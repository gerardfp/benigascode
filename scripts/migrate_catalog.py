#!/usr/bin/env python3
import os
import re
import yaml
import shutil

EXERCISES_DIR = "/home/gerard/benigascode/catalog/exercises"

def format_weight(w):
    try:
        wf = float(w)
        if wf.is_integer():
            return str(int(wf))
        else:
            return str(wf)
    except Exception:
        return str(w)

def migrate_exercise(ex_dir):
    ex_name = os.path.basename(ex_dir)
    yaml_path = os.path.join(ex_dir, "exercise.yaml")
    if not os.path.exists(yaml_path):
        print(f"Skipping {ex_name}: no exercise.yaml found")
        return

    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    tests_data = data.get("tests", {})
    public_tests = tests_data.get("public") or []
    private_tests = tests_data.get("private") or []
    templates = data.get("templates") or []

    # 1. Process Public Tests
    pub_dir = os.path.join(ex_dir, "public-tests")
    old_pub_files = set()
    for t in public_tests:
        inp_rel = t.get("input", "")
        exp_rel = t.get("expected", "")
        weight = t.get("weight", 10.0)

        # Identifier from input filename, e.g. "public-tests/input00.txt" -> "00"
        m = re.search(r'input(\d+)\.txt$', inp_rel)
        if not m:
            m = re.search(r'(\d+)', os.path.basename(inp_rel))
        test_id = m.group(1) if m else "00"

        test_folder = os.path.join(pub_dir, test_id)
        os.makedirs(test_folder, exist_ok=True)

        inp_src = os.path.join(ex_dir, inp_rel)
        exp_src = os.path.join(ex_dir, exp_rel)
        old_pub_files.add(os.path.basename(inp_src))
        old_pub_files.add(os.path.basename(exp_src))

        # Copy input.txt & output.txt
        shutil.copy2(inp_src, os.path.join(test_folder, "input.txt"))
        shutil.copy2(exp_src, os.path.join(test_folder, "output.txt"))

        # Create weight-{val} empty file
        w_file = os.path.join(test_folder, f"weight-{format_weight(weight)}")
        with open(w_file, "w") as wf:
            pass

    # 2. Process Private Tests
    priv_dir = os.path.join(ex_dir, "private-tests")
    old_priv_files = set()
    for t in private_tests:
        inp_rel = t.get("input", "")
        exp_rel = t.get("expected", "")
        weight = t.get("weight", 10.0)

        m = re.search(r'input(\d+)\.txt$', inp_rel)
        if not m:
            m = re.search(r'(\d+)', os.path.basename(inp_rel))
        test_id = m.group(1) if m else "00"

        test_folder = os.path.join(priv_dir, test_id)
        os.makedirs(test_folder, exist_ok=True)

        inp_src = os.path.join(ex_dir, inp_rel)
        exp_src = os.path.join(ex_dir, exp_rel)
        old_priv_files.add(os.path.basename(inp_src))
        old_priv_files.add(os.path.basename(exp_src))

        # Copy input.txt & output.txt
        shutil.copy2(inp_src, os.path.join(test_folder, "input.txt"))
        shutil.copy2(exp_src, os.path.join(test_folder, "output.txt"))

        # Create weight-{val} empty file
        w_file = os.path.join(test_folder, f"weight-{format_weight(weight)}")
        with open(w_file, "w") as wf:
            pass

    # Clean old flat test files
    for fname in old_pub_files:
        p = os.path.join(pub_dir, fname)
        if os.path.isfile(p):
            os.remove(p)

    for fname in old_priv_files:
        p = os.path.join(priv_dir, fname)
        if os.path.isfile(p):
            os.remove(p)

    # 3. Process Templates
    if templates and isinstance(templates, list):
        templates_dir = os.path.join(ex_dir, "templates")
        os.makedirs(templates_dir, exist_ok=True)
        for tpl in templates:
            code = tpl.get("code", "")
            runtimes = tpl.get("runtimes") or []
            if not runtimes and "runtime" in tpl:
                runtimes = [tpl["runtime"]]
            for rt in runtimes:
                # Write templates/<runtime>.java
                tpl_file = os.path.join(templates_dir, f"{rt}.java")
                with open(tpl_file, "w", encoding="utf-8") as tf:
                    tf.write(code)

    # 4. Remove exercise.yaml
    os.remove(yaml_path)

def main():
    exercises = sorted([
        os.path.join(EXERCISES_DIR, d)
        for d in os.listdir(EXERCISES_DIR)
        if os.path.isdir(os.path.join(EXERCISES_DIR, d))
    ])
    print(f"Found {len(exercises)} exercises to migrate.")
    migrated = 0
    for ex in exercises:
        migrate_exercise(ex)
        migrated += 1
    print(f"Successfully migrated {migrated} exercises.")

if __name__ == "__main__":
    main()

