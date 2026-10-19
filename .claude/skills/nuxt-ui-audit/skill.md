---
name: nuxt-ui-audit
description: Audit Vue components for Nuxt UI anti-patterns — raw HTML elements, alert() calls, custom color-mode code, and other patterns that Nuxt UI already handles. Run before a PR or after adding new pages/components.
---

# Nuxt UI Audit

Scan the codebase for patterns that violate @nuxt/ui v4 best practices (as documented by the `nuxt-ui` skill) using targeted greps. Faster and cheaper than reading every file.

## Steps

Run all grep commands first, then triage findings. Some patterns have legitimate exceptions — judge context before flagging.

### 1. Notifications — `alert()` instead of `useToast()`

```bash
grep -rn "alert(" app/ --include="*.vue" --include="*.ts"
```

**Fix:** Replace with `const toast = useToast()` → `toast.add({ title: '...', description: '...', color: 'error' })`.  
**Exception:** `alert` appearing in variable names, comments, or `UAlert` component usage — ignore those.

---

### 2. Raw form elements instead of U-components

```bash
grep -rn "<input\b\|<select\b\|<textarea\b" app/ --include="*.vue" | grep -v "type=\"hidden\"\|<!--"
```

| Raw element | Replacement |
|---|---|
| `<input type="checkbox">` | `UCheckbox` |
| `<input type="radio">` | `URadioGroup` |
| `<input type="text/email/...">` | `UInput` |
| `<select>` | `USelect` or `USelectMenu` |
| `<textarea>` | `UTextarea` |

**Exception:** Inputs inside third-party component slots (e.g. D3 canvas, external libs) that aren't part of the Vue template.

---

### 3. Raw `<button>` instead of `UButton`

```bash
grep -rn "<button\b" app/ --include="*.vue" | grep -v "<!--"
```

**Fix:** Replace with `<UButton variant="ghost" color="neutral">`. Pass inner content via the default slot.  
**Exception:** Buttons rendered by D3/canvas code outside the Vue template — leave those alone.

---

### 4. Custom color-mode management instead of `useColorMode()`

```bash
grep -rn "localStorage.*theme\|classList.*dark\|document\.documentElement" app/ --include="*.vue" --include="*.ts" --include="*.js"
```

**Fix:** Delete custom theme composables/plugins. Use `useColorMode()` from `@nuxtjs/color-mode` (bundled with `@nuxt/ui`). The layout's `<UColorModeButton>` is all that's needed.  
**Exception:** None — there is no valid reason to manage the dark class manually when Nuxt UI is in use.

---

### 5. Hardcoded colors instead of semantic utility classes

```bash
# Raw Tailwind palette colors
grep -rnE "\b(text|bg|border|ring|divide)-(gray|slate|zinc|neutral|stone|red|green|blue|yellow|amber|orange|emerald)-[0-9]{2,3}" app/ --include="*.vue" | grep -v "<!--"
# CSS-variable arbitrary values where a semantic utility exists
grep -rnE "\b(text|bg|border|ring|divide)-\(--ui-" app/ --include="*.vue" --include="*.ts"
```

**Fix:** Use the semantic utilities — `text-muted`, `text-default`, `text-highlighted`, `text-primary`, `text-error`, `bg-default`, `bg-elevated`, `bg-muted`, `border-default`, `divide-default`, etc. Not `text-(--ui-text-muted)` / `border-(--ui-border)`: they render the same but bypass the utility layer the theme is built on. See `.claude/skills/nuxt-ui/references/guidelines/design-system.md`.
**Exception:** D3/SVG `fill`/`stroke` attributes and `<style>` blocks, where plain `var(--ui-*)` is the right tool.

---

### 6. Missing `useToast()` — errors swallowed silently or logged only

```bash
grep -rn "catch.*{" app/ --include="*.vue" -A2 | grep -E "console\.(error|warn|log)"
```

**Fix:** Add `toast.add({ title: 'Error', description: err.data?.message || err.message, color: 'error' })` alongside or instead of `console.error`.

---

### 7. Dead custom composables/plugins superseded by Nuxt UI

```bash
grep -rn "useColorMode\|UColorModeButton" app/ --include="*.vue" --include="*.ts"
```

Cross-reference: if the project has a custom `useTheme`, `useDarkMode`, or `theme.client.ts`, and `useColorMode`/`UColorModeButton` is also present, the custom one is dead code — delete it.

---

### 8. Custom tooltips instead of `UTooltip`

```bash
grep -rn "v-if.*tooltip\|tooltip.*visible\|:style.*tooltip" app/ --include="*.vue"
```

**Fix:** Replace with `<UTooltip :text="..."><trigger /></UTooltip>`.  
**Exception:** Tooltips that follow the mouse cursor over D3/SVG canvas elements — `UTooltip` is anchor-based and cannot follow cursor position over non-Vue elements. Custom floating divs are correct there.

---

### 9. Custom loading spinners instead of `UButton :loading` or `USkeleton`

```bash
grep -rn "animate-spin" app/ --include="*.vue" -B2 | grep -v "UIcon\|i-lucide-loader\|animate-spin\|^--$"
```

**Fix:** Use `<UButton :loading="isLoading">` (adds spinner + disables automatically) or `<USkeleton>` for content placeholders.  
**Exception:** `animate-spin` on a `UIcon` inside a tree/list item for per-item loading state is fine — `UButton :loading` only works when the whole button is in a loading state.

---

### 10. Forms without `UForm`

```bash
for f in $(grep -rl "<UFormField" app/ --include="*.vue"); do grep -q "<UForm\b" "$f" || echo "$f"; done
grep -rn "<form\b" app/ --include="*.vue"
```

**Fix:** Wrap submitting forms in `<UForm :schema :state @submit>` with a zod schema and `name` on every `UFormField`, so validation errors render per field. Put server errors on a field with `form.setErrors([{ name, message }])`, and keep a `UAlert` only for errors that aren't tied to a field.
**Exception:** Filter/search bars and single-control pickers that never submit — `UFormField` there is just a label wrapper.

---

### 11. Raw `<table>` instead of `UTable`

```bash
grep -rn "<table\b" app/ --include="*.vue"
```

**Fix:** `UTable` with a `columns: TableColumn<T>[]` definition and `#<column>-cell` slots for custom cells.

---

### 12. Hand-built overlay headers

```bash
grep -rn -A1 "<template #header>" app/ --include="*.vue" | grep "<h[1-6]"
```

**Fix:** On `UModal` / `USlideover`, pass `title` (and `description`) props instead of a `#header` slot holding a heading — the props are wired to the dialog's accessible name. Use `#footer="{ close }"` for Cancel buttons.
**Exception:** Headers containing more than a title (badges, actions, links) — keep the slot.

---

## Output format

Group findings by severity:

**High** — Will break theme consistency or accessibility (`alert()`, raw form inputs with no fallback, hardcoded colors in light/dark-sensitive UI).  
**Medium** — Redundant custom code that will diverge from Nuxt UI updates over time (custom color mode, custom tooltips).  
**Low** — Raw `<button>` elements that work but bypass Nuxt UI's focus/hover/disabled handling.

For each finding: `file:line — pattern — suggested fix`.  
If a file has no findings, skip it. End with a count: `N findings across M files`.
