import React from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import type { Toast } from '../hooks/useToast';
import './ToastContainer.css';

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: number) => void;
}

import { MessageSquare } from 'lucide-react';

const iconMap = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
    message: <MessageSquare size={18} />,
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast toast-${toast.type}`}>
                    <span className="toast-icon">{iconMap[toast.type]}</span>
                    <span className="toast-text">{toast.message}</span>
                    <button className="toast-close" onClick={() => onRemove(toast.id)}>
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};
