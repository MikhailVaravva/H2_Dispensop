// WebSocket messages: Backend → RPi
export interface GrantPermissionMsg {
  type: 'GRANT_PERMISSION';
  permissionId: string;
  expiresAt: string; // ISO timestamp
}

export interface CancelPermissionMsg {
  type: 'CANCEL_PERMISSION';
  permissionId: string;
}

export interface PingMsg {
  type: 'PING';
}

// WebSocket messages: RPi → Backend
export interface PermissionAckMsg {
  type: 'PERMISSION_ACK';
  permissionId: string;
}

export interface ButtonPressedMsg {
  type: 'BUTTON_PRESSED';
  permissionId: string;
}

export interface FillStartedMsg {
  type: 'FILL_STARTED';
  permissionId: string;
}

export interface FillDoneMsg {
  type: 'FILL_DONE';
  permissionId: string;
  durationMs: number;
}

export interface RpiErrorMsg {
  type: 'ERROR';
  code: string;
  message: string;
}

export interface RpiStatusMsg {
  type: 'STATUS';
  state: string;
  serialConnected: boolean;
}

export interface PongMsg {
  type: 'PONG';
}

export interface NfcCardReadMsg {
  type: 'NFC_CARD_READ';
  cardId: string;
}

export interface SerialLogMsg {
  type: 'SERIAL_LOG';
  direction: 'in' | 'out';
  data: string;
}

export interface RpiFillTimeMsg {
  type: 'FILL_TIME';
  ms: number;
}

export interface TestRelayResultMsg {
  type: 'TEST_RELAY_RESULT';
  success: boolean;
}

export interface TestButtonResultMsg {
  type: 'TEST_BUTTON_RESULT';
  result: 'pressed' | 'timeout' | 'error';
}

export type RpiToBackendMessage =
  | PermissionAckMsg
  | ButtonPressedMsg
  | FillStartedMsg
  | FillDoneMsg
  | RpiErrorMsg
  | RpiStatusMsg
  | PongMsg
  | NfcCardReadMsg
  | SerialLogMsg
  | RpiFillTimeMsg
  | TestRelayResultMsg
  | TestButtonResultMsg
  | RpiLedBrightnessMsg
  | RpiLedCountMsg;

// SSE events: Backend → Frontend
export type StationState =
  | 'waiting'
  | 'permission_active'
  | 'filling'
  | 'done'
  | 'error'
  | 'offline'
  | 'service_mode';

export interface StatusUpdateEvent {
  state: StationState;
  permissionId?: string;
  expiresAt?: string;
  message?: string;
  cardType?: 'service' | 'staff' | 'user';
  cardId?: string;
  balance?: number;
  cards?: Array<{ id: string; balance: number; cardType: CardType }>;
  isOnline?: boolean;
  relayTestResult?: 'testing' | 'ok' | 'failed';
  buttonTestResult?: 'testing' | 'pressed' | 'timeout' | 'error';
  fillTimeMs?: number;
  ledBrightness?: number;
  ledCount?: number;
  serialLog?: Array<{ time: string; direction: 'in' | 'out'; data: string }>;
  scannedCardId?: string;
}

export type CardType = 'service' | 'staff' | 'user';

export interface ServiceDiagMsg {
  type: 'SERVICE_DIAG';
  action: 'get_cards' | 'get_status' | 'test_relay' | 'test_button' | 'cancel';
}

export interface ServiceDiagResultMsg {
  type: 'SERVICE_DIAG_RESULT';
  cards?: Array<{ id: string; balance: number; cardType: CardType }>;
  status?: { stationId: string; isOnline: boolean };
  relayTestResult?: 'ok' | 'failed';
  buttonTestResult?: 'pressed' | 'timeout' | 'error';
  error?: string;
}

export interface TestRelayMsg {
  type: 'TEST_RELAY';
}

export interface TestButtonMsg {
  type: 'TEST_BUTTON';
}

export interface SetFillTimeMsg {
  type: 'SET_FILL_TIME';
  ms: number;
}

export interface GetFillTimeMsg {
  type: 'GET_FILL_TIME';
}

export interface GetLedSettingsMsg {
  type: 'GET_LED_SETTINGS';
}

export interface SetLedBrightnessMsg {
  type: 'SET_LED_BRIGHTNESS';
  value: number;
}

export interface SetLedCountMsg {
  type: 'SET_LED_COUNT';
  value: number;
}

export interface RpiLedBrightnessMsg {
  type: 'LED_BRIGHTNESS';
  value: number;
}

export interface RpiLedCountMsg {
  type: 'LED_COUNT';
  value: number;
}

export type BackendToRpiMessage = GrantPermissionMsg | CancelPermissionMsg | PingMsg | ServiceDiagMsg | TestRelayMsg | TestButtonMsg | SetFillTimeMsg | GetFillTimeMsg | GetLedSettingsMsg | SetLedBrightnessMsg | SetLedCountMsg;
