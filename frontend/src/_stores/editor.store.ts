"use client";

import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type EditorState = {
  currentDocumentId: string | null;
  currentDocumentTitle: string;
  isDocumentSaved: boolean;
  saveStatus: SaveStatus;
  saveError: string;
  setCurrentDocument: (document: { id: string; title: string }) => void;
  setDocumentTitle: (title: string) => void;
  setSaveStatus: (status: SaveStatus, error?: string) => void;
  resetDocument: () => void;
};

const initialState = {
  currentDocumentId: null,
  currentDocumentTitle: "",
  isDocumentSaved: false,
  saveStatus: "idle" as SaveStatus,
  saveError: "",
};

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,
  setCurrentDocument: (document) =>
    set({
      currentDocumentId: document.id,
      currentDocumentTitle: document.title,
      isDocumentSaved: true,
      saveStatus: "saved",
      saveError: "",
    }),
  setDocumentTitle: (currentDocumentTitle) => set({ currentDocumentTitle }),
  setSaveStatus: (saveStatus, error = "") =>
    set({
      saveStatus,
      saveError: error,
      isDocumentSaved: saveStatus === "saved",
    }),
  resetDocument: () => set(initialState),
}));
