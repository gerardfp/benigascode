import unittest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

from sandbox import Sandbox

class TestSandbox(unittest.TestCase):
    def setUp(self):
        self.sandbox = Sandbox()

    def test_timeout_handling(self):
        # En fallback local, probar comando que excede timeout
        import tempfile
        tmp = tempfile.mkdtemp()
        try:
            # Ejecuta comando que duerme más tiempo que el timeout
            if os.name == 'nt':
                cmd = ["powershell", "-Command", "Start-Sleep -Seconds 3"]
            else:
                cmd = ["sleep", "3"]
            
            res = self.sandbox.execute_in_sandbox(
                workspace_dir=tmp,
                command=cmd,
                timeout_seconds=1
            )
            self.assertTrue(res.timed_out)
            self.assertEqual(res.exit_code, -1)
        finally:
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)

    def test_normal_execution(self):
        import tempfile
        tmp = tempfile.mkdtemp()
        try:
            if os.name == 'nt':
                cmd = ["powershell", "-Command", "Write-Output 'Benigascode OK'"]
            else:
                cmd = ["echo", "Benigascode OK"]

            res = self.sandbox.execute_in_sandbox(
                workspace_dir=tmp,
                command=cmd,
                timeout_seconds=3
            )
            self.assertFalse(res.timed_out)
            self.assertIn("Benigascode OK", res.stdout)
        finally:
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)

    def test_batch_consecutive_timeout_short_circuit(self):
        import tempfile
        import time
        tmp = tempfile.mkdtemp()
        try:
            start = time.time()
            compile_res, test_results = self.sandbox.execute_batch_in_sandbox(
                workspace_dir=tmp,
                compile_command=["echo", "compile_ok"],
                compile_timeout=5,
                run_command=["sleep", "3"],
                test_inputs=["1", "2", "3", "4", "5"],
                run_timeout=1,
                max_consecutive_timeouts=2,
            )
            elapsed = time.time() - start
            self.assertEqual(compile_res.exit_code, 0)
            self.assertEqual(len(test_results), 5)
            self.assertTrue(all(r.timed_out for r in test_results))
            # Con 5 tests de 1s y cortocircuito tras 2 timeouts, debe tardar ~2s en vez de 5s
            self.assertLess(elapsed, 3.5)
        finally:
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)

if __name__ == "__main__":
    unittest.main()

