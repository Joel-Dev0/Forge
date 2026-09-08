import { useState, useEffect } from "react";
import {
  Crosshair,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  ChevronRight,
  ChevronDown,
  Layers,
  Box,
  Code,
  Search,
  Check,
  Plus,
} from "lucide-react";
import { useInspectorStore, type DomNode, type InspectedElement } from "../../core/inspector/useInspectorStore";
import {
  getDomTreeScript,
  enablePickerScript,
  disablePickerScript,
  getInspectedDataScript,
  applyLiveStyleScript,
} from "../../core/inspector/inspectorScript";

interface Props {
  getActiveWebview?: () => WebviewElement | null;
}

export function VisualInspector({ getActiveWebview }: Props) {
  const {
    isPickerActive,
    selectedElement,
    domTree,
    viewportMode,
    activeInspectorTab,
    styleFilter,
    setPickerActive,
    setSelectedElement,
    setDomTree,
    setViewportMode,
    setActiveInspectorTab,
    setStyleFilter,
  } = useInspectorStore();

  const [customProp, setCustomProp] = useState("");
  const [customVal, setCustomVal] = useState("");
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Refresh DOM tree from guest page
  const fetchDomTree = async () => {
    try {
      const wv = getActiveWebview ? getActiveWebview() : null;
      if (!wv) return;
      const tree = await wv.executeJavaScript(getDomTreeScript);
      if (tree) {
        setDomTree(tree);
        // Expand root by default
        if (tree.id) {
          setExpandedNodes((prev) => ({ ...prev, [tree.id]: true }));
        }
      }
    } catch {}
  };

  // Toggle picker
  const handleTogglePicker = async () => {
    const nextState = !isPickerActive;
    setPickerActive(nextState);

    const wv = getActiveWebview ? getActiveWebview() : null;
    if (!wv) return;

    if (nextState) {
      await wv.executeJavaScript(enablePickerScript);

      // Poll for inspection result
      const pollInterval = setInterval(async () => {
        try {
          const data: InspectedElement = await wv.executeJavaScript(getInspectedDataScript);
          if (data) {
            setSelectedElement(data);
            setPickerActive(false);
            clearInterval(pollInterval);
          }
        } catch {
          clearInterval(pollInterval);
        }
      }, 300);

      setTimeout(() => clearInterval(pollInterval), 30000); // 30s timeout
    } else {
      await wv.executeJavaScript(disablePickerScript);
    }
  };

  // Fetch initial DOM tree on mount
  useEffect(() => {
    fetchDomTree();
  }, []);

  const handleApplyStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProp.trim() || !customVal.trim()) return;

    const wv = getActiveWebview ? getActiveWebview() : null;
    if (wv) {
      await wv.executeJavaScript(applyLiveStyleScript(customProp.trim(), customVal.trim()));
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 1500);

      // Update local state
      if (selectedElement) {
        setSelectedElement({
          ...selectedElement,
          computedStyles: {
            ...selectedElement.computedStyles,
            [customProp.trim()]: customVal.trim(),
          },
        });
      }
    }
  };

  const toggleNodeExpanded = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Render DOM Tree node
  const renderDomNode = (node: DomNode, depth = 0) => {
    const isExpanded = expandedNodes[node.id] ?? depth < 2;
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedElement?.selectorPath === node.selectorPath;

    if (node.tagName === "#text") {
      return (
        <div key={node.id} style={{ paddingLeft: `${depth * 14}px` }} className="text-[10px] text-zinc-400 font-mono py-0.5 truncate">
          "{node.textContent}"
        </div>
      );
    }

    return (
      <div key={node.id} className="flex flex-col font-mono text-[10px]">
        <div
          onClick={() => {
            if (node.selectorPath) {
              // Simulated inspect
              setSelectedElement({
                tagName: node.tagName,
                classList: [],
                attributes: node.attributes,
                boxModel: {
                  margin: [0, 0, 0, 0],
                  border: [1, 1, 1, 1],
                  padding: [8, 8, 8, 8],
                  width: 320,
                  height: 48,
                },
                computedStyles: {
                  display: "block",
                  color: "inherit",
                  "font-size": "14px",
                },
                selectorPath: node.selectorPath,
              });
            }
          }}
          className={`flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer transition-colors group ${
            isSelected ? "bg-[#FF6B00]/20 text-[#FF6B00]" : "hover:bg-[var(--forge-hover)] text-[var(--forge-text)]"
          }`}
          style={{ paddingLeft: `${depth * 14}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpanded(node.id);
              }}
              className="text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] p-0.5"
            >
              {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
          ) : (
            <span className="w-3" />
          )}

          <span className="text-pink-400 font-bold">&lt;{node.tagName}</span>

          {/* Attributes */}
          {Object.entries(node.attributes || {}).slice(0, 3).map(([key, val]) => (
            <span key={key} className="text-zinc-400 text-[9px]">
              <span className="text-sky-400">{key}</span>="<span className="text-amber-300">{val}</span>"
            </span>
          ))}

          <span className="text-pink-400 font-bold">&gt;</span>

          {node.textContent && !hasChildren && (
            <span className="text-zinc-300 text-[9px] truncate max-w-xs">{node.textContent}</span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {node.children.map((child) => renderDomNode(child, depth + 1))}
            <div style={{ paddingLeft: `${depth * 14 + 12}px` }} className="text-pink-400 font-bold text-[10px] py-0.5">
              &lt;/{node.tagName}&gt;
            </div>
          </div>
        )}
      </div>
    );
  };

  const box = selectedElement?.boxModel || {
    margin: [0, 0, 0, 0],
    border: [0, 0, 0, 0],
    padding: [0, 0, 0, 0],
    width: 0,
    height: 0,
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--forge-surface)] text-[11px] select-text">
      {/* Inspector Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/40 shrink-0 w-full">
        <div className="flex items-center gap-2">
          {/* Picker Toggle Button */}
          <button
            onClick={handleTogglePicker}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer shadow-xs ${
              isPickerActive
                ? "bg-[#FF6B00] text-white animate-pulse"
                : "bg-[var(--forge-input)] text-[var(--forge-text)] hover:text-[#FF6B00] hover:bg-[var(--forge-hover)]"
            }`}
            title="Toggle Element Picker (Click an element in the page)"
          >
            <Crosshair size={12} />
            <span>{isPickerActive ? "Click Element in Page..." : "Inspect Element"}</span>
          </button>

          <button
            onClick={fetchDomTree}
            title="Reload Page DOM Tree"
            className="p-1 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] rounded transition-colors cursor-pointer"
          >
            <RefreshCw size={12} />
          </button>

          {/* Breadcrumb path */}
          {selectedElement?.selectorPath && (
            <div className="flex items-center gap-1 font-mono text-[9px] text-[var(--forge-text-muted)] bg-[var(--forge-input)] px-2 py-0.5 rounded max-w-sm truncate">
              <span className="text-[#FF6B00] font-bold">&lt;/&gt;</span>
              <span>{selectedElement.selectorPath}</span>
            </div>
          )}
        </div>

        {/* Viewport simulation mode */}
        <div className="flex items-center gap-1 bg-[var(--forge-input)] p-0.5 rounded text-[9px]">
          <button
            onClick={() => setViewportMode("desktop")}
            title="Desktop Mode"
            className={`p-1 rounded cursor-pointer transition-colors ${
              viewportMode === "desktop" ? "bg-[var(--forge-surface)] text-[#FF6B00] font-bold" : "text-[var(--forge-text-muted)]"
            }`}
          >
            <Monitor size={11} />
          </button>
          <button
            onClick={() => setViewportMode("tablet")}
            title="Tablet Mode (768px)"
            className={`p-1 rounded cursor-pointer transition-colors ${
              viewportMode === "tablet" ? "bg-[var(--forge-surface)] text-[#FF6B00] font-bold" : "text-[var(--forge-text-muted)]"
            }`}
          >
            <Tablet size={11} />
          </button>
          <button
            onClick={() => setViewportMode("mobile")}
            title="Mobile Mode (375px)"
            className={`p-1 rounded cursor-pointer transition-colors ${
              viewportMode === "mobile" ? "bg-[var(--forge-surface)] text-[#FF6B00] font-bold" : "text-[var(--forge-text-muted)]"
            }`}
          >
            <Smartphone size={11} />
          </button>
        </div>
      </div>

      {/* Main Split Body: Left = DOM Tree, Right = Styles / Box Model */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Left: DOM Tree Explorer */}
        <div className="w-1/2 border-r border-[var(--forge-border)] flex flex-col overflow-hidden">
          <div className="px-3 py-1 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/20 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)]">
            <span className="flex items-center gap-1">
              <Layers size={11} /> DOM Elements Tree
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {domTree ? (
              renderDomNode(domTree)
            ) : (
              <div className="p-4 text-center text-[var(--forge-text-muted)] italic text-[10px]">
                Click "Refresh" or load a webpage to inspect its DOM structure.
              </div>
            )}
          </div>
        </div>

        {/* Right: Styles, Box Model & Live Editor */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-[var(--forge-surface-elevated)]/10">
          {/* Sub-tabs */}
          <div className="flex items-center px-2 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/30">
            <button
              onClick={() => setActiveInspectorTab("styles")}
              className={`flex items-center gap-1 px-3 py-1.5 border-b-2 font-semibold text-[10px] transition-colors cursor-pointer ${
                activeInspectorTab === "styles"
                  ? "border-[#FF6B00] text-[#FF6B00]"
                  : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              <Code size={11} /> Computed CSS
            </button>
            <button
              onClick={() => setActiveInspectorTab("boxmodel")}
              className={`flex items-center gap-1 px-3 py-1.5 border-b-2 font-semibold text-[10px] transition-colors cursor-pointer ${
                activeInspectorTab === "boxmodel"
                  ? "border-[#FF6B00] text-[#FF6B00]"
                  : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              <Box size={11} /> Box Model
            </button>
            <button
              onClick={() => setActiveInspectorTab("editor")}
              className={`flex items-center gap-1 px-3 py-1.5 border-b-2 font-semibold text-[10px] transition-colors cursor-pointer ${
                activeInspectorTab === "editor"
                  ? "border-[#FF6B00] text-[#FF6B00]"
                  : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              <Plus size={11} /> Live Style Editor
            </button>
          </div>

          {/* Tab 1: Computed CSS */}
          {activeInspectorTab === "styles" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-[var(--forge-border)]">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)]">
                  <Search size={10} className="text-[var(--forge-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Filter styles (e.g. color, flex, width)..."
                    value={styleFilter}
                    onChange={(e) => setStyleFilter(e.target.value)}
                    className="bg-transparent text-[9px] text-[var(--forge-text)] outline-none w-full"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-0.5 scrollbar-thin">
                {selectedElement?.computedStyles ? (
                  Object.entries(selectedElement.computedStyles)
                    .filter(([k]) => !styleFilter || k.includes(styleFilter.toLowerCase()))
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-[var(--forge-hover)]">
                        <span className="text-sky-400">{k}:</span>
                        <span className="text-amber-300 font-semibold">{v};</span>
                      </div>
                    ))
                ) : (
                  <div className="p-4 text-center text-[var(--forge-text-muted)] italic text-[10px]">
                    Select an element to view computed CSS properties.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Visual Box Model */}
          {activeInspectorTab === "boxmodel" && (
            <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
              {/* Margin Box */}
              <div className="relative border border-dashed border-amber-500/60 bg-amber-500/10 p-5 rounded text-center text-[9px] font-mono text-amber-300 min-w-[280px]">
                <span className="absolute top-1 left-1 font-bold text-[8px] uppercase tracking-wider text-amber-400">
                  Margin
                </span>
                <span className="block mb-1">{box.margin[0]}</span>
                <div className="flex items-center justify-between">
                  <span>{box.margin[3]}</span>

                  {/* Border Box */}
                  <div className="flex-1 mx-3 border border-yellow-500/70 bg-yellow-500/15 p-4 rounded text-yellow-300">
                    <span className="absolute top-7 left-8 font-bold text-[8px] uppercase tracking-wider text-yellow-400">
                      Border
                    </span>
                    <span className="block mb-1">{box.border[0]}</span>
                    <div className="flex items-center justify-between">
                      <span>{box.border[3]}</span>

                      {/* Padding Box */}
                      <div className="flex-1 mx-3 border border-emerald-500/70 bg-emerald-500/15 p-4 rounded text-emerald-300">
                        <span className="absolute top-13 left-15 font-bold text-[8px] uppercase tracking-wider text-emerald-400">
                          Padding
                        </span>
                        <span className="block mb-1">{box.padding[0]}</span>
                        <div className="flex items-center justify-between">
                          <span>{box.padding[3]}</span>

                          {/* Content Box */}
                          <div className="flex-1 mx-3 bg-sky-500/30 border border-sky-400/80 p-2 rounded text-sky-200 font-bold">
                            {box.width} x {box.height}
                          </div>

                          <span>{box.padding[1]}</span>
                        </div>
                        <span className="block mt-1">{box.padding[2]}</span>
                      </div>

                      <span>{box.border[1]}</span>
                    </div>
                    <span className="block mt-1">{box.border[2]}</span>
                  </div>

                  <span>{box.margin[1]}</span>
                </div>
                <span className="block mt-1">{box.margin[2]}</span>
              </div>
            </div>
          )}

          {/* Tab 3: Live Style Editor */}
          {activeInspectorTab === "editor" && (
            <div className="flex-1 p-3 flex flex-col gap-3">
              <p className="text-[10px] text-[var(--forge-text-muted)]">
                Inject custom CSS properties live into the active element in the page:
              </p>

              <form onSubmit={handleApplyStyle} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <input
                    type="text"
                    placeholder="property (e.g. background-color)"
                    value={customProp}
                    onChange={(e) => setCustomProp(e.target.value)}
                    className="flex-1 bg-[var(--forge-input)] border border-[var(--forge-border)] px-2.5 py-1.5 rounded text-[var(--forge-text)] outline-none focus:border-[#FF6B00]"
                  />
                  <span>:</span>
                  <input
                    type="text"
                    placeholder="value (e.g. #FF6B00 or 20px)"
                    value={customVal}
                    onChange={(e) => setCustomVal(e.target.value)}
                    className="flex-1 bg-[var(--forge-input)] border border-[var(--forge-border)] px-2.5 py-1.5 rounded text-[var(--forge-text)] outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded font-bold text-[10px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  {appliedSuccess ? <Check size={12} /> : <Plus size={12} />}
                  {appliedSuccess ? "Applied Live!" : "Apply Style"}
                </button>
              </form>

              {/* Quick Preset Buttons */}
              <div className="mt-2 flex flex-col gap-1.5">
                <span className="text-[9px] uppercase font-bold text-[var(--forge-text-muted)]">Quick Presets:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "Highlight Red", prop: "outline", val: "3px solid #EF4444" },
                    { label: "Hide (display:none)", prop: "display", val: "none" },
                    { label: "Rounded Corners", prop: "border-radius", val: "16px" },
                    { label: "Glass Blur", prop: "backdrop-filter", val: "blur(12px)" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setCustomProp(preset.prop);
                        setCustomVal(preset.val);
                      }}
                      className="px-2 py-1 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[9px] text-[var(--forge-text)] border border-[var(--forge-border)] cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}