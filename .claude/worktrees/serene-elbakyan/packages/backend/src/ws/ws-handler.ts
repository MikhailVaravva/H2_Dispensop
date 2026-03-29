import { RpiToBackendMessage, CardType, ServiceDiagMsg, BackendToRpiMessage } from '@dispenser/shared';
import { log } from '../utils/logger';
import { logEvent } from '../services/event-log.service';
import { markPermissionUsed, createPermission, getActivePermission } from '../services/permission.service';
import { getCard, deductCoin, createCard, getAllCards, Card } from '../services/card.service';
import { sendSseEvent, sendSerialLogEvent } from './sse-manager';
import { getConnection } from './connection-registry';
import { GrantPermissionMsg } from '@dispenser/shared';

let serviceDiagActive: { stationId: string; cardId: string } | null = null;

const MAX_SERIAL_LOG_ENTRIES = 50;
const serialLogBuffer: Map<string, Array<{ time: string; direction: 'in' | 'out'; data: string }>> = new Map();

export function handleRpiMessage(stationId: string, message: RpiToBackendMessage) {
  log('info', 'RPi message received', { stationId, type: message.type });

  switch (message.type) {
    case 'NFC_CARD_READ':
      handleNfcCardRead(stationId, message.cardId);
      break;

    case 'PERMISSION_ACK':
      logEvent(stationId, 'permission_received_by_rpi', message.permissionId);
      sendSseEvent(stationId, {
        state: 'permission_active',
        permissionId: message.permissionId,
      });
      break;

    case 'BUTTON_PRESSED':
      logEvent(stationId, 'button_pressed', message.permissionId);
      break;

    case 'FILL_STARTED':
      logEvent(stationId, 'fill_started', message.permissionId);
      sendSseEvent(stationId, {
        state: 'filling',
        permissionId: message.permissionId,
      });
      break;

    case 'FILL_DONE':
      markPermissionUsed(message.permissionId);
      logEvent(stationId, 'fill_done', message.permissionId, {
        durationMs: message.durationMs,
      });
      sendSseEvent(stationId, {
        state: 'done',
        permissionId: message.permissionId,
      });
      setTimeout(() => {
        sendSseEvent(stationId, { state: 'waiting' });
      }, 3000);
      break;

    case 'ERROR':
      logEvent(stationId, 'error', undefined, {
        code: message.code,
        message: message.message,
      });
      sendSseEvent(stationId, {
        state: 'error',
        message: message.message,
      });
      break;

    case 'STATUS':
      log('info', 'RPi status', { stationId, state: message.state, serialConnected: message.serialConnected });
      break;

    case 'TEST_RELAY_RESULT':
      sendSseEvent(stationId, {
        state: 'service_mode',
        relayTestResult: message.success ? 'ok' : 'failed',
      });
      break;

    case 'TEST_BUTTON_RESULT':
      sendSseEvent(stationId, {
        state: 'service_mode',
        buttonTestResult: (message as any).success && (message as any).pressed ? 'ok' : 'failed',
      });
      break;

    case 'SERIAL_LOG':
      // Skip debug spam
      if (message.data.startsWith('DEBUG:') || message.data.startsWith('[Serial')) break;
      {
        const logs = serialLogBuffer.get(stationId) || [];
        logs.push({ time: new Date().toISOString(), direction: message.direction, data: message.data });
        if (logs.length > MAX_SERIAL_LOG_ENTRIES) {
          logs.shift();
        }
        serialLogBuffer.set(stationId, logs);
        // Send via dedicated serial_log SSE event (doesn't change UI state)
        sendSerialLogEvent(stationId, logs);
        // Also push into service_mode SSE when diag is active (for ServicePanel)
        if (serviceDiagActive && serviceDiagActive.stationId === stationId) {
          sendSseEvent(stationId, {
            state: 'service_mode',
            serialLog: logs,
          });
        }
      }
      break;

    case 'FILL_TIME':
      if (serviceDiagActive && serviceDiagActive.stationId === stationId) {
        sendSseEvent(stationId, {
          state: 'service_mode',
          fillTimeMs: message.ms,
        });
      }
      break;

    case 'PONG':
      break;
  }
}

export function handleServiceDiagMessage(stationId: string, action: ServiceDiagMsg['action']) {
  log('info', 'Service diag action', { stationId, action });

  if (action === 'cancel') {
    serviceDiagActive = null;
    sendSseEvent(stationId, { state: 'waiting' });
    return;
  }

  if (action === 'get_cards') {
    const cards = getAllCards();
    sendSseEvent(stationId, {
      state: 'service_mode',
      message: `Карты (${cards.length})`,
      cards: cards.map(c => ({ id: c.id, balance: c.balance, cardType: c.cardType })),
    });
    log('info', 'Cards list', { cards });
  }

  if (action === 'get_status') {
    const connection = getConnection(stationId);
    const isOnline = !!connection;
    sendSseEvent(stationId, {
      state: 'service_mode',
      message: 'Статус станции',
      isOnline,
    });
    log('info', 'Station status', { stationId, isOnline });
  }

  if (action === 'test_relay') {
    sendSseEvent(stationId, {
      state: 'service_mode',
      message: 'Тест реле...',
      relayTestResult: 'testing' as const,
    });
    const connection = getConnection(stationId);
    if (connection) {
      connection.send(JSON.stringify({ type: 'TEST_RELAY' } satisfies BackendToRpiMessage));
    }
  }

  if (action === 'test_button') {
    sendSseEvent(stationId, {
      state: 'service_mode',
      message: 'Нажмите кнопку...',
      buttonTestResult: 'testing' as const,
    });
    const connection = getConnection(stationId);
    if (connection) {
      connection.send(JSON.stringify({ type: 'TEST_BUTTON' } satisfies BackendToRpiMessage));
    }
  }
}

export function handleSetFillTime(stationId: string, ms: number) {
  log('info', 'Set fill time', { stationId, ms });
  const connection = getConnection(stationId);
  if (connection) {
    connection.send(JSON.stringify({ type: 'SET_FILL_TIME', ms } satisfies BackendToRpiMessage));
  }
  sendSseEvent(stationId, {
    state: 'service_mode',
    message: `Время налива: ${ms} мс`,
    fillTimeMs: ms,
  });
}

function handleNfcCardRead(stationId: string, cardId: string) {
  log('info', 'NFC card read', { stationId, cardId });
  logEvent(stationId, 'card_read', undefined, { cardId });

  if (serviceDiagActive && serviceDiagActive.stationId === stationId) {
    if (serviceDiagActive.cardId === cardId) {
      log('info', 'Service card re-tapped, exiting service mode', { stationId });
      serviceDiagActive = null;
      sendSseEvent(stationId, { state: 'waiting' });
    } else {
      log('info', 'Service diag active, ignoring card read', { stationId });
    }
    return;
  }

  let card = getCard(cardId);
  
  if (!card) {
    log('info', 'Card not found, creating with 0 coins as user', { cardId });
    logEvent(stationId, 'card_not_found', undefined, { cardId });
    card = createCard(cardId, 0, 'user');
    sendSseEvent(stationId, {
      state: 'waiting',
      message: 'Карта не активирована. Обратитесь к администратору.',
    });
    return;
  }

  switch (card.cardType) {
    case 'service':
      handleServiceCard(stationId, cardId, card);
      break;
    case 'staff':
      handleStaffCard(stationId, card);
      break;
    case 'user':
      handleUserCard(stationId, card);
      break;
  }
}

function handleServiceCard(stationId: string, cardId: string, card: Card) {
  log('info', 'Service card detected', { stationId, cardId });
  logEvent(stationId, 'service_card_read', undefined, { cardId });

  serviceDiagActive = { stationId, cardId };
  sendSseEvent(stationId, {
    state: 'service_mode',
    message: 'Режим диагностики',
    cardType: 'service' as CardType,
  });
}

function handleStaffCard(stationId: string, card: Card) {
  log('info', 'Staff card detected', { stationId, cardId: card.id });
  logEvent(stationId, 'staff_card_read', undefined, { cardId: card.id });

  const existingPermission = getActivePermission(stationId);
  if (existingPermission) {
    log('info', 'Station already has active permission', { stationId });
    return;
  }

  const permission = createPermission(stationId);
  
  const rpiConnection = getConnection(stationId);
  if (rpiConnection) {
    const msg: GrantPermissionMsg = {
      type: 'GRANT_PERMISSION',
      permissionId: permission.id,
      expiresAt: permission.expiresAt,
    };
    rpiConnection.send(JSON.stringify(msg));
    log('info', 'Staff permission sent to RPi', { stationId, permissionId: permission.id });
  }
  
  sendSseEvent(stationId, {
    state: 'permission_active',
    message: 'Карта сотрудника',
    cardType: 'staff' as CardType,
    expiresAt: permission.expiresAt,
  });
}

function handleUserCard(stationId: string, card: Card) {
  if (card.balance <= 0) {
    log('info', 'Card has no balance', { cardId: card.id, balance: card.balance });
    logEvent(stationId, 'card_no_balance', undefined, { cardId: card.id, balance: card.balance });
    sendSseEvent(stationId, {
      state: 'waiting',
      message: 'Нет монет на карте',
      cardType: 'user' as CardType,
      balance: 0,
    });
    return;
  }

  deductCoin(card.id);
  
  const permission = createPermission(stationId);
  
  const rpiConnection = getConnection(stationId);
  if (rpiConnection) {
    const msg: GrantPermissionMsg = {
      type: 'GRANT_PERMISSION',
      permissionId: permission.id,
      expiresAt: permission.expiresAt,
    };
    rpiConnection.send(JSON.stringify(msg));
    log('info', 'User permission sent to RPi', { stationId, permissionId: permission.id });
  }
  
  const newBalance = card.balance - 1;
  sendSseEvent(stationId, {
    state: 'permission_active',
    cardType: 'user' as CardType,
    balance: newBalance,
    permissionId: permission.id,
    expiresAt: permission.expiresAt,
  });
}

export function exitServiceMode(stationId: string) {
  if (serviceDiagActive && serviceDiagActive.stationId === stationId) {
    serviceDiagActive = null;
    sendSseEvent(stationId, { state: 'waiting' });
  }
}
