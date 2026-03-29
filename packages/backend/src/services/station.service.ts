import db from '../db/database';
import { Station } from '@dispenser/shared';
import { AppError } from '../middleware/error-handler';

interface StationRow {
  id: string;
  name: string;
  location: string | null;
  is_online: number;
  created_at: string;
  updated_at: string;
}

function rowToStation(row: StationRow): Station {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    isOnline: row.is_online === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getStation(stationId: string): Station {
  const row = db.prepare('SELECT * FROM stations WHERE id = ?').get(stationId) as StationRow | undefined;
  if (!row) throw new AppError(404, 'Station not found');
  return rowToStation(row);
}

export function createStation(id: string, name: string, location?: string): Station {
  const existing = db.prepare('SELECT id FROM stations WHERE id = ?').get(id);
  if (existing) throw new AppError(409, 'Station already exists');
  db.prepare(
    'INSERT INTO stations (id, name, location) VALUES (?, ?, ?)'
  ).run(id, name, location || null);
  return getStation(id);
}

export function setStationOnline(stationId: string, online: boolean) {
  db.prepare(
    "UPDATE stations SET is_online = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(online ? 1 : 0, stationId);
}

export function getAllStations(): Station[] {
  const rows = db.prepare('SELECT * FROM stations ORDER BY created_at').all() as StationRow[];
  return rows.map(rowToStation);
}
