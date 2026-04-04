import { Router, Request, Response } from 'express';
import { handleServiceDiagMessage, exitServiceMode, enterServiceModeManually } from '../ws/ws-handler';
import { getStation } from '../services/station.service';
import { getConnection } from '../ws/connection-registry';
import { log } from '../utils/logger';

const router = Router();

router.post('/:stationId/service', (req: Request, res: Response) => {
  const stationId = String(req.params.stationId);
  const { action, fillTimeMs } = req.body;
  log('info', 'Service action received', { stationId, action, fillTimeMs });

  if (!action || !['get_cards', 'get_status', 'test_relay', 'test_button', 'cancel', 'exit', 'set_fill_time', 'get_fill_time', 'get_led_settings', 'set_led_brightness', 'set_led_count', 'enter'].includes(action)) {
    res.status(400).json({ error: 'Invalid action' });
    return;
  }

  if (action === 'exit') {
    exitServiceMode(stationId);
    res.json({ success: true, message: 'Exited service mode' });
    return;
  }

  if (action === 'enter') {
    enterServiceModeManually(stationId);
    res.json({ success: true, message: 'Entered service mode' });
    return;
  }

  if (action === 'set_fill_time') {
    const connection = getConnection(stationId);
    log('info', 'SET_FILL_TIME connection check', { stationId, hasConnection: !!connection });
    if (connection) {
      log('info', 'Sending SET_FILL_TIME to RPi', { stationId, ms: fillTimeMs });
      connection.send(JSON.stringify({ type: 'SET_FILL_TIME', ms: fillTimeMs }));
    }
    res.json({ success: true, fillTimeMs });
    return;
  }

  if (action === 'get_fill_time') {
    const connection = getConnection(stationId);
    log('info', 'GET_FILL_TIME connection check', { stationId, hasConnection: !!connection });
    if (connection) {
      log('info', 'Sending GET_FILL_TIME to RPi', { stationId });
      connection.send(JSON.stringify({ type: 'GET_FILL_TIME' }));
    }
    res.json({ success: true, action: 'get_fill_time' });
    return;
  }

  if (action === 'get_led_settings') {
    const connection = getConnection(stationId);
    if (connection) connection.send(JSON.stringify({ type: 'GET_LED_SETTINGS' }));
    res.json({ success: true, action });
    return;
  }

  if (action === 'set_led_brightness') {
    const connection = getConnection(stationId);
    if (connection) connection.send(JSON.stringify({ type: 'SET_LED_BRIGHTNESS', value: req.body.value }));
    res.json({ success: true, action, value: req.body.value });
    return;
  }

  if (action === 'set_led_count') {
    const connection = getConnection(stationId);
    if (connection) connection.send(JSON.stringify({ type: 'SET_LED_COUNT', value: req.body.value }));
    res.json({ success: true, action, value: req.body.value });
    return;
  }

  handleServiceDiagMessage(stationId, action);
  res.json({ success: true, action });
});

export default router;
