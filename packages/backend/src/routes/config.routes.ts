import { Router, Request, Response } from 'express';
import db from '../db/database';

const router = Router();

router.get('/:key', (req: Request, res: Response) => {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(req.params.key) as { value: string } | undefined;
  res.json({ value: row?.value ?? '' });
});

router.post('/:key', (req: Request, res: Response) => {
  const { value } = req.body;
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(req.params.key, value ?? '');
  res.json({ success: true });
});

export default router;
