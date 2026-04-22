# Copilot Instructions for Cafetería Lelita — Carta Digital

These instructions help AI coding agents work productively in this static site.

## Overview
- **Project Type:** Static multi-page website in Spanish for a café menu.
- **Key Files:** [index.html](index.html), [lunch.html](lunch.html), [cafes.html](cafes.html), [brunch.html](brunch.html), [tortas.html](tortas.html), [styles.css](styles.css), [codigo.js](codigo.js).
- **Shared UI:** Sticky header, responsive navigation, and a section switcher used across menu pages.
- **Dependencies:** No build step, bundler, or external libraries; plain HTML/CSS/JS only.

## Architecture & Patterns
- **Pages:** Each section is a separate page. Active page highlighting uses `aria-current="page"` on both header links and section switcher pills (see [brunch.html](brunch.html)).
- **Header/Nav:** Common markup with `.site-header`, `.header-inner`, `.menu-toggle` (hamburger), `#primary-nav`, `.nav-list`, `.nav-link`. Mobile nav is hidden by default and toggled via the `nav--open` class (CSS) and `aria-expanded` state (JS).
- **Section Switcher:** The sticky `.section-switcher` below the header provides quick links across sections. Active pill uses `aria-current="page"`.
- **Cards:** Menu items use `article.dish-card` with child `.dish-media` (optional), `.dish-body`, `.dish-name`, `.dish-desc`, `.dish-price`. Omit the media by adding `.no-image` (see [cafes.html](cafes.html)).
- **Section Hero:** `.section-hero` combines `.title-banner` (with decorative `.line`, `.dot`, `.rule`) and `.section-lead-card` with preview content.

## Styling Conventions
- **Design Tokens:** Colors and fonts are defined in CSS variables at `:root` (see [styles.css](styles.css)). Change palette via `--color-primary`, `--color-cream`, `--color-text`; titles use `--font-title`.
- **Responsive Breakpoint:** `768px` is the main breakpoint. On desktop (`min-width: 768px`), the nav is visible and pills get an emphasized style via `[aria-current="page"]` selectors.
- **Accessibility:** Minimum touch size, focus outlines, and `aria-*` attributes are used throughout. Preserve `aria-expanded`, `aria-controls`, `aria-label`, and `[aria-current]` patterns.

## JavaScript Behaviors (codigo.js)
- **Mobile Menu:** Toggles `aria-expanded` on `.menu-toggle` and `nav--open` on `#primary-nav`. Closes on link click in mobile and on resize to desktop.
- **Pressed Feedback:** Adds/removes `is-pressed` on interactive elements for tactile feedback.
- **Dropdown (Optional):** Supports a dropdown via a `.dropdown-toggle` and a submenu (`#submenu-carta`) toggling `submenu--open`. This markup is not present in current pages; only add if you introduce a dropdown.

## Workflows
- **Local Preview:** Open any page directly in a browser or use VS Code Live Server to serve the folder. No build step.
- **Manual Testing:** Verify at mobile (< 768px) that the hamburger opens/closes the nav, and that links close the menu; verify at desktop (≥ 768px) that the nav displays and active states via `[aria-current="page"]` are styled.
- **Content Updates:**
  - Add items by copying an `article.dish-card` block; use `.no-image` when appropriate.
  - Update active page states (`aria-current="page"`) in both header nav and section switcher.
  - Keep page `<title>` consistent with the section heading.

## Examples
- **Active Link:** In [lunch.html](lunch.html), the header uses `<a class="nav-link" aria-current="page" href="lunch.html">` to style the current section.
- **No Image Card:** In [cafes.html](cafes.html), menu items use `.dish-card.no-image` to omit the media block cleanly.
- **Mobile Nav Toggle:** In [index.html](index.html), `.menu-toggle` with `aria-expanded="false"` is turned into an "X" via attribute selectors in [styles.css](styles.css).

## Guardrails
- **Keep Accessibility:** Do not remove `aria-*` attributes or focus styles.
- **Consistent Structure:** Reuse the header/nav and section switcher patterns; avoid diverging markup across pages.
- **Dropdown Usage:** Only add `.dropdown-toggle` and `#submenu-carta` if you also update all pages with consistent markup.
