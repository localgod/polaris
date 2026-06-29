MATCH (item:HealthRefreshJobItem {status: 'failed'})
WHERE item.finishedAt IS NULL
   OR item.finishedAt >= datetime() - duration({days: 1})
RETURN count(item) AS failedItems
