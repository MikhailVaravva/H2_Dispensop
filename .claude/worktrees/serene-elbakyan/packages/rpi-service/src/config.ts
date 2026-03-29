import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  stationId: process.env.STATION_ID || 'station-001',
  backendUrl: process.env.BACKEND_WS_URL || 'ws://192.168.1.11:3000',
  authToken: process.env.RPI_AUTH_TOKEN || 'changeme',
  serialPort: process.env.SERIAL_PORT || '/dev/ttyUSB0',
  serialBaudRate: parseInt(process.env.SERIAL_BAUD_RATE || '9600', 10),
  commandTimeoutMs: parseInt(process.env.COMMAND_TIMEOUT_MS || '2000', 10),
  nfcReaderDevice: process.env.NFC_READER_DEVICE || null,
};
