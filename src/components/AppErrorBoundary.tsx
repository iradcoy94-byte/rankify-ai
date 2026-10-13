import { Component, type ErrorInfo, type ReactNode } from "react";

interface State { error: Error | null }

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Rankify.AI gagal dimuat:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
          <section className="w-full max-w-xl space-y-3 rounded-2xl border border-destructive/30 bg-card p-6 shadow-lg">
            <h1 className="text-xl font-bold">Rankify.AI tidak dapat dimuat</h1>
            <p className="text-sm text-muted-foreground">Periksa pesan ini di terminal atau kirimkan kepada pengelola aplikasi.</p>
            <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">{this.state.error.message}</pre>
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => window.location.reload()}>Muat ulang aplikasi</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
