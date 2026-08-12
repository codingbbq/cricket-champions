import React from 'react';
import type { Toast as ToastType } from '@/contexts/ToastContext';
import { useToast } from '@/contexts/ToastContext';

const Toast: React.FC<{ toast: ToastType }> = ({ toast }) => {
  const { removeToast } = useToast();

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
  }[toast.type];

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
    warning: 'text-yellow-800',
  }[toast.type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  }[toast.type];

  return (
    <div className={`${bgColor} border rounded-lg p-4 flex items-start gap-3 animate-slide-in`}>
      <span className={`text-xl font-bold ${textColor}`}>{icon}</span>
      <div className="flex-1">
        <p className={`${textColor} font-medium`}>{toast.message}</p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className={`${textColor} hover:opacity-70 transition-opacity`}
      >
        ✕
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default Toast;
