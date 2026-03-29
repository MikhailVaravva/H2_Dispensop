import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

const dbDir = path.dirname(path.resolve(config.dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db: DatabaseType = new Database(path.resolve(config.dbPath));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
export type { DatabaseType };
