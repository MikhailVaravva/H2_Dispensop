import db from '../db/database';
import type { Statement } from 'better-sqlite3';

export type EventType =
  | 'qr_scanned'
  | 'page_opened'
  | 'pour_requested'
  | 'permission_created'
  | 'permission_sent_to_rpi'
  | 'permission_received_by_rpi'
  | 'button_enabled'
  | 'button_pressed'
  | 'fill_started'
  | 'fill_done'
  | 'permission_used'
  | 'permission_expired'
  | 'permission_cancelled'
  | 'error'
  | 'emergency_stop'
  | 'station_connected'
  | 'station_disconnected'
  | 'card_read'
  | 'card_not_found'
  | 'card_no_balance'
  | 'card_created'
  | 'card_deleted'
  | 'card_updated'
  | 'coins_added'
  | 'coin_deducted'
  | 'service_card_read'
  | 'staff_card_read'
  | 'service_mode_entered'
  | 'service_mode_exited';

let insertStmt: Statement | null = null;

function getInsertStmt(): Statement {
  if (!insertStmt) {
    insertStmt = db.prepare(
      'INSERT INTO event_logs (station_id, permission_id, event_type, payload) VALUES (?, ?, ?, ?)'
    );
  }
  return insertStmt;
}

export function logEvent(
  stationId: string,
  eventType: EventType,
  permissionId?: string,
  payload?: Record<string, unknown>,
) {
  getInsertStmt().run(
    stationId,
    permissionId || null,
    eventType,
    payload ? JSON.stringify(payload) : null,
  );
}

export function getStationLogs(stationId: string, limit = 100) {
  return db.prepare(
    'SELECT * FROM event_logs WHERE station_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(stationId, limit);
}
