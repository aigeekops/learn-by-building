/* Original local line icons. No CDN or font request is required. */
(() => {
  'use strict';
  const paths = {
    map: ['M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z', 'M9 3v16M15 5v16'],
    'clock-3': ['M12 8v5h4', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
    route: ['M7 5h9a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h9', 'M5 3v4M3 5h4M17 19v4M15 21h4'],
    'notebook-text': ['M6 3h14v18H6zM3 7h6M3 12h6M3 17h6M12 8h5M12 12h5M12 16h4'],
    library: ['M4 4v16M9 4v16M14 4v16M18 4l4 15'],
    blocks: ['M3 3h8v8H3zM13 13h8v8h-8zM3 13h8v8H3zM13 3h8v8h-8z'],
    sprout: ['M12 21v-9M12 14C4 14 3 8 4 5c6-1 9 2 8 9zM12 11c-1-6 3-9 8-8 1 5-2 8-8 8z'],
    'chart-no-axes-combined': ['M3 3v18h18M6 15l5-5 4 3 6-8M17 5h4v4'],
    braces: ['M9 3H7v7l-3 2 3 2v7h2M15 3h2v7l3 2-3 2v7h-2'],
    cpu: ['M6 6h12v12H6zM9 9h6v6H9zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4'],
    network: ['M9 3h6v5H9zM2 16h6v5H2zM16 16h6v5h-6zM12 8v5M5 16v-3h14v3'],
    search: ['M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
    'sliders-horizontal': ['M3 6h5M12 6h9M3 12h10M17 12h4M3 18h3M10 18h11M8 3v6M13 9v6M6 15v6'],
    'git-merge': ['M6 3v13a4 4 0 0 0 4 4h8M6 7c8 0 4 9 12 9M16 14l2 2-2 2'],
    layers: ['M12 3L2 8l10 5 10-5zM2 12l10 5 10-5M2 16l10 5 10-5'],
    workflow: ['M3 3h6v6H3zM15 15h6v6h-6zM9 6h6a3 3 0 0 1 3 3v6M6 9v9h9'],
    'scan-eye': ['M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M4 12s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z', 'M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0'],
    bot: ['M5 7h14v13H5zM12 3v4M2 11v5M22 11v5M8 16h8M8 11h1M15 11h1'],
    rocket: ['M9 15l-4 4M7 13l-4-1 5-5h3M11 17l1 4 5-5v-3M8 14C11 6 16 3 21 3c0 5-3 10-11 13z', 'M17 7h.01'],
  };
  function createIcons({attrs = {}} = {}) {
    document.querySelectorAll('i[data-lucide]').forEach(node => {
      const name = node.dataset.lucide;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const values = {viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none',
        stroke: 'currentColor', 'stroke-width': 1.7, 'stroke-linecap': 'round',
        'stroke-linejoin': 'round', 'aria-hidden': 'true', ...attrs};
      Object.entries(values).forEach(([key, value]) => svg.setAttribute(key, String(value)));
      svg.setAttribute('class', 'lucide lucide-' + name);
      for (const d of paths[name] || ['M5 5h14v14H5z']) {
        const path = document.createElementNS(svg.namespaceURI, 'path');
        path.setAttribute('d', d); svg.append(path);
      }
      node.replaceWith(svg);
    });
  }
  globalThis.lucide = {createIcons};
  createIcons();
})();
