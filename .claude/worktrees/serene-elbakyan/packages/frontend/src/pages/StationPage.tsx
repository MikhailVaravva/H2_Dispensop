import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useStationStatus, SerialLogEntry } from '../hooks/useStationStatus';
import { usePourPermission } from '../hooks/usePourPermission';
import { fetchStation, StationInfo } from '../services/api';
import StatusDisplay from '../components/StatusDisplay';
import PourButton from '../components/PourButton';
import WaterDrop from '../components/WaterDrop';
import ServicePanel from '../components/ServicePanel';

export default function StationPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const [station, setStation] = useState<StationInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { state, expiresAt, isConnected, diagData, serialLog } = useStationStatus(stationId!);
  const { pour, isRequesting, error: pourError, reset } = usePourPermission(stationId!);
  const [showSerialLog, setShowSerialLog] = useState(true);
  const [hideMainLog, setHideMainLog] = useState(() => localStorage.getItem('hideMainLog') === 'true');
  const serialLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStorage = () => {
      setHideMainLog(localStorage.getItem('hideMainLog') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (serialLogRef.current) {
      serialLogRef.current.scrollTop = serialLogRef.current.scrollHeight;
    }
  }, [serialLog]);

  useEffect(() => {
    fetchStation(stationId!)
      .then(setStation)
      .catch((err) => setLoadError(err.message));
  }, [stationId]);

  if (loadError) {
    return (
      <div className="page-container">
        <div className="error-page">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <h1>Станция не найдена</h1>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="page-container">
        <div className="loading-page">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <StatusDisplay
        stationName={station.name}
        isConnected={isConnected}
        isOnline={station.isOnline}
      />

      <div className="main-content">
        {state === 'service_mode' ? (
          <ServicePanel 
            stationId={stationId!} 
            diagData={diagData}
          />
        ) : (
          <>
            <WaterDrop state={state} />

            <PourButton
              stationState={state}
              expiresAt={expiresAt}
              isRequesting={isRequesting}
              error={pourError}
              onPour={pour}
              onReset={reset}
            />
          </>
        )}
      </div>

      {state !== 'service_mode' && !hideMainLog && (
        <div className="serial-log-panel">
          <button
            className="serial-log-toggle"
            onClick={() => setShowSerialLog(v => !v)}
          >
            📟 Лог ESP32 {showSerialLog ? '▲' : '▼'}
          </button>
          {showSerialLog && (
            <div className="serial-log" ref={serialLogRef}>
              {serialLog.length === 0 ? (
                <div className="serial-log-empty">Нет данных</div>
              ) : (
                serialLog.map((entry: SerialLogEntry, index: number) => (
                  <div key={index} className={`serial-log-entry ${entry.direction}`}>
                    <span className="serial-time">{entry.time.split('T')[1]?.split('.')[0]}</span>
                    <span className="serial-dir">{entry.direction === 'in' ? '←' : '→'}</span>
                    <span className="serial-data">{entry.data}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="footer">
        <p className="volume-info">Станция рефила воды</p>
      </div>
    </div>
  );
}
