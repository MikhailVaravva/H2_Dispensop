import { Router, Request, Response } from 'express';
import { handleServiceDiagMessage, exitServiceMode } from '../ws/ws-handler';
import { getStation } from '../services/station.service';
import { getConnection } from '../ws/connection-registry';

const router = Router();

router.post('/:stationId/service', (req: Request, res: Response) => {
  const stationId = String(req.params.stationId);
  const { action, fillTimeMs } = req.body;

  if (!action || !['get_cards', 'get_status', 'test_relay', 'test_button', 'cancel', 'exit', 'set_fill_time'].includes(action)) {
    res.status(400).json({ error: 'Invalid action' });
    return;
  }

  if (action === 'exit') {
    exitServiceMode(stationId);
    res.json({ success: true, message: 'Exited service mode' });
    return;
  }

  if (action === 'set_fill_time') {
    const connection = getConnection(stationId);
    if (connection) {
      connection.send(JSON.stringify({ type: 'SET_FILL_TIME', ms: fillTimeMs }));
    }
    res.json({ success: true, fillTimeMs });
    return;
  }

  handleServiceDiagMessage(stationId, action);
  res.json({ success: true, action });
});

export default router;
