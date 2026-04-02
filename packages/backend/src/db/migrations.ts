import db from './database';
import { log } from '../utils/logger';

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      is_online INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      FOREIGN KEY (station_id) REFERENCES stations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_permissions_station_status
      ON permissions(station_id, status);

    CREATE INDEX IF NOT EXISTS idx_permissions_expires
      ON permissions(expires_at) WHERE status = 'active';

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      card_type TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id TEXT NOT NULL,
      permission_id TEXT,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (station_id) REFERENCES stations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_event_logs_station
      ON event_logs(station_id);

    CREATE INDEX IF NOT EXISTS idx_event_logs_type
      ON event_logs(event_type);

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS card_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (card_id) REFERENCES cards(id)
    );

    CREATE INDEX IF NOT EXISTS idx_card_transactions_card
      ON card_transactions(card_id);
  `);

  // Migration: add card_type column if it doesn't exist (for existing databases)
  const columns = db.prepare("PRAGMA table_info(cards)").all() as { name: string }[];
  if (!columns.find(c => c.name === 'card_type')) {
    db.exec("ALTER TABLE cards ADD COLUMN card_type TEXT NOT NULL DEFAULT 'user'");
    log('info', 'Added card_type column to cards table');
  }

  // Auto-seed station-001 for testing
  const existing = db.prepare('SELECT id FROM stations WHERE id = ?').get('station-001');
  if (!existing) {
    db.prepare(
      'INSERT INTO stations (id, name, location) VALUES (?, ?, ?)'
    ).run('station-001', 'Станция 1', 'Тест');
    log('info', 'Seeded test station', { stationId: 'station-001' });
  }

  // Auto-seed service card for service mode
  const serviceCard = db.prepare('SELECT id FROM cards WHERE id = ?').get('999999999');
  if (!serviceCard) {
    db.prepare(
      'INSERT INTO cards (id, balance, card_type) VALUES (?, ?, ?)'
    ).run('999999999', 0, 'service');
    log('info', 'Seeded service card', { cardId: '999999999' });
  }

  log('info', 'Database migrations complete');
}
