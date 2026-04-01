const BASE_URL = '/api';

export interface StationInfo {
  id: string;
  name: string;
  location: string | null;
  isOnline: boolean;
}

export interface PourResponse {
  permissionId: string;
  stationId: string;
  status: string;
  expiresAt: string;
  expiresInSeconds: number;
}

export type ServiceDiagAction = 'get_cards' | 'get_status' | 'test_relay' | 'test_button' | 'cancel' | 'get_fill_time' | 'enter';

export async function setFillTime(stationId: string, ms: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/stations/${stationId}/service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set_fill_time', fillTimeMs: ms }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function getFillTime(stationId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/stations/${stationId}/service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_fill_time' }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export interface ServiceDiagResponse {
  success: boolean;
  action?: ServiceDiagAction;
  message?: string;
}

export async function fetchStation(stationId: string): Promise<StationInfo> {
  const res = await fetch(`${BASE_URL}/stations/${stationId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Station not found' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function requestPour(stationId: string): Promise<PourResponse> {
  const res = await fetch(`${BASE_URL}/stations/${stationId}/pour`, {
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getBgVideo(): Promise<string> {
  const res = await fetch(`${BASE_URL}/config/bgvideo`);
  if (!res.ok) return '';
  const data = await res.json();
  return data.value || '';
}

export async function saveBgVideo(url: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/config/bgvideo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: url }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function callServiceDiag(
  stationId: string, 
  action: ServiceDiagAction
): Promise<ServiceDiagResponse> {
  const res = await fetch(`${BASE_URL}/stations/${stationId}/service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}
