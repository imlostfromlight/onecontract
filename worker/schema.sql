-- OneContract D1 Schema
-- Run: wrangler d1 execute onecontract --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS templates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  file_key        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_data       TEXT DEFAULT '',
  file_mime       TEXT DEFAULT 'application/octet-stream',
  template_fields TEXT DEFAULT '[]',
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         TEXT NOT NULL,
  organization_id TEXT DEFAULT NULL,
  template_id     INTEGER,
  uuid            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  file_key        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_data       TEXT DEFAULT '',
  file_mime       TEXT DEFAULT 'application/octet-stream',
  status          TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','CLOSED')),
  org_signature   TEXT,
  org_signed_at   TEXT,
  client_fields   TEXT DEFAULT '[]',
  manager_fields  TEXT DEFAULT '{}',
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS document_signatures (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id  INTEGER NOT NULL,
  client_id    TEXT,
  client_email TEXT DEFAULT '',
  client_name  TEXT DEFAULT '',
  signature    TEXT,
  signed_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(document_id, client_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_uuid ON documents(uuid);
CREATE INDEX IF NOT EXISTS idx_signatures_doc ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_templates_org ON templates(organization_id);
