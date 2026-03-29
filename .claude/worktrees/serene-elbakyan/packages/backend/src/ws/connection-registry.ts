import WebSocket from 'ws';

// stationId → WebSocket
const connections = new Map<string, WebSocket>();

export function registerConnection(stationId: string, ws: WebSocket) {
  const existing = connections.get(stationId);
  if (existing && existing.readyState === WebSocket.OPEN) {
    existing.close();
  }
  connections.set(stationId, ws);
}

export function unregisterConnection(stationId: string) {
  connections.delete(stationId);
}

export function getConnection(stationId: string): WebSocket | undefined {
  const ws = connections.get(stationId);
  if (ws && ws.readyState === WebSocket.OPEN) return ws;
  if (ws) connections.delete(stationId);
  return undefined;
}

export function isStationConnected(stationId: string): boolean {
  return !!getConnection(stationId);
}

export function sendToStation(stationId: string, message: object): boolean {
  const ws = getConnection(stationId);
  if (!ws) return false;
  ws.send(JSON.stringify(message));
  return true;
}
