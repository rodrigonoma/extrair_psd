'use client';

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Enter animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getToastStyles = () => {
    const baseStyles = {
      background: 'white',
      border: '1px solid #e5e7eb',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    };

    const typeStyles = {
      success: {
        borderLeftColor: '#10b981',
        borderLeftWidth: '4px'
      },
      error: {
        borderLeftColor: '#ef4444',
        borderLeftWidth: '4px'
      },
      warning: {
        borderLeftColor: '#f59e0b',
        borderLeftWidth: '4px'
      },
      info: {
        borderLeftColor: '#3b82f6',
        borderLeftWidth: '4px'
      }
    };

    return { ...baseStyles, ...typeStyles[toast.type] };
  };

  const getIconAndColor = () => {
    switch (toast.type) {
      case 'success':
        return { icon: '✅', color: '#10b981' };
      case 'error':
        return { icon: '❌', color: '#ef4444' };
      case 'warning':
        return { icon: '⚠️', color: '#f59e0b' };
      case 'info':
        return { icon: 'ℹ️', color: '#3b82f6' };
      default:
        return { icon: 'ℹ️', color: '#3b82f6' };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <div
      style={{
        ...getToastStyles(),
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        transform: isRemoving 
          ? 'translateX(100%) scale(0.8)' 
          : isVisible 
            ? 'translateX(0) scale(1)' 
            : 'translateX(100%) scale(0.8)',
        opacity: isRemoving ? 0 : isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer'
      }}
      onClick={handleRemove}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          fontSize: '1.2rem',
          flexShrink: 0
        }}>
          {icon}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            margin: '0 0 4px 0',
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#111827'
          }}>
            {toast.title}
          </h4>
          
          {toast.message && (
            <p style={{
              margin: '0',
              fontSize: '0.875rem',
              color: '#6b7280',
              lineHeight: '1.4'
            }}>
              {toast.message}
            </p>
          )}

          {toast.action && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.action!.onClick();
                handleRemove();
              }}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                background: color,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.color = '#6b7280';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          width: '400px',
          maxWidth: 'calc(100vw - 40px)',
          pointerEvents: 'none'
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            {toasts.map(toast => (
              <ToastItem
                key={toast.id}
                toast={toast}
                onRemove={removeToast}
              />
            ))}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

// Convenience hooks
export const useSuccessToast = () => {
  const { showToast } = useToast();
  return (title: string, message?: string, duration?: number) =>
    showToast({ type: 'success', title, message, duration });
};

export const useErrorToast = () => {
  const { showToast } = useToast();
  return (title: string, message?: string, duration?: number) =>
    showToast({ type: 'error', title, message, duration });
};

export const useWarningToast = () => {
  const { showToast } = useToast();
  return (title: string, message?: string, duration?: number) =>
    showToast({ type: 'warning', title, message, duration });
};

export const useInfoToast = () => {
  const { showToast } = useToast();
  return (title: string, message?: string, duration?: number) =>
    showToast({ type: 'info', title, message, duration });
};