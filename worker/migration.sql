-- Migration: add MANAGER role, organization_id, client_fields, manager_fields
-- Run: wrangler d1 execute onecontract --file=migration.sql --remote

PRAGMA foreign_keys=OFF;

-- Recreate users table with MANAGER role and organization_id
CREATE TABLE IF NOT EXISTS users_v2 (
  id          TEXT PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  first_name  TEXT DEFAULT '',
  last_name   TEXT DEFAULT '',
  password_hash TEXT,
  role        TEXT DEFAULT 'CLIENT' CHECK(role IN ('SUPERADMIN','ADMIN','ORGANIZATION','MANAGER','CLIENT')),
  organization_id TEXT DEFAULT NULL,
  is_ecp_verified INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

INSERT INTO users_v2 (id, username, email, first_name, last_name, password_hash, role, is_ecp_verified, created_at)
SELECT id, username, email, first_name, last_name, password_hash, role, is_ecp_verified, created_at FROM users;

DROP TABLE users;
ALTER TABLE users_v2 RENAME TO users;

PRAGMA foreign_keys=ON;

-- Add new columns to documents (safe: SQLite allows ADD COLUMN)
ALTER TABLE documents ADD COLUMN organization_id TEXT DEFAULT NULL;
ALTER TABLE documents ADD COLUMN client_fields TEXT DEFAULT '[]';
ALTER TABLE documents ADD COLUMN manager_fields TEXT DEFAULT '{}';

-- Backfill organization_id for existing docs created by ORGANIZATION users
UPDATE documents SET organization_id = user_id
WHERE user_id IN (SELECT id FROM users WHERE role = 'ORGANIZATION');

CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
