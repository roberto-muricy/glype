# Handoff: Glype Brand System

## Overview
Glype is a PlayStation reviews/curation product. This handoff contains the v1 brand identity: a **tilted thumbstick** symbol paired with a **Space Grotesk** wordmark, plus full guidance on color, type, lockups, app icons, clear space, do/don't rules, and in-context examples.

## About the Design Files
The HTML file in this bundle is a **design reference** — a static page showing the intended look of the brand mark, lockups, palette, and rules. It is not production code to ship. Your task is to **lift the design tokens, SVG primitives, and rules below into the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.). If no environment exists yet, pick the most appropriate framework for the app and implement the brand foundations there (e.g. as a `Logo` component + a `tokens` module).

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and the locked geometric construction of the mark. Recreate pixel-perfectly using the target codebase's existing libraries and patterns.

---

## The Mark

The Glype mark is a top-down view of an analog thumbstick: an outer **socket ring** (stroked circle) with an inner **cap** (filled circle) pushed off-center to the upper-right.

### Locked construction (do not deviate)

Working in a **100×100 viewBox** with the symbol centered:

| Part | Geometry | Notes |
|---|---|---|
| Socket ring | `cx=50 cy=50 r=38`, `stroke-width=6`, `fill=none` | Stroke only |
| Cap | `cx=61.3 cy=38.7 r=18`, `fill=solid` | Sits at NE 45° from socket center, kissing the inner edge |
| Cap offset | `dx=+11.3, dy=-11.3` from socket center | Equivalent to `r_socket * cos(45°) − r_cap × … fixed` |
| Cap : socket diameter ratio | **47%** | 18 / 38 ≈ 0.474 |

The off-axis cap is what makes the silhouette distinctive — never center the cap, never rotate the cap to a different angle, never change the diameter ratio.

### Reference SVG (primary, blue on dark)

```html
<svg viewBox="0 0 100 100" fill="none" aria-label="Glype">
  <circle cx="50" cy="50" r="38" stroke="#0066FF" stroke-width="6" fill="none"/>
  <circle cx="61.3" cy="38.7" r="18" fill="#0066FF"/>
</svg>
```

### Mono / inverted variants

- **White on blue surface** — both shapes `#FFFFFF`
- **Blue on dark surface** (primary) — both shapes `#0066FF`
- **Blue on white surface** (print) — both shapes `#0066FF`
- **Mono ink** (1-color) — both shapes `#0A0A0F` (or `#FFFFFF` reversed)

Never apply gradients, dashed strokes, or outline-only treatments to the cap.

---

## Wordmark & Lockups

**Typeface:** Space Grotesk 600 · letter-spacing `-0.025em` (display) / `-0.015em` (body display).

### Horizontal lockup (primary)

- Symbol height = wordmark cap-height × ~1.6
- Gap between symbol and wordmark = ~0.4× symbol width
- Both elements share `#0066FF`
- Min usable width: **120px**

### Vertical lockup

- Symbol centered above wordmark
- Gap = ~0.5× symbol height
- Min usable width: **80px**

### Stacked + tagline (marketing only)

- Wordmark on top line (Space Grotesk 600)
- Tagline below in **JetBrains Mono 500**, `font-size 10px`, `letter-spacing 2.5px`, `text-transform: uppercase`, color `#6B6B7A`
- Tagline: "PLAYSTATION · REVIEWS"

---

## Design Tokens

Drop these into your tokens module (`tokens.ts`, `tokens.css`, Tailwind config, etc.):

### Colors

```ts
export const colors = {
  blue:  '#0066FF', // Primary brand · CTAs · highlights
  ink:   '#0A0A0F', // Default surface (dark mode primary)
  bone:  '#E7E7EE', // Body text on dark · light surface
  slate: '#6B6B7A', // Muted · meta · monospace text
  // Supporting (used in the brand page itself)
  bg2:   '#111118', // Card surface on dark
  bg3:   '#15151D', // Elevated surface on dark
  line:  '#1C1C26', // Hairline borders on dark
  line2: '#25252F', // Stronger borders on dark
};
```

### Typography

| Role | Family | Weight | Tracking |
|---|---|---|---|
| Display / Heading | Space Grotesk | 600 | -0.025em |
| Body | Space Grotesk | 500 | -0.005em |
| Mono / Numbers / Meta | JetBrains Mono | 400–500 | +0.06em to +0.16em (uppercase) |

Google Fonts import:
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Border radius

| Token | Value | Use |
|---|---|---|
| `radius.sm` | 8px | Inner canvases |
| `radius.md` | 12–14px | Cards |
| `radius.lg` | 22% (relative) | App icon tiles (iOS-style superellipse via `border-radius: 22%`) |
| `radius.full` | 999px | Pills, avatars |

### Spacing scale

The brand page uses a 4px-based scale: `4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 96`. Use whatever scale your codebase already has and map to the same visual rhythm.

### Shadows (brand-blue glow)

```css
/* Used on app icon tiles and CTA cards */
box-shadow: 0 12px 40px -16px rgba(0, 102, 255, 0.55);
```

---

## App Icons

| Variant | Background | Mark color | Use |
|---|---|---|---|
| Primary | `#0066FF` | `#FFFFFF` | iOS, default |
| Gradient | `linear-gradient(160deg, #2A82FF 0%, #0044CC 100%)` | `#FFFFFF` | Marketing only |
| Dark | `#15151D` with `1px solid #25252F` border | `#0066FF` | Android adaptive (foreground layer) |
| Light | `#F6F6F8` with `1px solid #E6E6EA` border | `#0066FF` | Favicon / web |

App-icon tile: `border-radius: 22%` on a square. Mark sized to **60% of tile width**.

---

## Rules

### ✓ Do
- Use the locked construction (ring 6u, cap NE 45° at 47%) at all sizes.
- Maintain **clear space = 1× cap diameter** on all sides.
- Use one of the four approved color treatments (white/blue, blue/dark, blue/white, mono ink).

### × Don't
- Stretch, squash, or distort the mark.
- Recolor with non-approved colors or apply gradients beyond the marketing app icon.
- Place on low-contrast surfaces or competing-blue backgrounds.
- Rotate the mark — cap angle is fixed at NE 45°.
- Outline, dash, or otherwise reinterpret the construction.

---

## Implementation Notes

### As a React component

```tsx
type LogoProps = { size?: number; tone?: 'blue' | 'white' | 'ink' };

export function Logo({ size = 24, tone = 'blue' }: LogoProps) {
  const color = tone === 'blue' ? '#0066FF' : tone === 'white' ? '#FFFFFF' : '#0A0A0F';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Glype">
      <circle cx="50" cy="50" r="38" stroke={color} strokeWidth="6" fill="none" />
      <circle cx="61.3" cy="38.7" r="18" fill={color} />
    </svg>
  );
}
```

### Stroke-width scaling
The `stroke-width: 6` is set at the 100-unit viewBox. When scaling, keep the viewBox and scale the rendered size — do **not** rewrite the stroke width. SVG handles this automatically.

### Minimum sizes
- Mark alone: **16px** (still legible due to the off-axis cap)
- Horizontal lockup: **120px** wide
- Vertical lockup: **80px** wide

---

## Assets / Files in this bundle

- `Glype Brand Package.html` — the full visual spec page; open in any browser to see the canonical reference for everything described above.

All marks are inline SVG (no external image assets); copy directly from the HTML or use the React snippet above.
