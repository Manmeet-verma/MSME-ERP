import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  retries: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, retries: 0 };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch() {
    const msg = this.state.error?.message || "";
    const isColdStart = msg.includes("502") || msg.includes("503") || msg.includes("Bad Gateway") || msg.includes("Failed to fetch");
    if (isColdStart && this.state.retries < 5) {
      const delay = Math.min(3000 * (this.state.retries + 1), 15000);
      setTimeout(() => {
        this.setState((s) => ({ hasError: false, retries: s.retries + 1 }));
      }, delay);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const msg = this.state.error?.message || "";
      const isServerDown = msg.includes("502") || msg.includes("503") || msg.includes("Bad Gateway") || msg.includes("Failed to fetch");

      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            {isServerDown ? (
              <>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg className="h-6 w-6 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">Server is waking up</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Our server needs a moment to start (typically 5-15 seconds). Auto-retrying...
                </p>
                <Button size="sm" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-foreground mb-2">Something went wrong</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {msg || "An unexpected error occurred."}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, retries: 0 })}>
                    Try again
                  </Button>
                  <Button size="sm" onClick={() => window.location.reload()}>
                    Reload page
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
