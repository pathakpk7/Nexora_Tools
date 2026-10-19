import React from 'react';
import ReactDOM from 'react-dom/client';
import { LinkSentryPopup } from './Popup';
import '../style.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LinkSentryPopup />
  </React.StrictMode>
);
