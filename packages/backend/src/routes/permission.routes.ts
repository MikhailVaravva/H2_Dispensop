import { Router, Request, Response } from 'express';
import { getStation } from '../services/station.service';
import { createPermission, getActivePermission, markPermissionExpired } from '../services/permission.service';
import { isStationConnected, sendToStation } from '../ws/connection-registry';
import { sendSseEvent } from '../ws/sse-manager';
import { logEvent } from '../services/event-log.service';
import { AppError } from '../middleware/error-handler';
import { log } from '../utils/logger';

const router = Router();

// Request a pour permission
router.post('/:stationId/pour', (req: Request, res: Response) => {
  const stationId = String(req.params.stationId);

  // Validate station
  const station = getStation(stationId);

  // Check station is online
  if (!station.isOnline || !isStationConnected(stationId)) {
    throw new AppError(503, 'Station is offline');
  }

  logEvent(stationId, 'pour_requested');

  // Create permission (throws 409 if one already active)
  const permission = createPermission(stationId);

  // Send to RPi
  const sent = sendToStation(stationId, {
    type: 'GRANT_PERMISSION',
    permissionId: permission.id,
    expiresAt: permission.expiresAt,
  });

  if (!sent) {
    markPermissionExpired(permission.id);
    throw new AppError(503, 'Failed to communicate with station');
  }

  logEvent(stationId, 'permission_sent_to_rpi', permission.id);

  // Notify frontend SSE clients
  sendSseEvent(stationId, {
    state: 'permission_active',
    permissionId: permission.id,
    expiresAt: permission.expiresAt,
  });

  // Calculate seconds until expiry
  const expiresAt = new Date(permission.expiresAt + 'Z');
  const expiresInSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  res.status(201).json({
    permissionId: permission.id,
    stationId,
    status: permission.status,
    expiresAt: permission.expiresAt,
    expiresInSeconds,
  });
});

// Cancel an active permission
router.delete('/:stationId/permissions/:permissionId', (req: Request, res: Response) => {
  const stationId = String(req.params.stationId);
  const permissionId = String(req.params.permissionId);

  const expired = markPermissionExpired(permissionId);
  if (!expired) {
    throw new AppError(404, 'Active permission not found');
  }

  sendToStation(stationId, {
    type: 'CANCEL_PERMISSION',
    permissionId,
  });

  logEvent(stationId, 'permission_cancelled', permissionId);
  sendSseEvent(stationId, { state: 'waiting' });

  res.json({ message: 'Permission cancelled' });
});

// Get active permission for station
router.get('/:stationId/permission', (req: Request, res: Response) => {
  const stationId = String(req.params.stationId);
  const permission = getActivePermission(stationId);
  if (!permission) {
    res.json({ active: false });
    return;
  }
  res.json({ active: true, permission });
});

export default router;
