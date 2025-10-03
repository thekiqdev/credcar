/**
 * Sistema de Notificações em Tela
 * Substitui popups por notificações elegantes no sistema
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // em ms, 0 = permanente até fechar manualmente
  timestamp: Date;
}

interface NotificationSystemProps {
  className?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onClose: (id: string) => void;
}

// Componente individual de notificação
const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animação de entrada
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-close se duration definido
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300); // Tempo da animação CSS
  };

  const getIconAndColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-500',
          titleColor: 'text-green-900',
          messageColor: 'text-green-700'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500',
          titleColor: 'text-red-900',
          messageColor: 'text-red-700'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-500',
          titleColor: 'text-yellow-900',
          messageColor: 'text-yellow-700'
        };
      case 'info':
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700'
        };
    }
  };

  const styles = getIconAndColors();
  const IconComponent = styles.icon;

  return (
    <div className={`
      ${styles.bgColor}
      ${styles.borderColor}
      border-l-4 p-4 mb-3 rounded-r-lg shadow-md
      transform transition-all duration-300 ease-in-out
      ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      hover:shadow-lg transition-shadow duration-200
      min-w-[300px] max-w-[500px]
    `}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={`h-6 w-6 ${styles.iconColor}`} />
        </div>
        
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-medium ${styles.titleColor}`}>
              {notification.title}
            </h3>
            <button
              onClick={handleClose}
              className={`flex-shrink-0 ml-2 ${styles.iconColor} hover:opacity-75 transition-opacity`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <p className={`mt-1 text-sm ${styles.messageColor}`}>
            {notification.message}
          </p>
          
          <p className={`mt-2 text-xs ${styles.messageColor} opacity-75`}>
            {notification.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

// Sistema principal de notificações
export const NotificationSystem: React.FC<NotificationSystemProps> = ({ className = '' }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Listener para notificações globais
  useEffect(() => {
    const handleGlobalNotification = (event: CustomEvent<Notification>) => {
      addNotification(event.detail);
    };

    window.addEventListener('add-notification', handleGlobalNotification as EventListener);
    
    return () => {
      window.removeEventListener('add-notification', handleGlobalNotification as EventListener);
    };
  }, []);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Máximo 5 notificações
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  if (notifications.length === 0) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="mb-2">
        <button
          onClick={clearAllNotifications}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium underline"
        >
          Limpar todas ({notifications.length})
        </button>
      </div>
      
      <div className="space-y-0">
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </div>
  );
};

// Hook para usar no sistema
export const useNotification = () => {
  const showNotification = (
    type: Notification['type'],
    title: string,
    message: string,
    duration?: number
  ) => {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      duration,
      timestamp: new Date(),
    };

    const event = new CustomEvent('add-notification', { detail: notification });
    window.dispatchEvent(event);
  };

  return {
    success: (title: string, message: string, duration?: number) => 
      showNotification('success', title, message, duration || 5000),
    error: (title: string, message: string, duration?: number) => 
      showNotification('error', title, message, duration || 8000),
    warning: (title: string, message: string, duration?: number) => 
      showNotification('warning', title, message, duration || 6000),
    info: (title: string, message: string, duration?: number) => 
      showNotification('info', title, message, duration || 4000),
  };
};

// Função global para conveniência
export const notify = {
  success: (title: string, message: string, duration?: number) => {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'success',
      title,
      message,
      duration,
      timestamp: new Date(),
    };
    const event = new CustomEvent('add-notification', { detail: notification });
    window.dispatchEvent(event);
  },
  
  error: (title: string, message: string, duration?: number) => {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'error',
      title,
      message,
      duration,
      timestamp: new Date(),
    };
    const event = new CustomEvent('add-notification', { detail: notification });
    window.dispatchEvent(event);
  },
  
  warning: (title: string, message: string, duration?: number) => {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'warning',
      title,
      message,
      duration,
      timestamp: new Date(),
    };
    const event = new CustomEvent('add-notification', { detail: notification });
    window.dispatchEvent(event);
  },
  
  info: (title: string, message: string, duration?: number) => {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'info',
      title,
      message,
      duration,
      timestamp: new Date(),
    };
    const event = new CustomEvent('add-notification', { detail: notification });
    window.dispatchEvent(event);
  },
};

export default NotificationSystem;
