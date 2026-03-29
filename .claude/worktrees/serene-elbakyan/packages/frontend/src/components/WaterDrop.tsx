import { StationState } from '../hooks/useStationStatus';

interface WaterDropProps {
  state: StationState;
}

const stateColors: Record<StationState, { fill: string; opacity: number }> = {
  loading: { fill: '#CBD5E1', opacity: 0.5 },
  waiting: { fill: '#0066FF', opacity: 0.8 },
  permission_active: { fill: '#00C853', opacity: 1 },
  filling: { fill: '#0066FF', opacity: 1 },
  done: { fill: '#00C853', opacity: 1 },
  error: { fill: '#FF3B30', opacity: 0.7 },
  offline: { fill: '#94A3B8', opacity: 0.4 },
  service_mode: { fill: '#FF9500', opacity: 1 },
};

export default function WaterDrop({ state }: WaterDropProps) {
  const { fill, opacity } = stateColors[state] || stateColors.waiting;
  const isFilling = state === 'filling';

  return (
    <div className="water-drop-wrapper">
      <div className={`water-drop-bg state-${state}`}>
        <svg
          className={`water-drop-svg ${isFilling ? 'fill-wave' : ''}`}
          viewBox="0 0 100 120"
          width="90"
          height="108"
          style={{ opacity }}
        >
          <defs>
            <linearGradient id="dropGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity="0.8" />
              <stop offset="100%" stopColor={fill} stopOpacity="1" />
            </linearGradient>
            <radialGradient id="shine" cx="35%" cy="30%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Drop shape */}
          <path
            d="M50 8 C50 8 15 55 15 72 C15 90 30 107 50 107 C70 107 85 90 85 72 C85 55 50 8 50 8Z"
            fill="url(#dropGrad)"
          />
          {/* Glossy shine */}
          <path
            d="M50 8 C50 8 15 55 15 72 C15 90 30 107 50 107 C70 107 85 90 85 72 C85 55 50 8 50 8Z"
            fill="url(#shine)"
          />
          {/* Small highlight */}
          <ellipse cx="38" cy="60" rx="8" ry="12" fill="white" opacity="0.2" />
        </svg>
      </div>

      <div className="volume-badge">500 мл</div>
    </div>
  );
}
