// Migration: Create Platform node
//
// Platform is a sibling to Technology for manually-declared, non-SBOM-observable
// technology (databases, cloud services, container runtimes, etc.) — the deliberate
// "no evidence required" counterpart introduced alongside the rule that Technology
// must always have at least one linked Component. See docs/architecture/decisions/
// 0004-technology-requires-component.md.

CREATE CONSTRAINT platform_name_unique IF NOT EXISTS
FOR (p:Platform)
REQUIRE p.name IS UNIQUE;
