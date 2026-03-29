import db from '../db/database';
import { Permission } from '@dispenser/shared';
import { AppError } from '../middleware/error-handler';
import { generatePermissionId } from '../utils/id-generator';
import { config } from '../config';
import { logEvent } from './event-log.service';

interface PermissionRow {
  id: string;
  station_id: string;
  status: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

function rowToPermission(row: PermissionRow): Permission {
  return {
    id: row.id,
    stationId: row.station_id,
    status: row.status as Permission['status'],
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
  };
}

export function getActivePermission(stationId: string): Permission | null {
  // Expire stale permissions first
  db.prepare(
    "UPDATE permissions SET status = 'expired' WHERE station_id = ? AND status = 'active' AND expires_at <= datetime('now')"
  ).run(stationId);

  const row = db.prepare(
    "SELECT * FROM permissions WHERE station_id = ? AND status = 'active' AND expires_at > datetime('now')"
  ).get(stationId) as PermissionRow | undefined;

  return row ? rowToPermission(row) : null;
}

export function createPermission(stationId: string): Permission {
  const existing = getActivePermission(stationId);
  if (existing) {
    throw new AppError(409, 'Station already has an active permission');
  }

  const id = generatePermissionId();
  const ttl = config.permissionTtlSeconds;

  db.prepare(
    `INSERT INTO permissions (id, station_id, status, expires_at)
     VALUES (?, ?, 'active', datetime('now', '+${ttl} seconds'))`
  ).run(id, stationId);

  logEvent(stationId, 'permission_created', id);

  const row = db.prepare('SELECT * FROM permissions WHERE id = ?').get(id) as PermissionRow;
  return rowToPermission(row);
}

export function markPermissionUsed(permissionId: string): boolean {
  const result = db.prepare(
    "UPDATE permissions SET status = 'used', used_at = datetime('now') WHERE id = ? AND status = 'active' AND expires_at > datetime('now')"
  ).run(permissionId);
  if (result.changes > 0) {
    const row = db.prepare('SELECT station_id FROM permissions WHERE id = ?').get(permissionId) as { station_id: string } | undefined;
    if (row) logEvent(row.station_id, 'permission_used', permissionId);
  }
  return result.changes > 0;
}

export function markPermissionExpired(permissionId: string): boolean {
  const result = db.prepare(
    "UPDATE permissions SET status = 'expired' WHERE id = ? AND status = 'active'"
  ).run(permissionId);
  if (result.changes > 0) {
    const row = db.prepare('SELECT station_id FROM permissions WHERE id = ?').get(permissionId) as { station_id: string } | undefined;
    if (row) logEvent(row.station_id, 'permission_expired', permissionId);
  }
  return result.changes > 0;
}

export function expireAllStale(): number {
  const staleRows = db.prepare(
    "SELECT id, station_id FROM permissions WHERE status = 'active' AND expires_at <= datetime('now')"
  ).all() as { id: string; station_id: string }[];

  if (staleRows.length === 0) return 0;

  const result = db.prepare(
    "UPDATE permissions SET status = 'expired' WHERE status = 'active' AND expires_at <= datetime('now')"
  ).run();

  for (const row of staleRows) {
    logEvent(row.station_id, 'permission_expired', row.id);
  }

  return result.changes;
}
