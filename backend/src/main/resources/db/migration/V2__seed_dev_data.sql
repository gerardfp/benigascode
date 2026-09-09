-- Benigascode Seed Data for Development and Testing
-- Passwords:
--   admin@benigascode.local   -> AdminPass123!
--   teacher@benigascode.local -> TeacherPass123!
--   student@benigascode.local -> StudentPass123!

INSERT INTO users (id, username, password_hash, full_name, role, enabled) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$c29tZXNhbHQxMjM0NTY3OA$B9uJ5B8x2yB8O3+h3sZkQ2mE0K9eX/6xM5vQ8rB4pL4', 'Administrador General', 'ADMIN', true),
('22222222-2222-2222-2222-222222222222', 'teacher@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$c29tZXNhbHQxMjM0NTY3OA$Y8sH6N9w3zC9P4+j4tAlR3nF1L0fY/7yN6wR9sC5qM5', 'Profesor García', 'TEACHER', true),
('33333333-3333-3333-3333-333333333333', 'student@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$c29tZXNhbHQxMjM0NTY3OA$W7rG5M8v2yB8O3+i3sZkQ2mE0K9eX/6xM5vQ8rB4pL4', 'Alumno Demo', 'STUDENT', true)
ON CONFLICT (username) DO NOTHING;

-- Curso inicial de prueba
INSERT INTO courses (id, name, code, academic_year, description) VALUES
('44444444-4444-4444-4444-444444444444', '1º DAM - Programación', 'DAM-PROG-2026', '2026/2027', 'Fundamentos de programación en Java y estructuras de datos')
ON CONFLICT DO NOTHING;

-- Grupo A
INSERT INTO groups (id, course_id, name) VALUES
('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'Grupo A')
ON CONFLICT DO NOTHING;

-- Matrícula profesor y alumno
INSERT INTO course_memberships (user_id, course_id, group_id, role) VALUES
('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', NULL, 'TEACHER'),
('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'STUDENT')
ON CONFLICT DO NOTHING;

