import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  add: (notification: Omit<Notification, 'id'>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

let _idCounter = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  add: (notification) => {
    const id = `notif-${++_idCounter}`;
    set((s) => ({ notifications: [...s.notifications, { ...notification, id }] }));

    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
      }, duration);
    }
  },

  dismiss: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  dismissAll: () => set({ notifications: [] }),
}));
