/*!
 * KENAI — Material Design 3 CSS Framework
 * kenai.js — Theme toggle + Ripple engine
 * Version: 0.1.0
 */

(function (global) {
  'use strict';

  /* ============================================================
     KENAI NAMESPACE
  ============================================================ */
  const KENAI = {};

  /* ============================================================
     1. THEME MANAGER
     Handles light / dark toggling with localStorage persistence
     and system preference detection.
  ============================================================ */
  KENAI.Theme = (function () {

    const STORAGE_KEY = 'kenai-theme';
    const ATTR        = 'data-theme';
    const root        = document.documentElement;

    /** Resolve effective theme: stored > system > default light */
    function resolve() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }

    /** Apply theme to <html> and update all toggle buttons */
    function apply(theme) {
      root.setAttribute(ATTR, theme);
      localStorage.setItem(STORAGE_KEY, theme);
      document.querySelectorAll('[data-kenai-theme-toggle]').forEach(btn => {
        btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      });
      root.dispatchEvent(new CustomEvent('kenai:themechange', { detail: { theme } }));
    }

    /** Toggle between light and dark */
    function toggle() {
      apply(current() === 'dark' ? 'light' : 'dark');
    }

    /** Get current active theme */
    function current() {
      return root.getAttribute(ATTR) || 'light';
    }

    /** Initialise — called automatically on DOMContentLoaded */
    function init() {
      apply(resolve());

      // Wire up any elements with [data-kenai-theme-toggle]
      document.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-kenai-theme-toggle]');
        if (btn) toggle();
      });

      // React to OS-level changes
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', function (e) {
          // Only follow system if the user hasn't made an explicit choice
          if (!localStorage.getItem(STORAGE_KEY)) {
            apply(e.matches ? 'dark' : 'light');
          }
        });
    }

    return { init, toggle, apply, current, resolve };
  })();


  /* ============================================================
     2. RIPPLE ENGINE
     Attaches Material-style ink ripple to elements
     with class="ripple" or [data-ripple].
  ============================================================ */
  KENAI.Ripple = (function () {

    const RIPPLE_CLASS = 'kenai-ripple-wave';

    /** Inject required ripple styles once */
    function injectStyles() {
      if (document.getElementById('kenai-ripple-styles')) return;
      const style = document.createElement('style');
      style.id = 'kenai-ripple-styles';
      style.textContent = `
        .kenai-ripple-wave {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: kenai-ripple-anim 550ms cubic-bezier(0.2, 0, 0, 1) forwards;
          background: currentColor;
          opacity: 0.12;
          pointer-events: none;
        }
        @keyframes kenai-ripple-anim {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    /** Create and animate a ripple on the target element */
    function spawn(element, event) {
      const rect   = element.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height);
      const x      = (event.clientX - rect.left) - size / 2;
      const y      = (event.clientY - rect.top)  - size / 2;

      const ripple = document.createElement('span');
      ripple.classList.add(RIPPLE_CLASS);
      ripple.style.cssText = `
        width:  ${size}px;
        height: ${size}px;
        left:   ${x}px;
        top:    ${y}px;
      `;

      // Ensure the host has relative positioning
      const pos = window.getComputedStyle(element).position;
      if (pos === 'static') element.style.position = 'relative';

      element.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    }

    /** Attach ripple listeners — called on init and for dynamic elements */
    function attach(root) {
      const targets = (root || document).querySelectorAll('.ripple, [data-ripple]');
      targets.forEach(el => {
        if (el._kenaiRipple) return; // prevent double-binding
        el._kenaiRipple = true;
        el.addEventListener('pointerdown', function (e) {
          spawn(this, e);
        });
      });
    }

    /** Watch for dynamically added ripple elements */
    function observe() {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches('.ripple, [data-ripple]')) attach(node.parentElement);
            else if (node.querySelectorAll) attach(node);
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    function init() {
      injectStyles();
      attach();
      observe();
    }

    return { init, attach, spawn };
  })();


  /* ============================================================
     3. DYNAMIC COLOR SEED
     Accepts a hex seed color and generates a basic primary
     tonal palette written as CSS custom properties on :root.
     A lightweight approximation — not full HCT color science.
  ============================================================ */
  KENAI.Color = (function () {

    /** Convert hex to { r, g, b } (0–255) */
    function hexToRgb(hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const n = parseInt(hex, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    /** Clamp a value between min and max */
    function clamp(val, min, max) {
      return Math.min(max, Math.max(min, val));
    }

    /** Lighten / darken a hex color by a ratio (-1 to 1) */
    function adjust(hex, ratio) {
      const { r, g, b } = hexToRgb(hex);
      const factor = ratio > 0 ? (255 - Math.max(r, g, b)) * ratio : Math.min(r, g, b) * Math.abs(ratio);
      const sign   = ratio > 0 ? 1 : -1;
      return rgbToHex(
        clamp(r + factor * sign, 0, 255),
        clamp(g + factor * sign, 0, 255),
        clamp(b + factor * sign, 0, 255)
      );
    }

    function rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    }

    /**
     * Generate tonal palette from a seed hex and apply to CSS vars.
     * @param {string} seedHex  — e.g. "#1B6EF3"
     * @param {string} [target] — CSS selector to apply to, defaults to ":root"
     */
    function applyPalette(seedHex, target) {
      const el = target ? document.querySelector(target) : document.documentElement;
      if (!el) return;

      el.style.setProperty('--md-primary',              seedHex);
      el.style.setProperty('--md-on-primary',           adjust(seedHex, 0.9));
      el.style.setProperty('--md-primary-container',    adjust(seedHex, 0.75));
      el.style.setProperty('--md-on-primary-container', adjust(seedHex, -0.6));
      el.style.setProperty('--md-inverse-primary',      adjust(seedHex, 0.4));
    }

    return { applyPalette, hexToRgb, adjust };
  })();


  /* ============================================================
     4. AUTO-INIT
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
     5. EXPORT
  ============================================================ */
  global.KENAI = KENAI;

})(typeof window !== 'undefined' ? window : this);
