-- Restaurant Menu Template: initial schema
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL DEFAULT 'demo',
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON categories(restaurant_id, sort_order);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL DEFAULT 'demo',
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  image_key TEXT,
  price REAL,
  sizes_json TEXT,
  is_available INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id, category_id, sort_order);
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL DEFAULT 'demo',
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 310000,
  role TEXT NOT NULL DEFAULT 'manager',
  must_change_password INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(restaurant_id, username)
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL DEFAULT 'demo',
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE TABLE IF NOT EXISTS restaurant_settings (
  restaurant_id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip_hash TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started TEXT NOT NULL,
  blocked_until TEXT
);
