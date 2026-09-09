import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from evaluators.java_evaluator import Comparators

class TestRunnerComparators(unittest.TestCase):
    def test_exact(self):
        self.assertTrue(Comparators.exact("hello\n", "hello\n"))
        self.assertFalse(Comparators.exact("hello", "hello\n"))

    def test_trim(self):
        self.assertTrue(Comparators.trim("  6.00 \n", "6.00"))
        self.assertTrue(Comparators.trim("6.00\r\n", "6.00"))
        self.assertFalse(Comparators.trim("6.01", "6.00"))

    def test_whitespace_insensitive(self):
        self.assertTrue(Comparators.whitespace_insensitive("1 2  3\n4", "1\n2\n3 4"))
        self.assertFalse(Comparators.whitespace_insensitive("1 2 3", "1 2 4"))

    def test_line_insensitive(self):
        self.assertTrue(Comparators.line_insensitive("line 1\nline 2\n", "line 1\r\nline 2"))
        self.assertFalse(Comparators.line_insensitive("line 1", "line 2"))

    def test_case_insensitive(self):
        self.assertTrue(Comparators.case_insensitive("no_data", "NO_DATA"))
        self.assertFalse(Comparators.case_insensitive("yes", "no"))

    def test_numeric_tolerance(self):
        self.assertTrue(Comparators.numeric_tolerance("3.14159", "3.141", tolerance=0.001))
        self.assertTrue(Comparators.numeric_tolerance("10.000", "10.0001", tolerance=0.001))
        self.assertFalse(Comparators.numeric_tolerance("10.00", "10.05", tolerance=0.01))

if __name__ == "__main__":
    unittest.main()

