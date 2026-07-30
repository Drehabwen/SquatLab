# Design System Strategy: The Clinical Atelier

## 1. Overview & Creative North Star
**Creative North Star: "The Clinical Atelier"**
The goal of this design system is to pivot away from the generic "SaaS Dashboard" aesthetic and toward a high-end, "Clinical Atelier" experience. We are designing a precision instrument—a tool that feels as authoritative as a medical report but as fluid and accessible as a premium fitness app. 

To achieve this, we move beyond the grid. We utilize **intentional asymmetry** and **high-contrast typographic scales** to guide the eye. Instead of a "box for everything," we use expansive "Neutral Paper" surfaces. This creates a local-first, utility feel—it is a workspace, not a control center. Elements should feel like they were placed by a human hand onto a physical desk, utilizing overlapping layers to create a sense of depth and tactile reality.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a "Neutral Paper" foundation (`surface: #faf9f6`), providing a warm, professional backdrop that reduces eye strain and mimics high-quality stationery.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. We define boundaries through **background color shifts** or **tonal transitions**. 
- Use `surface_container_low` (#f4f3f1) to define secondary content areas against the primary `surface`. 
- Content blocks should emerge from the page through color logic, not line work.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of paper:
1.  **Base:** `surface` (#faf9f6) - The desk.
2.  **Section:** `surface_container_low` (#f4f3f1) - The primary workspace.
3.  **Active Card:** `surface_container_lowest` (#ffffff) - A "sheet" of data lifted slightly.
4.  **Floating Utility:** `surface_bright` - Elements requiring immediate attention.

### The "Glass & Gradient" Rule
To elevate the "medical-grade" feel, floating assessment overlays should use **Glassmorphism**. Use `surface_container_lowest` at 80% opacity with a `20px backdrop-blur`. 
For Primary CTAs and the "Squat Score" hero sections, use a subtle **Signature Texture**: a linear gradient from `primary` (#006b5f) to `primary_container` (#14b8a6) at a 135-degree angle. This adds "soul" and depth to the data.

---

## 3. Typography: The Editorial Voice
We use **Manrope** to bridge the gap between technical precision and human friendliness.

- **Display Scales:** Use `display-lg` (3.5rem) for primary assessment metrics (e.g., Squat Depth %). These should be Semibold and feel like an undeniable "statement of fact."
- **Headlines:** `headline-sm` (1.5rem) should be used for section titles. Ensure generous `letter-spacing: -0.02em` to provide a modern, editorial look.
- **The Contrast Play:** Pair a Semibold `headline-md` with a `body-md` in `on_surface_variant` (#3c4947). The weight difference communicates the hierarchy of "Fact" (Headline) vs. "Context" (Body) without needing icons.

---

## 4. Elevation & Depth
Depth in this design system is achieved through **Tonal Layering** rather than traditional structural shadows.

- **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` section to create a soft, natural "lift."
- **Ambient Shadows:** For floating elements (like an AI camera modal), use a shadow: `box-shadow: 0 12px 32px -4px rgba(26, 28, 26, 0.05)`. The shadow is nearly invisible, tinted by the `on-surface` color to mimic natural room light.
- **The "Ghost Border" Fallback:** If a distinction is absolutely required for accessibility, use a "Ghost Border": `outline_variant` (#bbcac6) at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons (The "Precision Triggers")
- **Primary:** Gradient fill (`primary` to `primary_container`), white text, `xl` (0.75rem) roundedness. 
- **Secondary (The Accent):** `secondary_container` (#fea619) with `on_secondary_container` (#684000) text. Use this *only* for the primary squat assessment trigger.
- **Tertiary:** Ghost style. No background, `on_surface` text, semibold.

### Assessment Cards
Forbid divider lines. Instead, use `body-sm` labels in `primary` (#006b5f) as "Header Tags" to separate data points. Increase the vertical spacing to `32px` between data groups to allow the content to breathe.

### Input Fields
Avoid the "boxed" look. Use a `surface_container_high` background with a `2px` bottom-only stroke in `primary` when focused. This mimics a professional form or a lab ledger.

### Data Charts (The "Blue Print")
All AI-driven charts must use `Data Blue` (#3B82F6). This differentiates "Analysis" from "Brand" (Teal). Use a stroke weight of `3px` for line charts to ensure it looks like a deliberate medical annotation.

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical margins. A wider left margin (e.g., 80px) vs. a narrower right margin (40px) creates a high-end, editorial feel.
- **Do** use `Amber` sparingly. It is a "High-Alert" or "Action" color. If everything is Amber, nothing is important.
- **Do** treat "Squat Assessment" as a narrative. The top of the page is the "Summary," the middle is the "Analysis," and the bottom is the "Prescription."

### Don't
- **Don't** use standard "Admin Dashboard" cards with headers, footers, and 1px borders.
- **Don't** use pure black (#000000) for text. Always use `on_surface` (#1a1c1a) to maintain the "Paper" aesthetic.
- **Don't** use Dark Mode. The brand integrity relies on the clean, medical-grade clarity of the "Neutral Paper" palette.
- **Don't** use icons for everything. Rely on high-quality typography and spacing to define the interface's structure.