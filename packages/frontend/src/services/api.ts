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

export type ServiceDiagAction = 'get_cards' | 'get_status' | 'test_relay' | 'test_pump' | 'test_button' | 'cancel' | 'get_fill_time' | 'enter';

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

export async function getLedSettings(stationId: string): Promise<void> {
  await fetch(`${BASE_URL}/stations/${stationId}/service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_led_settings' }),
  });
}

export async function setLedBrightness(stationId: string, value: number): Promise<void> {
  await fetch(`${BASE_URL}/stations/${stationId}/service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set_led_brightness', value }),
  });
}

export async function setLedCount(stationId: string, value: number): Promise<void> {
  await fetch(`${BASE_URL}/stations/${stationId}/service`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set_led_count', value }),
  });
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

export interface CardInfo {
  id: string;
  balance: number;
  cardType: string;
}

export interface CardTransaction {
  id: number;
  type: string;
  amount: number;
  createdAt: string;
}

export async function checkCard(cardId: string): Promise<CardInfo | null> {
  const res = await fetch(`${BASE_URL}/cards/${encodeURIComponent(cardId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getAllCards(): Promise<CardInfo[]> {
  const res = await fetch(`${BASE_URL}/cards`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getCardHistory(cardId: string): Promise<CardTransaction[]> {
  const res = await fetch(`${BASE_URL}/cards/${encodeURIComponent(cardId)}/history`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateCard(cardId: string, updates: { balance?: number; cardType?: string }): Promise<CardInfo> {
  const res = await fetch(`${BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteCard(cardId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function addCard(id: string, cardType: string, balance: number): Promise<CardInfo> {
  const res = await fetch(`${BASE_URL}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, cardType, balance }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function topupCard(cardId: string, amount: number): Promise<CardInfo> {
  const res = await fetch(`${BASE_URL}/cards/${encodeURIComponent(cardId)}/topup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface VideoItem { name: string; url: string; }

export async function getAvailableVideos(): Promise<VideoItem[]> {
  const res = await fetch(`${BASE_URL}/videos`);
  if (!res.ok) return [];
  return res.json();
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
