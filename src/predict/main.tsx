import React from 'react';
import ReactDOM from 'react-dom/client';
import AppCasino from './AppCasino';
import '../app/casino.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppCasino />
  </React.StrictMode>,
);

