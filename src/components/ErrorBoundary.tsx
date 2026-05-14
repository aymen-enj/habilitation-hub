import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
            <h1 className="text-2xl font-bold text-destructive">Une erreur est survenue</h1>
            <p className="text-muted-foreground">
              {this.state.error?.message || "Veuillez recharger la page."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Recharger la page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
