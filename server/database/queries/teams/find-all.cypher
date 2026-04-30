MATCH (t:Team)
OPTIONAL MATCH (t)-[:STEWARDED_BY]->(tech:Technology)
OPTIONAL MATCH (t)-[:OWNS]->(sys:System)
OPTIONAL MATCH (u:User)-[:MEMBER_OF]->(t)
WITH t,
     count(DISTINCT tech) as technologyCount,
     count(DISTINCT sys) as systemCount,
     count(DISTINCT u) as memberCount
WITH collect({t: t, technologyCount: technologyCount, systemCount: systemCount, memberCount: memberCount}) as allRows, count(t) as total
UNWIND allRows as row
WITH row.t as t, row.technologyCount as technologyCount, row.systemCount as systemCount, row.memberCount as memberCount, total
RETURN t.name as name,
       t.email as email,
       t.responsibilityArea as responsibilityArea,
       technologyCount,
       systemCount,
       memberCount,
       total
ORDER BY {{ORDER_BY}}
SKIP toInteger($offset)
LIMIT toInteger($limit)
