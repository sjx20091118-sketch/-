import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 全局第三方资源与跨域脚本安全守护
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message === 'Script error.' || event.filename === '' || event.target instanceof HTMLScriptElement || event.target instanceof HTMLAudioElement) {
      // 捕获并静默外链第三方资源网络抖动或跨域限制，防止阻断应用运行
      event.preventDefault?.();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('play()') || event.reason?.name === 'NotAllowedError' || event.reason?.name === 'AbortError') {
      event.preventDefault?.();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
