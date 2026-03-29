import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || './data/dispenser.db',
  rpiAuthToken: process.env.RPI_AUTH_TOKEN || 'changeme',
  permissionTtlSeconds: parseInt(process.env.PERMISSION_TTL_SECONDS || '60', 10),
  fillDurationMs: parseInt(process.env.FILL_DURATION_MS || '4200', 10),
};
