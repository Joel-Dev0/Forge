export const getDomTreeScript = `
(() => {
  function serializeNode(node, depth = 0, maxDepth = 4) {
    if (!node || depth > maxDepth) return null;
    if (node.nodeType === 3) {
      const text = node.textContent.trim();
      return text ? { id: 'text-' + Math.random(), tagName: '#text', textContent: text.slice(0, 50), attributes: {}, children: [], selectorPath: '' } : null;
    }
    if (node.nodeType !== 1) return null;
    
    // Skip forge inspector overlay
    if (node.id === '__forge_inspector_overlay__') return null;

    const attrs = {};
    for (let i = 0; i < node.attributes.length; i++) {
      const a = node.attributes[i];
      attrs[a.name] = a.value;
    }

    let selector = node.tagName.toLowerCase();
    if (node.id) selector += '#' + node.id;
    else if (node.className && typeof node.className === 'string') {
      const cls = node.className.trim().split(/\\s+/).slice(0, 2).join('.');
      if (cls) selector += '.' + cls;
    }

    const children = [];
    for (let i = 0; i < node.childNodes.length; i++) {
      const serialized = serializeNode(node.childNodes[i], depth + 1, maxDepth);
      if (serialized) children.push(serialized);
      if (children.length > 25) break;
    }

    return {
      id: 'node-' + Math.random().toString(36).substr(2, 9),
      tagName: node.tagName.toLowerCase(),
      attributes: attrs,
      textContent: children.length === 0 ? (node.innerText || '').slice(0, 60) : undefined,
      children,
      selectorPath: selector
    };
  }

  return serializeNode(document.body || document.documentElement);
})();
`;

export const enablePickerScript = `
(() => {
  window.__forgePickerActive = true;
  let overlay = document.getElementById('__forge_inspector_overlay__');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '__forge_inspector_overlay__';
    overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #FF6B00;background:rgba(255,107,0,0.15);transition:all 0.05s ease;display:none;';
    
    const badge = document.createElement('div');
    badge.id = '__forge_inspector_badge__';
    badge.style.cssText = 'position:absolute;top:-22px;left:0;background:#FF6B00;color:#fff;font-family:monospace;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:3px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);';
    overlay.appendChild(badge);
    document.body.appendChild(overlay);
  }

  function onHover(e) {
    if (!window.__forgePickerActive) return;
    const target = e.target;
    if (!target || target.id === '__forge_inspector_overlay__') return;

    const rect = target.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';

    const badge = document.getElementById('__forge_inspector_badge__');
    if (badge) {
      let label = target.tagName.toLowerCase();
      if (target.id) label += '#' + target.id;
      else if (target.className && typeof target.className === 'string') {
        const firstClass = target.className.trim().split(/\\s+/)[0];
        if (firstClass) label += '.' + firstClass;
      }
      label += ' | ' + Math.round(rect.width) + 'x' + Math.round(rect.height);
      badge.innerText = label;
    }
  }

  function onClick(e) {
    if (!window.__forgePickerActive) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    window.__forgeLastInspectedElement = target;

    // Remove overlay highlight
    if (overlay) overlay.style.display = 'none';
    window.__forgePickerActive = false;

    // Extract details
    const rect = target.getBoundingClientRect();
    const style = window.getComputedStyle(target);

    const importantProps = [
      'display', 'position', 'width', 'height', 'color', 'background-color',
      'font-family', 'font-size', 'font-weight', 'line-height',
      'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
      'flex-direction', 'justify-content', 'align-items', 'gap', 'opacity', 'z-index'
    ];

    const computed = {};
    for (const p of importantProps) {
      computed[p] = style.getPropertyValue(p);
    }

    const attrs = {};
    for (let i = 0; i < target.attributes.length; i++) {
      const a = target.attributes[i];
      attrs[a.name] = a.value;
    }

    const details = {
      tagName: target.tagName.toLowerCase(),
      id: target.id || undefined,
      classList: Array.from(target.classList || []),
      attributes: attrs,
      boxModel: {
        margin: [parseFloat(style.marginTop) || 0, parseFloat(style.marginRight) || 0, parseFloat(style.marginBottom) || 0, parseFloat(style.marginLeft) || 0],
        border: [parseFloat(style.borderTopWidth) || 0, parseFloat(style.borderRightWidth) || 0, parseFloat(style.borderBottomWidth) || 0, parseFloat(style.borderLeftWidth) || 0],
        padding: [parseFloat(style.paddingTop) || 0, parseFloat(style.paddingRight) || 0, parseFloat(style.paddingBottom) || 0, parseFloat(style.paddingLeft) || 0],
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      computedStyles: computed,
      selectorPath: target.tagName.toLowerCase() + (target.id ? '#' + target.id : (target.className && typeof target.className === 'string' ? '.' + target.className.trim().split(/\\s+/).join('.') : '')),
      innerHTML: (target.innerHTML || '').slice(0, 150)
    };

    window.__forgeInspectedData = details;
    return details;
  }

  document.addEventListener('pointermove', onHover, true);
  document.addEventListener('click', onClick, true);
  window.__forgeCleanupPicker = () => {
    document.removeEventListener('pointermove', onHover, true);
    document.removeEventListener('click', onClick, true);
    if (overlay) overlay.style.display = 'none';
  };

  return true;
})();
`;

export const getInspectedDataScript = `
(() => {
  return window.__forgeInspectedData || null;
})();
`;

export const disablePickerScript = `
(() => {
  window.__forgePickerActive = false;
  if (window.__forgeCleanupPicker) window.__forgeCleanupPicker();
  const overlay = document.getElementById('__forge_inspector_overlay__');
  if (overlay) overlay.style.display = 'none';
  return true;
})();
`;

export const applyLiveStyleScript = (property: string, value: string) => `
(() => {
  const el = window.__forgeLastInspectedElement;
  if (el) {
    el.style.setProperty(${JSON.stringify(property)}, ${JSON.stringify(value)});
    return true;
  }
  return false;
})();
`;