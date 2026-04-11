# Spec: Collapsible Sidebar

## Problem Statement

The sidebar is a fixed `w-64` `<aside>` with no responsive behaviour. On small screens it consumes a disproportionate share of the viewport, leaving little room for main content.

## Nuxt UI v4 Capability Summary

All requirements are achievable with standard Nuxt UI v4 components — no custom CSS width toggling or manual tooltip wrappers are needed:

| Requirement | Nuxt UI solution |
|---|---|
| Collapsible sidebar with icon-only mode | `<USidebar collapsible="icon">` |
| Rail toggle button on sidebar edge | `<USidebar :rail="true">` |
| Nav items icon-only + tooltips on hover | `<UNavigationMenu :collapsed="true" :tooltip="true">` |
| Mobile: full-screen slideover | `<USidebar mode="slideover">` (auto below 1024px) |
| Persist state across reloads | `useLocalStorage` from `@vueuse/core` (already a dependency) |

## Requirements

### Collapse Trigger

- A rail (thin clickable strip) on the right edge of the sidebar toggles collapse/expand.
- The user controls this manually on all screen sizes.
- On screens narrower than 1024px, `USidebar` automatically switches to a slideover (mobile drawer) — this is built-in behaviour.

### Collapsed State (icon-only mode)

- Sidebar narrows to icon-only width (`--sidebar-width-icon: 4rem`, built into `USidebar`).
- Each navigation item shows only its icon; labels are hidden.
- Hovering an icon shows the item label as a tooltip (right-side, built into `UNavigationMenu :tooltip="true"`).
- The main content area expands to fill the freed space (handled by `USidebar`'s gap spacer).
- Width transition is animated (built into `USidebar` — `transition-[width] duration-200 ease-linear`).

### Logo / Header Area (collapsed)

- Hide "Polaris" text label (`v-show="sidebarOpen"`).
- Hide `UColorModeButton` (`v-show="sidebarOpen"`).
- The zap icon remains visible as the only logo element.

### User Section (collapsed)

- Hide user name, email, and role badge (`v-show="sidebarOpen"`).
- Avatar remains visible.
- Profile and Sign Out items show icon-only with tooltips (handled by `UNavigationMenu :collapsed` + `:tooltip`).
- "Sign In" button: hide the full button, show an icon-only button when collapsed.

### Documentation Section (collapsed)

- The "Documentation" label (`type: 'label'`) is hidden automatically by `UNavigationMenu` when `collapsed` is true.
- All doc nav items show icon-only with tooltips.

### Version Footer (collapsed)

- Version string hidden (`v-show="sidebarOpen"`).

### State Persistence

- `sidebarOpen` is backed by `useLocalStorage('polaris:sidebar:open', true)`.
- Restores last state on page reload.

## Acceptance Criteria

1. The sidebar renders using `<USidebar collapsible="icon" :rail="true">`.
2. Clicking the rail toggles between expanded (`w-64`) and collapsed (`w-16`) states.
3. In collapsed mode, all navigation icons are visible and links work.
4. In collapsed mode, hovering any nav icon shows a tooltip with the item label.
5. In collapsed mode, the logo area shows only the zap icon.
6. In collapsed mode, the user section shows only the avatar.
7. The collapsed/expanded state persists across page reloads via `localStorage`.
8. The width transition is smooth (no layout jump).
9. The main content area fills the remaining width in both states.
10. On screens < 1024px, the sidebar opens as a slideover (mobile behaviour).
11. Dark mode continues to work correctly in both states.

## Implementation Approach

1. **Verify `@vueuse/core` import** — confirm `useLocalStorage` is importable (it is, already used by `@nuxt/ui` internally).
2. **Replace `<aside>` with `<USidebar>`** in `app/layouts/default.vue`:
   - `collapsible="icon"` for icon-only collapse mode.
   - `:rail="true"` for the edge toggle strip.
   - `v-model:open="sidebarOpen"` bound to a `useLocalStorage` ref.
   - Move all sidebar content into the default slot (header, nav, footer slots as appropriate).
3. **Add `sidebarOpen` state** using `useLocalStorage('polaris:sidebar:open', true)`.
4. **Update all three `UNavigationMenu` instances** to pass `:collapsed="!sidebarOpen"` and `:tooltip="!sidebarOpen"`.
5. **Guard text-only elements** with `v-show="sidebarOpen"`:
   - "Polaris" `<span>` in the logo.
   - `UColorModeButton`.
   - User name `<div>`, email `<div>`, role `UBadge`.
   - Version `<span>` in the footer.
6. **Handle Sign In button** — show full `UButton` when expanded (`v-if="sidebarOpen"`), icon-only button when collapsed (`v-else`).
7. **Adjust nav padding** — `USidebar`'s body slot uses `p-4`; remove the existing `px-6` from the `<nav>` to avoid double padding.
8. **Verify layout** — confirm `<main>` fills remaining width correctly with `USidebar`'s gap spacer approach (the `flex min-h-screen` wrapper on the outer div should still work).
9. **Test** — expanded/collapsed toggle, tooltip display, localStorage persistence, mobile slideover, dark mode.
