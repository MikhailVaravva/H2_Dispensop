import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './themes/theme1-minimal.css';
import './themes/theme2-dark.css';
import './themes/theme3-glass.css';
import './themes/theme4-industrial.css';
import './themes/theme5-nature.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
