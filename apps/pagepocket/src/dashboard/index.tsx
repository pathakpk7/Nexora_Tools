import React from 'react';
import ReactDOM from 'react-dom/client';
import { PagePocketDashboard } from './Dashboard';
import '../style.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PagePocketDashboard />
  </React.StrictMode>
);
