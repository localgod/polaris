---
name: nuxt-ui-audit
description: Audit Vue components for Nuxt UI anti-patterns — raw HTML elements, alert() calls, custom color-mode code, and other patterns that Nuxt UI already handles. Run before a PR or after adding new pages/components.
---

# Nuxt UI Audit

Scan the codebase for patterns that violate @nuxt/ui v4.9.0 best practices using targeted greps. Faster and cheaper than reading every file.

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

### 5. Hardcoded Tailwind palette colors instead of semantic tokens

```bash
grep -rn "text-\(gray\|slate\|zinc\|neutral\|stone\)-[0-9]\|bg-\(gray\|slate\|zinc\|neutral\|stone\)-[0-9]" app/ --include="*.vue" | grep -v "color=\|<!--"
```

**Fix:** Replace with semantic tokens — `text-(--ui-text-muted)`, `bg-(--ui-bg-elevated)`, `border-(--ui-border)`, etc.  
**Exception:** D3/SVG fill/stroke attributes that require hex values (not CSS classes).

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

## Output format

Group findings by severity:

**High** — Will break theme consistency or accessibility (`alert()`, raw form inputs with no fallback, hardcoded colors in light/dark-sensitive UI).  
**Medium** — Redundant custom code that will diverge from Nuxt UI updates over time (custom color mode, custom tooltips).  
**Low** — Raw `<button>` elements that work but bypass Nuxt UI's focus/hover/disabled handling.

For each finding: `file:line — pattern — suggested fix`.  
If a file has no findings, skip it. End with a count: `N findings across M files`.
