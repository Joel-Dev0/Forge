import { create } from "zustand";
import {
  DEVICE_PRESETS,
  getPresetById,
  getDefaultPresetForCategory,
  type DeviceCategory,
} from "./devicePresets.ts";

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

export type ViewportMode = "desktop" | "tablet" | "mobile" | "watch" | "custom";

interface InspectorState {
  isPickerActive: boolean;
  selectedElement: InspectedElement | null;
  domTree: DomNode | null;
  viewportMode: ViewportMode;
  viewportOrientation: "portrait" | "landscape";
  selectedDeviceId: string;
  viewportWidth: number;
  viewportHeight: number;
  deviceScale: number | "fit";
  activeInspectorTab: "styles" | "boxmodel" | "editor";
  styleFilter: string;

  togglePicker: () => void;
  setPickerActive: (active: boolean) => void;
  setSelectedElement: (el: InspectedElement | null) => void;
  setDomTree: (tree: DomNode | null) => void;
  setViewportMode: (mode: ViewportMode) => void;
  setViewportOrientation: (orientation: "portrait" | "landscape") => void;
  toggleViewportOrientation: () => void;
  setViewportDimensions: (width: number, height: number) => void;
  selectDevicePreset: (presetId: string) => void;
  setDeviceScale: (scale: number | "fit") => void;
  setActiveInspectorTab: (tab: "styles" | "boxmodel" | "editor") => void;
  setStyleFilter: (filter: string) => void;
}

const defaultMobile = getDefaultPresetForCategory("mobile");

export const useInspectorStore = create<InspectorState>((set, get) => ({
  isPickerActive: false,
  selectedElement: null,
  domTree: null,
  viewportMode: "desktop",
  viewportOrientation: "portrait",
  selectedDeviceId: "responsive",
  viewportWidth: defaultMobile.width,
  viewportHeight: defaultMobile.height,
  deviceScale: 1,
  activeInspectorTab: "styles",
  styleFilter: "",

  togglePicker: () => set((s) => ({ isPickerActive: !s.isPickerActive })),
  setPickerActive: (isPickerActive) => set({ isPickerActive }),
  setSelectedElement: (selectedElement) => set({ selectedElement }),
  setDomTree: (domTree) => set({ domTree }),

  setViewportMode: (mode) => {
    if (mode === "desktop") {
      set({ viewportMode: "desktop", selectedDeviceId: "responsive" });
      return;
    }
    const preset = getDefaultPresetForCategory(mode as DeviceCategory);
    if (preset) {
      const isLandscape = get().viewportOrientation === "landscape" && preset.category !== "watch";
      set({
        viewportMode: mode,
        selectedDeviceId: preset.id,
        viewportWidth: isLandscape ? preset.height : preset.width,
        viewportHeight: isLandscape ? preset.width : preset.height,
      });
    } else {
      set({ viewportMode: mode });
    }
  },

  selectDevicePreset: (presetId) => {
    if (presetId === "responsive") {
      set({ viewportMode: "desktop", selectedDeviceId: "responsive" });
      return;
    }
    const preset = getPresetById(presetId);
    if (!preset) return;
    const isLandscape = get().viewportOrientation === "landscape" && preset.category !== "watch";
    set({
      viewportMode: preset.category,
      selectedDeviceId: preset.id,
      viewportWidth: isLandscape ? preset.height : preset.width,
      viewportHeight: isLandscape ? preset.width : preset.height,
    });
  },

  setViewportDimensions: (width, height) => {
    const w = Math.max(180, Math.min(3840, Math.round(width)));
    const h = Math.max(180, Math.min(2160, Math.round(height)));
    // Check if matches an existing preset
    const match = DEVICE_PRESETS.find((p) => p.width === w && p.height === h);
    if (match) {
      set({
        viewportWidth: w,
        viewportHeight: h,
        selectedDeviceId: match.id,
        viewportMode: match.category,
      });
    } else {
      set({
        viewportWidth: w,
        viewportHeight: h,
        selectedDeviceId: "custom",
        viewportMode: "custom",
      });
    }
  },

  setViewportOrientation: (orientation) => {
    const current = get().viewportOrientation;
    if (current === orientation) return;
    get().toggleViewportOrientation();
  },

  toggleViewportOrientation: () => {
    const { viewportOrientation, viewportWidth, viewportHeight, viewportMode } = get();
    if (viewportMode === "watch" && viewportWidth === viewportHeight) return;
    const nextOrientation = viewportOrientation === "portrait" ? "landscape" : "portrait";
    set({
      viewportOrientation: nextOrientation,
      viewportWidth: viewportHeight,
      viewportHeight: viewportWidth,
    });
  },

  setDeviceScale: (deviceScale) => set({ deviceScale }),
  setActiveInspectorTab: (activeInspectorTab) => set({ activeInspectorTab }),
  setStyleFilter: (styleFilter) => set({ styleFilter }),
}));