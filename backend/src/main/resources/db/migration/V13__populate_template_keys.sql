-- V13: Ensure 'java' and runtime keys are populated in templates_config for exercise_versions
UPDATE exercise_versions
SET templates_config = templates_config || jsonb_build_object('java', templates_config->'java-21')
WHERE templates_config ? 'java-21' AND NOT (templates_config ? 'java');

UPDATE exercise_versions
SET templates_config = templates_config || jsonb_build_object('java-21', templates_config->'java')
WHERE templates_config ? 'java' AND NOT (templates_config ? 'java-21');

