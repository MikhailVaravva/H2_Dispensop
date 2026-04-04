import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StationPage from './pages/StationPage';
import DemoPage from './pages/DemoPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/station/:stationId" element={<StationPage />} />
        <Route path="*" element={<Navigate to="/station/station-001" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
