import http from 'http';
import app from './app';
import { config } from './config';
import { runMigrations } from './db/migrations';
import { setupWebSocketServer } from './ws/ws-server';
import { expireAllStale } from './services/permission.service';
import { sendSseEvent } from './ws/sse-manager';
import { log } from './utils/logger';

// Run database migrations
runMigrations();

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket server for RPi connections
setupWebSocketServer(server);

// Permission expiry background job
setInterval(() => {
  const expired = expireAllStale();
  if (expired > 0) {
    log('info', 'Expired stale permissions', { count: expired });
  }
}, 10_000);

// Start server
server.listen(config.port, () => {
  log('info', `Server started on port ${config.port}`);
  log('info', `Health check: http://localhost:${config.port}/health`);
  log('info', `Station page: http://localhost:${config.port}/station/station-001`);
});
