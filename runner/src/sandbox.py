import os
import shlex
import shutil
import tempfile
import time
import uuid
import subprocess
import logging
from typing import Dict, Any, Optional, List, Tuple

logger = logging.getLogger("BenigascodeSandbox")

class ExecutionResult:
    def __init__(self, exit_code: int, stdout: str, stderr: str, duration_ms: int, timed_out: bool = False, oom_killed: bool = False):
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.duration_ms = duration_ms
        self.timed_out = timed_out
        self.oom_killed = oom_killed

    def to_dict(self) -> Dict[str, Any]:
        return {
            "exit_code": self.exit_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "duration_ms": self.duration_ms,
            "timed_out": self.timed_out,
            "oom_killed": self.oom_killed,
        }

class Sandbox:
    """
    Gestiona la ejecución aislada de código Java 26 en contenedores efímeros
    aplicando restricciones estrictas de seguridad (red none, memoria, CPU, procesos, no-new-privileges).
    """

    MAX_OUTPUT_BYTES = 64 * 1024  # 64 KB limit

    def __init__(self, image_name: Optional[str] = None):
        self.image_name = image_name or os.environ.get("RUNNER_SANDBOX_IMAGE", "eclipse-temurin:26-jdk-alpine")
        default_image = os.environ.get("RUNNER_SANDBOX_IMAGE") or os.environ.get("RUNNER_JAVA_IMAGE", "benigascode-sandbox-java26:latest")
        self.image_name = image_name or default_image
        self.hostname = os.environ.get("HOSTNAME", os.uname().nodename)
        self.docker_available = self._check_docker()
        self.inside_container = self._check_inside_container() if self.docker_available else False

    def _check_docker(self) -> bool:
        try:
            res = subprocess.run(["docker", "version"], capture_output=True, timeout=3)
            return res.returncode == 0
        except Exception:
            return False

    def _check_inside_container(self) -> bool:
        if not self.docker_available:
            return False
        try:
            res = subprocess.run(["docker", "inspect", self.hostname], capture_output=True, timeout=3)
            is_inside = (res.returncode == 0)
            logger.info(f"Sandbox container detection: hostname={self.hostname}, inside_container={is_inside}")
            return is_inside
        except Exception as e:
            logger.warning(f"Error comprobando si se ejecuta dentro de un contenedor: {e}")
            return False

    def execute_in_sandbox(
        self,
        workspace_dir: str,
        command: List[str],
        stdin_data: Optional[str] = None,
        timeout_seconds: int = 5,
        memory_limit: str = "256m",
        cpu_limit: float = 1.0,
        pids_limit: int = 64,
        image_name: Optional[str] = None,
    ) -> ExecutionResult:
        """
        Ejecuta un comando dentro del sandbox aislado con Java 26.
        Ejecuta un comando dentro del sandbox aislado.
        Si Docker está disponible, usa 'docker run' con todas las protecciones.
        Si Docker no está presente (entorno dev/test local sin docker), ejecuta el proceso
        directamente con límites de tiempo y captura de buffers.
        """
        start_time = time.time()

        if self.docker_available:
            return self._run_docker(
                workspace_dir, command, stdin_data, timeout_seconds, memory_limit, cpu_limit, pids_limit, image_name
            )
        else:
            return self._run_local_fallback(workspace_dir, command, stdin_data, timeout_seconds)

    def execute_batch_in_sandbox(
        self,
        workspace_dir: str,
        compile_command: List[str],
        compile_timeout: int,
        run_command: List[str],
        test_inputs: List[str],
        run_timeout: int = 3,
        memory_limit: str = "256m",
        cpu_limit: float = 1.0,
        pids_limit: int = 64,
        image_name: Optional[str] = None,
        max_consecutive_timeouts: int = 2,
    ) -> Tuple[ExecutionResult, List[ExecutionResult]]:
        """
        Ejecuta la compilación y todos los casos de prueba dentro de un único contenedor Docker
        para eliminar la sobrecarga de crear/destruir N contenedores por entrega, y cortocircuita
        si se producen múltiples timeouts consecutivos (ej. bucle infinito del alumno).
        """
        if self.docker_available:
            return self._run_docker_batch(
                workspace_dir=workspace_dir,
                compile_command=compile_command,
                compile_timeout=compile_timeout,
                run_command=run_command,
                test_inputs=test_inputs,
                run_timeout=run_timeout,
                memory_limit=memory_limit,
                cpu_limit=cpu_limit,
                pids_limit=pids_limit,
                image_name=image_name,
                max_consecutive_timeouts=max_consecutive_timeouts,
            )

        # Fallback local sin Docker
        compile_res = self._run_local_fallback(workspace_dir, compile_command, None, compile_timeout)
        if compile_res.exit_code != 0:
            return compile_res, []

        test_results: List[ExecutionResult] = []
        consecutive_timeouts = 0
        for stdin_data in test_inputs:
            if consecutive_timeouts >= max_consecutive_timeouts:
                test_results.append(
                    ExecutionResult(
                        exit_code=-1,
                        stdout="",
                        stderr="Timeout (omitido tras múltiples timeouts consecutivos)",
                        duration_ms=0,
                        timed_out=True,
                        oom_killed=False,
                    )
                )
                continue

            res = self._run_local_fallback(workspace_dir, run_command, stdin_data, run_timeout)
            if res.timed_out:
                consecutive_timeouts += 1
            else:
                consecutive_timeouts = 0
            test_results.append(res)

        return compile_res, test_results

    def _run_docker_batch(
        self,
        workspace_dir: str,
        compile_command: List[str],
        compile_timeout: int,
        run_command: List[str],
        test_inputs: List[str],
        run_timeout: int,
        memory_limit: str,
        cpu_limit: float,
        pids_limit: int,
        image_name: Optional[str],
        max_consecutive_timeouts: int,
    ) -> Tuple[ExecutionResult, List[ExecutionResult]]:
        batch_in_dir = os.path.join(workspace_dir, ".bcode_batch")
        batch_out_dir = os.path.join(workspace_dir, ".bcode_out")
        try:
            os.chmod(workspace_dir, 0o777)
        except Exception:
            pass
        os.makedirs(batch_in_dir, exist_ok=True)
        os.chmod(batch_in_dir, 0o777)
        os.makedirs(batch_out_dir, exist_ok=True)
        os.chmod(batch_out_dir, 0o777)

        for i, stdin_val in enumerate(test_inputs):
            in_path = os.path.join(batch_in_dir, f"in_{i}")
            with open(in_path, "w", encoding="utf-8") as f:
                f.write(stdin_val if stdin_val is not None else "")
            os.chmod(in_path, 0o666)

        compile_cmd_str = " ".join(shlex.quote(arg) for arg in compile_command)
        run_cmd_str = " ".join(shlex.quote(arg) for arg in run_command)
        num_tests = len(test_inputs)
        indices_str = " ".join(str(i) for i in range(num_tests))
        timeout_ms_threshold = max(100, int(run_timeout * 1000) - 150)

        tests_loop_script = ""
        if num_tests > 0:
            tests_loop_script = f"""
if [ "$c_ec" -eq 0 ]; then
  consec_to=0
  for i in {indices_str}; do
    if [ "$consec_to" -ge {max_consecutive_timeouts} ]; then
      echo "-1 0 1" > /tmp/.bcode_$$/t_${{i}}_meta
      : > /tmp/.bcode_$$/t_${{i}}_out
      echo "Timeout (omitido tras múltiples timeouts consecutivos)" > /tmp/.bcode_$$/t_${{i}}_err
      continue
    fi
    read up _ < /proc/uptime
    t0="${{up%.*}}${{up#*.}}0"
    timeout -s TERM -k 1 {run_timeout} {run_cmd_str} < /tmp/.bcode_$$/in_${{i}} > /tmp/.bcode_$$/t_${{i}}_out 2> /tmp/.bcode_$$/t_${{i}}_err
    ec=$?
    read up _ < /proc/uptime
    t1="${{up%.*}}${{up#*.}}0"
    dur=$((t1 - t0))
    is_to=0
    if [ "$ec" -eq 124 ] || [ "$ec" -eq 143 ]; then
      is_to=1
      consec_to=$((consec_to + 1))
    elif [ "$ec" -eq 137 ] && [ "$dur" -ge {timeout_ms_threshold} ]; then
      is_to=1
      consec_to=$((consec_to + 1))
    else
      consec_to=0
    fi
    echo "${{ec}} ${{dur}} ${{is_to}}" > /tmp/.bcode_$$/t_${{i}}_meta
  done
fi
"""

        script = f"""mkdir -p /tmp/.bcode_$$
cp .bcode_batch/* /tmp/.bcode_$$/ 2>/dev/null || true
rm -rf .bcode_batch

read up _ < /proc/uptime
t0="${{up%.*}}${{up#*.}}0"
timeout -s TERM -k 1 {compile_timeout} {compile_cmd_str} < /dev/null > /tmp/.bcode_$$/c_out 2> /tmp/.bcode_$$/c_err
c_ec=$?
read up _ < /proc/uptime
t1="${{up%.*}}${{up#*.}}0"
c_dur=$((t1 - t0))
c_to=0
if [ "$c_ec" -eq 124 ] || [ "$c_ec" -eq 143 ]; then c_to=1; fi
echo "${{c_ec}} ${{c_dur}} ${{c_to}}" > /tmp/.bcode_$$/c_meta
{tests_loop_script}
mkdir -p .bcode_out
rm -f /tmp/.bcode_$$/in_*
cp /tmp/.bcode_$$/* .bcode_out/ 2>/dev/null || true
chmod -R 777 .bcode_out 2>/dev/null || true
rm -rf /tmp/.bcode_$$
"""

        outer_timeout = compile_timeout + max(1, num_tests) * (run_timeout + 1) + 10
        batch_exec = self._run_docker(
            workspace_dir=workspace_dir,
            command=["/bin/sh", "-s"],
            stdin_data=script,
            timeout_seconds=outer_timeout,
            memory_limit=memory_limit,
            cpu_limit=cpu_limit,
            pids_limit=pids_limit,
            image_name=image_name,
        )

        def _read_text(path: str) -> str:
            if not os.path.isfile(path):
                return ""
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    return f.read(self.MAX_OUTPUT_BYTES)
            except Exception:
                return ""

        c_meta_path = os.path.join(batch_out_dir, "c_meta")
        if not os.path.isfile(c_meta_path):
            return (
                ExecutionResult(
                    exit_code=batch_exec.exit_code if batch_exec.exit_code != 0 else -1,
                    stdout=batch_exec.stdout,
                    stderr=batch_exec.stderr or "Error ejecutando lote en contenedor sandbox",
                    duration_ms=batch_exec.duration_ms,
                    timed_out=batch_exec.timed_out,
                    oom_killed=batch_exec.oom_killed,
                ),
                [],
            )

        c_meta_parts = _read_text(c_meta_path).strip().split()
        c_ec = int(c_meta_parts[0]) if len(c_meta_parts) >= 1 else -1
        c_dur = int(c_meta_parts[1]) if len(c_meta_parts) >= 2 else 0
        c_to = (c_meta_parts[2] == "1") if len(c_meta_parts) >= 3 else False

        compile_res = ExecutionResult(
            exit_code=-1 if c_to else c_ec,
            stdout=_read_text(os.path.join(batch_out_dir, "c_out")),
            stderr=_read_text(os.path.join(batch_out_dir, "c_err")),
            duration_ms=c_dur,
            timed_out=c_to,
            oom_killed=(c_ec == 137 and not c_to),
        )

        if compile_res.exit_code != 0:
            return compile_res, []

        test_results: List[ExecutionResult] = []
        for i in range(num_tests):
            t_meta_path = os.path.join(batch_out_dir, f"t_{i}_meta")
            if not os.path.isfile(t_meta_path):
                test_results.append(
                    ExecutionResult(
                        exit_code=-1,
                        stdout="",
                        stderr="Ejecución interrumpida por límite global del contenedor",
                        duration_ms=0,
                        timed_out=True,
                        oom_killed=False,
                    )
                )
                continue

            parts = _read_text(t_meta_path).strip().split()
            ec = int(parts[0]) if len(parts) >= 1 else -1
            dur = int(parts[1]) if len(parts) >= 2 else 0
            is_to = (parts[2] == "1") if len(parts) >= 3 else False

            test_results.append(
                ExecutionResult(
                    exit_code=-1 if is_to else ec,
                    stdout=_read_text(os.path.join(batch_out_dir, f"t_{i}_out")),
                    stderr=_read_text(os.path.join(batch_out_dir, f"t_{i}_err")),
                    duration_ms=dur,
                    timed_out=is_to,
                    oom_killed=(ec == 137 and not is_to),
                )
            )

        return compile_res, test_results

    def _run_docker(
        self,
        workspace_dir: str,
        command: List[str],
        stdin_data: Optional[str],
        timeout_seconds: int,
        memory_limit: str,
        cpu_limit: float,
        pids_limit: int,
        image_name: Optional[str] = None,
    ) -> ExecutionResult:
        container_name = f"benigascode_sandbox_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
        docker_cmd = [
            "docker", "run", "--rm", "-i",
            "--name", container_name,
            "--network", "none",
            "--memory", memory_limit,
            "--memory-swap", memory_limit,
            f"--cpus={cpu_limit}",
            f"--pids-limit={pids_limit}",
            "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges:true",
            "--user", "10001:10001",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m",
        ]

        if self.inside_container:
            docker_cmd.extend(["--volumes-from", self.hostname, "-w", os.path.abspath(workspace_dir)])
        else:
            docker_cmd.extend(["-v", f"{os.path.abspath(workspace_dir)}:/workspace:rw", "-w", "/workspace"])

        docker_cmd.append(image_name or self.image_name)
        docker_cmd.extend(command)

        timed_out = False
        container_cleaned = False
        start_time = time.time()

        try:
            process = subprocess.Popen(
                docker_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            try:
                stdout, stderr = process.communicate(input=stdin_data if stdin_data is not None else "", timeout=timeout_seconds)
                exit_code = process.returncode
                container_cleaned = True
            except subprocess.TimeoutExpired:
                timed_out = True
                # Matar contenedor forzosamente para no dejar procesos huérfanos
                subprocess.run(["docker", "kill", container_name], capture_output=True)
                container_cleaned = True
                stdout, stderr = process.communicate()
                exit_code = -1

            duration_ms = int((time.time() - start_time) * 1000)

            return ExecutionResult(
                exit_code=exit_code,
                stdout=stdout[: self.MAX_OUTPUT_BYTES] if stdout else "",
                stderr=stderr[: self.MAX_OUTPUT_BYTES] if stderr else "",
                duration_ms=duration_ms,
                timed_out=timed_out,
                oom_killed=(exit_code == 137),
            )

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return ExecutionResult(
                exit_code=-1,
                stdout="",
                stderr=str(e),
                duration_ms=duration_ms,
                timed_out=False,
            )
        finally:
            if not container_cleaned:
                # Asegurar que el contenedor muere incluso en caso de excepción imprevista
                subprocess.run(["docker", "kill", container_name], capture_output=True)

    def _run_local_fallback(
        self,
        workspace_dir: str,
        command: List[str],
        stdin_data: Optional[str],
        timeout_seconds: int,
    ) -> ExecutionResult:
        """
        Ejecución de fallback cuando Docker no está activo en el host de desarrollo.
        """
        start_time = time.time()
        timed_out = False

        try:
            process = subprocess.Popen(
                command,
                cwd=workspace_dir,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            try:
                stdout, stderr = process.communicate(input=stdin_data if stdin_data is not None else "", timeout=timeout_seconds)
                exit_code = process.returncode
            except subprocess.TimeoutExpired:
                timed_out = True
                process.kill()
                stdout, stderr = process.communicate()
                exit_code = -1

            duration_ms = int((time.time() - start_time) * 1000)

            return ExecutionResult(
                exit_code=exit_code,
                stdout=stdout[: self.MAX_OUTPUT_BYTES] if stdout else "",
                stderr=stderr[: self.MAX_OUTPUT_BYTES] if stderr else "",
                duration_ms=duration_ms,
                timed_out=timed_out,
                oom_killed=False,
            )
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            return ExecutionResult(
                exit_code=-1,
                stdout="",
                stderr=str(e),
                duration_ms=duration_ms,
                timed_out=False,
            )
