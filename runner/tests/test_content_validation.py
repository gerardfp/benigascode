import unittest
import os
import re

class TestContentValidation(unittest.TestCase):
    def setUp(self):
        self.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-example"))

    def test_exercise_yaml_and_tests(self):
        ex_dir = os.path.join(self.base_dir, "exercises", "calcular-media")
        yaml_path = os.path.join(ex_dir, "exercise.yaml")
        statement_path = os.path.join(ex_dir, "statement.md")

        self.assertTrue(os.path.exists(yaml_path), "exercise.yaml debe existir")
        self.assertTrue(os.path.exists(statement_path), "statement.md debe existir")

        with open(yaml_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn('id: "calcular-media"', content)
        self.assertIn('language: "java"', content)
        self.assertIn("compile:", content)
        self.assertIn("execution:", content)
        self.assertIn("tests:", content)

        # Encontrar todos los inputs y expecteds referenciados
        inputs = re.findall(r'input:\s*"([^"]+)"', content)
        expecteds = re.findall(r'expected:\s*"([^"]+)"', content)

        self.assertTrue(len(inputs) >= 4, "Debe haber al menos 4 tests")
        self.assertEqual(len(inputs), len(expecteds), "Cada test debe tener input y expected")

        for in_rel, out_rel in zip(inputs, expecteds):
            in_file = os.path.join(ex_dir, in_rel)
            out_file = os.path.join(ex_dir, out_rel)
            self.assertTrue(os.path.exists(in_file), f"Fichero input {in_file} debe existir")
            self.assertTrue(os.path.exists(out_file), f"Fichero output {out_file} debe existir")

        # Sumar pesos
        weights = [float(w) for w in re.findall(r'weight:\s*([0-9.]+)', content)]
        total_weight = sum(weights)
        self.assertAlmostEqual(total_weight, 100.0, places=1, msg="El sumatorio de pesos de tests debe ser 100")

    def test_collection_yaml(self):
        col_dir = os.path.join(self.base_dir, "collections", "java-basics")
        yaml_path = os.path.join(col_dir, "collection.yaml")
        self.assertTrue(os.path.exists(yaml_path), "collection.yaml debe existir")

        with open(yaml_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn('id: "java-basics"', content)
        self.assertIn('calcular-media', content)

if __name__ == "__main__":
    unittest.main()

