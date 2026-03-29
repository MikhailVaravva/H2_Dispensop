import WebSocket from 'ws';
import { BackendToRpiMessage, RpiToBackendMessage } from '@dispenser/shared';
import { config } from '../config';
import { log } from '../utils/logger';

export type MessageHandler = (message: BackendToRpiMessage) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private shouldReconnect = true;
  private onMessage: MessageHandler | null = null;
  private onConnected: (() => void) | null = null;
  private onDisconnected: (() => void) | null = null;

  setOnMessage(handler: MessageHandler) {
    this.onMessage = handler;
  }

  setOnConnected(handler: () => void) {
    this.onConnected = handler;
  }

  setOnDisconnected(handler: () => void) {
    this.onDisconnected = handler;
  }

  connect() {
    const url = `${config.backendUrl}/ws/rpi?stationId=${config.stationId}`;
    log('info', 'Connecting to backend', { url });

    this.ws = new WebSocket(url, {
      headers: {
        'x-auth-token': config.authToken,
        'x-station-id': config.stationId,
      },
    });

    this.ws.on('open', () => {
      log('info', 'Connected to backend');
      this.reconnectDelay = 1000;
      this.onConnected?.();
    });

    this.ws.on('message', (data) => {
      try {
        const message: BackendToRpiMessage = JSON.parse(data.toString());

        if (message.type === 'PING') {
          this.send({ type: 'PONG' });
          return;
        }

        this.onMessage?.(message);
      } catch (err) {
        log('error', 'Failed to parse backend message', { error: (err as Error).message });
      }
    });

    this.ws.on('close', () => {
      log('warn', 'Disconnected from backend');
      this.onDisconnected?.();
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      log('error', 'WebSocket error', { error: err.message });
    });
  }

  send(message: RpiToBackendMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      log('warn', 'Cannot send, WebSocket not open', { type: message.type });
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return;

    log('info', `Reconnecting in ${this.reconnectDelay}ms`);
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  close() {
    this.shouldReconnect = false;
    this.ws?.close();
  }
}
