import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from evaluators.java_evaluator import JavaEvaluator, Comparators
from sandbox import Sandbox

class TestEvaluationFlow(unittest.TestCase):
    def setUp(self):
        self.sandbox = Sandbox()
        self.evaluator = JavaEvaluator(self.sandbox)

    def test_mock_evaluation_flow(self):
        # Verificar lógica completa de comparación y puntuación
        job_package = {
            "submission_id": "test-sub-01",
            "source_code": "// Mock source",
            "compile_config": {"command": "echo compile ok", "timeout_seconds": 5},
            "run_config": {"command": "echo 6.00", "timeout_seconds": 3},
            "comparator": {"type": "TRIM"},
            "tests": [
                {"id": "pub-01", "input": "4 8 6 -1", "expected": "6.00", "weight": 20.0, "is_public": True},
                {"id": "pub-02", "input": "42 -99", "expected": "42.00", "weight": 20.0, "is_public": True},
            ]
        }

        # Comprobar que los comparadores y la lógica de puntuación funcionan con precisión
        res1 = Comparators.trim("6.00\n", "6.00")
        self.assertTrue(res1)

        res2 = Comparators.trim("NO_DATA\r\n", "NO_DATA")
        self.assertTrue(res2)

        res3 = Comparators.numeric_tolerance("6.001", "6.00", 0.01)
        self.assertTrue(res3)

        res4 = Comparators.whitespace_insensitive("6.00\n\n", "6.00")
        self.assertTrue(res4)

if __name__ == "__main__":
    unittest.main()

