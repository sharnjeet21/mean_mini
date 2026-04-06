# Design System Specification: High-End Travel & SaaS Editorial

## 1. Overview & Creative North Star
**The Creative North Star: "The Elevated Navigator"**

This design system transcends the standard SaaS "box-on-box" utility. It is rooted in **Soft Minimalism** and **Editorial Precision**. Instead of treating a dashboard like a control panel, we treat it like a premium travel journal—airy, intentional, and high-trust. 

We break the "template" look by utilizing **intentional asymmetry** (e.g., staggering card heights in itineraries) and **tonal depth**. By moving away from rigid 1px borders and moving toward "Physical Layering," we create an interface that feels like stacked sheets of fine vellum paper rather than a digital grid.

---

## 2. Colors & Surface Philosophy

### The "No-Line" Rule
To achieve a signature premium feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined through background color shifts or subtle tonal transitions. 
- *Instead of a border:* Place a `surface_container_lowest` card on a `surface_container_low` background.

### Surface Hierarchy & Nesting
Use the `surface_container` tiers to create organic depth. 
- **Base Layer:** `surface` (#f8f9fa) – The vast, airy canvas.
- **Sectioning:** `surface_container_low` (#f3f4f5) – Use for large sidebar areas or grouped content regions.
- **Actionable Cards:** `surface_container_lowest` (#ffffff) – Reserved for the highest level of interaction (e.g., a flight detail card).

### The "Glass & Gradient" Rule
Our primary identity is the **Signature Gradient** (`#667eea` to `#764ba2`). 
- **CTAs & Active States:** Use this gradient sparingly to signify "Primary Action."
- **Glassmorphism:** For floating overlays (Tooltips, Dropdowns), use `surface_container_lowest` at 80% opacity with a `backdrop-filter: blur(12px)`. This integrates the UI into the background rather than sitting "on top" of it.

---

## 3. Typography: Editorial Authority

We use a dual-font approach to balance personality with extreme legibility.

| Level | Token | Font | Size | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-md` | Manrope | 2.75rem | 700 | Hero metrics, destination titles. |
| **Headline**| `headline-sm`| Manrope | 1.5rem | 600 | Section headers (e.g., "Upcoming Trips"). |
| **Title**   | `title-md`   | Inter | 1.125rem | 600 | Card titles, navigation items. |
| **Body**    | `body-md`    | Inter | 0.875rem | 400 | General metadata and descriptions. |
| **Label**   | `label-sm`   | Inter | 0.6875rem | 500 | All-caps tags, micro-copy. |

**The Hierarchy Note:** Headlines use **Manrope** for its geometric, modern character to establish "High Trust," while body copy remains in **Inter** for maximum SaaS utility and readability.

---

## 4. Elevation & Depth: The Layering Principle

Forget traditional shadows. We achieve hierarchy through **Tonal Stacking**.

*   **The Stack:** Place a `surface_container_lowest` card on a `surface_container_low` background. This creates a "soft lift" without a single drop shadow.
*   **Ambient Shadows:** If a card must float (e.g., a hovered itinerary), use a custom shadow: `0 12px 32px -4px rgba(25, 28, 29, 0.06)`. Note the color: we use a tint of `on_surface` rather than pure black to maintain an airy feel.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline_variant` (#c5c5d5) at **20% opacity**. Never use 100% opacity borders.

---

## 5. Components

### Buttons & Chips
*   **Primary Button:** Uses the Purple-to-Blue gradient. Border radius: `md` (0.75rem). No shadow; the color carries the weight.
*   **Secondary Button:** `surface_container_highest` background with `on_surface_variant` text.
*   **Chips (Status):** Use `primary_fixed` for "In Transit" and `tertiary_fixed` for "Pending." Use `label-md` for text.

### Form Fields
*   **The Floating Field:** No background color. Only a 1px "Ghost Border" at bottom (`outline_variant` at 40%). On focus, the border transitions to a 2px solid `primary` (#3953bd) with a subtle vertical shift.
*   **Error State:** Border becomes `error` (#ba1a1a) with `error_container` as a subtle 5% opacity background fill.

### Cards & Itinerary Grids
*   **Constraint:** Forbid the use of divider lines within cards.
*   **Separation:** Use `Spacing 4` (1.4rem) to separate header from content.
*   **The Signature Detail:** Add a 4px vertical "Accent Bar" using the `primary` token to the left side of active itinerary cards to indicate "Current Selection."

### Tables (Admin View)
*   **Row Style:** No borders. Use alternating backgrounds of `surface` and `surface_container_low`. 
*   **Hover State:** Row background shifts to `surface_container_high`.

---

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace as a structural element. If in doubt, increase spacing by one scale (e.g., from `3` to `3.5`).
*   **DO** use `surface_bright` for background areas that need to feel "infinite" and expansive.
*   **DO** utilize the `9999px` (full) roundedness for tags and chips to contrast against the `md` (0.75rem) cards.

### Don't
*   **DON'T** use 100% black (#000000). Always use `on_surface` (#191c1d) for text to maintain the "high-end ink" look.
*   **DON'T** use shadows on every card. Reserve shadows for "Hover" or "Active" states only.
*   **DON'T** use standard blue for links. Use the `secondary` (#754aa1) token to lean into the brand's sophisticated purple-blue palette.