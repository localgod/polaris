MATCH (r:Repository {url: $url})
SET r.lastSbomScanAt = datetime(),
    r.updatedAt = datetime()
