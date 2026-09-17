import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from sandbox import Sandbox
from evaluators.python_evaluator import PythonEvaluator
from evaluators.comparators import Comparators
from daemon import RunnerDaemon

class TestPythonRunner(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sandbox = Sandbox(image_name="benigascode-sandbox-python:latest")
        cls.evaluator = PythonEvaluator(cls.sandbox)

    def test_correct_python_program(self):
        job = {
            "source_code": """
name = input().strip()
print(f"Hello {name}")
""",
            "compile_config": {"command": "python3 -m py_compile solution.py", "timeout_seconds": 10},
            "run_config": {"command": "python3 solution.py", "timeout_seconds": 3, "memory_limit": "256m"},
            "comparator": {"type": "TRIM"},
            "tests": [
                {"id": "t1", "input": "Ada", "expected": "Hello Ada", "weight": 50.0, "is_public": True},
                {"id": "t2", "input": "Alan", "expected": "Hello Alan", "weight": 50.0, "is_public": False},
            ]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "CORRECT")
        self.assertEqual(res["score"], 100.0)
        self.assertTrue(res["compile"]["success"])
        self.assertEqual(len(res["testResults"]), 2)
        self.assertTrue(res["testResults"][0]["passed"])
        self.assertTrue(res["testResults"][1]["passed"])

    def test_compilation_syntax_error(self):
        job = {
            "source_code": "def broken_syntax(:\n    pass\n",
            "compile_config": {"command": "python3 -m py_compile solution.py", "timeout_seconds": 10},
            "run_config": {"command": "python3 solution.py", "timeout_seconds": 3},
            "comparator": {"type": "TRIM"},
            "tests": [{"id": "t1", "input": "", "expected": "", "weight": 100.0, "is_public": True}]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "COMPILE_ERROR")
        self.assertEqual(res["score"], 0.0)
        self.assertFalse(res["compile"]["success"])
        self.assertIn("SyntaxError", res["compile"]["stderr"])

    def test_runtime_error_exception(self):
        job = {
            "source_code": """
val = int(input())
res = 100 // val
print(res)
""",
            "compile_config": {"command": "python3 -m py_compile solution.py", "timeout_seconds": 10},
            "run_config": {"command": "python3 solution.py", "timeout_seconds": 3},
            "comparator": {"type": "TRIM"},
            "tests": [{"id": "t1", "input": "0", "expected": "0", "weight": 100.0, "is_public": True}]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "RUNTIME_ERROR")
        self.assertEqual(res["score"], 0.0)
        self.assertEqual(res["testResults"][0]["status"], "RUNTIME_ERROR")
        self.assertFalse(res["testResults"][0]["passed"])
        self.assertIn("ZeroDivisionError", res["testResults"][0]["stderr"])

    def test_timeout_handling(self):
        job = {
            "source_code": """
while True:
    pass
""",
            "compile_config": {"command": "python3 -m py_compile solution.py", "timeout_seconds": 10},
            "run_config": {"command": "python3 solution.py", "timeout_seconds": 1},
            "comparator": {"type": "TRIM"},
            "tests": [{"id": "t1", "input": "", "expected": "done", "weight": 100.0, "is_public": True}]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "TIMEOUT")
        self.assertEqual(res["testResults"][0]["status"], "TIMEOUT")

    def test_failed_logic_test(self):
        job = {
            "source_code": "print('wrong answer')",
            "compile_config": {"command": "python3 -m py_compile solution.py", "timeout_seconds": 10},
            "run_config": {"command": "python3 solution.py", "timeout_seconds": 3},
            "comparator": {"type": "TRIM"},
            "tests": [
                {"id": "t1", "input": "", "expected": "wrong answer", "weight": 50.0, "is_public": True},
                {"id": "t2", "input": "", "expected": "expected answer", "weight": 50.0, "is_public": False},
            ]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "INCORRECT")
        self.assertEqual(res["score"], 50.0)
        self.assertTrue(res["testResults"][0]["passed"])
        self.assertFalse(res["testResults"][1]["passed"])

    def test_sanitize_javac_java_commands(self):
        # Even if a job inherits compile_config with javac and run_config with java from a Java template,
        # PythonEvaluator will sanitize and run python3
        job = {
            "source_code": "print('sanitized')",
            "compile_config": {"command": "javac Main.java", "timeout_seconds": 15},
            "run_config": {"command": "java Main", "timeout_seconds": 3},
            "comparator": {"type": "TRIM"},
            "tests": [{"id": "t1", "input": "", "expected": "sanitized", "weight": 100.0, "is_public": True}]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "CORRECT")
        self.assertEqual(res["score"], 100.0)
        self.assertTrue(res["compile"]["success"])

    def test_multifile_python_project(self):
        job = {
            "files": {
                "solution.py": "from helper import greet\nprint(greet('World'))",
                "helper.py": "def greet(name):\n    return f'Hello, {name}!'"
            },
            "comparator": {"type": "TRIM"},
            "tests": [{"id": "t1", "input": "", "expected": "Hello, World!", "weight": 100.0, "is_public": True}]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "CORRECT")
        self.assertEqual(res["score"], 100.0)

    def test_daemon_detect_language(self):
        daemon = RunnerDaemon()
        java_code = "public class Main { public static void main(String[] args) { System.out.println(\"Hi\"); } }"
        python_code = "def main():\n    print('Hi')\n\nif __name__ == '__main__':\n    main()"
        
        self.assertEqual(daemon.detect_language(java_code), "java")
        self.assertEqual(daemon.detect_language(python_code), "python")
        
        py_evaluator = daemon.get_evaluator({"language": "python", "source_code": ""})
        self.assertIsInstance(py_evaluator, PythonEvaluator)
        
        java_evaluator = daemon.get_evaluator({"language": "java", "source_code": ""})
        self.assertNotIsInstance(java_evaluator, PythonEvaluator)

if __name__ == "__main__":
    unittest.main()

