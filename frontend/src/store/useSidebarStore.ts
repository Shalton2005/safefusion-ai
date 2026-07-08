import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LS_SIDEBAR_KEY } from '@/constants';

interface SidebarState {
  /** Desktop (lg+) narrow/wide state. Persisted. */
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
  /** Mobile (<lg) off-canvas open state. Not persisted. */
  mobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (value) => set({ collapsed: value }),

      mobileOpen: false,
      toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
      closeMobile: () => set({ mobileOpen: false }),
    }),
    {
      name: LS_SIDEBAR_KEY,
      partialize: (state) => ({ collapsed: state.collapsed }),
    },
  ),
);
