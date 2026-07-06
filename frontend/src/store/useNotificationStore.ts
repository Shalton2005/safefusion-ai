/**
 * useNotificationStore
 *
 * In-memory queue of toast notifications.
 *
 * Call `toast.*` from anywhere in the app (inside or outside React):
 *   toast.success('Saved', 'Report generated successfully.');
 *   toast.error('Failed', err.toUserMessage());
 */

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

// ─── Convenience helpers (usable outside React) ───────────────────
// These call getState() directly so they work in services, stores,
// and interceptors without needing a hook call.

const enqueue = (type: NotificationType) =>
  (title: string, message?: string, duration?: number) =>
    useNotificationStore.getState().add({ type, title, message, duration });

/**
 * Fire-and-forget toast helpers.
 *
 * @example
 * import { toast } from '@/store';
 * toast.error('Upload failed', 'File size exceeds 10 MB.');
 */
export const toast = {
  info:    enqueue('info'),
  success: enqueue('success'),
  warning: enqueue('warning'),
  error:   enqueue('error'),
} as const;
