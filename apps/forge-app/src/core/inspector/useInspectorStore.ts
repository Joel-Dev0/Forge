import { create } from "zustand";

export interface BoxModel {
  margin: [number, number, number, number]; // top, right, bottom, left
  border: [number, number, number, number];
  padding: [number, number, number, number];
  width: number;
  height: number;
}

export interface InspectedElement {
  tagName: string;
  id?: string;
  classList: string[];
  attributes: Record<string, string>;
  boxModel: BoxModel;
  computedStyles: Record<string, string>;
  selectorPath: string;
  innerHTML?: string;
}

export interface DomNode {
  id: string;
  tagName: string;
  attributes: Record<string, string>;
  textContent?: string;
  children: DomNode[];
  selectorPath: string;
}

interface InspectorState {
  isPickerActive: boolean;
  selectedElement: InspectedElement | null;
  domTree: DomNode | null;
  viewportMode: "desktop" | "tablet" | "mobile";
  activeInspectorTab: "styles" | "boxmodel" | "editor";
  styleFilter: string;

  togglePicker: () => void;
  setPickerActive: (active: boolean) => void;
  setSelectedElement: (el: InspectedElement | null) => void;
  setDomTree: (tree: DomNode | null) => void;
  setViewportMode: (mode: "desktop" | "tablet" | "mobile") => void;
  setActiveInspectorTab: (tab: "styles" | "boxmodel" | "editor") => void;
  setStyleFilter: (filter: string) => void;
}

export const useInspectorStore = create<InspectorState>((set) => ({
  isPickerActive: false,
  selectedElement: null,
  domTree: null,
  viewportMode: "desktop",
  activeInspectorTab: "styles",
  styleFilter: "",

  togglePicker: () => set((s) => ({ isPickerActive: !s.isPickerActive })),
  setPickerActive: (isPickerActive) => set({ isPickerActive }),
  setSelectedElement: (selectedElement) => set({ selectedElement }),
  setDomTree: (domTree) => set({ domTree }),
  setViewportMode: (viewportMode) => set({ viewportMode }),
  setActiveInspectorTab: (activeInspectorTab) => set({ activeInspectorTab }),
  setStyleFilter: (styleFilter) => set({ styleFilter }),
}));