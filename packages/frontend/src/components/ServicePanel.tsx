import { useState, useCallback, useEffect, useRef } from 'react';
import { callServiceDiag, ServiceDiagAction, setFillTime as apiSetFillTime } from '../services/api';
import { ServiceDiagData, ServiceCard, SerialLogEntry } from '../hooks/useStationStatus';
import ThemeSwitcher from './ThemeSwitcher';

interface ServicePanelProps {
  stationId: string;
  diagData: ServiceDiagData;
}

export default function ServicePanel({ stationId, diagData }: ServicePanelProps) {
  const [loading, setLoading] = useState<ServiceDiagAction | null>(null);
  const [showSerialLog, setShowSerialLog] = useState(false);
  const [fillTime, setFillTime] = useState(diagData.fillTimeMs ?? 5000);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (diagData.fillTimeMs !== null) {
      setFillTime(diagData.fillTimeMs);
    }
  }, [diagData.fillTimeMs]);

  const runAction = useCallback(async (action: ServiceDiagAction) => {
    setLoading(action);
    try {
      await callServiceDiag(stationId, action);
    } catch (err) {
      console.error('Service diag error:', err);
    } finally {
      setLoading(null);
    }
  }, [stationId]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [diagData.serialLog]);

  const cardTypeLabel: Record<ServiceCard['cardType'], string> = {
    service: 'Сервис',
    staff: 'Персонал',
    user: 'Пользователь',
  };

  return (
    <div className="service-panel">
      <div className="service-panel-title">🔧 Режим диагностики</div>

      <div className="service-panel-buttons">
        <button
          className="service-btn"
          onClick={() => runAction('get_cards')}
          disabled={loading !== null}
        >
          {loading === 'get_cards' ? '⏳' : '📋'} Карты
        </button>

        <button
          className="service-btn"
          onClick={() => runAction('get_status')}
          disabled={loading !== null}
        >
          {loading === 'get_status' ? '⏳' : '📶'} Статус
        </button>

        <button
          className="service-btn"
          onClick={() => { runAction('test_relay'); setShowSerialLog(true); }}
          disabled={loading !== null}
        >
          {loading === 'test_relay' ? '⏳' : '🔌'} Тест реле
        </button>

        <button
          className="service-btn"
          onClick={() => { runAction('test_button'); setShowSerialLog(true); }}
          disabled={loading !== null}
        >
          {loading === 'test_button' ? '⏳' : '🔘'} Тест кнопки
        </button>

        <div className="fill-time-control">
          <label>Время налива: {fillTime} мс ({(fillTime/1000).toFixed(1)} сек)</label>
          <input
            type="range"
            min="1000"
            max="30000"
            step="1000"
            value={fillTime}
            onChange={(e) => setFillTime(Number(e.target.value))}
          />
          <button
            className="service-btn"
            style={{ marginTop: '12px', background: '#FF9500', borderColor: '#FF9500', color: '#fff' }}
            onClick={() => { apiSetFillTime(stationId, fillTime); setShowSerialLog(true); }}
          >
            💾 Сохранить
          </button>
        </div>

        <div className="fill-time-control">
          <label>Тема оформления</label>
          <ThemeSwitcher inline />
        </div>

        <button
          className="service-btn"
          onClick={() => setShowSerialLog(!showSerialLog)}
        >
          📟 Лог {showSerialLog ? '▲' : '▼'}
        </button>

        <button
          className="service-btn service-btn-exit"
          onClick={() => runAction('cancel')}
          disabled={loading !== null}
        >
          ❌ Выход
        </button>
      </div>

      {showSerialLog && diagData.serialLog && (
        <div className="serial-log" ref={logRef}>
          {diagData.serialLog.length === 0 ? (
            <div className="serial-log-empty">Нет данных. Нажмите "Тест реле" для отправки команды.</div>
          ) : (
            diagData.serialLog.map((entry: SerialLogEntry, index: number) => (
              <div key={index} className={`serial-log-entry ${entry.direction}`}>
                <span className="serial-time">{entry.time.split('T')[1]?.split('.')[0]}</span>
                <span className="serial-dir">{entry.direction === 'in' ? '←' : '→'}</span>
                <span className="serial-data">{entry.data}</span>
              </div>
            ))
          )}
        </div>
      )}

      {diagData.relayTestResult && (
        <div className={`service-result relay-${diagData.relayTestResult}`}>
          {diagData.relayTestResult === 'testing' && 'Тестирование реле...'}
          {diagData.relayTestResult === 'ok' && '✓ Реле работает'}
          {diagData.relayTestResult === 'failed' && '✗ Реле не ответило'}
        </div>
      )}

{diagData.isOnline !== null && diagData.relayTestResult === null && (
        <div className={`service-result status-${diagData.isOnline ? 'online' : 'offline'}`}>
          {diagData.isOnline ? '✓ Станция онлайн' : '✗ Станция офлайн'}
        </div>
      )}

      {diagData.cards !== null && (
        <div className="service-cards">
          {diagData.cards.length === 0 ? (
            <div className="service-result">Карты не найдены</div>
          ) : (
            <table className="cards-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Тип</th>
                  <th>Баланс</th>
                </tr>
              </thead>
              <tbody>
                {diagData.cards.map((card: ServiceCard) => (
                  <tr key={card.id}>
                    <td className="card-id">{card.id}</td>
                    <td>
                      <span className={`card-type-badge type-${card.cardType}`}>
                        {cardTypeLabel[card.cardType]}
                      </span>
                    </td>
                    <td>{card.cardType === 'user' ? card.balance : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="service-hint">Приложите карту повторно для выхода</div>
    </div>
  );
}
