-- Staff account metadata and one-time owner bootstrap guard.
ALTER TABLE admin_users ADD COLUMN display_name TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS bootstrap_state (
  id TEXT PRIMARY KEY,
  consumed_at TEXT,
  claim_token TEXT
);

INSERT OR IGNORE INTO bootstrap_state(id, consumed_at, claim_token)
VALUES ('initial-manager', NULL, NULL);
