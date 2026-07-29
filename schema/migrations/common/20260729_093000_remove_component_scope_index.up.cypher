/*
 * Migration: Remove Component.scope Index
 * Version: 2026.07.29.093000
 * Author: @ona
 *
 * Description:
 * Drops the `component_scope` index. `20260522_080000_move_scope_to_edges`
 * moved dependency scope from `Component.scope` onto the `USES` relationship
 * (per-system, not intrinsic to the component) but never dropped the
 * now-dead index left over from `20251102_180000_enhance_component_for_sbom`.
 * No `Component` node has a `scope` property any more (confirmed 0 of ~2,600
 * live Components), and no query reads `Component.scope`.
 *
 * Dependencies:
 * - 20260522_080000_move_scope_to_edges
 *
 * Rollback: See corresponding .down.cypher file
 */

DROP INDEX component_scope IF EXISTS;
