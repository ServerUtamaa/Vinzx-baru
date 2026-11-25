import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/600.css';
import '@fontsource/roboto/700.css';
import '@fontsource/roboto/800.css';
import '@fontsource/roboto/900.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import App from './App';
import { initAutoUpdater } from './utils/autoUpdater';

// Initialize automatic PWA/APK update & cache-invalidation engine
initAutoUpdater();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

(window as unknown as { __VINZX_MOUNTED__?: boolean }).__VINZX_MOUNTED__ = true;

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
