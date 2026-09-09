import os
import sys
import time
import signal
import logging
import threading
from typing import Optional, Dict, Any
import requests

from sandbox import Sandbox
from evaluators.java_evaluator import JavaEvaluator

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [RunnerDaemon] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("BenigascodeRunner")

class RunnerDaemon:
    def __init__(self):
        self.api_url = os.environ.get("BENIGASCODE_API_URL", "http://localhost:8080/api/v1/runner").rstrip("/")
        self.token = os.environ.get("RUNNER_TOKEN", "dev_runner_token_secure_12345")
        self.worker_id = os.environ.get("WORKER_ID", "runner-local-01")
        self.poll_interval = float(os.environ.get("POLL_INTERVAL_SECONDS", "3.0"))

        self.running = True
        self.sandbox = Sandbox()
        self.evaluator = JavaEvaluator(self.sandbox)

        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)

    def _handle_shutdown(self, signum, frame):
        logger.info("Señal de parada recibida. Finalizando RunnerDaemon de forma ordenada...")
        self.running = False

    def get_headers(self) -> Dict[str, str]:
        return {
            "X-Runner-Token": self.token,
            "X-Worker-Id": self.worker_id,
            "Content-Type": "application/json",
        }

    def claim_job(self) -> Optional[Dict[str, Any]]:
        url = f"{self.api_url}/jobs/claim"
        try:
            res = requests.post(url, headers=self.get_headers(), json={"worker_id": self.worker_id}, timeout=10)
            if res.status_code == 200:
                return res.json()
            elif res.status_code == 204:
                return None
            else:
                logger.warning(f"Respuesta inesperada al reclamar trabajo: HTTP {res.status_code} - {res.text}")
                return None
        except requests.RequestException as e:
            logger.debug(f"No se pudo contactar con backend Benigascode: {e}")
            return None

    def send_heartbeat(self, job_id: str, stop_event: threading.Event):
        url = f"{self.api_url}/jobs/{job_id}/heartbeat"
        while not stop_event.is_set():
            time.sleep(5)
            if stop_event.is_set():
                break
            try:
                requests.post(url, headers=self.get_headers(), timeout=5)
            except Exception as e:
                logger.debug(f"Heartbeat fallido para job {job_id}: {e}")

    def submit_result(self, job_id: str, result: Dict[str, Any]):
        url = f"{self.api_url}/jobs/{job_id}/result"
        for attempt in range(3):
            try:
                res = requests.post(url, headers=self.get_headers(), json=result, timeout=10)
                if res.status_code in (200, 201):
                    logger.info(f"Resultado del job {job_id} enviado exitosamente.")
                    return
                else:
                    logger.error(f"Error al enviar resultado (intento {attempt+1}): HTTP {res.status_code}")
            except Exception as e:
                logger.error(f"Excepción al enviar resultado (intento {attempt+1}): {e}")
            time.sleep(2)

    def start(self):
        logger.info(f"RunnerDaemon iniciado. WorkerID: {self.worker_id}, API: {self.api_url}")
        logger.info(f"Modo de aislamiento: {'Docker Container Sandbox' if self.sandbox.docker_available else 'Local Fallback'}")

        while self.running:
            try:
                job = self.claim_job()
                if job:
                    job_id = job.get("job_id")
                    submission_id = job.get("submission_id")
                    logger.info(f"Trabajo reclamado: JobID={job_id}, SubmissionID={submission_id}")

                    # Heartbeat en segundo plano
                    stop_heartbeat = threading.Event()
                    heartbeat_thread = threading.Thread(
                        target=self.send_heartbeat, args=(job_id, stop_heartbeat), daemon=True
                    )
                    heartbeat_thread.start()

                    try:
                        eval_result = self.evaluator.evaluate(job)
                        logger.info(f"Evaluación finalizada para Job {job_id}: Estado={eval_result.get('status')}, Puntuación={eval_result.get('score')}")
                    except Exception as ex:
                        logger.exception(f"Error interno durante la evaluación del job {job_id}: {ex}")
                        eval_result = {
                            "status": "SYSTEM_ERROR",
                            "score": 0.0,
                            "error": str(ex),
                            "test_results": [],
                        }
                    finally:
                        stop_heartbeat.set()
                        heartbeat_thread.join(timeout=2)

                    self.submit_result(job_id, eval_result)
                else:
                    time.sleep(self.poll_interval)
            except Exception as e:
                logger.error(f"Error no capturado en bucle principal: {e}")
                time.sleep(self.poll_interval)

        logger.info("RunnerDaemon apagado correctamente.")

if __name__ == "__main__":
    daemon = RunnerDaemon()
    daemon.start()

