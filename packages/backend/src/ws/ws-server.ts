import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import { config } from '../config';
import { log } from '../utils/logger';
import { logEvent } from '../services/event-log.service';
import { setStationOnline } from '../services/station.service';
import { registerConnection, unregisterConnection } from './connection-registry';
import { handleRpiMessage, isServiceModeActive } from './ws-handler';
import { sendSseEvent } from './sse-manager';

export function setupWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    if (!url.pathname.startsWith('/ws/rpi')) {
      socket.destroy();
      return;
    }

    const stationId = url.searchParams.get('stationId');
    const token = request.headers['x-auth-token'] as string;

    if (!stationId) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    if (token && token !== config.rpiAuthToken) {
      log('warn', 'Invalid auth token', { token });
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, stationId);
    });
  });

  wss.on('connection', (ws: WebSocket, stationId: string) => {
    log('info', 'RPi connected', { stationId });
    registerConnection(stationId, ws);
    setStationOnline(stationId, true);
    logEvent(stationId, 'station_connected');
    if (!isServiceModeActive(stationId)) {
      sendSseEvent(stationId, { state: 'waiting' });
    }

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 15000);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleRpiMessage(stationId, message);
      } catch (err) {
        log('error', 'Invalid message from RPi', { stationId, error: (err as Error).message });
      }
    });

    ws.on('close', () => {
      log('info', 'RPi disconnected', { stationId });
      clearInterval(heartbeatInterval);
      unregisterConnection(stationId);
      setStationOnline(stationId, false);
      logEvent(stationId, 'station_disconnected');
      if (!isServiceModeActive(stationId)) {
        sendSseEvent(stationId, { state: 'offline' });
      }
    });

    ws.on('error', (err) => {
      log('error', 'RPi WebSocket error', { stationId, error: err.message });
    });
  });

  return wss;
}
