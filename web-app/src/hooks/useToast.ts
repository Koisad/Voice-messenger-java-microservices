import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'message';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

export function useToast(duration = 3000) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const idRef = useRef(0);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++idRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, [duration]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, showToast, removeToast };
}
