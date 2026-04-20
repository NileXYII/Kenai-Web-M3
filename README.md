# KENAI v0.2.0 Alpha
### Material Design 3 CSS Framework — Stock Android / Pixel Aesthetic

> Link it. Use it. Ship it.

---

## Quick Start

```html
<!DOCTYPE html>
<html data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>

  <!-- Google Fonts (Roboto + Google Sans) -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500&family=Roboto:wght@400;500&family=Roboto+Mono&display=swap" rel="stylesheet" />

  <!-- KENAI -->
  <link rel="stylesheet" href="kenai.css" />
</head>
<body>

  <h1>Hello KENAI</h1>
  <p class="body-large">Material Design 3 in plain CSS.</p>

  <!-- Theme Toggle -->
  <button class="kenai-theme-toggle" data-kenai-theme-toggle aria-label="Toggle theme">
    <svg class="icon-dark"  width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
    <svg class="icon-light" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0-5a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 17a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0v-1a1 1 0 0 1 1-1zM4.22 4.22a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.71a1 1 0 0 1 0-1.41zm13.14 13.14a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.71a1 1 0 0 1 0-1.41zM3 12a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1zm16 0a1 1 0 0 1 1-1h1a1 1 0 0 1 0 2h-1a1 1 0 0 1-1-1zM4.22 19.78a1 1 0 0 1 0-1.41l.71-.71a1 1 0 1 1 1.41 1.41l-.71.71a1 1 0 0 1-1.41 0zM17.36 6.64a1 1 0 0 1 0-1.41l.71-.71a1 1 0 1 1 1.41 1.41l-.71.71a1 1 0 0 1-1.41 0z"/></svg>
  </button>

  <script src="kenai.js"></script>
</body>
</html>
```

---

## What's Included in v0.1

| File        | Purpose |
|-------------|---------|
| `kenai.css` | Design tokens, reset, typography, utilities |
| `kenai.js`  | Theme toggle, ripple engine, dynamic color seed |

---

## Design Tokens

All M3 tokens are exposed as CSS custom properties so you can use them directly:

```css
.my-card {
  background: var(--md-surface-2);
  color: var(--md-on-surface);
  border-radius: var(--md-shape-large);
  box-shadow: var(--md-elevation-2);
  padding: var(--md-spacing-6);
  transition: box-shadow var(--md-duration-medium-2) var(--md-easing-standard);
}
```

---

## Theming

KENAI uses `data-theme="light|dark"` on `<html>`. The JS handles:
- Persistence via `localStorage`
- System preference detection (`prefers-color-scheme`)
- Toggle via any `[data-kenai-theme-toggle]` element

**Custom seed color:**
```js
KENAI.Color.applyPalette('#E91E63'); // Generate palette from any hex
```

---

## Typography Classes

```html
<p class="display-large">Display Large</p>
<p class="headline-medium">Headline Medium</p>
<p class="title-small">Title Small</p>
<p class="body-large">Body Large</p>
<p class="label-medium">Label Medium</p>
```

---

## Ripple Effect

Add `.ripple` or `data-ripple` to any element:
```html
<button class="ripple">Click me</button>
<div data-ripple class="rounded-lg p-4 bg-surface-2">Tappable card</div>
```

---

## Roadmap

- [ ] Components: Buttons, Cards, Chips
- [ ] Navigation: App Bar, Nav Bar, Nav Drawer, Nav Rail
- [ ] Inputs: Text Field, Switch, Checkbox, Radio, Slider
- [ ] Feedback: Dialog, Snackbar, Progress, Badge
- [ ] Full HCT dynamic color engine
- [ ] Sass/PostCSS build
- [ ] CDN distribution

---

## License
MIT
