import { useState, useEffect, useCallback } from 'react';
import { StationState } from '../hooks/useStationStatus';

interface PourButtonProps {
  stationState: StationState;
  expiresAt: string | null;
  isRequesting: boolean;
  error: string | null;
  onPour: () => void;
  onReset: () => void;
}

export default function PourButton({
  stationState,
  expiresAt,
  isRequesting,
  error,
  onPour,
  onReset,
}: PourButtonProps) {
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (stationState !== 'permission_active' || !expiresAt) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt + 'Z').getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setCountdown(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [stationState, expiresAt]);

  const handleClick = useCallback(() => {
    if (stationState === 'waiting') {
      onPour();
    } else if (stationState === 'done' || stationState === 'error') {
      onReset();
    }
  }, [stationState, onPour, onReset]);

  const getButtonContent = () => {
    if (isRequesting) {
      return { text: 'Подключение...', className: 'btn-requesting', disabled: true };
    }

    switch (stationState) {
      case 'loading':
        return { text: 'Загрузка...', className: 'btn-loading', disabled: true };
      case 'waiting':
        return { text: 'Налить', className: 'btn-pour', disabled: false };
      case 'permission_active':
        return {
          text: countdown !== null
            ? `Нажмите кнопку на аппарате \u00B7 ${countdown}с`
            : 'Нажмите кнопку на аппарате',
          className: 'btn-active',
          disabled: true,
        };
      case 'filling':
        return { text: 'Наливаем воду...', className: 'btn-filling', disabled: true };
      case 'done':
        return { text: 'Готово!', className: 'btn-done', disabled: false };
      case 'error':
        return { text: error || 'Ошибка', className: 'btn-error', disabled: false };
      case 'offline':
        return { text: 'Станция недоступна', className: 'btn-offline', disabled: true };
      case 'service_mode':
        return { text: 'Режим диагностики', className: 'btn-service', disabled: true };
      default:
        return { text: 'Налить', className: 'btn-pour', disabled: false };
    }
  };

  const { text, className, disabled } = getButtonContent();

  return (
    <div className="pour-button-container">
      <button
        className={`pour-button ${className}`}
        onClick={handleClick}
        disabled={disabled || isRequesting}
      >
        <span className="button-text">{text}</span>
      </button>

      {stationState === 'permission_active' && (
        <div className="permission-hint">
          Разрешение выдано
        </div>
      )}

      {stationState === 'done' && (
        <button className="retry-link" onClick={onReset}>
          Налить ещё
        </button>
      )}
      {stationState === 'error' && (
        <button className="retry-link" onClick={onReset}>
          Попробовать снова
        </button>
      )}
    </div>
  );
}
