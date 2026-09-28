-- Backfill teaching_space_id on submissions where it was not populated but collection_id exists
UPDATE submissions s
SET teaching_space_id = tsc.teaching_space_id
FROM teaching_space_collections tsc
WHERE s.collection_id = tsc.collection_id
  AND s.teaching_space_id IS NULL;
