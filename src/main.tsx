import React, { StrictMode, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 全局第三方资源与跨域脚本安全守护，防止未捕获异常泄露阻断
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // 捕获并静默外链第三方资源网络抖动、媒体阻断或跨域限制
    if (
      event.message === 'Script error.' ||
      event.filename === '' ||
      event.target instanceof HTMLScriptElement ||
      event.target instanceof HTMLAudioElement ||
      event.target instanceof HTMLVideoElement
    ) {
      event.preventDefault?.();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    // 拦截 Audio play()、剪贴板权限、异步网络等未捕获 Promise 异常
    event.preventDefault?.();
  });
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
}

class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('捕获到组件渲染异常:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#FAF8F5] text-[#2B332E] flex items-center justify-center p-6 font-serif select-none z-[999999]">
          <div className="max-w-sm w-full bg-white p-6 rounded-3xl border border-[#5B7B6D]/20 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#5B7B6D]/10 text-[#5B7B6D] flex items-center justify-center mx-auto text-xl font-bold">
              拾
            </div>
            <h3 className="font-bold text-base text-[#2B332E]">时光画卷稍歇</h3>
            <p className="text-xs text-[#6E7C75] leading-relaxed">
              页面加载遇到微小波动，轻触下方按钮即可重新唤醒记忆长卷。
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-2.5 rounded-xl bg-[#5B7B6D] text-white font-bold text-xs hover:bg-[#3E564B] transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              重新唤醒
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);
