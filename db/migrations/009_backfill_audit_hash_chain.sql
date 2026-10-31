-- 009_backfill_audit_hash_chain.sql
-- Backfill the existing audit ledger in creation order.

CREATE OR REPLACE FUNCTION vera_canonical_jsonb(value JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result TEXT;
BEGIN
  CASE jsonb_typeof(value)
    WHEN 'object' THEN
      SELECT COALESCE(
        '{' || string_agg(to_jsonb(key)::text || ':' || vera_canonical_jsonb(item), ',' ORDER BY key COLLATE "C") || '}',
        '{}'
      )
      INTO result
      FROM jsonb_each(value) AS object_items(key, item);
    WHEN 'array' THEN
      SELECT COALESCE(
        '[' || string_agg(vera_canonical_jsonb(item), ',' ORDER BY ordinal) || ']',
        '[]'
      )
      INTO result
      FROM jsonb_array_elements(value) WITH ORDINALITY AS array_items(item, ordinal);
    ELSE
      result := value::text;
  END CASE;

  RETURN result;
END;
$$;

DO $$
DECLARE
  audit_row RECORD;
  previous_hash VARCHAR(64) := NULL;
  next_position BIGINT := 0;
BEGIN
  FOR audit_row IN
    SELECT id, campaign_id, actor_id, action, entity_type, entity_id, metadata
    FROM audit_logs
    ORDER BY created_at ASC, id ASC
  LOOP
    next_position := next_position + 1;

    UPDATE audit_logs
    SET chain_position = next_position,
        prev_hash = previous_hash,
        entry_hash = encode(
          digest(
            COALESCE(previous_hash, '') ||
            vera_canonical_jsonb(jsonb_build_object(
              'action', audit_row.action,
              'actor_id', audit_row.actor_id,
              'campaign_id', audit_row.campaign_id,
              'entity_id', audit_row.entity_id,
              'entity_type', audit_row.entity_type,
              'metadata', audit_row.metadata
            )),
            'sha256'
          ),
          'hex'
        )
    WHERE id = audit_row.id;

    SELECT entry_hash INTO previous_hash FROM audit_logs WHERE id = audit_row.id;
  END LOOP;

  IF next_position > 0 THEN
    PERFORM setval('audit_logs_chain_position_seq', next_position, true);
  END IF;
END $$;

ALTER TABLE audit_logs ALTER COLUMN entry_hash SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN chain_position SET NOT NULL;
