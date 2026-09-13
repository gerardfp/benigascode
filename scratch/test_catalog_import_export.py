#!/usr/bin/env python3
import os
import shutil
import subprocess
import requests
import json
import sys

BASE_URL = "http://localhost:8080/api/v1"
HOST_DIR = "/home/gerard/benigascode"
TEST_REPO_HOST = os.path.join(HOST_DIR, "catalog", "test-catalog-repo")
TEST_REPO_CONTAINER = "/var/lib/benigascode/catalog/test-catalog-repo"
EXPORT_TARGET_HOST = os.path.join(HOST_DIR, "catalog", "export-target.git")
EXPORT_TARGET_CONTAINER = "/var/lib/benigascode/catalog/export-target.git"


def log(msg):
    print(f"[TEST] {msg}", flush=True)

def setup_test_repo():
    log("Preparando repositorio git de prueba...")
    if os.path.exists(TEST_REPO_HOST):
        shutil.rmtree(TEST_REPO_HOST)
    os.makedirs(TEST_REPO_HOST, exist_ok=True)

    # 1. Ejercicio 1: suma-dos-numeros
    ex1_dir = os.path.join(TEST_REPO_HOST, "exercises", "suma-dos-numeros")
    os.makedirs(ex1_dir, exist_ok=True)
    with open(os.path.join(ex1_dir, "statement.md"), "w") as f:
        f.write("# Suma de Dos Números\nCalcula la suma de a y b.")
    with open(os.path.join(ex1_dir, "exercise.yaml"), "w") as f:
        f.write("id: suma-dos-numeros\ntitle: Suma de Dos Números\nlanguage: java\nruntime: java-21\n")
    os.makedirs(os.path.join(ex1_dir, "public-tests", "00"), exist_ok=True)
    with open(os.path.join(ex1_dir, "public-tests", "00", "input.txt"), "w") as f:
        f.write("2 3\n")
    with open(os.path.join(ex1_dir, "public-tests", "00", "output.txt"), "w") as f:
        f.write("5\n")
    with open(os.path.join(ex1_dir, "public-tests", "00", "weight-10"), "w") as f:
        pass

    # 2. Ejercicio 2: nuevo-ejercicio-catalogo
    ex2_dir = os.path.join(TEST_REPO_HOST, "exercises", "nuevo-ejercicio-catalogo")
    os.makedirs(ex2_dir, exist_ok=True)
    with open(os.path.join(ex2_dir, "statement.md"), "w") as f:
        f.write("# Nuevo Ejercicio de Catálogo\nEste es un ejercicio de prueba nuevo.")
    with open(os.path.join(ex2_dir, "exercise.yaml"), "w") as f:
        f.write("id: nuevo-ejercicio-catalogo\ntitle: Nuevo Ejercicio\nlanguage: java\nruntime: java-21\n")

    # 3. Colección: coleccion-demo
    col_dir = os.path.join(TEST_REPO_HOST, "collections", "coleccion-demo")
    os.makedirs(col_dir, exist_ok=True)
    with open(os.path.join(col_dir, "collection.yaml"), "w") as f:
        f.write("""id: coleccion-demo
title: Colección Demo
slug: coleccion-demo
description: Colección para probar importación y exportación
visibility: PUBLIC
items:
  - type: EXERCISE
    id: suma-dos-numeros
    position: 1
    required: true
    weight: 1.0
  - type: EXERCISE
    id: nuevo-ejercicio-catalogo
    position: 2
    required: false
    weight: 2.0
""")

    # Inicializar git
    subprocess.run(["git", "init"], cwd=TEST_REPO_HOST, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["git", "config", "user.name", "Test Teacher"], cwd=TEST_REPO_HOST, check=True)
    subprocess.run(["git", "config", "user.email", "teacher@test.local"], cwd=TEST_REPO_HOST, check=True)
    subprocess.run(["git", "checkout", "-b", "main"], cwd=TEST_REPO_HOST, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["git", "add", "-A"], cwd=TEST_REPO_HOST, check=True)
    subprocess.run(["git", "commit", "-m", "Initial test catalog commit"], cwd=TEST_REPO_HOST, check=True, stdout=subprocess.DEVNULL)
    log(f"Repositorio de prueba creado con éxito en {TEST_REPO_HOST}")

def setup_export_bare_repo():
    log("Preparando repositorio bare destino para prueba de push...")
    if os.path.exists(EXPORT_TARGET_HOST):
        shutil.rmtree(EXPORT_TARGET_HOST)
    os.makedirs(EXPORT_TARGET_HOST, exist_ok=True)
    subprocess.run(["git", "init", "--bare"], cwd=EXPORT_TARGET_HOST, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["chmod", "-R", "777", EXPORT_TARGET_HOST], check=True)
    log(f"Repositorio bare creado en {EXPORT_TARGET_HOST}")


def main():
    setup_test_repo()
    setup_export_bare_repo()

    session = requests.Session()

    # 1. Login Docente
    log("Iniciando sesión como profesor...")
    login_resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": "teacher@benigascode.local",
        "password": "TeacherPass123!"
    })
    if login_resp.status_code != 200:
        log(f"FALLO en login: {login_resp.status_code} - {login_resp.text}")
        sys.exit(1)
    
    csrf_token = session.cookies.get("XSRF-TOKEN")
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    if csrf_token:
        headers["X-XSRF-TOKEN"] = csrf_token
    log("Login correcto. Sesión obtenida.")

    # 2. Test Preview Importación con OVERWRITE
    log("Paso 1: Probando PREVIEW con estrategia OVERWRITE...")
    preview_req = {
        "repositoryUrl": f"file://{TEST_REPO_CONTAINER}",
        "branch": "main",
        "conflictStrategy": "OVERWRITE"
    }
    prev_resp = session.post(f"{BASE_URL}/teacher/catalog/import/preview", json=preview_req, headers=headers)
    if prev_resp.status_code != 200:
        log(f"FALLO en preview OVERWRITE: {prev_resp.status_code} - {prev_resp.text}")
        sys.exit(1)
    
    prev_data = prev_resp.json()
    log(f"Preview OK: Total ejercicios: {prev_data['totalExercises']}, Colecciones: {prev_data['totalCollections']}")
    assert prev_data['totalExercises'] == 2, f"Esperados 2 ejercicios, obtenidos {prev_data['totalExercises']}"
    assert prev_data['totalCollections'] == 1, f"Esperada 1 colección, obtenida {prev_data['totalCollections']}"

    # 3. Test Preview Importación con NEW_SLUG
    log("Paso 2: Probando PREVIEW con estrategia NEW_SLUG...")
    preview_req["conflictStrategy"] = "NEW_SLUG"
    prev_resp2 = session.post(f"{BASE_URL}/teacher/catalog/import/preview", json=preview_req, headers=headers)
    assert prev_resp2.status_code == 200, f"Error en preview NEW_SLUG: {prev_resp2.text}"
    prev_data2 = prev_resp2.json()
    log(f"Preview NEW_SLUG OK: Items: {len(prev_data2['items'])}")
    for item in prev_data2['items']:
        log(f"  - [{item['type']}] {item['slug']} -> Acción: {item['action']}, Target: {item['targetSlug']}")

    # 4. Test Preview Importación con SKIP
    log("Paso 3: Probando PREVIEW con estrategia SKIP...")
    preview_req["conflictStrategy"] = "SKIP"
    prev_resp3 = session.post(f"{BASE_URL}/teacher/catalog/import/preview", json=preview_req, headers=headers)
    assert prev_resp3.status_code == 200, f"Error en preview SKIP: {prev_resp3.text}"
    log("Preview SKIP OK.")

    # 5. Ejecutar Importación con NEW_SLUG
    log("Paso 4: Ejecutando importación real con NEW_SLUG...")
    exec_req = {
        "repositoryUrl": f"file://{TEST_REPO_CONTAINER}",
        "branch": "main",
        "conflictStrategy": "NEW_SLUG"
    }
    exec_resp = session.post(f"{BASE_URL}/teacher/catalog/import/execute", json=exec_req, headers=headers)
    if exec_resp.status_code != 200:
        log(f"FALLO en ejecución de importación: {exec_resp.status_code} - {exec_resp.text}")
        sys.exit(1)
    
    res_data = exec_resp.json()
    log(f"Resultado Importación: Estado: {res_data['status']}, Procesados: {res_data['totalProcessed']}, Nuevos: {res_data['importedNew']}, Renombrados: {res_data['renamed']}, Colecciones: {res_data['collectionsProcessed']}")
    assert res_data['status'] in ("SUCCESS", "WARNING"), f"Estado no exitoso: {res_data}"
    assert res_data['totalProcessed'] >= 2, f"Total procesados insuficiente: {res_data}"

    # 6. Re-ejecutar Importación con NEW_SLUG para verificar que genera slug sucesivo (ej. slug-2, slug-3)
    log("Paso 5: Re-ejecutando importación con NEW_SLUG para comprobar asignación de número sucesivo...")
    exec_resp2 = session.post(f"{BASE_URL}/teacher/catalog/import/execute", json=exec_req, headers=headers)
    assert exec_resp2.status_code == 200, f"Fallo al re-importar con NEW_SLUG: {exec_resp2.text}"
    res_data2 = exec_resp2.json()
    log(f"Segunda importación con NEW_SLUG: Renombrados: {res_data2['renamed']}, Nuevos: {res_data2['importedNew']}")
    assert res_data2['renamed'] >= 1, "Debería haber renombrado elementos que ya existían"

    # 7. Test Exportación a Repositorio Git (Push)
    log("Paso 6: Probando exportación y push de catálogo...")
    export_req = {
        "repositoryUrl": f"file://{EXPORT_TARGET_CONTAINER}",
        "branch": "main",
        "commitMessage": "Test export push from automated test"
    }
    exp_resp = session.post(f"{BASE_URL}/teacher/catalog/export/push", json=export_req, headers=headers)
    if exp_resp.status_code != 200:
        log(f"FALLO en exportación push: {exp_resp.status_code} - {exp_resp.text}")
        sys.exit(1)
    
    exp_data = exp_resp.json()
    log(f"Exportación OK: Éxito={exp_data['success']}, Commit SHA={exp_data['commitSha']}, Ejercicios={exp_data['exercisesCount']}, Colecciones={exp_data['collectionsCount']}")
    assert exp_data['success'] is True
    assert exp_data['commitSha'] is not None and len(exp_data['commitSha']) > 5
    assert exp_data['exercisesCount'] > 0

    # 8. Verificar contenido en el repositorio Git exportado
    log("Paso 7: Verificando contenido del commit en el repositorio destino...")
    inspect_output = subprocess.check_output(
        ["git", "ls-tree", "-r", "--name-only", "main"],
        cwd=EXPORT_TARGET_HOST,
        text=True
    )
    log(f"Archivos exportados en el repo Git (muestra):\n" + "\n".join(inspect_output.strip().splitlines()[:15]))
    assert "exercises/" in inspect_output, "No se encontraron carpetas exercises/ en el repositorio exportado"
    assert "statement.md" in inspect_output, "No se encontró statement.md en el repositorio exportado"
    assert "exercise.yaml" in inspect_output, "No se encontró exercise.yaml en el repositorio exportado"

    log("==================================================")
    log("🎉 ¡TODAS LAS PRUEBAS DE IMPORTACIÓN Y EXPORTACIÓN PASARON CON ÉXITO!")
    log("==================================================")

if __name__ == "__main__":
    main()
