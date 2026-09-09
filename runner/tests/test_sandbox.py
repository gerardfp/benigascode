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

if __name__ == "__main__":
    unittest.main()

