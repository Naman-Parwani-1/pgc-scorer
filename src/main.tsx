import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ensureSeed } from './data/db';
import './index.css';

// Seed the Panchkula card before first paint so the app is usable offline immediately.
ensureSeed().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {/* HashRouter: Capacitor serves from a file-style origin where path routing breaks. */}
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  );
});
