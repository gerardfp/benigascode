-- V15: Seed 5 test students for development and testing

INSERT INTO users (id, username, password_hash, full_name, role, enabled) VALUES
('33333333-3333-3333-3333-333333333337', 'alumno1@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$59kc7y5wo61upE/WPccMTg$YojdUDWjFQetqu44HlcktBimdKWyqAdSbRW5qu58Vj4', 'Alumno 1', 'STUDENT', true),
('33333333-3333-3333-3333-333333333338', 'alumno2@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$59kc7y5wo61upE/WPccMTg$YojdUDWjFQetqu44HlcktBimdKWyqAdSbRW5qu58Vj4', 'Alumno 2', 'STUDENT', true),
('33333333-3333-3333-3333-333333333339', 'alumno3@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$59kc7y5wo61upE/WPccMTg$YojdUDWjFQetqu44HlcktBimdKWyqAdSbRW5qu58Vj4', 'Alumno 3', 'STUDENT', true),
('33333333-3333-3333-3333-33333333333a', 'alumno4@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$59kc7y5wo61upE/WPccMTg$YojdUDWjFQetqu44HlcktBimdKWyqAdSbRW5qu58Vj4', 'Alumno 4', 'STUDENT', true),
('33333333-3333-3333-3333-33333333333b', 'alumno5@benigascode.local', '{argon2}$argon2id$v=19$m=16384,t=2,p=1$59kc7y5wo61upE/WPccMTg$YojdUDWjFQetqu44HlcktBimdKWyqAdSbRW5qu58Vj4', 'Alumno 5', 'STUDENT', true)
ON CONFLICT (username) DO NOTHING;

-- Matricular en curso inicial si existe (Alumnos 1, 2, 3 en Grupo A; 4 y 5 en Grupo B)
INSERT INTO course_memberships (user_id, course_id, group_id, role)
SELECT u.id, '44444444-4444-4444-4444-444444444444', 
       CASE 
         WHEN u.username IN ('alumno1@benigascode.local', 'alumno2@benigascode.local', 'alumno3@benigascode.local') 
           THEN '55555555-5555-5555-5555-555555555555'::uuid 
         ELSE '55555555-5555-5555-5555-555555555556'::uuid 
       END, 
       'STUDENT'
FROM users u
WHERE u.username IN (
    'alumno1@benigascode.local',
    'alumno2@benigascode.local',
    'alumno3@benigascode.local',
    'alumno4@benigascode.local',
    'alumno5@benigascode.local'
)
ON CONFLICT DO NOTHING;

-- Dar acceso a colecciones públicas
INSERT INTO access_grants (user_id, collection_id, mechanism)
SELECT u.id, c.id, 'PUBLIC'
FROM users u
CROSS JOIN collections c
WHERE u.username IN (
    'alumno1@benigascode.local',
    'alumno2@benigascode.local',
    'alumno3@benigascode.local',
    'alumno4@benigascode.local',
    'alumno5@benigascode.local'
)
ON CONFLICT DO NOTHING;

