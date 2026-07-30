import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error | null;
  errorInfo?: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center p-4">
          <h2 className="text-2xl font-bold text-destructive mb-2">Oops, there was an error!</h2>
          <p className="text-muted-foreground mb-4">Something went wrong in this component.</p>
          {this.state.error && (
            <div className="w-full max-w-3xl text-left bg-rose-50 dark:bg-rose-950/50 p-4 rounded-2xl border border-rose-200 dark:border-rose-800 text-xs font-mono overflow-auto max-h-60 mb-4 text-rose-800 dark:text-rose-200">
              <p className="font-bold mb-1">{this.state.error.toString()}</p>
              {this.state.error.stack && (
                <pre className="text-[11px] whitespace-pre-wrap opacity-80">{this.state.error.stack}</pre>
              )}
            </div>
          )}
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
