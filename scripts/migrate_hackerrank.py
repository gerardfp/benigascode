#!/usr/bin/env python3
"""
Migración de ejercicios de HackerRank (carpeta chs/) a Benigascode.

Requisitos:
1. Todos los casos de prueba son públicos, excepto el último de cada ejercicio (si N=1, es público).
   Todos los casos de prueba tienen el mismo peso -> no se asigna peso.
2. Únicamente se extrae la plantilla java8, y solo si es diferente a la plantilla por defecto con Scanner.
3. Se gestionan las explicaciones de los casos de prueba (Explanation X) y sus imágenes en exercise_assets.
4. "Input Format" pasa a "Input", "Output Format" a "Output", y se elimina "Constraints".
"""

import os
import sys
import glob
import json
import re
import html
import hashlib
import uuid
import zipfile
import mimetypes
import subprocess
from datetime import datetime, timezone

CHS_DIR = "/home/gerard/benigascode/chs"

DEFAULT_TEMPLATE_TOKENS = "".join('''import java.util.Scanner;

public class Solution {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
      \t
      \t
    }
}'''.split())

def is_default_template(code: str) -> bool:
    if not code or not code.strip():
        return True
    norm = "".join(code.split())
    return norm == DEFAULT_TEMPLATE_TOKENS

def sql_escape(text: str) -> str:
    if text is None:
        return "NULL"
    return "'" + text.replace("'", "''") + "'"

def html_to_markdown(html_content: str) -> str:
    if not html_content:
        return ""

    s = html_content

    # 1. Eliminar estilos de MathJax y SVG defs ocultos
    s = re.sub(r'<style[^>]*>.*?</style>', '', s, flags=re.DOTALL)
    s = re.sub(r'<svg style=[\'"]display:\s*none;?[\'"][^>]*>.*?</svg>', '', s, flags=re.DOTALL)

    # 2. Desempaquetar wrapper hackdown-content
    s = re.sub(r'^\s*<div class=[\'"][^\'"]*hackdown-content[^\'"]*[\'"]>\s*', '', s)
    s = re.sub(r'\s*</div>\s*$', '', s)

    # 3. Bloques de código pre / code
    def repl_pre(m):
        code = m.group(1)
        code = re.sub(r'^<code[^>]*>', '', code)
        code = re.sub(r'</code>$', '', code)
        # Limpiar etiquetas internas de resaltado de sintaxis
        code = re.sub(r'<[^>]+>', '', code)
        code = html.unescape(code)
        return '\n\n```\n' + code.strip() + '\n```\n\n'
    s = re.sub(r'<pre[^>]*>(.*?)</pre>', repl_pre, s, flags=re.DOTALL)

    # 4. Código inline
    def repl_inline_code(m):
        code = re.sub(r'<[^>]+>', '', m.group(1))
        return '`' + html.unescape(code) + '`'
    s = re.sub(r'<code[^>]*>(.*?)</code>', repl_inline_code, s, flags=re.DOTALL)

    # 5. Imágenes HTML a sintaxis Markdown: <img src="foo.png" ...> -> ![image](foo.png)
    s = re.sub(r'<img[^>]+src=[\'"]([^\'"]+)[\'"][^>]*>', r'![image](\1)', s)

    # 6. Negrita y Cursiva
    s = re.sub(r'<(strong|b)[^>]*>(.*?)</\1>', r'**\2**', s, flags=re.DOTALL)
    s = re.sub(r'<(em|i)[^>]*>(.*?)</\1>', r'*\2*', s, flags=re.DOTALL)

    # 7. Listas no ordenadas
    def repl_ul(m):
        items = re.findall(r'<li[^>]*>(.*?)</li>', m.group(1), flags=re.DOTALL)
        res = []
        for it in items:
            it_text = re.sub(r'<p[^>]*>(.*?)</p>', r'\1', it, flags=re.DOTALL).strip()
            res.append(f'- {it_text}')
        return '\n\n' + '\n'.join(res) + '\n\n'
    s = re.sub(r'<ul[^>]*>(.*?)</ul>', repl_ul, s, flags=re.DOTALL)

    # 8. Listas ordenadas
    def repl_ol(m):
        items = re.findall(r'<li[^>]*>(.*?)</li>', m.group(1), flags=re.DOTALL)
        res = []
        for i, it in enumerate(items, 1):
            it_text = re.sub(r'<p[^>]*>(.*?)</p>', r'\1', it, flags=re.DOTALL).strip()
            res.append(f'{i}. {it_text}')
        return '\n\n' + '\n'.join(res) + '\n\n'
    s = re.sub(r'<ol[^>]*>(.*?)</ol>', repl_ol, s, flags=re.DOTALL)

    # 9. Párrafos
    s = re.sub(r'<p[^>]*>(.*?)</p>', r'\1\n\n', s, flags=re.DOTALL)

    # 10. Enlaces
    s = re.sub(r'<a\s+[^>]*href=[\'"]([^\'"]+)[\'"][^>]*>(.*?)</a>', r'[\2](\1)', s, flags=re.DOTALL)

    # 11. Eliminar divs contenedores restantes
    s = re.sub(r'</?div[^>]*>', '\n', s)

    # 12. Decodificar entidades HTML pero preservando etiquetas permitidas
    s = html.unescape(s)

    # Normalizar saltos de línea consecutivos
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()

def extract_section_html(body: str, section_class: str) -> str:
    m = re.search(r'<div class=[\'"][^\'"]*' + section_class + r'[^\'"]*[\'"]>(.*?)</div>\s*</div>', body, re.DOTALL)
    if m:
        return m.group(1)
    return ""

def parse_explanations(body: str) -> dict:
    explanations = {}
    exp_matches = re.finditer(
        r'<div class=[\'"][^\'"]*challenge_explanation_title[^\'"]*[\'"]>(.*?)</div>\s*'
        r'<div class=[\'"][^\'"]*challenge_explanation_body[^\'"]*[\'"]>(.*?)</div>\s*</div>',
        body,
        re.DOTALL
    )
    for m in exp_matches:
        title_raw = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        num_m = re.search(r'Explanation\s+(\d+)', title_raw, re.IGNORECASE)
        if num_m:
            idx = int(num_m.group(1))
            body_md = html_to_markdown(m.group(2))
            explanations[idx] = body_md
    return explanations

def parse_exercise(slug_dir: str):
    slug = os.path.basename(slug_dir)
    json_path = os.path.join(slug_dir, f"{slug}.json")
    if not os.path.exists(json_path):
        return None

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    m = data["model"]

    raw_name = m.get("name") or slug
    tags = re.findall(r'#([a-zA-Z0-9_\-]+)', raw_name)
    clean_title = re.sub(r'\[[a-zA-Z0-9_\-]+\]', '', raw_name)
    clean_title = re.sub(r'#([a-zA-Z0-9_\-]+)', '', clean_title).strip()
    if not clean_title:
        clean_title = slug

    body_html = m.get("body_html") or ""
    fields = m.get("problem_statement_fields") or {}

    explanations = {}
    if body_html:
        explanations = parse_explanations(body_html)
        ps_html = extract_section_html(body_html, "challenge_problem_statement_body")
        in_html = extract_section_html(body_html, "challenge_input_format_body")
        out_html = extract_section_html(body_html, "challenge_output_format_body")

        ps_md = html_to_markdown(ps_html)
        in_md = html_to_markdown(in_html)
        out_md = html_to_markdown(out_html)
    else:
        ps_md = (fields.get("problem_statement") or "").strip()
        in_md = (fields.get("input_format") or "").strip()
        out_md = (fields.get("output_format") or "").strip()

    # Formar statement final sin Constraints y sin duplicar el título
    if ps_md.startswith("# "):
        lines = ps_md.split("\n", 1)
        first_h1 = lines[0][2:].strip()
        if first_h1.lower() == clean_title.lower():
            ps_md = lines[1].strip() if len(lines) > 1 else ""

    statement_parts = []
    if ps_md:
        statement_parts.append(ps_md)
    if in_md:
        statement_parts.append(f"## Input\n\n{in_md}")
    if out_md:
        statement_parts.append(f"## Output\n\n{out_md}")
    statement = "\n\n".join(statement_parts).strip()

    # Plantilla Java 8
    java8_tpl = m.get("java8_template")
    templates = {}
    if java8_tpl and not is_default_template(java8_tpl):
        clean_tpl = re.sub(r'\bpublic\s+class\s+Solution\b', 'public class Main', java8_tpl)
        templates["java"] = clean_tpl
        templates["java-26"] = clean_tpl

    # Casos de prueba
    zip_path = os.path.join(slug_dir, f"{slug}-testcases.zip")
    raw_tests = []
    if os.path.exists(zip_path):
        with zipfile.ZipFile(zip_path, "r") as z:
            namelist = z.namelist()
            inputs = sorted([n for n in namelist if "input/" in n and n.endswith(".txt")])
            for inp_file in inputs:
                m_idx = re.search(r'input(\d+)\.txt', inp_file)
                if not m_idx:
                    continue
                num_str = m_idx.group(1)
                idx = int(num_str)
                out_file = f"output/output{num_str}.txt"
                if out_file not in namelist:
                    # Intento alternativo
                    out_candidates = [n for n in namelist if f"output{num_str}.txt" in n]
                    out_file = out_candidates[0] if out_candidates else None

                inp_content = z.read(inp_file).decode("utf-8", errors="replace")
                out_content = z.read(out_file).decode("utf-8", errors="replace") if out_file else ""
                raw_tests.append((idx, inp_content, out_content))
        raw_tests.sort(key=lambda x: x[0])
    elif slug == "rota-el-vector-en-el-elemento-k":
        sample_in = "10\n1 2 3 4 5 6 7 8 9 10\n1"
        sample_out = "2 3 4 5 6 7 8 9 10 1"
        raw_tests.append((0, sample_in, sample_out))

    public_tests = []
    private_tests = []
    total_tests = len(raw_tests)

    for i, (orig_idx, test_input, test_output) in enumerate(raw_tests):
        exp_text = explanations.get(i) or explanations.get(orig_idx)
        test_obj = {
            "name": f"Test {i + 1}",
            "input": test_input,
            "expected": test_output
        }
        if exp_text:
            test_obj["explanation"] = exp_text

        if total_tests == 1:
            # Según confirmación del usuario, si hay 1 solo test, es público
            test_obj["id"] = f"pub-{i:02d}"
            test_obj["is_public"] = True
            public_tests.append(test_obj)
        elif i < total_tests - 1:
            # Todos excepto el último son públicos
            test_obj["id"] = f"pub-{i:02d}"
            test_obj["is_public"] = True
            public_tests.append(test_obj)
        else:
            # El último es privado
            test_obj["id"] = f"priv-{i:02d}"
            test_obj["is_public"] = False
            private_tests.append(test_obj)

    tests_config = {
        "public": public_tests,
        "private": private_tests
    }

    # Assets (imágenes en la carpeta del ejercicio)
    assets = []
    for ext in ("*.png", "*.jpg", "*.jpeg", "*.gif", "*.svg"):
        for img_path in glob.glob(os.path.join(slug_dir, ext)):
            fname = os.path.basename(img_path)
            mime, _ = mimetypes.guess_type(img_path)
            if not mime:
                mime = "image/svg+xml" if fname.endswith(".svg") else "image/png"
            with open(img_path, "rb") as imf:
                bdata = imf.read()
            assets.append({
                "filename": fname,
                "content_type": mime,
                "data": bdata,
                "size_bytes": len(bdata)
            })

    return {
        "slug": slug,
        "title": clean_title,
        "statement": statement,
        "tags": tags,
        "templates": templates,
        "tests_config": tests_config,
        "assets": assets
    }

def main():
    print("=== Iniciando migración de ejercicios HackerRank (chs) ===")
    ex_folders = sorted([
        os.path.join(CHS_DIR, d)
        for d in os.listdir(CHS_DIR)
        if os.path.isdir(os.path.join(CHS_DIR, d))
    ])
    print(f"Total carpetas encontradas: {len(ex_folders)}")

    sql_statements = []
    # 1. Limpieza de base de datos
    sql_statements.append("BEGIN;")
    sql_statements.append("DELETE FROM test_results;")
    sql_statements.append("DELETE FROM evaluations;")
    sql_statements.append("DELETE FROM evaluation_jobs;")
    sql_statements.append("DELETE FROM attempt_ledger;")
    sql_statements.append("DELETE FROM submissions;")
    sql_statements.append("DELETE FROM student_progress;")
    sql_statements.append("DELETE FROM student_workspaces;")
    sql_statements.append("DELETE FROM exercise_drafts;")
    sql_statements.append("DELETE FROM exercise_assets;")
    sql_statements.append("DELETE FROM exercise_versions;")
    sql_statements.append("DELETE FROM exercises;")

    parsed_count = 0
    total_assets_count = 0
    templates_count = 0

    compile_config_str = '{"command": "javac Main.java"}'
    run_config_str = '{"command": "java Main", "memory_limit": "256m", "timeout_seconds": 3}'
    scoring_config_str = '{"mode": "weighted", "total_score": 100}'
    comparator_config_str = '{"type": "TRIM"}'

    for folder in ex_folders:
        parsed = parse_exercise(folder)
        if not parsed:
            continue

        ex_id = str(uuid.uuid4())
        ver_id = str(uuid.uuid4())
        slug = parsed["slug"]
        title = parsed["title"]
        stmt = parsed["statement"]
        tags_json = json.dumps(parsed["tags"], ensure_ascii=False)
        tests_json = json.dumps(parsed["tests_config"], ensure_ascii=False)
        tpls_json = json.dumps(parsed["templates"], ensure_ascii=False)

        if parsed["templates"]:
            templates_count += 1

        content_hash = hashlib.sha256(
            (stmt + tests_json + compile_config_str + run_config_str + tpls_json).encode("utf-8")
        ).hexdigest()

        # Insert exercise
        sql_statements.append(
            f"INSERT INTO exercises (id, slug, created_at) "
            f"VALUES ('{ex_id}', {sql_escape(slug)}, NOW());"
        )

        # Insert exercise_version
        sql_statements.append(
            f"INSERT INTO exercise_versions ("
            f"id, exercise_id, version_number, title, statement, language, runtime_id, "
            f"compile_config, run_config, scoring_config, comparator_config, "
            f"tests_config, templates_config, tags, content_hash, status, created_at"
            f") VALUES ("
            f"'{ver_id}', '{ex_id}', 1, {sql_escape(title)}, {sql_escape(stmt)}, 'java', 'java-26', "
            f"{sql_escape(compile_config_str)}::jsonb, {sql_escape(run_config_str)}::jsonb, "
            f"{sql_escape(scoring_config_str)}::jsonb, {sql_escape(comparator_config_str)}::jsonb, "
            f"{sql_escape(tests_json)}::jsonb, {sql_escape(tpls_json)}::jsonb, "
            f"{sql_escape(tags_json)}::jsonb, '{content_hash}', 'PUBLISHED', NOW()"
            f");"
        )

        # Insert assets
        for ast in parsed["assets"]:
            asset_id = str(uuid.uuid4())
            hex_data = ast["data"].hex()
            sql_statements.append(
                f"INSERT INTO exercise_assets ("
                f"id, exercise_id, filename, content_type, data, size_bytes, created_at"
                f") VALUES ("
                f"'{asset_id}', '{ex_id}', {sql_escape(ast['filename'])}, {sql_escape(ast['content_type'])}, "
                f"decode('{hex_data}', 'hex'), {ast['size_bytes']}, NOW()"
                f");"
            )
            total_assets_count += 1

        parsed_count += 1

    sql_statements.append("COMMIT;")

    print(f"Ejercicios procesados: {parsed_count}")
    print(f"Ejercicios con plantilla java8 conservada: {templates_count}")
    print(f"Total assets (imágenes) insertados: {total_assets_count}")
    print(f"Total sentencias SQL generadas: {len(sql_statements)}")

    # Ejecutar en Postgres vía docker exec
    print("Ejecutando sentencias SQL en base de datos PostgreSQL...")
    sql_script = "\n".join(sql_statements)
    proc = subprocess.Popen(
        ["docker", "exec", "-i", "benigascode-postgres-dev", "psql", "-U", "benigascode_user", "-d", "benigascode"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = proc.communicate(input=sql_script.encode("utf-8"))

    if proc.returncode != 0:
        print("ERROR al ejecutar migración en PostgreSQL:")
        print(stderr.decode("utf-8", errors="replace"))
        sys.exit(1)

    print("Migración completada con éxito.")

if __name__ == "__main__":
    main()
