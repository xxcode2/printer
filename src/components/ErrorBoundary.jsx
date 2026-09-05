import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "./ui/Button";

/**
 * Error Boundary untuk menangkap error di rendering child components.
 * Daripada blank screen, tampilkan pesan error yang jelas dan tombol
 * untuk mencoba lagi.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-paper-100 p-6">
          <div className="w-full max-w-md rounded-xl border border-ink-900/10 bg-white p-8 text-center shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-signal/10">
              <AlertTriangle size={24} className="text-signal" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-ink-900">
              Terjadi Kesalahan
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Aplikasi mengalami error yang tidak terduga. Silakan coba muat ulang halaman.
            </p>
            {this.state.error && (
              <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-paper-100 p-3 text-left font-mono text-xs text-ink-700">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-4 flex gap-3">
              <Button onClick={this.handleReset} className="flex-1">
                Coba Lagi
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Muat Ulang
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
