import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const LS_RIGHT_PANEL_KEY = 'safefusion:right-panel-open';

interface RightPanelState {
  open: boolean;
  toggle: () => void;
  setOpen: (value: boolean) => void;
}

export const useRightPanelStore = create<RightPanelState>()(
  persist(
    (set) => ({
      open: true,
      toggle: () => set((s) => ({ open: !s.open })),
      setOpen: (value) => set({ open: value }),
    }),
    { name: LS_RIGHT_PANEL_KEY },
  ),
);
