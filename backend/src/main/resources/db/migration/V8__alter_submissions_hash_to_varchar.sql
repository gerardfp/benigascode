-- V8: Convert source_hash and tests_hash from CHAR(64) to VARCHAR(64) for JPA/Hibernate compatibility
ALTER TABLE submissions ALTER COLUMN source_hash TYPE VARCHAR(64);
ALTER TABLE submissions ALTER COLUMN tests_hash TYPE VARCHAR(64);

