import { config } from './config';
import { log } from './utils/logger';
import { StateMachine } from './state-machine/machine';
import { StationState } from './state-machine/states';
import { WsClient } from './ws/ws-client';
import { initSerial, getSerialConnected, closeSerial, sendCommand, sendRawSerial, setOnSerialLog, startSerialPing, stopSerialPing } from './serial/command-sender';
import { initNfcReader, closeNfcReader } from './nfc/nfc-reader';
import { BackendToRpiMessage, SerialCommand } from '@dispenser/shared';

const machine = new StateMachine();
const wsClient = new WsClient();

// Handle serial data from ESP32
function handleSerialData(line: string) {
  log('info', 'Processing serial data', { line });

  if (line === 'BUTTON_TEST_PRESSED') {
    wsClient.send({ type: 'TEST_BUTTON_RESULT', success: true, pressed: true } as any);
  } else if (line === 'BUTTON_PRESSED') {
    machine.dispatch('BUTTON_PRESSED');
    wsClient.send({
      type: 'BUTTON_PRESSED',
      permissionId: machine.getPermissionId() || '',
    });
  } else if (line.startsWith('TOUCH_RX:')) {
    log('info', 'Touch panel byte received', { data: line });
  } else if (line === 'FILL_STARTED') {
    wsClient.send({
      type: 'FILL_STARTED',
      permissionId: machine.getPermissionId() || '',
    });
  } else if (line === 'FILL_DONE') {
    const permId = machine.getPermissionId() || '';
    machine.dispatch('FILL_DONE');
    wsClient.send({
      type: 'FILL_DONE',
      permissionId: permId,
      durationMs: 0,
    });
  } else if (line.startsWith('FILL_VOLUME:')) {
    log('info', 'Fill volume confirmed', { volume: line.split(':')[1] });
  } else if (line.startsWith('ERROR:')) {
    const errorMsg = line.substring(6);
    machine.dispatch('ERROR');
    wsClient.send({
      type: 'ERROR',
      code: 'CONTROLLER_ERROR',
      message: errorMsg,
    });
  } else if (line === 'EMERGENCY_STOP' || line.startsWith('EMERGENCY_STOP:')) {
    const reason = line.includes(':') ? line.substring(line.indexOf(':') + 1) : 'unknown';
    machine.dispatch('EMERGENCY_STOP');
    wsClient.send({
      type: 'ERROR',
      code: 'EMERGENCY_STOP',
      message: reason,
    });
  } else if (line.startsWith('STATUS:')) {
    log('info', 'Controller status', { status: line });
  } else if (line.startsWith('FILL_TIME:')) {
    const ms = parseInt(line.substring(10), 10);
    if (!isNaN(ms)) {
      log('info', 'Fill time received', { ms });
      wsClient.send({ type: 'FILL_TIME', ms } as any);
    }
  } else if (line.startsWith('LED_BRIGHTNESS:')) {
    const val = parseInt(line.substring(15), 10);
    wsClient.send({ type: 'LED_BRIGHTNESS', value: val } as any);
  } else if (line.startsWith('LED_COUNT:')) {
    const val = parseInt(line.substring(10), 10);
    wsClient.send({ type: 'LED_COUNT', value: val } as any);
  }
}

// Handle backend WebSocket messages
function handleBackendMessage(message: BackendToRpiMessage) {
  log('info', 'Backend message', { type: message.type });

  switch (message.type) {
    case 'GRANT_PERMISSION':
      machine.dispatch('GRANT_PERMISSION', {
        permissionId: message.permissionId,
        expiresAt: message.expiresAt,
      });
      wsClient.send({
        type: 'PERMISSION_ACK',
        permissionId: message.permissionId,
      });
      break;

    case 'CANCEL_PERMISSION':
      machine.dispatch('CANCEL_PERMISSION');
      break;

    case 'SET_FILL_TIME':
      log('info', 'Set fill time command received', { ms: message.ms });
      sendRawSerial(`SET_FILL_TIME:${message.ms}`);
      break;

    case 'GET_FILL_TIME':
      log('info', 'Get fill time command received');
      sendRawSerial('GET_FILL_TIME');
      break;

    case 'TEST_RELAY':
      log('info', 'Test relay command received');
      sendCommand('TEST_RELAY' as any)
        .then(() => {
          wsClient.send({ type: 'TEST_RELAY_RESULT', success: true } as any);
        })
        .catch(() => {
          wsClient.send({ type: 'TEST_RELAY_RESULT', success: false } as any);
        });
      break;

    case 'TEST_PUMP':
      log('info', 'Test pump command received');
      sendCommand('TEST_PUMP' as any)
        .then(() => {
          wsClient.send({ type: 'TEST_PUMP_RESULT', success: true } as any);
        })
        .catch(() => {
          wsClient.send({ type: 'TEST_PUMP_RESULT', success: false } as any);
        });
      break;

    case 'TEST_BUTTON':
      log('info', 'Test button command received');
      sendCommand('TEST_BUTTON' as any)
        .then(() => {
          log('info', 'TEST_BUTTON command sent, waiting for press');
        })
        .catch(() => {
          wsClient.send({ type: 'TEST_BUTTON_RESULT', success: false, pressed: false } as any);
        });
      break;

    case 'GET_LED_SETTINGS':
      sendRawSerial('GET_LED_SETTINGS');
      break;

    case 'SET_LED_BRIGHTNESS':
      sendRawSerial(`SET_LED_BRIGHTNESS:${(message as any).value}`);
      break;

    case 'SET_LED_COUNT':
      sendRawSerial(`SET_LED_COUNT:${(message as any).value}`);
      break;

    case 'SET_GREEN':
      log('info', 'Set green LED command received');
      sendCommand(SerialCommand.SET_GREEN as any);
      break;

    case 'SET_RED':
      log('info', 'Set red LED command received');
      sendCommand(SerialCommand.SET_RED as any);
      break;
  }
}

// State change notifications to backend
machine.setOnStateChange((from, to, event) => {
  log('info', 'State changed', { from, to, event });

  if (event === 'TIMEOUT' && from === StationState.PERMISSION_READY) {
    log('info', 'Permission timed out locally');
  }

  wsClient.send({
    type: 'STATUS',
    state: to,
    serialConnected: getSerialConnected(),
  });
});

// Handle NFC card read
function handleNfcCardRead(cardId: string) {
  log('info', 'NFC card detected', { cardId });
  wsClient.send({
    type: 'NFC_CARD_READ',
    cardId: cardId,
  });
}

// Startup
async function main() {
  log('info', 'RPi service starting', {
    stationId: config.stationId,
    serialPort: config.serialPort,
  });

  // Set up serial log forwarding to backend
  setOnSerialLog((direction, data) => {
    wsClient.send({ type: 'SERIAL_LOG', direction, data } as any);
  });

  // Initialize serial connection to ESP32
  try {
    await initSerial(handleSerialData);
    log('info', 'Serial connected');
    startSerialPing(10000);
  } catch (err) {
    log('error', 'Serial connection failed — running without serial', {
      error: (err as Error).message,
    });
  }

  // Initialize NFC reader
  if (config.nfcReaderDevice) {
    await initNfcReader(handleNfcCardRead);
  }

  // Connect to backend
  wsClient.setOnMessage(handleBackendMessage);
  wsClient.setOnConnected(() => {
    wsClient.send({
      type: 'STATUS',
      state: machine.getState(),
      serialConnected: getSerialConnected(),
    });
    sendCommand(SerialCommand.SET_RED as any)
      .catch(() => {});
  });
  wsClient.setOnDisconnected(() => {
    log('warn', 'Lost connection to backend - setting red LED');
    sendCommand(SerialCommand.SET_RED as any)
      .catch(() => {});
  });
  wsClient.connect();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    log('info', 'Shutting down...');
    stopSerialPing();
    wsClient.close();
    await closeSerial();
    closeNfcReader();
    process.exit(0);
  });
}

main().catch((err) => {
  log('error', 'Fatal error', { error: err.message });
  process.exit(1);
});
