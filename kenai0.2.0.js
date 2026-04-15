/*!
 * KENAI — Material Design 3 CSS Framework
 * kenai.js — Runtime engine
 * Version: 0.2.0
 */

(function (global) {
  'use strict';

  const KENAI = {};

  /* ============================================================
     1. THEME MANAGER
     Handles light/dark toggling, localStorage persistence,
     system preference detection, and custom seed color.
  ============================================================ */
  KENAI.Theme = (function () {
    const STORAGE_KEY = 'kenai-theme';
    const ATTR        = 'data-theme';
    const root        = document.documentElement;

    function resolve() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function apply(theme) {
      root.setAttribute(ATTR, theme);
      localStorage.setItem(STORAGE_KEY, theme);
      document.querySelectorAll('[data-kenai-theme-toggle]').forEach(btn => {
        btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('aria-pressed', String(theme === 'dark'));
      });
      root.dispatchEvent(new CustomEvent('kenai:themechange', { detail: { theme }, bubbles: true }));
    }

    function toggle() {
      apply(current() === 'dark' ? 'light' : 'dark');
    }

    function current() {
      return root.getAttribute(ATTR) || 'light';
    }

    function init() {
      apply(resolve());

      document.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-kenai-theme-toggle]');
        if (btn) toggle();
      });

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!localStorage.getItem(STORAGE_KEY)) apply(e.matches ? 'dark' : 'light');
      });
    }

    return { init, toggle, apply, current, resolve };
  })();


  /* ============================================================
     2. RIPPLE ENGINE
     Pixel-perfect M3 ink ripple on .ripple / [data-ripple]
  ============================================================ */
  KENAI.Ripple = (function () {
    const WAVE_CLASS = 'kenai-ripple-wave';

    function injectStyles() {
      if (document.getElementById('kenai-ripple-styles')) return;
      const s = document.createElement('style');
      s.id = 'kenai-ripple-styles';
      s.textContent = `
        .kenai-ripple-wave {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: kenai-ripple-expand 500ms cubic-bezier(0.2, 0, 0, 1) forwards;
          background: currentColor;
          pointer-events: none;
        }
        @keyframes kenai-ripple-expand {
          to { transform: scale(4); opacity: 0; }
        }
      `;
      document.head.appendChild(s);
    }

    function spawn(el, e) {
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x    = e.clientX - rect.left - size / 2;
      const y    = e.clientY - rect.top  - size / 2;

      const wave = document.createElement('span');
      wave.className = WAVE_CLASS;
      wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;opacity:0.12;`;

      const pos = getComputedStyle(el).position;
      if (pos === 'static') el.style.position = 'relative';

      el.appendChild(wave);
      wave.addEventListener('animationend', () => wave.remove(), { once: true });
    }

    function attach(root) {
      (root || document).querySelectorAll('.ripple, [data-ripple]').forEach(el => {
        if (el._kenaiRipple) return;
        el._kenaiRipple = true;
        el.addEventListener('pointerdown', function (e) { spawn(this, e); });
      });
    }

    function observe() {
      new MutationObserver(mutations => {
        mutations.forEach(m => m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('.ripple, [data-ripple]')) attach(node.parentElement);
          if (node.querySelectorAll) attach(node);
        }));
      }).observe(document.body, { childList: true, subtree: true });
    }

    function init() {
      injectStyles();
      attach();
      observe();
    }

    return { init, attach, spawn };
  })();


  /* ============================================================
     3. SNACKBAR MANAGER
     KENAI.Snackbar.show('Message', { action: 'Undo', onAction: fn, duration: 4000 })
  ============================================================ */
  KENAI.Snackbar = (function () {
    let container;

    function getContainer() {
      if (!container) {
        container = document.createElement('div');
        container.className = 'snackbar-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
      }
      return container;
    }

    function show(message, opts) {
      opts = Object.assign({ duration: 4000, action: null, onAction: null }, opts);

      const c   = getContainer();
      const bar = document.createElement('div');
      bar.className    = 'snackbar';
      bar.setAttribute('role', 'status');

      const text = document.createElement('span');
      text.className   = 'snackbar-text';
      text.textContent = message;
      bar.appendChild(text);

      if (opts.action) {
        const btn = document.createElement('button');
        btn.className   = 'snackbar-action';
        btn.textContent = opts.action;
        btn.addEventListener('click', function () {
          if (typeof opts.onAction === 'function') opts.onAction();
          dismiss(bar);
        });
        bar.appendChild(btn);
      }

      c.appendChild(bar);

      let timer = setTimeout(() => dismiss(bar), opts.duration);

      // Pause on hover
      bar.addEventListener('mouseenter', () => clearTimeout(timer));
      bar.addEventListener('mouseleave', () => { timer = setTimeout(() => dismiss(bar), 2000); });

      return {
        dismiss: () => dismiss(bar),
        el: bar,
      };
    }

    function dismiss(bar) {
      if (!bar || bar._dismissed) return;
      bar._dismissed = true;
      bar.classList.add('closing');
      bar.addEventListener('animationend', () => bar.remove(), { once: true });
    }

    return { show, dismiss };
  })();


  /* ============================================================
     4. SCROLL LOCK
     Prevents body scroll when modals / drawers are open.
  ============================================================ */
  KENAI.ScrollLock = (function () {
    let count = 0;
    let savedY = 0;

    function lock() {
      if (count === 0) {
        savedY = window.scrollY;
        document.body.style.cssText += `
          overflow: hidden;
          position: fixed;
          top: -${savedY}px;
          width: 100%;
        `;
      }
      count++;
    }

    function unlock() {
      count = Math.max(0, count - 1);
      if (count === 0) {
        document.body.style.overflow    = '';
        document.body.style.position   = '';
        document.body.style.top        = '';
        document.body.style.width      = '';
        window.scrollTo(0, savedY);
      }
    }

    return { lock, unlock };
  })();


  /* ============================================================
     5. COLOR — TONAL PALETTE GENERATOR
     Apply a seed hex color to generate a full M3-inspired
     tonal palette as CSS custom properties on :root.
     Uses perceptual lightness approximation (not full HCT).
  ============================================================ */
  KENAI.Color = (function () {

    function hexToHsl(hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.slice(0,2),16) / 255;
      const g = parseInt(hex.slice(2,4),16) / 255;
      const b = parseInt(hex.slice(4,6),16) / 255;
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      let h, s, l = (max + min) / 2;
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToHex(h, s, l) {
      h /= 360; s /= 100; l /= 100;
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return '#' + [r, g, b]
        .map(v => Math.round(v * 255).toString(16).padStart(2, '0'))
        .join('');
    }

    function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

    /**
     * Generate a full tonal palette from a seed hex color.
     * Writes CSS custom properties to --md-primary, --md-primary-container, etc.
     * @param {string} seedHex - e.g. "#4CAF50"
     */
    function applyPalette(seedHex) {
      const { h, s } = hexToHsl(seedHex);
      const el = document.documentElement;
      const isDark = KENAI.Theme.current() === 'dark';

      if (!isDark) {
        // Light theme
        el.style.setProperty('--md-primary',              hslToHex(h, clamp(s, 40, 90), 40));
        el.style.setProperty('--md-on-primary',           '#FFFFFF');
        el.style.setProperty('--md-primary-container',    hslToHex(h, clamp(s, 30, 80), 90));
        el.style.setProperty('--md-on-primary-container', hslToHex(h, clamp(s, 40, 90), 10));
        el.style.setProperty('--md-secondary',            hslToHex(h, clamp(s * 0.4, 10, 40), 35));
        el.style.setProperty('--md-secondary-container',  hslToHex(h, clamp(s * 0.3, 10, 30), 88));
        el.style.setProperty('--md-inverse-primary',      hslToHex(h, clamp(s, 40, 90), 80));
      } else {
        // Dark theme
        el.style.setProperty('--md-primary',              hslToHex(h, clamp(s, 40, 90), 80));
        el.style.setProperty('--md-on-primary',           hslToHex(h, clamp(s, 40, 90), 20));
        el.style.setProperty('--md-primary-container',    hslToHex(h, clamp(s, 40, 90), 30));
        el.style.setProperty('--md-on-primary-container', hslToHex(h, clamp(s, 30, 80), 90));
        el.style.setProperty('--md-secondary',            hslToHex(h, clamp(s * 0.4, 10, 40), 75));
        el.style.setProperty('--md-secondary-container',  hslToHex(h, clamp(s * 0.3, 10, 30), 28));
        el.style.setProperty('--md-inverse-primary',      hslToHex(h, clamp(s, 40, 90), 40));
      }

      el.dispatchEvent(new CustomEvent('kenai:palettechange', {
        detail: { seed: seedHex, hue: h, saturation: s },
        bubbles: true
      }));
    }

    /**
     * Reset all custom color properties to stylesheet defaults.
     */
    function reset() {
      const props = [
        '--md-primary', '--md-on-primary', '--md-primary-container',
        '--md-on-primary-container', '--md-secondary', '--md-secondary-container',
        '--md-inverse-primary'
      ];
      props.forEach(p => document.documentElement.style.removeProperty(p));
    }

    return { applyPalette, reset, hexToHsl, hslToHex };
  })();


  /* ============================================================
     6. UTILITIES
  ============================================================ */
  KENAI.Utils = {
    /**
     * Simple element query helper
     * @param {string} selector
     * @param {Element} [context]
     */
    $(selector, context) {
      return (context || document).querySelector(selector);
    },
    $$(selector, context) {
      return Array.from((context || document).querySelectorAll(selector));
    },

    /**
     * Debounce a function
     * @param {Function} fn
     * @param {number} delay
     */
    debounce(fn, delay) {
      let t;
      return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    /**
     * Parse a CSS custom property value from :root
     * @param {string} prop - e.g. '--md-primary'
     */
    getToken(prop) {
      return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    },

    /**
     * Set a CSS custom property on :root
     * @param {string} prop
     * @param {string} value
     */
    setToken(prop, value) {
      document.documentElement.style.setProperty(prop, value);
    }
  };


  /* ============================================================
     7. AUTO-INIT
  ============================================================ */
  function init() {
    KENAI.Theme.init();
    KENAI.Ripple.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }


  /* ============================================================
     8. EXPORT
  ============================================================ */
  global.KENAI = KENAI;

})(typeof window !== 'undefined' ? window : this);


KENAI.Menu = (function () {

  function open(anchor) {
    const menu = anchor.querySelector('.menu');
    if (!menu) return;
    menu.classList.add('menu-open');
    anchor.setAttribute('aria-expanded', 'true');
    anchor.dispatchEvent(new CustomEvent('kenai:menuopen', { bubbles: true }));
  }

  function close(anchor) {
    const menu = anchor.querySelector('.menu');
    if (!menu) return;
    menu.classList.remove('menu-open');
    anchor.setAttribute('aria-expanded', 'false');
    anchor.dispatchEvent(new CustomEvent('kenai:menuclose', { bubbles: true }));
  }

  function closeAll() {
    document.querySelectorAll('.menu-anchor[aria-expanded="true"]').forEach(close);
  }

  function init() {
    // Toggle on trigger click
    document.addEventListener('click', function (e) {
      const trigger = e.target.closest('[data-menu-trigger]');
      if (trigger) {
        const anchor = trigger.closest('.menu-anchor');
        if (!anchor) return;
        e.stopPropagation();
        const isOpen = anchor.getAttribute('aria-expanded') === 'true';
        closeAll();
        if (!isOpen) open(anchor);
        return;
      }

      // Close on item click
      const item = e.target.closest('.menu-item');
      if (item) {
        const anchor = item.closest('.menu-anchor');
        if (anchor) close(anchor);
        return;
      }

      // Close on outside click
      if (!e.target.closest('.menu-anchor')) closeAll();
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
  }

  return { open, close, closeAll, init };
})();


/* ============================================================
   MODULE 2 — TABS MANAGER
   Auto-manages active tab + tab panel visibility.
   KENAI.Tabs.activate(tabEl)
   KENAI.Tabs.init()
============================================================ */

KENAI.Tabs = (function () {

  function activate(tab) {
    const list = tab.closest('.tabs-list');
    if (!list) return;
    const tabs = list.querySelectorAll('.tab');

    // Deactivate all
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });

    // Activate target
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    // Move indicator
    moveIndicator(list, tab);

    // Swap panels
    const tabsContainer = list.closest('.tabs');
    if (tabsContainer) {
      const panelId = tab.getAttribute('data-tab');
      tabsContainer.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      if (panelId) {
        const panel = tabsContainer.querySelector(`#${panelId}`);
        if (panel) panel.classList.add('active');
      }
    }

    tab.dispatchEvent(new CustomEvent('kenai:tabchange', { bubbles: true, detail: { tab } }));
  }

  function moveIndicator(list, activeTab) {
    let indicator = list.querySelector('.tab-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'tab-indicator';
      list.appendChild(indicator);
    }
    const listRect = list.getBoundingClientRect();
    const tabRect  = activeTab.getBoundingClientRect();
    indicator.style.left  = (tabRect.left - listRect.left + list.scrollLeft) + 'px';
    indicator.style.width = tabRect.width + 'px';
  }

  function init() {
    document.addEventListener('click', function (e) {
      const tab = e.target.closest('.tab');
      if (tab) activate(tab);
    });

    // Init indicators on load
    document.querySelectorAll('.tabs-list').forEach(list => {
      const active = list.querySelector('.tab.active, .tab[aria-selected="true"]');
      if (active) moveIndicator(list, active);
    });
  }

  return { activate, moveIndicator, init };
})();


/* ============================================================
   MODULE 3 — ACCORDION MANAGER
   KENAI.Accordion.open(itemEl)
   KENAI.Accordion.close(itemEl)
   KENAI.Accordion.toggle(itemEl)
   KENAI.Accordion.init()
============================================================ */

KENAI.Accordion = (function () {

  function open(item) {
    const panel   = item.querySelector('.accordion-panel');
    const content = item.querySelector('.accordion-panel-content');
    if (!panel) return;
    item.classList.add('open');
    item.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'true');
    // Use actual content height for precise animation
    if (content) panel.style.maxHeight = content.offsetHeight + 'px';
    item.dispatchEvent(new CustomEvent('kenai:accordionopen', { bubbles: true }));
  }

  function close(item) {
    const panel = item.querySelector('.accordion-panel');
    if (!panel) return;
    panel.style.maxHeight = '0';
    item.classList.remove('open');
    item.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
    item.dispatchEvent(new CustomEvent('kenai:accordionclose', { bubbles: true }));
  }

  function toggle(item) {
    item.classList.contains('open') ? close(item) : open(item);
  }

  function init() {
    document.addEventListener('click', function (e) {
      const trigger = e.target.closest('.accordion-trigger');
      if (!trigger) return;
      const item = trigger.closest('.accordion-item');
      if (!item) return;

      const accordion = item.closest('.accordion');
      // Single-open mode
      if (accordion && accordion.hasAttribute('data-single')) {
        accordion.querySelectorAll('.accordion-item').forEach(i => {
          if (i !== item) close(i);
        });
      }

      toggle(item);
    });
  }

  return { open, close, toggle, init };
})();


/* ============================================================
   MODULE 4 — APP BAR SCROLL BEHAVIOR
   Adds .scrolled to .app-bar-sticky / .app-bar-fixed on scroll.
   KENAI.AppBar.init()
============================================================ */

KENAI.AppBar = (function () {

  function init() {
    const bars = document.querySelectorAll('.app-bar');
    if (!bars.length) return;

    const onScroll = function () {
      const scrolled = window.scrollY > 4;
      bars.forEach(bar => bar.classList.toggle('scrolled', scrolled));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on init
  }

  return { init };
})();


/* ============================================================
   MODULE 5 — TEXT FIELD FLOAT LABEL
   Adds .has-value to .text-field when the input has content,
   enabling the floating label to stay up.
   KENAI.TextField.init()
============================================================ */

KENAI.TextField = (function () {

  function sync(input) {
    const field = input.closest('.text-field');
    if (!field) return;
    field.classList.toggle('has-value', input.value.length > 0);
  }

  function attach(root) {
    (root || document).querySelectorAll('.text-field input, .text-field textarea').forEach(el => {
      if (el._kenaiTextField) return;
      el._kenaiTextField = true;
      el.addEventListener('input', function () { sync(this); });
      el.addEventListener('change', function () { sync(this); });
      sync(el); // sync initial value (e.g. autofill)
    });
  }

  function observe() {
    new MutationObserver(mutations => {
      mutations.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        attach(node);
      }));
    }).observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    attach();
    observe();
  }

  return { init, attach, sync };
})();


/* ============================================================
   MODULE 6 — NAVIGATION DRAWER MANAGER
   KENAI.Drawer.open(drawerEl)
   KENAI.Drawer.close(drawerEl)
   KENAI.Drawer.toggle(drawerEl)
   KENAI.Drawer.init()
   
   HTML pattern:
   <button data-drawer-toggle="myDrawer">Open</button>
   <aside class="nav-drawer" id="myDrawer">...</aside>
============================================================ */

KENAI.Drawer = (function () {

  function getScrim(drawer) {
    let scrim = drawer._kenaiScrim;
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.className = 'nav-drawer-scrim';
      scrim.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(scrim, drawer);
      drawer._kenaiScrim = scrim;
      scrim.addEventListener('click', () => close(drawer));
    }
    return scrim;
  }

  function open(drawer) {
    drawer.classList.add('nav-drawer-open');
    drawer.setAttribute('aria-hidden', 'false');
    getScrim(drawer).classList.add('visible');
    KENAI.ScrollLock.lock();
    drawer.dispatchEvent(new CustomEvent('kenai:draweropen', { bubbles: true }));

    // Focus first focusable element inside
    const focusable = drawer.querySelector('a, button, input, [tabindex="0"]');
    if (focusable) setTimeout(() => focusable.focus(), 50);
  }

  function close(drawer) {
    drawer.classList.remove('nav-drawer-open');
    drawer.setAttribute('aria-hidden', 'true');
    const scrim = drawer._kenaiScrim;
    if (scrim) scrim.classList.remove('visible');
    KENAI.ScrollLock.unlock();
    drawer.dispatchEvent(new CustomEvent('kenai:drawerclose', { bubbles: true }));
  }

  function toggle(drawer) {
    drawer.classList.contains('nav-drawer-open') ? close(drawer) : open(drawer);
  }

  function init() {
    // Wire toggle buttons
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-drawer-toggle]');
      if (btn) {
        const id = btn.getAttribute('data-drawer-toggle');
        const drawer = document.getElementById(id);
        if (drawer) toggle(drawer);
        return;
      }

      // Close button inside drawer
      const closeBtn = e.target.closest('[data-drawer-close]');
      if (closeBtn) {
        const drawer = closeBtn.closest('.nav-drawer');
        if (drawer) close(drawer);
      }
    });

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.nav-drawer.nav-drawer-open').forEach(close);
      }
    });
  }

  return { open, close, toggle, init };
})();


/* ============================================================
   MODULE 7 — DIALOG MANAGER
   KENAI.Dialog.open(dialogScrimEl | '#dialogId')
   KENAI.Dialog.close(dialogScrimEl | '#dialogId')
   KENAI.Dialog.init()
   
   HTML pattern:
   <button data-dialog-open="myDialog">Open</button>
   <div class="dialog-scrim" id="myDialog" style="display:none">
     <div class="dialog" role="dialog" aria-modal="true">
       ...
       <button data-dialog-close>Cancel</button>
     </div>
   </div>
============================================================ */

KENAI.Dialog = (function () {

  function resolve(target) {
    if (typeof target === 'string') return document.querySelector(target);
    return target;
  }

  function open(target) {
    const scrim = resolve(target);
    if (!scrim) return;
    scrim.style.display = 'flex';
    requestAnimationFrame(() => {
      scrim.style.opacity = '1';
    });
    KENAI.ScrollLock.lock();
    scrim.setAttribute('aria-hidden', 'false');

    const dialog = scrim.querySelector('[role="dialog"]');
    if (dialog) {
      const focusable = dialog.querySelector('button, input, [tabindex="0"]');
      if (focusable) setTimeout(() => focusable.focus(), 80);
    }

    scrim.dispatchEvent(new CustomEvent('kenai:dialogopen', { bubbles: true }));
  }

  function close(target) {
    const scrim = resolve(target);
    if (!scrim) return;
    scrim.style.display = 'none';
    KENAI.ScrollLock.unlock();
    scrim.setAttribute('aria-hidden', 'true');
    scrim.dispatchEvent(new CustomEvent('kenai:dialogclose', { bubbles: true }));
  }

  function init() {
    document.addEventListener('click', function (e) {
      // Open trigger
      const openBtn = e.target.closest('[data-dialog-open]');
      if (openBtn) {
        const id = openBtn.getAttribute('data-dialog-open');
        open('#' + id);
        return;
      }

      // Close trigger
      const closeBtn = e.target.closest('[data-dialog-close]');
      if (closeBtn) {
        const scrim = closeBtn.closest('.dialog-scrim');
        if (scrim) close(scrim);
        return;
      }

      // Scrim click closes modal
      if (e.target.classList.contains('dialog-scrim')) {
        close(e.target);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const open = document.querySelector('.dialog-scrim:not([style*="display: none"])');
        if (open) close(open);
      }
    });
  }

  return { open, close, init };
})();


/* ============================================================
   MODULE 8 — TOAST / SNACKBAR QUEUE
   Extends the existing KENAI.Snackbar with a queue system
   so multiple toasts don't pile up.
   KENAI.Toast.push('Message', opts)
   KENAI.Toast.clear()
============================================================ */

KENAI.Toast = (function () {
  const queue   = [];
  let active    = false;
  const MAX_VISIBLE = 1;

  function push(message, opts) {
    queue.push({ message, opts });
    if (!active) processNext();
  }

  function processNext() {
    if (!queue.length) { active = false; return; }
    active = true;
    const { message, opts = {} } = queue.shift();
    const duration = opts.duration || 4000;

    const instance = KENAI.Snackbar.show(message, {
      ...opts,
      duration,
      onAction: opts.onAction,
    });

    // After duration + animation, show next
    setTimeout(processNext, duration + 400);
  }

  function clear() {
    queue.length = 0;
  }

  return { push, clear };
})();


/* ============================================================
   MODULE 9 — KEYBOARD NAVIGATION HELPER
   Traps focus within modal elements and restores on close.
   KENAI.FocusTrap.activate(containerEl)
   KENAI.FocusTrap.deactivate()
============================================================ */

KENAI.FocusTrap = (function () {
  let container = null;
  let previouslyFocused = null;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getFocusableEls() {
    return Array.from(container.querySelectorAll(FOCUSABLE)).filter(el => !el.offsetParent === false);
  }

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusableEls();
    if (!focusable.length) { e.preventDefault(); return; }

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  function activate(el) {
    container = el;
    previouslyFocused = document.activeElement;
    document.addEventListener('keydown', handleKeyDown);
    const firstFocusable = getFocusableEls()[0];
    if (firstFocusable) firstFocusable.focus();
  }

  function deactivate() {
    document.removeEventListener('keydown', handleKeyDown);
    if (previouslyFocused) previouslyFocused.focus();
    container = null;
    previouslyFocused = null;
  }

  return { activate, deactivate };
})();


/* ============================================================
   MODULE 10 — INTERSECTION OBSERVER ANIMATIONS
   Add data-animate to any element to trigger .animate-fade-in
   or a custom class when it enters the viewport.
   
   Usage:
   <div data-animate>Content</div>
   <div data-animate="animate-slide-up delay-200">Content</div>
   
   KENAI.Observer.init()
============================================================ */

KENAI.Observer = (function () {

  function init(options) {
    options = Object.assign({
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px',
    }, options);

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el   = entry.target;
        const cls  = el.getAttribute('data-animate') || 'animate-fade-in';
        cls.split(' ').filter(Boolean).forEach(c => el.classList.add(c));
        el.removeAttribute('data-animate');
        observer.unobserve(el);
      });
    }, options);

    document.querySelectorAll('[data-animate]').forEach(el => {
      el.style.opacity = '0'; // hide before animation
      observer.observe(el);
    });

    return observer;
  }

  return { init };
})();


/* ============================================================
   MODULE 11 — FORM VALIDATOR
   Lightweight form validation integrated with KENAI text fields.
   
   Usage:
   <form data-kenai-validate>
     <div class="text-field text-field-filled">
       <input required minlength="3" data-label="Username" />
     </div>
   </form>
   
   KENAI.Validate.form(formEl) → true | false
   KENAI.Validate.field(inputEl) → true | false
   KENAI.Validate.init()
============================================================ */

KENAI.Validate = (function () {

  const MESSAGES = {
    required:  (label) => `${label} is required`,
    minlength: (label, min) => `${label} must be at least ${min} characters`,
    maxlength: (label, max) => `${label} must be ${max} characters or less`,
    email:     (label) => `${label} must be a valid email address`,
    pattern:   (label) => `${label} format is invalid`,
    min:       (label, min) => `${label} must be at least ${min}`,
    max:       (label, max) => `${label} must be no more than ${max}`,
  };

  function getLabel(input) {
    return input.getAttribute('data-label')
      || input.getAttribute('placeholder')
      || input.name
      || 'This field';
  }

  function setError(input, message) {
    const field = input.closest('.text-field');
    if (!field) return;
    field.classList.add('text-field-error');
    let support = field.querySelector('.text-field-support');
    if (!support) {
      support = document.createElement('div');
      support.className = 'text-field-support';
      field.appendChild(support);
    }
    support.textContent = message;
    support.setAttribute('role', 'alert');
  }

  function clearError(input) {
    const field = input.closest('.text-field');
    if (!field) return;
    field.classList.remove('text-field-error');
    const support = field.querySelector('.text-field-support');
    if (support) support.textContent = '';
  }

  function validateField(input) {
    clearError(input);
    const label = getLabel(input);
    const val   = input.value.trim();

    if (input.required && !val) {
      setError(input, MESSAGES.required(label));
      return false;
    }
    if (val && input.minLength > 0 && val.length < input.minLength) {
      setError(input, MESSAGES.minlength(label, input.minLength));
      return false;
    }
    if (val && input.maxLength > 0 && val.length > input.maxLength) {
      setError(input, MESSAGES.maxlength(label, input.maxLength));
      return false;
    }
    if (val && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setError(input, MESSAGES.email(label));
      return false;
    }
    if (val && input.pattern && !new RegExp(input.pattern).test(val)) {
      setError(input, MESSAGES.pattern(label));
      return false;
    }
    if (val && input.min && parseFloat(val) < parseFloat(input.min)) {
      setError(input, MESSAGES.min(label, input.min));
      return false;
    }
    if (val && input.max && parseFloat(val) > parseFloat(input.max)) {
      setError(input, MESSAGES.max(label, input.max));
      return false;
    }

    return true;
  }

  function validateForm(form) {
    const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
    const results = inputs.map(validateField);
    const valid = results.every(Boolean);
    if (!valid) {
      const firstInvalid = inputs.find((input, i) => !results[i]);
      if (firstInvalid) firstInvalid.focus();
    }
    return valid;
  }

  function init() {
    // Real-time validation on blur
    document.addEventListener('blur', function (e) {
      const input = e.target;
      if (!input.matches('input, textarea, select')) return;
      const form = input.closest('[data-kenai-validate]');
      if (form) validateField(input);
    }, true);

    // Full validation on submit
    document.addEventListener('submit', function (e) {
      const form = e.target.closest('[data-kenai-validate]');
      if (!form) return;
      if (!validateForm(form)) e.preventDefault();
    });
  }

  return { form: validateForm, field: validateField, setError, clearError, init };
})();


/* ============================================================
   MODULE 12 — POPOVER / POSITIONING ENGINE
   Positions a floating element relative to an anchor.
   KENAI.Popover.position(popoverEl, anchorEl, placement)
   
   Placement: 'top' | 'bottom' | 'left' | 'right'
             + '-start' | '-end' suffix
============================================================ */

KENAI.Popover = (function () {

  const OFFSET = 8; // gap between anchor and popover

  function position(popover, anchor, placement) {
    placement = placement || 'bottom';
    const ar = anchor.getBoundingClientRect();
    const pr = popover.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top  = 0;
    let left = 0;

    const [side, align] = placement.split('-');

    switch (side) {
      case 'top':
        top  = ar.top - pr.height - OFFSET;
        left = ar.left + ar.width / 2 - pr.width / 2;
        break;
      case 'bottom':
        top  = ar.bottom + OFFSET;
        left = ar.left + ar.width / 2 - pr.width / 2;
        break;
      case 'left':
        top  = ar.top + ar.height / 2 - pr.height / 2;
        left = ar.left - pr.width - OFFSET;
        break;
      case 'right':
        top  = ar.top + ar.height / 2 - pr.height / 2;
        left = ar.right + OFFSET;
        break;
    }

    // Alignment overrides
    if (align === 'start') { left = (side === 'left' || side === 'right') ? left : ar.left; }
    if (align === 'end')   { left = (side === 'left' || side === 'right') ? left : ar.right - pr.width; }

    // Viewport clamp
    left = Math.max(8, Math.min(left, vw - pr.width - 8));
    top  = Math.max(8, Math.min(top,  vh - pr.height - 8));

    // Add scroll offset
    top  += window.scrollY;
    left += window.scrollX;

    popover.style.position = 'absolute';
    popover.style.top  = top  + 'px';
    popover.style.left = left + 'px';
  }

  return { position };
})();

