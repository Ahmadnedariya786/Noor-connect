import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BUILD_COMMIT } from '@/buildInfo';
import { recordDiagnosticEvent, cleanStackTrace, extractErrorNameAndCleanMessage } from '@/lib/diagnostics-engine';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught application render error:', error, errorInfo);

    // Unconditionally remove pre-React splash layers and release scroll lock
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('splash-active');
        document.body.classList.remove('splash-active');
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
        document.documentElement.style.touchAction = 'auto';
        document.body.style.touchAction = 'auto';
        document.documentElement.style.overscrollBehavior = 'auto';
        document.body.style.overscrollBehavior = 'auto';
        const elInitial = document.getElementById('initial-splash');
        if (elInitial) elInitial.remove();
        const elStatic = document.getElementById('static-splash');
        if (elStatic) elStatic.remove();
      }
    } catch (e) {
      console.warn('[AppErrorBoundary] Failed to clean up splash state:', e);
    }

    try {
      const commit = BUILD_COMMIT || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_COMMIT) || 'unknown';
      recordDiagnosticEvent({
        category: 'REACT_CRASH',
        type: 'app-root-boundary',
        message: error?.message || String(error),
        stack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        time: new Date().toISOString(),
        commit,
      });
    } catch (e) {
      console.warn('[AppErrorBoundary] Failed to record diagnostic crash event:', e);
    }

    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndRestart = () => {
    try {
      const preservePrefixes = [
        'qaza',
        'noor_qaza',
        'quran',
        'mushaf',
        'bookmark',
        'noor-theme',
        'noor_theme',
        'theme',
        'user_settings',
        'noor_user_preferences',
        'user_location',
        'location',
        'tasbeeh',
        'hadith',
        'owner',
        'haidh',
      ];

      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const lower = key.toLowerCase();
            const shouldPreserve = preservePrefixes.some(p => lower.includes(p));
            if (!shouldPreserve) {
              keysToRemove.push(key);
            }
          }
        }
        for (const k of keysToRemove) {
          localStorage.removeItem(k);
        }
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      if (typeof window !== 'undefined' && 'caches' in window) {
        window.caches.keys().then((names) => {
          names.forEach((name) => {
            window.caches.delete(name);
          });
        }).catch((err) => {
          console.warn('[AppErrorBoundary] caches.delete fallback:', err);
        });
      }
    } catch (e) {
      console.warn('[AppErrorBoundary] Cache cleanup failed:', e);
    }

    window.location.reload();
  };

  handleCopyReport = () => {
    try {
      const err = this.state.error;
      const { errorName, cleanMessage } = extractErrorNameAndCleanMessage(err?.message || String(err));
      const route = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
      const commit = BUILD_COMMIT || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_COMMIT) || 'unknown';

      let md = `### Noor Connect — Crash Forensic Report\n`;
      md += `- **Error:** \`${errorName}: ${cleanMessage}\`\n`;
      md += `- **Route:** \`${route}\`\n`;
      md += `- **Commit:** \`${commit}\`\n`;
      md += `- **Timestamp:** ${new Date().toISOString()}\n`;
      if (this.state.errorInfo?.componentStack) {
        md += `\n**React Component Stack:**\n\`\`\`text\n${this.state.errorInfo.componentStack.trim()}\n\`\`\`\n`;
      }
      if (err?.stack) {
        md += `\n**Stack Trace:**\n\`\`\`text\n${cleanStackTrace(err.stack)}\n\`\`\`\n`;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(md);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      }
    } catch (e) {
      console.warn('[AppErrorBoundary] Clipboard copy failed:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const errMessage = err?.message || 'An unexpected error interrupted application mounting.';
      const errName = err?.name || 'Error';

      return (
        <div
          style={{
            minHeight: '100vh',
            width: '100vw',
            backgroundColor: '#050914',
            color: '#F8FAFC',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#0E1424',
              borderRadius: '24px',
              border: '1px solid rgba(226, 232, 240, 0.16)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
              padding: '28px 20px',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}
          >
            {/* Header Icon */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#F87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '28px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              ⚠️
            </div>

            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px', color: '#F8FAFC' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 20px', lineHeight: 1.5 }}>
              Noor Connect encountered an unexpected issue during render. Your Quran and Qaza progress remain safely preserved locally.
            </p>

            {/* Error Diagnostics Box */}
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '14px',
                padding: '12px 14px',
                textAlign: 'left',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                Forensic Diagnostics
              </div>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FEE2E2',
                  margin: 0,
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                }}
              >
                {errName}: {errMessage}
              </p>
              {err?.stack && (
                <pre
                  style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    color: 'rgba(241, 245, 249, 0.75)',
                    backgroundColor: 'rgba(5, 9, 20, 0.6)',
                    padding: '8px',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: 0,
                    maxHeight: '80px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {cleanStackTrace(err.stack).split('\n').slice(0, 3).join('\n')}
                </pre>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: '#C8B89A',
                  color: '#050914',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>🔄</span>
                <span>Reload App</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndRestart}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '14px',
                  border: '1px solid rgba(226, 232, 240, 0.22)',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: '#E2E8F0',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>🧹</span>
                <span>Clear Cache & Restart</span>
              </button>

              <button
                type="button"
                onClick={this.handleCopyReport}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#94A3B8',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {this.state.copied ? '✓ Forensic Report Copied!' : '📋 Copy Error Report'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
