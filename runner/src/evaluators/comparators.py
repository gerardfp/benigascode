from typing import Dict, Any

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

    @classmethod
    def compare(cls, actual: str, expected: str, config: Dict[str, Any]) -> bool:
        comp_type = (config.get("type") or "TRIM").upper()
        if comp_type == "EXACT":
            return cls.exact(actual, expected)
        elif comp_type == "TRIM":
            return cls.trim(actual, expected)
        elif comp_type in ("EXACT_LINE_BY_LINE", "LINE_BY_LINE"):
            ignore_trailing = config.get("ignore_trailing_whitespace", True)
            return cls.exact_line_by_line(actual, expected, ignore_trailing)
        elif comp_type == "WHITESPACE_INSENSITIVE":
            return cls.whitespace_insensitive(actual, expected)
        elif comp_type == "LINE_INSENSITIVE":
            return cls.line_insensitive(actual, expected)
        elif comp_type == "CASE_INSENSITIVE":
            return cls.case_insensitive(actual, expected)
        elif comp_type == "NUMERIC_TOLERANCE":
            tolerance = float(config.get("tolerance", 0.001))
            return cls.numeric_tolerance(actual, expected, tolerance)
        return cls.trim(actual, expected)

