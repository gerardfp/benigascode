import unittest
import os
import re

class TestContentValidation(unittest.TestCase):
    def setUp(self):
        self.base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-example"))

    def test_exercise_yaml_and_tests(self):
        exercises_dir = os.path.join(self.base_dir, "exercises")
        if not os.path.exists(exercises_dir):
            self.skipTest("Directorio exercises no existe en content-example")
        self.assertTrue(os.path.exists(exercises_dir), "Directorio exercises debe existir")
        ex_names = [d for d in os.listdir(exercises_dir) if os.path.isdir(os.path.join(exercises_dir, d))]
        self.assertGreaterEqual(len(ex_names), 6, "Debe haber al menos 6 ejercicios")

        for ex_name in ex_names:
            ex_dir = os.path.join(exercises_dir, ex_name)
            yaml_path = os.path.join(ex_dir, "exercise.yaml")
            statement_path = os.path.join(ex_dir, "statement.md")

            self.assertTrue(os.path.exists(yaml_path), f"exercise.yaml debe existir en {ex_name}")
            self.assertTrue(os.path.exists(statement_path), f"statement.md debe existir en {ex_name}")

            with open(yaml_path, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertIn(f'id: "{ex_name}"', content)
            self.assertIn('language: "java"', content)
            self.assertIn("compile:", content)
            self.assertIn("execution:", content)
            self.assertIn("tests:", content)

            # Encontrar todos los inputs y expecteds referenciados
            inputs = re.findall(r'input:\s*"([^"]+)"', content)
            expecteds = re.findall(r'expected:\s*"([^"]+)"', content)

            self.assertTrue(len(inputs) >= 4, f"Debe haber al menos 4 tests en {ex_name}")
            self.assertEqual(len(inputs), len(expecteds), f"Cada test debe tener input y expected en {ex_name}")

            for in_rel, out_rel in zip(inputs, expecteds):
                in_file = os.path.join(ex_dir, in_rel)
                out_file = os.path.join(ex_dir, out_rel)
                self.assertTrue(os.path.exists(in_file), f"Fichero input {in_file} debe existir")
                self.assertTrue(os.path.exists(out_file), f"Fichero output {out_file} debe existir")

            # Sumar pesos
            weights = [float(w) for w in re.findall(r'weight:\s*([0-9.]+)', content)]
            total_weight = sum(weights)
            self.assertAlmostEqual(total_weight, 100.0, places=1, msg=f"El sumatorio de pesos de tests debe ser 100 en {ex_name}")

    def test_collection_yaml(self):
        collections_dir = os.path.join(self.base_dir, "collections")
        if not os.path.exists(collections_dir):
            self.skipTest("Directorio collections no existe en content-example")
        self.assertTrue(os.path.exists(collections_dir), "Directorio collections debe existir")
        col_names = [d for d in os.listdir(collections_dir) if os.path.isdir(os.path.join(collections_dir, d))]
        self.assertGreaterEqual(len(col_names), 2, "Debe haber al menos 2 colecciones")

        for col_name in col_names:
            col_dir = os.path.join(collections_dir, col_name)
            yaml_path = os.path.join(col_dir, "collection.yaml")
            self.assertTrue(os.path.exists(yaml_path), f"collection.yaml debe existir en {col_name}")

            with open(yaml_path, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertIn(f'id: "{col_name}"', content)
            self.assertIn('items:', content)

if __name__ == "__main__":
    unittest.main()

