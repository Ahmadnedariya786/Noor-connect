import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { recordDiagnosticEvent, cleanStackTrace, extractErrorNameAndCleanMessage } from '@/lib/diagnostics-engine';
import { BUILD_COMMIT } from '@/buildInfo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  pathname?: string;
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError) {
      const pathnameChanged =
        this.props.pathname !== undefined && prevProps.pathname !== this.props.pathname;
      const resetKeysChanged =
        this.props.resetKeys &&
        prevProps.resetKeys &&
        (this.props.resetKeys.length !== prevProps.resetKeys.length ||
          this.props.resetKeys.some((val, idx) => val !== prevProps.resetKeys?.[idx]));

      if (pathnameChanged || resetKeysChanged) {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          copied: false,
        });
      }
    }
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    try {
      const commit = BUILD_COMMIT || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_COMMIT) || 'unknown';
      const componentStack = errorInfo?.componentStack || '';

      recordDiagnosticEvent({
        category: 'REACT_CRASH',
        type: 'react-boundary',
        message: error?.message || String(error),
        stack: error?.stack || '',
        componentStack,
        time: new Date().toISOString(),
        commit,
      });
    } catch {
      // silent fallback for diagnostics recording inside ErrorBoundary
    }

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    });
  };

  handleCopyErrorReport = () => {
    try {
      const err = this.state.error;
      const { errorName, cleanMessage } = extractErrorNameAndCleanMessage(err?.message || String(err));
      const route = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
      const now = new Date().toISOString();
      const commit = BUILD_COMMIT || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_COMMIT) || 'unknown';

      let md = `### Noor Connect — Crash Forensic Report\n`;
      md += `- **Error:** \`${errorName}: ${cleanMessage}\`\n`;
      md += `- **Route:** \`${route}\`\n`;
      md += `- **Commit:** \`${commit}\`\n`;
      md += `- **Timestamp:** ${now}\n`;

      if (this.state.errorInfo?.componentStack) {
        md += `\n**React Component Stack:**\n\`\`\`text\n${this.state.errorInfo.componentStack.trim()}\n\`\`\`\n`;
      }
      if (err?.stack) {
        md += `\n**Stack Trace:**\n\`\`\`text\n${cleanStackTrace(err.stack)}\n\`\`\`\n`;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(md);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      }
    } catch {
      // clipboard copy fallback
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border bg-card">
            <CardHeader className="text-center">
              <div
                className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(224, 122, 122, 0.15)', color: 'var(--danger)' }}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <CardTitle style={{ color: 'var(--danger)' }}>Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. The app has been stabilized to prevent further issues.
              </p>

              {/* Compact Themed Diagnostic Error Box */}
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-left space-y-1.5 font-sans">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold text-red-400">Crash Forensics</span>
                  <span className="font-mono truncate max-w-[150px]">
                    {typeof window !== 'undefined' ? window.location.pathname : '/'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground break-words" style={{ overflowWrap: 'anywhere' }}>
                  {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unexpected crash'}
                </p>
                {this.state.error?.stack && (
                  <pre
                    className="text-[10px] font-mono text-muted-foreground/80 bg-background/60 p-2 rounded border border-border/40 whitespace-pre-wrap max-h-24 overflow-y-auto"
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  >
                    {cleanStackTrace(this.state.error.stack).split('\n').slice(0, 4).join('\n')}
                  </pre>
                )}
              </div>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left">
                  <summary className="text-xs font-mono bg-muted p-2 rounded cursor-pointer">
                    Developer Details
                  </summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={this.handleReset}
                  size="sm"
                  className="gap-2"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()} 
                  size="sm"
                >
                  Reload App
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleCopyErrorReport}
                  size="sm"
                  className="gap-1.5"
                >
                  {this.state.copied ? (
                    <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {this.state.copied ? 'Copied' : 'Copy Error Report'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};
