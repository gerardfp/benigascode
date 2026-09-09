-- Convert fixed-length CHAR columns to VARCHAR to align with JPA entity definitions
ALTER TABLE access_keys ALTER COLUMN key_hash TYPE VARCHAR(64);
ALTER TABLE exercise_versions ALTER COLUMN content_hash TYPE VARCHAR(64);
ALTER TABLE exercise_versions ALTER COLUMN git_commit TYPE VARCHAR(40);
ALTER TABLE content_syncs ALTER COLUMN git_commit TYPE VARCHAR(40);

