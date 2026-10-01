import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@hneudev/flow-player/styles.css';
import './docs.css';
import { App } from './App';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
