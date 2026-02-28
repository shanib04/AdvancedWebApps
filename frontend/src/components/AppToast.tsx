import { useEffect } from "react";
import type { ToastState } from "../hooks/useAppToast";

interface AppToastProps {
  toasts: ToastState[];
  onClose: (id: number) => void;
  durationMs?: number;
}

function AppToast({ toasts, onClose, durationMs = 3000 }: AppToastProps) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div
      className="toast-container position-fixed bottom-0 end-0 p-3"
      style={{ zIndex: 9999 }}
    >
      <div className="d-flex flex-column gap-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            id={toast.id}
            message={toast.message}
            variant={toast.variant}
            durationMs={durationMs}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}

interface ToastItemProps {
  id: number;
  message: string;
  variant: "success" | "failed";
  durationMs: number;
  onClose: (id: number) => void;
}

function ToastItem({
  id,
  message,
  variant,
  durationMs,
  onClose,
}: ToastItemProps) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      onClose(id);
    }, durationMs);

    return () => clearTimeout(timeout);
  }, [id, durationMs, onClose]);

  const toneClass =
    variant === "success" ? "text-bg-success" : "text-bg-danger";

  return (
    <div
      className={`toast show ${toneClass} border-0`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="d-flex">
        <div className="toast-body">{message}</div>
        <button
          type="button"
          className="btn-close btn-close-white me-2 m-auto"
          aria-label="Close"
          onClick={() => onClose(id)}
        />
      </div>
    </div>
  );
}

export default AppToast;
