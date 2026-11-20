import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error?.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(message);
      if (parsed?.error) {
        message = parsed.error;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 sm:p-8 text-center space-y-4 border-rose-200">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Something Went Wrong</h2>
            <p className="text-xs text-slate-600 leading-relaxed break-words">
              {this.state.message}
            </p>
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Reload Portal
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
