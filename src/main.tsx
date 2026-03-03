import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './walletconnect.css';
import './index.css';

// Error boundary to catch and display runtime crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#ff4444', fontFamily: 'monospace', background: '#111', minHeight: '100vh' }}>
          <h1 style={{ color: '#ff6666' }}>Runtime Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#888', fontSize: 12, marginTop: 20 }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (e) {
  // If crash happens during initial render/import
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:40px;color:#ff4444;font-family:monospace;background:#111;min-height:100vh">
      <h1 style="color:#ff6666">Init Error</h1>
      <pre>${e instanceof Error ? e.message + '\n\n' + e.stack : String(e)}</pre>
    </div>`;
  }
}
