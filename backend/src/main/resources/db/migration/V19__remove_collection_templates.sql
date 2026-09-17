-- V19: Eliminar plantillas de las colecciones (las plantillas pertenecen exclusivamente a cada ejercicio)
UPDATE collection_versions
SET templates_config = '{}'::jsonb;

