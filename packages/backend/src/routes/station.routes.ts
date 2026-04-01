import { Router, Request, Response } from 'express';
import { getStation, createStation, getAllStations } from '../services/station.service';
import { getStationLogs } from '../services/event-log.service';
import { addSseClient, removeSseClient, sendSseEvent } from '../ws/sse-manager';
import { isStationConnected } from '../ws/connection-registry';
import { logEvent } from '../services/event-log.service';
import { isServiceModeActive } from '../ws/ws-handler';

const router = Router();

// Get all stations
router.get('/', (_req: Request, res: Response) => {
  const stations = getAllStations();
  res.json(stations);
});

// Get station info
router.get('/:stationId', (req: Request, res: Response) => {
  const station = getStation(String(req.params.stationId));
  res.json(station);
});

// Create station
router.post('/', (req: Request, res: Response) => {
  const { id, name, location } = req.body;
  if (!id || !name) {
    res.status(400).json({ error: 'id and name are required' });
    return;
  }
  const station = createStation(id, name, location);
  res.status(201).json(station);
});

// SSE endpoint for real-time status
router.get('/:stationId/events', (req: Request, res: Response) => {
  const stationId = String(req.params.stationId);

  // Validate station exists
  getStation(stationId);

  logEvent(stationId, 'page_opened');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial state
  const connected = isStationConnected(stationId);
  const initialState = isServiceModeActive(stationId) ? 'service_mode' : (connected ? 'waiting' : 'offline');
  res.write(`event: status_update\ndata: ${JSON.stringify({ state: initialState })}\n\n`);

  addSseClient(stationId, res);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeSseClient(stationId, res);
  });
});

// Get event logs
router.get('/:stationId/logs', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = getStationLogs(String(req.params.stationId), limit);
  res.json(logs);
});

export default router;
