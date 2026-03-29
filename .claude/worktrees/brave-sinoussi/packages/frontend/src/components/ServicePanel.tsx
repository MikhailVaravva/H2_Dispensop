import { useState, useCallback } from 'react';
import { callServiceDiag, ServiceDiagAction } from '../services/api';
import { ServiceDiagData, ServiceCard } from '../hooks/useStationStatus';

interface ServicePanelProps {
  stationId: string;
  diagData: ServiceDiagData;
}

export default function ServicePanel({ stationId, diagData }: ServicePanelProps) {
  const [loading, setLoading] = useState<ServiceDiagAction | null>(null);

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

  const cardTypeLabel: Record<ServiceCard['cardType'], string> = {
    service: 'Сервис',
    staff: 'Персонал',
    user: 'Пользователь',
  };

  return (
    <div className="service-panel">
      <div className="service-panel-title">Режим диагностики</div>

      <div className="service-panel-buttons">
        <button
          className="service-btn"
          onClick={() => runAction('get_cards')}
          disabled={loading !== null}
        >
          {loading === 'get_cards' ? '...' : 'Карты'}
        </button>

        <button
          className="service-btn"
          onClick={() => runAction('get_status')}
          disabled={loading !== null}
        >
          {loading === 'get_status' ? '...' : 'Статус'}
        </button>

        <button
          className="service-btn"
          onClick={() => runAction('test_relay')}
          disabled={loading !== null}
        >
          {loading === 'test_relay' ? '...' : 'Тест реле'}
        </button>

        <button
          className="service-btn service-btn-exit"
          onClick={() => runAction('cancel')}
          disabled={loading !== null}
        >
          Выход
        </button>
      </div>

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
                {diagData.cards.map((card) => (
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
