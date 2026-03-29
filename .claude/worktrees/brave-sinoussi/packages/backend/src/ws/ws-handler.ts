import { RpiToBackendMessage, CardType, ServiceDiagMsg, BackendToRpiMessage } from '@dispenser/shared';
import { log } from '../utils/logger';
import { logEvent } from '../services/event-log.service';
import { markPermissionUsed, createPermission, getActivePermission } from '../services/permission.service';
import { getCard, deductCoin, createCard, getAllCards, Card } from '../services/card.service';
import { sendSseEvent } from './sse-manager';
import { getConnection, isStationConnected } from './connection-registry';
import { GrantPermissionMsg } from '@dispenser/shared';

let serviceDiagActive: { stationId: string; cardId: string } | null = null;

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
      log('info', 'Relay test result', { stationId, success: message.success });
      sendSseEvent(stationId, {
        state: 'service_mode',
        message: message.success ? 'Реле: OK' : 'Реле: ошибка',
        relayTestResult: message.success ? 'ok' : 'failed',
      });
      break;

    case 'PONG':
      break;
  }
}

export function handleServiceDiagMessage(stationId: string, action: ServiceDiagMsg['action']) {
  log('info', 'Service diag action', { stationId, action });

  if (action === 'cancel') {
    serviceDiagActive = null;
    logEvent(stationId, 'service_mode_exited');
    sendSseEvent(stationId, { state: 'waiting' });
    return;
  }

  if (action === 'get_cards') {
    const cards = getAllCards();
    log('info', 'Cards list requested', { count: cards.length });
    sendSseEvent(stationId, {
      state: 'service_mode',
      message: `Карты: ${cards.length}`,
      cards,
    });
  }

  if (action === 'get_status') {
    const isOnline = isStationConnected(stationId);
    log('info', 'Station status requested', { stationId, isOnline });
    sendSseEvent(stationId, {
      state: 'service_mode',
      message: isOnline ? 'Станция онлайн' : 'Станция офлайн',
      isOnline,
    });
  }

  if (action === 'test_relay') {
    sendSseEvent(stationId, {
      state: 'service_mode',
      message: 'Тест реле...',
      relayTestResult: 'testing',
    });
    const connection = getConnection(stationId);
    if (connection) {
      connection.send(JSON.stringify({ type: 'TEST_RELAY' } satisfies BackendToRpiMessage));
    } else {
      sendSseEvent(stationId, {
        state: 'service_mode',
        message: 'Реле: нет связи с RPi',
        relayTestResult: 'failed',
      });
    }
  }
}

function handleNfcCardRead(stationId: string, cardId: string) {
  log('info', 'NFC card read', { stationId, cardId });
  logEvent(stationId, 'card_read', undefined, { cardId });

  // If service mode is active and the same service card is tapped again → exit
  if (serviceDiagActive && serviceDiagActive.stationId === stationId) {
    const card = getCard(cardId);
    if (card && card.cardType === 'service') {
      log('info', 'Service card tapped again, exiting service mode', { stationId });
      serviceDiagActive = null;
      logEvent(stationId, 'service_mode_exited');
      sendSseEvent(stationId, { state: 'waiting' });
    } else {
      log('info', 'Service diag active, ignoring non-service card read', { stationId });
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
