interface StatusDisplayProps {
  stationName: string;
  isConnected: boolean;
  isOnline: boolean;
}

export default function StatusDisplay({ stationName, isConnected, isOnline }: StatusDisplayProps) {
  const online = isConnected && isOnline;
  return (
    <div className="status-display">
      <div className="station-name">{stationName}</div>
      <div className="connection-status">
        <span className={`status-dot ${online ? 'online' : 'offline'}`} />
        <span className="status-text">
          {online ? 'На связи' : 'Не в сети'}
        </span>
      </div>
    </div>
  );
}
