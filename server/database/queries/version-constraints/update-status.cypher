MATCH (vc:VersionConstraint {name: $name})
SET vc.status = $status,
    vc.updatedAt = datetime(),
    vc.statusChangedAt = datetime(),
    vc.statusChangeReason = $reason
