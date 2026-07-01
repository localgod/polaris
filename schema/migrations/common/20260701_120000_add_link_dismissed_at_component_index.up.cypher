CREATE INDEX component_link_dismissed_at IF NOT EXISTS
FOR (c:Component) ON (c.linkDismissedAt);
