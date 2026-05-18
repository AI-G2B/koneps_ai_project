import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => '', dismissToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const CONFIG: Record<ToastType, { icon: React.ElementType; accent: string; bg: string; border: string }> = {
  success: { icon: CheckCircle2, accent: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
  info:    { icon: Info,         accent: '#2563EB', bg: 'rgba(37,99,235,0.08)',  border: 'rgba(37,99,235,0.25)' },
  warning: { icon: AlertTriangle, accent: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const c = CONFIG[toast.type];
  return (
    <div
      className="toast-enter"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '12px',
        backgroundColor: 'var(--dash-card)',
        border: `1px solid ${c.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        minWidth: '320px',
        maxWidth: '480px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <c.icon style={{ width: '16px', height: '16px', color: c.accent }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: c.accent, marginBottom: '2px' }}>
          {toast.type === 'success' ? '완료' : toast.type === 'warning' ? '경고' : '알림'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--dash-text-2)', lineHeight: 1.5, wordBreak: 'break-word' }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-5)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, borderRadius: '4px' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-2)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--dash-text-5)')}
      >
        <X style={{ width: '13px', height: '13px' }} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000): string => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes toastSlideOut {
          from { transform: translateY(0);     opacity: 1; }
          to   { transform: translateY(-20px); opacity: 0; }
        }
        .toast-enter { animation: toastSlideIn 0.25s cubic-bezier(0.16,1,0.3,1); }
      `}</style>
      {children}
      <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999, alignItems: 'center' }}>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
