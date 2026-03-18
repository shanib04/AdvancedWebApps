import { useCallback, useRef, useState } from "react";

export type ToastVariant = "success" | "failed";

export interface ToastState {
  id: number;
  message: string;
  variant: ToastVariant;
}

function useAppToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  // use a ref for the id counter so increments don't trigger renders
  const toastIdRef = useRef(1);

  const removeToast = useCallback((id: number) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }, []);

  // add a new toast with auto-incrementing id
  const addToast = (message: string, variant: ToastVariant) => {
    const toastId = toastIdRef.current;
    toastIdRef.current += 1;
    setToasts((currentToasts) => [
      ...currentToasts,
      { id: toastId, message, variant },
    ]);
  };

  const showFailed = (message: string) => {
    addToast(message, "failed");
  };

  const showSuccess = (message: string) => {
    addToast(message, "success");
  };

  return {
    toasts,
    removeToast,
    showFailed,
    showSuccess,
  };
}

export default useAppToast;
