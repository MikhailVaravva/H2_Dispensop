import { StationState, StateEvent, TRANSITIONS } from './states';
import { executeTransitionAction } from './actions';
import { log } from '../utils/logger';

export type StateChangeCallback = (from: StationState, to: StationState, event: StateEvent) => void;

export class StateMachine {
  private currentState: StationState = StationState.WAITING;
  private permissionId: string | null = null;
  private expiryTimer: NodeJS.Timeout | null = null;
  private onStateChange: StateChangeCallback | null = null;

  getState(): StationState {
    return this.currentState;
  }

  getPermissionId(): string | null {
    return this.permissionId;
  }

  setOnStateChange(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  async dispatch(event: StateEvent, data?: { permissionId?: string; expiresAt?: string }): Promise<boolean> {
    const from = this.currentState;
    const newState = TRANSITIONS[from]?.[event];

    if (!newState) {
      log('warn', 'Invalid state transition', { from, event });
      return false;
    }

    log('info', 'State transition', { from, to: newState, event });

    // Handle permission data
    if (event === 'GRANT_PERMISSION' && data?.permissionId) {
      this.permissionId = data.permissionId;
      this.startExpiryTimer(data.expiresAt);
    }

    if (newState === StationState.WAITING || newState === StationState.ERROR) {
      this.clearExpiryTimer();
      if (newState === StationState.WAITING) {
        this.permissionId = null;
      }
    }

    // Execute side effects (send serial commands)
    try {
      await executeTransitionAction(from, newState);
    } catch (err) {
      log('error', 'Action failed, forcing error state', { error: (err as Error).message });
      this.currentState = StationState.ERROR;
      this.clearExpiryTimer();
      this.onStateChange?.(from, StationState.ERROR, 'ERROR');
      return false;
    }

    this.currentState = newState;
    this.onStateChange?.(from, newState, event);
    return true;
  }

  private startExpiryTimer(expiresAt?: string) {
    this.clearExpiryTimer();

    let delayMs: number = 60_000; // Default 60s
    if (expiresAt) {
      // Ensure UTC parsing by appending Z if missing
      const ts = expiresAt.endsWith('Z') ? expiresAt : expiresAt + 'Z';
      const parsed = new Date(ts).getTime() - Date.now();
      if (parsed > 0) {
        delayMs = parsed;
      }
    }

    this.expiryTimer = setTimeout(() => {
      if (this.currentState === StationState.PERMISSION_READY) {
        log('info', 'Permission expired locally');
        this.dispatch('TIMEOUT');
      }
    }, delayMs);
  }

  private clearExpiryTimer() {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
