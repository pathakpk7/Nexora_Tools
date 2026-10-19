import React from 'react';
import ReactDOM from 'react-dom/client';
import { FormFillDashboard } from './Dashboard';
import '../style.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <FormFillDashboard />
  </React.StrictMode>
);
