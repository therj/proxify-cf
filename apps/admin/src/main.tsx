import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import faviconUrl from './assets/favicon.svg?url';

if (!document.querySelector('link[rel="icon"][data-app-favicon]')) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = faviconUrl;
  link.dataset.appFavicon = '1';
  document.head.appendChild(link);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
