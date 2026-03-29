import { Response } from 'express';
import { StatusUpdateEvent } from '@dispenser/shared';

// stationId → Set of SSE Response objects
const sseClients = new Map<string, Set<Response>>();

export function addSseClient(stationId: string, res: Response) {
  if (!sseClients.has(stationId)) {
    sseClients.set(stationId, new Set());
  }
  sseClients.get(stationId)!.add(res);
}

export function removeSseClient(stationId: string, res: Response) {
  sseClients.get(stationId)?.delete(res);
  if (sseClients.get(stationId)?.size === 0) {
    sseClients.delete(stationId);
  }
}

export function sendSseEvent(stationId: string, event: StatusUpdateEvent) {
  const clients = sseClients.get(stationId);
  if (!clients) return;
  const data = `event: status_update\ndata: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    res.write(data);
  }
}

export function sendSerialLogEvent(stationId: string, entries: Array<{ time: string; direction: 'in' | 'out'; data: string }>) {
  const clients = sseClients.get(stationId);
  if (!clients) return;
  const data = `event: serial_log\ndata: ${JSON.stringify({ entries })}\n\n`;
  for (const res of clients) {
    res.write(data);
  }
}
