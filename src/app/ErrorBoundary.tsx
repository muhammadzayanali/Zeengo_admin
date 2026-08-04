import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Card } from '@/shared/ui/primitives';

interface State {
  hasError: boolean;
  message?: string;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <Card className="max-w-md text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {this.state.message || 'Unexpected error'}
            </p>
            <Button className="mt-4" onClick={() => window.location.assign('/')}>
              Reload
            </Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
