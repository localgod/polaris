MATCH (u:User {id: $userId})-[:CAN_MANAGE]->(t:Team {name: $teamName})
RETURN count(t) > 0 as canManage
