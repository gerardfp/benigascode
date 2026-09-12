import os
import re
import shutil
import tempfile
from typing import Dict, Any, List
from sandbox import Sandbox, ExecutionResult

class Comparators:
    @staticmethod
    def exact(actual: str, expected: str) -> bool:
        return actual == expected

    @staticmethod
    def trim(actual: str, expected: str) -> bool:
        return actual.strip() == expected.strip()

    @staticmethod
    def whitespace_insensitive(actual: str, expected: str) -> bool:
        return "".join(actual.split()) == "".join(expected.split())

    @staticmethod
    def line_insensitive(actual: str, expected: str) -> bool:
        actual_lines = [line.strip() for line in actual.strip().splitlines() if line.strip()]
        expected_lines = [line.strip() for line in expected.strip().splitlines() if line.strip()]
        return actual_lines == expected_lines

    @staticmethod
    def exact_line_by_line(actual: str, expected: str, ignore_trailing: bool = True) -> bool:
        actual_lines = actual.splitlines()
        expected_lines = expected.splitlines()
        if ignore_trailing:
            actual_lines = [l.rstrip() for l in actual_lines]
            expected_lines = [l.rstrip() for l in expected_lines]
        while actual_lines and not actual_lines[-1]:
            actual_lines.pop()
        while expected_lines and not expected_lines[-1]:
            expected_lines.pop()
        return actual_lines == expected_lines

    @staticmethod
    def case_insensitive(actual: str, expected: str) -> bool:
        return actual.strip().lower() == expected.strip().lower()

    @staticmethod
    def numeric_tolerance(actual: str, expected: str, tolerance: float = 0.001) -> bool:
        try:
            return abs(float(actual.strip()) - float(expected.strip())) <= tolerance
        except ValueError:
            return actual.strip() == expected.strip()

class JavaEvaluator:
    """
    Evalúa soluciones en el runtime Java 26 dentro de un sandbox aislado.
    """

    def __init__(self, sandbox: Sandbox):
        self.sandbox = sandbox

    def evaluate(self, job_package: Dict[str, Any]) -> Dict[str, Any]:
        """
        job_package format:
        {
            "job_id": "...",
            "submission_id": "...",
            "source_code": "public class Main { ... }",
            "files": {"Main.java": "...", "Helper.java": "..."}, // opcional para proyectos multifichero
            "compile_config": {"command": "javac Main.java", "timeout_seconds": 15},
            "run_config": {"command": "java Main", "timeout_seconds": 3, "memory_limit": "256m", "memory_limit_mb": 256},
            "comparator": {"type": "exact_line_by_line", "ignore_trailing_whitespace": true},
            "tests": [
                {"id": "pub-01", "name": "...", "input": "...", "expected": "...", "weight": 20.0, "is_public": True},
                ...
            ]
        }
        """
        tmp_base = os.environ.get("BENIGASCODE_TMP_DIR", "/tmp/benigascode" if os.path.exists("/tmp/benigascode") else None)
        temp_dir = tempfile.mkdtemp(prefix="eval_", dir=tmp_base)
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
        class_name = "Main"
        if files and isinstance(files, dict):
            for rel_path, content in files.items():
                dest_path = os.path.join(workspace, rel_path)
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with open(dest_path, "w", encoding="utf-8") as f:
                    f.write(content)
                os.chmod(dest_path, 0o666)
            if "Main.java" not in files:
                for k in files.keys():
                    if k.endswith(".java"):
                        class_name = os.path.splitext(k)[0]
                        break
        else:
            match = re.search(r'\bpublic\s+(?:final\s+|abstract\s+)?class\s+(\w+)', source_code)
            if not match:
                match = re.search(r'\bclass\s+(\w+)', source_code)
            if match:
                class_name = match.group(1)

            main_file = os.path.join(workspace, f"{class_name}.java")
            with open(main_file, "w", encoding="utf-8") as f:
                f.write(source_code)
            os.chmod(main_file, 0o666)

        # 2. Compilar con Java 26
        compile_cmd_str = compile_config.get("command", f"javac {class_name}.java")
        if class_name != "Main" and "Main.java" in compile_cmd_str:
            compile_cmd_str = compile_cmd_str.replace("Main.java", f"{class_name}.java")
        compile_cmd = compile_cmd_str.split()
        compile_timeout = compile_config.get("timeout_seconds", 15)

        compile_res = self.sandbox.execute_in_sandbox(
            workspace_dir=workspace,
            command=compile_cmd,
            timeout_seconds=compile_timeout,
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
            }

        # 3. Ejecutar suite de pruebas con Java 26
        run_cmd_str = run_config.get("command", f"java {class_name}")
        if class_name != "Main" and "Main" in run_cmd_str:
            run_cmd_str = run_cmd_str.replace("Main", class_name)
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
                passed = self._compare_output(exec_res.stdout, expected_output, comparator_config)
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
        }

    def _compare_output(self, actual: str, expected: str, config: Dict[str, Any]) -> bool:
        comp_type = config.get("type", "TRIM").upper()
        if comp_type == "EXACT":
            return Comparators.exact(actual, expected)
        elif comp_type == "TRIM":
            return Comparators.trim(actual, expected)
        elif comp_type in ("EXACT_LINE_BY_LINE", "LINE_BY_LINE"):
            ignore_trailing = config.get("ignore_trailing_whitespace", True)
            return Comparators.exact_line_by_line(actual, expected, ignore_trailing)
        elif comp_type == "WHITESPACE_INSENSITIVE":
            return Comparators.whitespace_insensitive(actual, expected)
        elif comp_type == "LINE_INSENSITIVE":
            return Comparators.line_insensitive(actual, expected)
        elif comp_type == "CASE_INSENSITIVE":
            return Comparators.case_insensitive(actual, expected)
        elif comp_type == "NUMERIC_TOLERANCE":
            tolerance = float(config.get("tolerance", 0.001))
            return Comparators.numeric_tolerance(actual, expected, tolerance)
        return Comparators.trim(actual, expected)
