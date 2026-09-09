import os
import shutil
import tempfile
import time
import subprocess
from typing import Dict, Any, Optional, List

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
    Gestiona la ejecución aislada de código en contenedores efímeros
    aplicando restricciones estrictas de seguridad (red, memoria, CPU, procesos).
    """

    MAX_OUTPUT_BYTES = 64 * 1024  # 64 KB limit

    def __init__(self, image_name: str = "eclipse-temurin:21-jdk-alpine"):
        self.image_name = image_name
        self.docker_available = self._check_docker()

    def _check_docker(self) -> bool:
        try:
            res = subprocess.run(["docker", "version"], capture_output=True, timeout=3)
            return res.returncode == 0
        except Exception:
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
    ) -> ExecutionResult:
        """
        Ejecuta un comando dentro del sandbox aislado.
        Si Docker está disponible, usa 'docker run' con todas las protecciones.
        Si Docker no está presente (entorno dev/test local sin docker), ejecuta el proceso
        directamente con límites de tiempo y captura de buffers.
        """
        start_time = time.time()

        if self.docker_available:
            return self._run_docker(
                workspace_dir, command, stdin_data, timeout_seconds, memory_limit, cpu_limit, pids_limit
            )
        else:
            return self._run_local_fallback(workspace_dir, command, stdin_data, timeout_seconds)

    def _run_docker(
        self,
        workspace_dir: str,
        command: List[str],
        stdin_data: Optional[str],
        timeout_seconds: int,
        memory_limit: str,
        cpu_limit: float,
        pids_limit: int,
    ) -> ExecutionResult:
        container_name = f"codelab_sandbox_{int(time.time() * 1000)}"
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
            "-v", f"{os.path.abspath(workspace_dir)}:/workspace:rw",
            "-w", "/workspace",
            self.image_name,
        ] + command

        timed_out = False
        start_time = time.time()

        try:
            process = subprocess.Popen(
                docker_cmd,
                stdin=subprocess.PIPE if stdin_data else None,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            try:
                stdout, stderr = process.communicate(input=stdin_data, timeout=timeout_seconds)
                exit_code = process.returncode
            except subprocess.TimeoutExpired:
                timed_out = True
                # Matar contenedor forzosamente
                subprocess.run(["docker", "kill", container_name], capture_output=True)
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
                stdin=subprocess.PIPE if stdin_data is not None else None,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            try:
                stdout, stderr = process.communicate(input=stdin_data, timeout=timeout_seconds)
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

