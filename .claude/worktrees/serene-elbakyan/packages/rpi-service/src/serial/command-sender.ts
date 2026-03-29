import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { SerialCommand } from '@dispenser/shared';
import { log } from '../utils/logger';
import { config } from '../config';

let port: SerialPort | null = null;
let parser: ReadlineParser | null = null;
let pendingAck: { resolve: () => void; reject: (err: Error) => void; command: string } | null = null;
let onSerialLog: ((direction: 'in' | 'out', data: string) => void) | null = null;
let commandQueue: Array<{ command: string; resolve: () => void; reject: (err: Error) => void }> = [];

export function getSerialConnected(): boolean {
  return port !== null && port.isOpen;
}

export function setOnSerialLog(callback: (direction: 'in' | 'out', data: string) => void) {
  onSerialLog = callback;
}

export function initSerial(onData: (line: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    port = new SerialPort({
      path: config.serialPort,
      baudRate: config.serialBaudRate,
    });

    parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (line: string) => {
      const trimmed = line.trim();
      log('info', 'Serial received', { data: trimmed });

      if (onSerialLog) {
        onSerialLog('in', trimmed);
      }

      // Check if this is an ACK for a pending command
      // Supports both exact "OK:CMD" and extended "OK:CMD:extra" formats
      if (pendingAck && (trimmed === `OK:${pendingAck.command}` || trimmed.startsWith(`OK:${pendingAck.command}:`))) {
        pendingAck.resolve();
        pendingAck = null;
        return;
      }

      // Forward to handler
      onData(trimmed);
    });

    port.on('open', () => {
      log('info', 'Serial port opened', { port: config.serialPort });
      if (onSerialLog) {
        onSerialLog('in', `[Serial port opened: ${config.serialPort}]`);
      }
      resolve();
    });

    port.on('error', (err) => {
      log('error', 'Serial error', { error: err.message });
      if (onSerialLog) {
        onSerialLog('in', `[Serial error: ${err.message}]`);
      }
      reject(err);
    });

    port.on('close', () => {
      log('warn', 'Serial port closed');
      if (onSerialLog) {
        onSerialLog('in', '[Serial port closed]');
      }
    });
  });
}

function processQueue() {
  if (pendingAck || commandQueue.length === 0) return;
  if (!port || !port.isOpen) {
    while (commandQueue.length > 0) {
      const item = commandQueue.shift()!;
      item.reject(new Error('Serial port not open'));
    }
    return;
  }

  const item = commandQueue.shift()!;
  const timeoutMs = config.commandTimeoutMs;

  const timeout = setTimeout(() => {
    if (pendingAck) {
      const rej = pendingAck.reject;
      pendingAck = null;
      rej(new Error(`ACK timeout for ${item.command}`));
      processQueue();
    }
  }, timeoutMs);

  pendingAck = {
    command: item.command,
    resolve: () => {
      clearTimeout(timeout);
      item.resolve();
      processQueue();
    },
    reject: (err: Error) => {
      clearTimeout(timeout);
      item.reject(err);
      processQueue();
    },
  };

  log('info', 'Serial sending', { command: item.command });
  if (onSerialLog) {
    onSerialLog('out', item.command);
  }
  port.write(`${item.command}\n`);
}

export function sendCommand(command: SerialCommand | string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!port || !port.isOpen) {
      reject(new Error('Serial port not open'));
      return;
    }
    commandQueue.push({ command: command as string, resolve, reject });
    processQueue();
  });
}

export function sendRawSerial(rawCmd: string): void {
  if (!port || !port.isOpen) {
    log('warn', 'Serial not open, cannot send raw command', { rawCmd });
    return;
  }
  log('info', 'Serial sending raw', { rawCmd });
  if (onSerialLog) {
    onSerialLog('out', rawCmd);
  }
  port.write(`${rawCmd}\n`);
}

let pingInterval: NodeJS.Timeout | null = null;

export function startSerialPing(intervalMs: number = 10000) {
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  pingInterval = setInterval(() => {
    if (port && port.isOpen && !pendingAck && commandQueue.length === 0) {
      log('info', 'Serial ping');
      if (onSerialLog) {
        onSerialLog('out', 'GET_STATUS');
      }
      port.write('GET_STATUS\n');
    }
  }, intervalMs);
  log('info', 'Serial ping started', { intervalMs });
}

export function stopSerialPing() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
    log('info', 'Serial ping stopped');
  }
}

export function closeSerial(): Promise<void> {
  return new Promise((resolve) => {
    if (port && port.isOpen) {
      port.close(() => resolve());
    } else {
      resolve();
    }
  });
}
