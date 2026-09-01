MATCH (q:PolicyReviewQueue)
OPTIONAL MATCH (q)-[:REFERENCES]->(t:Technology)
RETURN q.id AS id,
       q.technologyName AS technologyName,
       q.conflictingValues AS conflictingValues,
       q.reviewedAt AS reviewedAt,
       toString(q.createdAt) AS createdAt,
       t IS NOT NULL AS technologyExists
ORDER BY q.technologyName
