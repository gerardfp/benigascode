import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from sandbox import Sandbox
from evaluators.java_evaluator import JavaEvaluator, Comparators

class TestJava26Runner(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sandbox = Sandbox(image_name="benigascode-sandbox-java26:latest")
        cls.evaluator = JavaEvaluator(cls.sandbox)

    def test_correct_java26_program(self):
        job = {
            "source_code": """
            import java.util.Scanner;
            public class Main {
                public static void main(String[] args) {
                    Scanner sc = new Scanner(System.in);
                    String name = sc.next();
                    System.out.println("Hello " + name);
                }
            }
            """,
            "compile_config": {"command": "javac Main.java", "timeout_seconds": 15},
            "run_config": {"command": "java Main", "timeout_seconds": 3, "memory_limit": "256m"},
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
        self.assertEqual(len(res["test_results"]), 2)
        self.assertTrue(res["test_results"][0]["passed"])
        self.assertTrue(res["test_results"][1]["passed"])

    def test_compilation_error(self):
        job = {
            "source_code": "public class Main { syntax_error; }",
            "compile_config": {"command": "javac Main.java", "timeout_seconds": 15},
            "run_config": {"command": "java Main", "timeout_seconds": 3},
            "comparator": {"type": "TRIM"},
            "tests": [{"id": "t1", "input": "", "expected": "", "weight": 100.0, "is_public": True}]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "COMPILE_ERROR")
        self.assertEqual(res["score"], 0.0)
        self.assertFalse(res["compile"]["success"])
        self.assertIn("error", res["compile"]["stderr"])

    def test_runtime_error_exception(self):
        job = {
            "source_code": """
            public class Main {
                public static void main(String[] args) {
                    throw new RuntimeException("Intentional failure");
                }
            }
            """,
            "compile_config": {"command": "javac Main.java", "timeout_seconds": 15},
            "run_config": {"command": "java Main", "timeout_seconds": 3},
            "comparator": {"type": "TRIM"},
            "tests": [{"id": "t1", "input": "", "expected": "OK", "weight": 100.0, "is_public": True}]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "RUNTIME_ERROR")
        self.assertEqual(res["score"], 0.0)
        self.assertEqual(res["test_results"][0]["status"], "RUNTIME_ERROR")
        self.assertFalse(res["test_results"][0]["passed"])

    def test_timeout_handling(self):
        job = {
            "source_code": """
            public class Main {
                public static void main(String[] args) {
                    while (true) {}
                }
            }
            """,
            "compile_config": {"command": "javac Main.java", "timeout_seconds": 15},
            "run_config": {"command": "java Main", "timeout_seconds": 1},
            "comparator": {"type": "TRIM"},
            "tests": [{"id": "t1", "input": "", "expected": "done", "weight": 100.0, "is_public": True}]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "TIMEOUT")
        self.assertEqual(res["test_results"][0]["status"], "TIMEOUT")

    def test_failed_logic_test(self):
        job = {
            "source_code": """
            public class Main {
                public static void main(String[] args) {
                    System.out.println("42");
                }
            }
            """,
            "compile_config": {"command": "javac Main.java", "timeout_seconds": 15},
            "run_config": {"command": "java Main", "timeout_seconds": 3},
            "comparator": {"type": "TRIM"},
            "tests": [
                {"id": "t1", "input": "", "expected": "42", "weight": 50.0, "is_public": True},
                {"id": "t2", "input": "", "expected": "100", "weight": 50.0, "is_public": False},
            ]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "INCORRECT")
        self.assertEqual(res["score"], 50.0)
        self.assertTrue(res["test_results"][0]["passed"])
        self.assertFalse(res["test_results"][1]["passed"])

    def test_multifile_project(self):
        job = {
            "files": {
                "Main.java": "public class Main { public static void main(String[] args) { System.out.println(Helper.greet()); } }",
                "Helper.java": "public class Helper { public static String greet() { return \"FromHelper\"; } }"
            },
            "compile_config": {"command": "javac Main.java Helper.java", "timeout_seconds": 15},
            "run_config": {"command": "java Main", "timeout_seconds": 3},
            "comparator": {"type": "TRIM"},
            "tests": [{"id": "t1", "input": "", "expected": "FromHelper", "weight": 100.0, "is_public": True}]
        }
        res = self.evaluator.evaluate(job)
        self.assertEqual(res["status"], "CORRECT")
        self.assertEqual(res["score"], 100.0)
        self.assertTrue(res["test_results"][0]["passed"])

    def test_comparator_exact_line_by_line(self):
        self.assertTrue(Comparators.exact_line_by_line("Line 1  \nLine 2\n", "Line 1\nLine 2", ignore_trailing=True))
        self.assertFalse(Comparators.exact_line_by_line("Line 1\nLine 3", "Line 1\nLine 2", ignore_trailing=True))

if __name__ == "__main__":
    unittest.main()

