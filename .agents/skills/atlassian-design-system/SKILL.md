---
name: atlassian-design-system
description: Design tokens, guidelines, and component standards for Atlassian Jira Dark Mode. Use whenever designing, styling, or modifying frontend UI components in MAVEN desktop to prevent generic AI styling.
---

# Atlassian Jira Dark Mode Design System

Mandatory UI standard for MAVEN frontend components. Strictly avoid generic AI styling (purple/indigo gradients, neon glows, or pill-shaped buttons/cards).

## 1. Official Color Palette (Jira Dark Theme)
- **Main Viewport Background:** `#1d2125`
- **Top App Bar:** `#161a1d`
- **Navigation Sidebar:** `#181b1f`
- **Card / Input Container:** `#22272b`
- **Border Lines:** `#282e33` and `#22272b` (`1px solid`, crisp and subtle)
- **Primary Text:** `#c7d1db` / `#b6c2cf`
- **Muted Text:** `#8c9bab` / `#738496`
- **Jira Primary Blue (Accent & Buttons):** `#579dff` (text/active), `#1868db` (hover)

## 2. Typography & Shape (Border Radius)
- **Border Radius:** Use `rounded-[3px]` or `rounded-[4px]`. Never use `rounded-full` or `rounded-2xl` on buttons or cards.
- **Font:** Clean system stack (`Segoe UI`, `-apple-system`, `Inter`) with crisp sub-pixel rendering.
- **Type Scale:**
  - Space Header: `14px - 16px font-bold`
  - Menu Items & Table Text: `12px - 13px`
  - Labels & Metadata: `11px - 12px`

## 3. Standard Jira Components
- **Top Bar:** 9-dot app switcher, Jira folded-diamonds logo, search input `#22272b`, blue `+ Create` button, orange `9+` notification badge, `FN` avatar.
- **Timeline (Gantt):**
  - Flat rectangular duration bars (`22px` height, `3px` radius).
  - Color accent line placed directly under the task title in the left column.
  - Vertical bright-blue marker line for `Today`.
- **Gantt Color Palette:**
  - Purple: `#8777d9`
  - Cyan: `#00b8d9`
  - Orange: `#ffab00`
  - Blue: `#388bff`
  - Red: `#ff5630`
