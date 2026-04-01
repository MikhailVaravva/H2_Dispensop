import express from 'express';
import cors from 'cors';
import path from 'path';
import stationRoutes from './routes/station.routes';
import permissionRoutes from './routes/permission.routes';
import serviceRoutes from './routes/service.routes';
import configRoutes from './routes/config.routes';
import { errorHandler } from './middleware/error-handler';

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/stations', stationRoutes);
app.use('/api/stations', permissionRoutes);
app.use('/api/stations', serviceRoutes);
app.use('/api/config', configRoutes);

// Serve frontend in production
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('/station/*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Error handler
app.use(errorHandler);

export default app;
