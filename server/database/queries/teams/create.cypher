CREATE (t:Team {
  name: $name,
  email: $email,
  responsibilityArea: $responsibilityArea,
  createdAt: datetime()
})
RETURN t.name as name
