MATCH (u:User {id: $userId})
UNWIND $teamNames as teamName
MATCH (t:Team {name: teamName})
MERGE (u)-[:MEMBER_OF]->(t)
