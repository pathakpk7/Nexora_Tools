import React from 'react';
import ReactDOM from 'react-dom/client';
import { TabMindDashboard } from './Dashboard';
import '../style.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TabMindDashboard />
  </React.StrictMode>
);
