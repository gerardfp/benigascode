import os
import shutil
import tempfile
from typing import Dict, Any, List, Optional
from sandbox import Sandbox, ExecutionResult
from evaluators.comparators import Comparators

class PythonEvaluator:
    """
    Evalúa soluciones en el runtime Python 3 dentro de un sandbox aislado.
    """

    def __init__(self, sandbox: Sandbox, image_name: Optional[str] = None):
        self.sandbox = sandbox
        self.image_name = image_name or os.environ.get("RUNNER_PYTHON_IMAGE", "benigascode-sandbox-python:latest")

    def evaluate(self, job_package: Dict[str, Any]) -> Dict[str, Any]:
        """
        job_package format:
        {
            "job_id": "...",
            "submission_id": "...",
            "source_code": "def solve(): ...",
            "files": {"solution.py": "...", "helper.py": "..."},
            "compile_config": {"command": "python3 -m py_compile solution.py", "timeout_seconds": 10},
            "run_config": {"command": "python3 solution.py", "timeout_seconds": 3, "memory_limit": "256m"},
            "comparator": {"type": "trim"},
            "tests": [...]
        }
        """
        tmp_base = os.environ.get("BENIGASCODE_TMP_DIR", "/tmp/benigascode" if os.path.exists("/tmp/benigascode") else None)
        temp_dir = tempfile.mkdtemp(prefix="eval_py_", dir=tmp_base)
        try:
            os.chmod(temp_dir, 0o777)
            return self._run_evaluation(job_package, temp_dir)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _run_evaluation(self, job_package: Dict[str, Any], workspace: str) -> Dict[str, Any]:
        source_code = job_package.get("source_code") or job_package.get("sourceCode") or ""
        files = job_package.get("files", {})
        compile_config = job_package.get("compile_config") or job_package.get("compileConfig") or {}
        run_config = job_package.get("run_config") or job_package.get("runConfig") or {}
        tests = job_package.get("tests", [])
        comparator_config = job_package.get("comparator", {"type": "TRIM"})

        # 1. Escribir archivos en workspace
        entry_file = "solution.py"
        if files and isinstance(files, dict):
            for rel_path, content in files.items():
                dest_path = os.path.join(workspace, rel_path)
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with open(dest_path, "w", encoding="utf-8") as f:
                    f.write(content)
                os.chmod(dest_path, 0o666)

            if "solution.py" in files:
                entry_file = "solution.py"
            elif "main.py" in files:
                entry_file = "main.py"
            else:
                for k in files.keys():
                    if k.endswith(".py"):
                        entry_file = k
                        break
        else:
            main_file = os.path.join(workspace, entry_file)
            with open(main_file, "w", encoding="utf-8") as f:
                f.write(source_code)
            os.chmod(main_file, 0o666)

        # 2. Comprobación sintáctica (compilación py_compile)
        compile_cmd_str = compile_config.get("command")
        if not compile_cmd_str or "javac" in compile_cmd_str:
            compile_cmd_str = f"python3 -m py_compile {entry_file}"
        compile_cmd = compile_cmd_str.split()
        compile_timeout = compile_config.get("timeout_seconds", 10)

        compile_res = self.sandbox.execute_in_sandbox(
            workspace_dir=workspace,
            command=compile_cmd,
            timeout_seconds=compile_timeout,
            image_name=self.image_name,
        )

        if compile_res.exit_code != 0:
            return {
                "status": "COMPILE_ERROR",
                "score": 0.0,
                "compile": {
                    "success": False,
                    "stdout": compile_res.stdout,
                    "stderr": compile_res.stderr,
                },
                "testResults": [],
                "test_results": [],
            }

        # 3. Ejecutar suite de pruebas con Python 3
        run_cmd_str = run_config.get("command")
        if not run_cmd_str or "java " in run_cmd_str:
            run_cmd_str = f"python3 {entry_file}"
        run_cmd = run_cmd_str.split()
        run_timeout = run_config.get("timeout_seconds") or run_config.get("timeoutSeconds", 3)

        memory_limit = run_config.get("memory_limit") or run_config.get("memoryLimit")
        if not memory_limit and ("memory_limit_mb" in run_config or "memoryLimitMb" in run_config):
            mb = run_config.get("memory_limit_mb") or run_config.get("memoryLimitMb")
            memory_limit = f"{mb}m"
        if not memory_limit:
            memory_limit = "256m"

        test_results = []
        total_score = 0.0
        all_passed = True
        has_timeout = False
        has_runtime_error = False

        for test in tests:
            test_id = test.get("id") or test.get("testId") or "test"
            test_name = test.get("name") or test.get("testName") or test_id
            test_input = test.get("input", "")
            expected_output = test.get("expected") if "expected" in test else test.get("expectedOutput", "")
            weight = float(test.get("weight", 0.0))
            is_public = test.get("is_public") if "is_public" in test else test.get("isPublic", False)

            exec_res = self.sandbox.execute_in_sandbox(
                workspace_dir=workspace,
                command=run_cmd,
                stdin_data=test_input,
                timeout_seconds=run_timeout,
                memory_limit=memory_limit,
                image_name=self.image_name,
            )

            if exec_res.timed_out:
                status = "TIMEOUT"
                has_timeout = True
                passed = False
            elif exec_res.exit_code != 0:
                status = "RUNTIME_ERROR"
                has_runtime_error = True
                passed = False
            else:
                passed = Comparators.compare(exec_res.stdout, expected_output, comparator_config)
                status = "PASSED" if passed else "FAILED"

            if not passed:
                all_passed = False

            test_score = weight if passed else 0.0
            total_score += test_score

            test_results.append({
                "testId": test_id,
                "testName": test_name,
                "name": test_name,
                "isPublic": is_public,
                "status": status,
                "durationMs": exec_res.duration_ms,
                "stdout": exec_res.stdout,
                "stderr": exec_res.stderr,
                "expectedOutput": expected_output,
                "actualOutput": exec_res.stdout,
                "passed": passed,
                "score": round(test_score, 2),
            })

        if all_passed:
            overall_status = "CORRECT"
        elif has_timeout and total_score == 0:
            overall_status = "TIMEOUT"
        elif has_runtime_error and total_score == 0:
            overall_status = "RUNTIME_ERROR"
        else:
            overall_status = "INCORRECT"

        return {
            "status": overall_status,
            "score": round(min(100.0, max(0.0, total_score)), 2),
            "compile": {
                "success": True,
                "stdout": compile_res.stdout,
                "stderr": compile_res.stderr,
            },
            "testResults": test_results,
            "test_results": test_results,
        }
