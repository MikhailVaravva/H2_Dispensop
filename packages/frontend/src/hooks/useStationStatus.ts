import { useState, useEffect, useRef, useCallback } from 'react';

export type StationState =
  | 'loading'
  | 'waiting'
  | 'permission_active'
  | 'filling'
  | 'done'
  | 'error'
  | 'offline'
  | 'service_mode';

export type CardType = 'service' | 'staff' | 'user';

export interface ServiceCard {
  id: string;
  balance: number;
  cardType: CardType;
}

export interface SerialLogEntry {
  time: string;
  direction: 'in' | 'out';
  data: string;
}

export interface ServiceDiagData {
  cards: ServiceCard[] | null;
  isOnline: boolean | null;
  relayTestResult: 'testing' | 'ok' | 'failed' | null;
  pumpTestResult: 'testing' | 'ok' | 'failed' | null;
  fillTimeMs: number | null;
  ledBrightness: number | null;
  ledCount: number | null;
  serialLog: SerialLogEntry[];
  scannedCardId: string | null;
}

interface StatusEvent {
  state: StationState;
  permissionId?: string;
  expiresAt?: string;
  message?: string;
  cards?: ServiceCard[];
  isOnline?: boolean;
  relayTestResult?: 'testing' | 'ok' | 'failed';
  pumpTestResult?: 'testing' | 'ok' | 'failed';
  fillTimeMs?: number;
  ledBrightness?: number;
  ledCount?: number;
  serialLog?: SerialLogEntry[];
  cardType?: CardType;
  cardId?: string;
  balance?: number;
  scannedCardId?: string;
}

export interface LastCard {
  id: string;
  cardType: CardType;
  balance?: number;
  message?: string;
  scannedAt: string;
}

export function useStationStatus(stationId: string) {
  const [state, setState] = useState<StationState>('loading');
  const [permissionId, setPermissionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serialLog, setSerialLog] = useState<SerialLogEntry[]>([]);
  const [lastCard, setLastCard] = useState<LastCard | null>(null);
  const [diagData, setDiagData] = useState<ServiceDiagData>({
    cards: null,
    isOnline: null,
    relayTestResult: null,
    pumpTestResult: null,
    fillTimeMs: null,
    ledBrightness: null,
    ledCount: null,
    serialLog: [],
    scannedCardId: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/stations/${stationId}/events`);
    eventSourceRef.current = es;

    es.addEventListener('status_update', (event) => {
      const data: StatusEvent = JSON.parse(event.data);
      setState(data.state);
      setPermissionId(data.permissionId || null);
      setExpiresAt(data.expiresAt || null);
      setErrorMessage(data.message || null);

      if (data.cardId) {
        setLastCard({
          id: data.cardId,
          cardType: data.cardType!,
          balance: data.balance,
          message: data.message,
          scannedAt: new Date().toISOString(),
        });
      }

      if (data.state === 'service_mode') {
        if (data.cards !== undefined) {
          setDiagData(prev => ({ ...prev, cards: data.cards ?? null }));
        }
        if (data.isOnline !== undefined) {
          setDiagData(prev => ({ ...prev, isOnline: data.isOnline ?? null }));
        }
        if (data.relayTestResult !== undefined) {
          setDiagData(prev => ({ ...prev, relayTestResult: data.relayTestResult ?? null }));
        }
        if (data.pumpTestResult !== undefined) {
          setDiagData(prev => ({ ...prev, pumpTestResult: data.pumpTestResult ?? null }));
        }
        if (data.fillTimeMs !== undefined) {
          setDiagData(prev => ({ ...prev, fillTimeMs: data.fillTimeMs ?? null }));
        }
        if (data.ledBrightness !== undefined) {
          setDiagData(prev => ({ ...prev, ledBrightness: data.ledBrightness ?? null }));
        }
        if (data.ledCount !== undefined) {
          setDiagData(prev => ({ ...prev, ledCount: data.ledCount ?? null }));
        }
        if (data.serialLog !== undefined) {
          setDiagData(prev => ({ ...prev, serialLog: data.serialLog ?? [] }));
        }
        if (data.scannedCardId !== undefined) {
          setDiagData(prev => ({ ...prev, scannedCardId: data.scannedCardId ?? null }));
        }
      } else {
        // Keep serialLog when leaving service mode
        setDiagData(prev => ({ ...prev, cards: null, isOnline: null, relayTestResult: null, pumpTestResult: null, fillTimeMs: null }));
      }
    });

    // Serial log events arrive independently of station state
    es.addEventListener('serial_log', (event) => {
      const data: { entries: SerialLogEntry[] } = JSON.parse(event.data);
      setSerialLog(data.entries);
      setDiagData(prev => ({ ...prev, serialLog: data.entries }));
    });

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = () => {
      setIsConnected(false);
    };
  }, [stationId]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return { state, permissionId, expiresAt, errorMessage, isConnected, diagData, serialLog, lastCard };
}
