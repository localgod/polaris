# Spec: Technology Radar Visualization (Issue #553)

## Problem Statement

The technologies page is a flat sortable table. There is no way to see the health of the technology portfolio at a glance — which technologies are strategic investments vs. migration candidates vs. scheduled for elimination. Engineering leadership needs a visual representation of the TIME (Tolerate/Invest/Migrate/Eliminate) framework distribution across the portfolio.

## Solution

Add a **D3 ring radar** view to `app/pages/technologies/index.vue`, toggled via a view-mode selector alongside the existing table view. A new API endpoint aggregates technology TIME classifications filtered by team.

---

## Requirements

### Radar Layout

- Five concentric rings, from inner to outer: **Invest → Tolerate → Migrate → Eliminate → Unclassified**
- Technology blips are plotted as circles within their ring, distributed by **domain** along the angular axis (each domain occupies an equal-angle sector of the circle)
- Domains are the existing `TechnologyDomain` values: `foundational-runtime`, `framework`, `data-platform`, `integration-platform`, `security-identity`, `infrastructure`, `observability`, `developer-tooling`, `other`
- Blips show the **technology name in a tooltip on hover** — no always-visible labels
- Ring boundaries are labelled with the TIME category name; sector boundaries are labelled with the domain name

### Team Filter

- A **team dropdown** above the radar selects which team's TIME approvals are used to place blips
- When a team is selected, each technology is placed in the ring matching that team's TIME value for it
- Technologies with no approval from the selected team appear in the **Unclassified** ring
- The dropdown includes an **"All teams"** option — when selected, the most common TIME value across all teams is used; ties broken by severity order (Eliminate > Migrate > Tolerate > Invest); technologies with no approvals at all are Unclassified

### View Toggle

- A toggle control (table icon / radar icon) in the page header switches between the existing table view and the new radar view
- The selected view mode is persisted in `localStorage` (key: `polaris:technologies:viewMode`)
- Default is table view

### New API Endpoint

`GET /api/technologies/radar`

**Query parameters:**
- `team` (optional string) — team name to filter TIME approvals by

**Response shape:**
```ts
{
  success: true,
  data: RadarTechnology[]
}

interface RadarTechnology {
  name: string
  domain: TechnologyDomain | null
  type: ComponentType | null
  timeValue: TimeValue | 'unclassified'
  approvalCount: number   // total number of team approvals for this technology
}
```

**Logic:**
- Fetches all technologies with their approvals
- If `team` param provided: uses that team's TIME value; `unclassified` if no approval exists for that team
- If no `team` param: computes dominant TIME value across all team approvals using majority vote; ties broken by severity (Eliminate > Migrate > Tolerate > Invest); `unclassified` if no approvals at all
- No pagination — returns all technologies (radar is a full-portfolio view)
- Auth: public (same as existing `/api/technologies`)

---

## Acceptance Criteria

1. The technologies page has a view toggle (table / radar icons); default is table
2. Selecting the radar view renders a D3 SVG with five concentric rings labelled Invest / Tolerate / Migrate / Eliminate / Unclassified (inner to outer)
3. The radar is divided into equal-angle sectors by domain; each sector is labelled with the domain name
4. Each technology appears as a blip in the correct ring for the selected team's TIME value
5. Hovering a blip shows a tooltip with the technology name, domain, and type
6. The team dropdown filters blips correctly; "All teams" uses dominant TIME logic
7. Technologies with no TIME approval for the selected team appear in the Unclassified ring
8. The view mode persists across page reloads via localStorage
9. `GET /api/technologies/radar?team=<name>` returns correctly shaped data
10. The radar SVG scales to container width (responsive via viewBox)
11. Existing table view and all its functionality is unchanged
12. New endpoint and service method have unit tests

---

## Implementation Steps

1. **New Cypher query** `server/database/queries/technologies/find-for-radar.cypher`
   - Returns all technologies with domain, type, and all team approvals (team name + time value)
   - No pagination, no ORDER BY

2. **Repository method** `TechnologyRepository.findForRadar()`
   - Executes the new query
   - Returns `Array<{ name, domain, type, approvals: { team, time }[] }>`

3. **Service method** `TechnologyService.findForRadar(team?: string): Promise<RadarTechnology[]>`
   - If `team` provided: find that team's approval for each technology; assign `unclassified` if absent
   - If no `team`: compute dominant TIME via majority vote with severity tie-break; assign `unclassified` if no approvals
   - Returns `RadarTechnology[]` (name, domain, type, timeValue, approvalCount)

4. **Unit tests** `test/server/services/technology.service.spec.ts`
   - Dominant TIME logic (majority, tie-breaking by severity)
   - Team filter (found, not found → unclassified)
   - All-unclassified case

5. **API endpoint** `server/api/technologies/radar.get.ts`
   - Reads optional `team` query param with `typeof === 'string' + trim()` validation
   - Calls `technologyService.findForRadar(team)`
   - Returns `{ success: true, data }` with OpenAPI doc comment

6. **Radar component** `app/components/TechnologyRadar.vue`
   - Props: `data: RadarTechnology[]`
   - D3 SVG with five concentric rings (Invest innermost, Unclassified outermost)
   - Equal-angle sectors per domain (9 domains → 40° each)
   - Blips as `<circle>` elements, coloured by TIME value:
     - invest → green (`success`)
     - tolerate → amber (`warning`)
     - migrate → amber (`warning`)
     - eliminate → red (`error`)
     - unclassified → grey (`neutral`)
   - Blips jittered within their ring+sector cell to avoid overlap
   - Tooltip on hover: technology name, domain, type
   - Ring labels (TIME category) and sector labels (domain name) rendered as SVG text
   - SVG `viewBox` set to fixed coordinate space; `width="100%"` for responsiveness

7. **Page integration** `app/pages/technologies/index.vue`
   - Add view-mode toggle buttons (table / radar icons) to page header area
   - `const viewMode = useLocalStorage('polaris:technologies:viewMode', 'table')`
   - Team dropdown (fetches `/api/teams`) rendered above radar, hidden in table mode; default "All teams"
   - `useFetch('/api/technologies/radar', { query: { team: selectedTeam } })` — lazy, only fetches when radar mode is active
   - Render `<TechnologyRadar :data="radarData" />` when `viewMode === 'radar'`

8. **Lint, build, test** — verify no regressions
