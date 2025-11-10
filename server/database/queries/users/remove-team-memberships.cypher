MATCH (u:User {id: $userId})-[r:MEMBER_OF]->(:Team)
DELETE r
