CREATE TABLE coffees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL CHECK (json_valid(data)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE state (
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL CHECK (json_valid(value)),
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (namespace, key)
);
CREATE INDEX state_expiry ON state(expires_at);
