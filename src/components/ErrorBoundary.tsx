import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

const clearArcadeStorage = () => {
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key.startsWith('apex:') || key.startsWith('apex_arcade_') || key.startsWith('apex-arcade-'))) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch { /* Storage may be blocked; reloading still clears in-memory state. */ }
};

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Apex Arcade rendering failed', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetData = () => {
    clearArcadeStorage();
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12 text-fg">
        <div role="alert" className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-danger">Something broke</p>
          <h1 className="mt-2 text-xl font-black">Apex Arcade hit an unexpected error</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Your save data may be incomplete or corrupted. Reloading usually fixes it; resetting local data is a last resort.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-xl border border-line bg-surface-2 p-3 text-[11px] text-fg-subtle whitespace-pre-wrap">
            {error.message || 'Unknown error'}
          </pre>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="min-h-10 rounded-xl bg-accent px-4 text-sm font-bold text-accent-fg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.handleResetData}
              className="min-h-10 rounded-xl border border-danger/40 bg-danger/10 px-4 text-sm font-bold text-danger hover:bg-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            >
              Reset local data
            </button>
          </div>
        </div>
      </div>
    );
  }
}
