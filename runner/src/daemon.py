import os
import sys
import time
import json
import signal
import logging
import threading
from typing import Optional, Dict, Any
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

from sandbox import Sandbox
from evaluators.java_evaluator import JavaEvaluator

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [RunnerDaemon] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("BenigascodeRunner")

class RunnerHTTPHandler(BaseHTTPRequestHandler):
    daemon_instance = None

    def log_message(self, format, *args):
        logger.debug("%s - - [%s] %s" % (self.client_address[0], self.log_date_time_string(), format % args))

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "UP",
                "runtime": "java-26",
                "worker_id": self.daemon_instance.worker_id,
            }).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/evaluate":
            token = self.headers.get("X-Runner-Token")
            if token != self.daemon_instance.token:
                self.send_response(403)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Forbidden"}).encode("utf-8"))
                return

            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                job_package = json.loads(body)
                result = self.daemon_instance.evaluator.evaluate(job_package)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except Exception as e:
                logger.exception(f"Error procesando petición /evaluate HTTP: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "SYSTEM_ERROR",
                    "score": 0.0,
                    "compile": {"success": False, "stdout": "", "stderr": str(e)},
                    "testResults": [],
                }).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

class RunnerDaemon:
    def __init__(self):
        self.api_url = os.environ.get("BENIGASCODE_API_URL", "http://localhost:8080/api/v1/runner").rstrip("/")
        self.token = os.environ.get("RUNNER_TOKEN", "dev_runner_token_secure_12345")
        self.worker_id = os.environ.get("WORKER_ID", "runner-local-01")
        self.poll_interval = float(os.environ.get("POLL_INTERVAL_SECONDS", "2.0"))
        self.http_port = int(os.environ.get("RUNNER_HTTP_PORT", "5000"))

        self.running = True
        self.sandbox = Sandbox()
        self.evaluator = JavaEvaluator(self.sandbox)
        self.http_server = None

        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)

    def _handle_shutdown(self, signum, frame):
        logger.info("Señal de parada recibida. Finalizando RunnerDaemon de forma ordenada...")
        self.running = False
        if self.http_server:
            self.http_server.shutdown()

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

    def _start_http_server(self):
        RunnerHTTPHandler.daemon_instance = self
        try:
            self.http_server = HTTPServer(("0.0.0.0", self.http_port), RunnerHTTPHandler)
            logger.info(f"Servidor HTTP interno de Runner escuchando en puerto {self.http_port}")
            self.http_server.serve_forever()
        except Exception as e:
            if self.running:
                logger.error(f"Error en servidor HTTP de Runner: {e}")

    def start(self):
        logger.info(f"RunnerDaemon Java 26 iniciado. WorkerID: {self.worker_id}, API: {self.api_url}")
        logger.info(f"Modo de aislamiento: {'Docker Container Sandbox' if self.sandbox.docker_available else 'Local Fallback'}")

        # Iniciar servidor HTTP en hilo en segundo plano
        http_thread = threading.Thread(target=self._start_http_server, daemon=True)
        http_thread.start()

        while self.running:
            try:
                job = self.claim_job()
                if job:
                    job_id = job.get("job_id") or job.get("jobId")
                    submission_id = job.get("submission_id") or job.get("submissionId")
                    logger.info(f"Trabajo reclamado: JobID={job_id}, SubmissionID={submission_id}")

                    if not job_id:
                        logger.error(f"Estructura de trabajo inválida, falta jobId: {job}")
                        time.sleep(self.poll_interval)
                        continue

                    # Heartbeat en segundo plano
                    stop_heartbeat = threading.Event()
                    heartbeat_thread = threading.Thread(
                        target=self.send_heartbeat, args=(job_id, stop_heartbeat), daemon=True
                    )
                    heartbeat_thread.start()

                    try:
                        eval_result = self.evaluator.evaluate(job)
                        logger.info(f"Evaluación Java 26 finalizada para Job {job_id}: Estado={eval_result.get('status')}, Puntuación={eval_result.get('score')}")
                    except Exception as ex:
                        logger.exception(f"Error interno durante la evaluación del job {job_id}: {ex}")
                        eval_result = {
                            "status": "SYSTEM_ERROR",
                            "score": 0.0,
                            "compile": {"success": False, "stdout": "", "stderr": str(ex)},
                            "testResults": [],
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
