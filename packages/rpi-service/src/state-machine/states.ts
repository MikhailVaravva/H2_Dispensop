export enum StationState {
  WAITING = 'waiting',
  PERMISSION_READY = 'permission_ready',
  FILLING = 'filling',
  ERROR = 'error',
}

export type StateEvent =
  | 'GRANT_PERMISSION'
  | 'CANCEL_PERMISSION'
  | 'BUTTON_PRESSED'
  | 'FILL_DONE'
  | 'TIMEOUT'
  | 'ERROR'
  | 'EMERGENCY_STOP'
  | 'RESET';

// Valid transitions: [currentState][event] -> newState
export const TRANSITIONS: Record<StationState, Partial<Record<StateEvent, StationState>>> = {
  [StationState.WAITING]: {
    GRANT_PERMISSION: StationState.PERMISSION_READY,
    ERROR: StationState.ERROR,
  },
  [StationState.PERMISSION_READY]: {
    BUTTON_PRESSED: StationState.FILLING,
    TIMEOUT: StationState.WAITING,
    CANCEL_PERMISSION: StationState.WAITING,
    ERROR: StationState.ERROR,
    EMERGENCY_STOP: StationState.ERROR,
  },
  [StationState.FILLING]: {
    FILL_DONE: StationState.WAITING,
    ERROR: StationState.ERROR,
    EMERGENCY_STOP: StationState.ERROR,
  },
  [StationState.ERROR]: {
    RESET: StationState.WAITING,
  },
};
