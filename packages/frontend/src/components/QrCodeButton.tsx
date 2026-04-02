import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Props { url: string; }

export default function QrCodeButton({ url }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="qr-corner" onClick={() => setExpanded(true)} title="Открыть на телефоне">
        <QRCodeSVG value={url} size={288} />
      </div>

      {expanded && (
        <div className="qr-overlay" onClick={() => setExpanded(false)}>
          <div className="qr-popup" onClick={e => e.stopPropagation()}>
            <QRCodeSVG value={url} size={220} />
            <div className="qr-url">{url}</div>
            <button className="qr-close" onClick={() => setExpanded(false)}>✕ Закрыть</button>
          </div>
        </div>
      )}
    </>
  );
}
