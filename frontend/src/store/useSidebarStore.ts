import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LS_SIDEBAR_KEY } from '@/constants';

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (value) => set({ collapsed: value }),
    }),
    { name: LS_SIDEBAR_KEY },
  ),
);
