import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL REACT CRASH CAUGHT BY ERROR BOUNDARY:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid #334155',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f87171', marginBottom: '8px' }}>
              Si è verificato un errore temporaneo nell'applicazione
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
              L'applicazione ha intercettato l'errore ed è pronta per ripartire in sicurezza.
            </p>
            <div style={{
              backgroundColor: '#0f172a',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#cbd5e1',
              textAlign: 'left',
              marginBottom: '20px',
              overflowX: 'auto',
              maxHeight: '120px'
            }}>
              {this.state.error?.message || 'Errore non specificato'}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
              }}
            >
              🔄 Ricarica Applicazione
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration skipped or failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
