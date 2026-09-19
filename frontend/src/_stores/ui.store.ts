"use client";

import { create } from "zustand";

type UiState = {
  isAiPanelOpen: boolean;
  isSidebarOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  toggleAiPanel: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  isAiPanelOpen: true,
  isSidebarOpen: false,
  setAiPanelOpen: (isAiPanelOpen) => set({ isAiPanelOpen }),
  toggleAiPanel: () =>
    set((state) => ({ isAiPanelOpen: !state.isAiPanelOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
