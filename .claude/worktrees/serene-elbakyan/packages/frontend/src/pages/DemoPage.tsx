import { useState } from 'react';
import { StationState } from '../hooks/useStationStatus';
import StatusDisplay from '../components/StatusDisplay';
import PourButton from '../components/PourButton';
import WaterDrop from '../components/WaterDrop';

const ALL_STATES: { state: StationState; label: string; isOnline: boolean }[] = [
  { state: 'offline', label: 'Станция не в сети', isOnline: false },
  { state: 'waiting', label: 'Ожидание — готова к работе', isOnline: true },
  { state: 'permission_active', label: 'Разрешение выдано', isOnline: true },
  { state: 'filling', label: 'Идёт налив воды', isOnline: true },
  { state: 'done', label: 'Налив завершён', isOnline: true },
  { state: 'error', label: 'Ошибка', isOnline: true },
];

export default function DemoPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = ALL_STATES[currentIndex];

  const goNext = () => setCurrentIndex((i) => (i + 1) % ALL_STATES.length);
  const goPrev = () => setCurrentIndex((i) => (i - 1 + ALL_STATES.length) % ALL_STATES.length);

  const fakeExpiresAt = new Date(Date.now() + 45000).toISOString().replace('Z', '');

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* State indicator bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        color: 'white',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontFamily: '-apple-system, sans-serif',
      }}>
        <button onClick={goPrev} style={navBtnStyle}>&larr;</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '2px' }}>
            ДЕМО — Экран {currentIndex + 1} из {ALL_STATES.length}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>
            {current.label}
          </div>
        </div>
        <button onClick={goNext} style={navBtnStyle}>&rarr;</button>
      </div>

      {/* Dots */}
      <div style={{
        position: 'fixed',
        top: '56px',
        left: 0,
        right: 0,
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
        padding: '8px',
      }}>
        {ALL_STATES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            style={{
              width: i === currentIndex ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              border: 'none',
              background: i === currentIndex ? 'white' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Actual page content */}
      <div className="page-container" style={{ paddingTop: '80px' }}>
        <StatusDisplay
          stationName="Станция 1"
          isConnected={current.isOnline}
          isOnline={current.isOnline}
        />

        <div className="main-content">
          <WaterDrop state={current.state} />

          <PourButton
            stationState={current.state}
            expiresAt={current.state === 'permission_active' ? fakeExpiresAt : null}
            isRequesting={false}
            error={current.state === 'error' ? 'Потеряна связь с контроллером' : null}
            onPour={() => setCurrentIndex(2)}
            onReset={() => setCurrentIndex(1)}
          />
        </div>

        <div className="footer">
          <p className="volume-info">Станция рефила воды</p>
        </div>
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  color: 'white',
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
