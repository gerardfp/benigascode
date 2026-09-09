import os
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
    Evalúa soluciones en Java 21 dentro de un sandbox aislado.
    """

    def __init__(self, sandbox: Sandbox):
        self.sandbox = sandbox

    def evaluate(self, job_package: Dict[str, Any]) -> Dict[str, Any]:
        """
        job_package format:
        {
            "submission_id": "...",
            "source_code": "public class Main { ... }",
            "compile_config": {"command": "javac Main.java", "timeout_seconds": 10},
            "run_config": {"command": "java Main", "timeout_seconds": 3, "memory_limit": "256m"},
            "comparator": {"type": "TRIM", "tolerance": 0.001},
            "tests": [
                {"id": "pub-01", "name": "...", "input": "...", "expected": "...", "weight": 20.0, "is_public": True},
                ...
            ]
        }
        """
        temp_dir = tempfile.mkdtemp(prefix="benigascode_eval_")
        try:
            return self._run_evaluation(job_package, temp_dir)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def _run_evaluation(self, job_package: Dict[str, Any], workspace: str) -> Dict[str, Any]:
        source_code = job_package.get("source_code", "")
        compile_config = job_package.get("compile_config", {})
        run_config = job_package.get("run_config", {})
        tests = job_package.get("tests", [])
        comparator_config = job_package.get("comparator", {"type": "TRIM"})

        # 1. Escribir archivo fuente
        main_file = os.path.join(workspace, "Main.java")
        with open(main_file, "w", encoding="utf-8") as f:
            f.write(source_code)

        # 2. Compilar
        compile_cmd = compile_config.get("command", "javac Main.java").split()
        compile_timeout = compile_config.get("timeout_seconds", 10)

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
                "test_results": [],
            }

        # 3. Ejecutar suite de pruebas
        run_cmd = run_config.get("command", "java Main").split()
        run_timeout = run_config.get("timeout_seconds", 3)
        memory_limit = run_config.get("memory_limit", "256m")

        test_results = []
        total_score = 0.0
        all_passed = True
        has_timeout = False
        has_runtime_error = False

        for test in tests:
            test_id = test.get("id")
            test_input = test.get("input", "")
            expected_output = test.get("expected", "")
            weight = float(test.get("weight", 0.0))
            is_public = test.get("is_public", False)

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
                "test_id": test_id,
                "is_public": is_public,
                "status": status,
                "duration_ms": exec_res.duration_ms,
                "stdout": exec_res.stdout,
                "stderr": exec_res.stderr,
                "expected_output": expected_output,
                "actual_output": exec_res.stdout,
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
            "test_results": test_results,
        }

    def _compare_output(self, actual: str, expected: str, config: Dict[str, Any]) -> bool:
        comp_type = config.get("type", "TRIM").upper()
        if comp_type == "EXACT":
            return Comparators.exact(actual, expected)
        elif comp_type == "TRIM":
            return Comparators.trim(actual, expected)
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

