import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/', (_req, res) => {
  const dir = path.join(__dirname, '../../public/videos');
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter(f => f.endsWith('.mp4'));
  } catch {
    files = [];
  }
  res.json(files.map(name => ({ name, url: `/videos/${name}` })));
});

export default router;
