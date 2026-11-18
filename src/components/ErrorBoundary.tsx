import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi kesalahan pada sistem.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info);
  }

  private formatFriendlyError(raw: string): string {
    try {
      const parsed = JSON.parse(raw) as { error?: string; operationType?: string; path?: string };
      if (parsed.error) {
        if (parsed.error.toLowerCase().includes('permission')) {
          return `Akses ditolak saat operasi ${parsed.operationType ?? ''} pada ${parsed.path ?? 'database'}. Pastikan akun Google Anda sudah terverifikasi dan memiliki izin yang sesuai.`;
        }
        return `${parsed.error} (${parsed.operationType ?? 'operasi'} ${parsed.path ?? ''})`;
      }
    } catch {
      // Not JSON
    }
    return raw;
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold text-slate-900">
                Terjadi Kendala Koneksi atau Izin Data
              </h1>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {this.formatFriendlyError(this.state.errorMessage)}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
