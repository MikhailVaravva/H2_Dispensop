import { useState, useEffect } from 'react';

const themes = [
  { id: 'default', name: 'Gradient', emoji: '1' },
  { id: 'dark', name: 'Dark', emoji: '2' },
];

export default function ThemeSwitcher() {
  const [current, setCurrent] = useState(() => {
    return localStorage.getItem('dispenser-theme') || 'default';
  });

  useEffect(() => {
    if (current === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', current);
    }
    localStorage.setItem('dispenser-theme', current);
  }, [current]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '6px',
      padding: '6px',
      borderRadius: '16px',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(12px)',
      zIndex: 9999,
    }}>
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setCurrent(t.id)}
          title={t.name}
          style={{
            width: '40px',
            height: '36px',
            borderRadius: '10px',
            border: current === t.id ? '2px solid white' : '2px solid transparent',
            background: current === t.id ? 'rgba(255,255,255,0.2)' : 'transparent',
            color: 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {t.emoji}
        </button>
      ))}
    </div>
  );
}
