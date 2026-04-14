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
