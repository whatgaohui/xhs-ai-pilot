import { create } from 'zustand';

export type NotificationCategory = 'all' | 'system' | 'data' | 'ai' | 'export';

export interface Notification {
  id: string;
  type: 'scrape' | 'analysis' | 'draft' | 'export' | 'delete' | 'info';
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  // Navigation context
  navigateTo?: 'dashboard' | 'account-hub' | 'analytics' | 'library' | 'settings' | 'account' | 'content' | 'persona' | 'creator';
  accountId?: string;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: () => number;
  categoryCount: (category: NotificationCategory) => number;
}

// Map old type to new category for backward compatibility
function mapTypeToCategory(type: string): NotificationCategory {
  switch (type) {
    case 'scrape':
    case 'delete':
      return 'data';
    case 'analysis':
    case 'draft':
      return 'ai';
    case 'export':
      return 'export';
    case 'info':
    default:
      return 'system';
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (notification) => {
    const category = notification.category || mapTypeToCategory(notification.type);
    const newNotification: Notification = {
      ...notification,
      category,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      read: false,
      timestamp: Date.now(),
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
    }));
  },
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },
  deleteNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
  clearAll: () => {
    set({ notifications: [] });
  },
  unreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },
  categoryCount: (category) => {
    if (category === 'all') return get().notifications.length;
    return get().notifications.filter((n) => n.category === category).length;
  },
}));
