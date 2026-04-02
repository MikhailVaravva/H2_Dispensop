import { LastCard } from '../hooks/useStationStatus';

const typeLabel: Record<string, string> = {
  staff: 'Персонал',
  user: 'Пользователь',
  service: 'Сервис',
};

export default function CardStatusPanel({ card }: { card: LastCard }) {
  return (
    <div className="card-status-panel">
      <div className="card-status-title">📇 Последняя карта</div>
      <div className="card-status-row">
        <span className="card-status-label">ID</span>
        <span className="card-status-value">{card.id}</span>
      </div>
      <div className="card-status-row">
        <span className="card-status-label">Тип</span>
        <span className={`card-type-badge type-${card.cardType}`}>{typeLabel[card.cardType]}</span>
      </div>
      {card.cardType === 'user' && (
        <div className="card-status-row">
          <span className="card-status-label">Монет</span>
          <span className="card-status-value">{card.balance ?? 0}</span>
        </div>
      )}
      {card.message && (
        <div className="card-status-msg">{card.message}</div>
      )}
      <div className="card-status-time">{new Date(card.scannedAt).toLocaleTimeString('ru-RU')}</div>
    </div>
  );
}
