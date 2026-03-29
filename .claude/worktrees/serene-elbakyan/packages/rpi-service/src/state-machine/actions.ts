import { SerialCommand } from '@dispenser/shared';
import { StationState, StateEvent } from './states';
import { sendCommand } from '../serial/command-sender';
import { log } from '../utils/logger';

// Side effects for state transitions
type TransitionKey = `${StationState}->${StationState}`;

const transitionActions: Partial<Record<TransitionKey, () => Promise<void>>> = {
  // Permission received → enable button, green LED
  [`${StationState.WAITING}->${StationState.PERMISSION_READY}`]: async () => {
    await sendCommand(SerialCommand.SET_GREEN);
    await sendCommand(SerialCommand.ENABLE_BUTTON);
  },

  // Button pressed → start fill, disable button, red LED
  [`${StationState.PERMISSION_READY}->${StationState.FILLING}`]: async () => {
    await sendCommand(SerialCommand.DISABLE_BUTTON);
    await sendCommand(SerialCommand.SET_RED);
    await sendCommand(SerialCommand.START_FILL_500ML);
  },

  // Fill done → back to waiting (LED already red from filling state)
  [`${StationState.FILLING}->${StationState.WAITING}`]: async () => {
    await sendCommand(SerialCommand.SET_RED);
    await sendCommand(SerialCommand.DISABLE_BUTTON);
  },

  // Permission timeout → red LED, disable button
  [`${StationState.PERMISSION_READY}->${StationState.WAITING}`]: async () => {
    await sendCommand(SerialCommand.SET_RED);
    await sendCommand(SerialCommand.DISABLE_BUTTON);
  },

  // Any → Error: emergency stop
  [`${StationState.PERMISSION_READY}->${StationState.ERROR}`]: async () => {
    await sendCommand(SerialCommand.STOP_FILL);
    await sendCommand(SerialCommand.SET_RED);
    await sendCommand(SerialCommand.DISABLE_BUTTON);
  },

  [`${StationState.FILLING}->${StationState.ERROR}`]: async () => {
    await sendCommand(SerialCommand.STOP_FILL);
    await sendCommand(SerialCommand.SET_RED);
    await sendCommand(SerialCommand.DISABLE_BUTTON);
  },

  [`${StationState.WAITING}->${StationState.ERROR}`]: async () => {
    await sendCommand(SerialCommand.STOP_FILL);
    await sendCommand(SerialCommand.SET_RED);
    await sendCommand(SerialCommand.DISABLE_BUTTON);
  },

  // Error reset → back to waiting, red LED
  [`${StationState.ERROR}->${StationState.WAITING}`]: async () => {
    await sendCommand(SerialCommand.RESET_ERROR);
    await sendCommand(SerialCommand.SET_RED);
    await sendCommand(SerialCommand.DISABLE_BUTTON);
  },
};

export async function executeTransitionAction(from: StationState, to: StationState): Promise<void> {
  const key: TransitionKey = `${from}->${to}`;
  const action = transitionActions[key];
  if (action) {
    try {
      await action();
    } catch (err) {
      log('error', 'Transition action failed', { from, to, error: (err as Error).message });
      throw err;
    }
  }
}
