MATCH (w:Waiver {id: $id})
WHERE w.revokedAt IS NULL
SET w.revokedAt = datetime(), w.revokedBy = $revokedBy
RETURN w.id as id
