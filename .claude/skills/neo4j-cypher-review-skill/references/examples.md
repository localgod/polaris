# Cypher Before/After Examples

## 1. Add labels, parameters, and explicit projection

Before:
```cypher
MATCH (n {id: 'C123'})--(m)
RETURN n, m
```

After:
```cypher
MATCH (customer:Customer {id: $customerId})-[:PLACED]->(order:Order)
RETURN customer.id AS customerId, order.id AS orderId, order.status AS status
```

Why better:
- Starts from a labelled, indexable anchor.
- Uses parameters for application execution.
- Uses explicit relationship type and direction.
- Returns only required fields.

## 2. Bound variable-length traversal

Before:
```cypher
MATCH path = (a:Account {id: $accountId})-[:TRANSFERRED_TO*]->(b:Account)
RETURN path
```

After:
```cypher
MATCH path = (a:Account {id: $accountId})-[:TRANSFERRED_TO*1..4]->(b:Account)
RETURN b.id AS relatedAccountId, length(path) AS depth
```

Why better:
- Prevents uncontrolled traversal across a large graph.
- Returns compact results.

## 3. Avoid accidental Cartesian products

Before:
```cypher
MATCH (c:Customer), (o:Order)
WHERE c.id = $customerId AND o.status = 'OPEN'
RETURN c, o
```

After:
```cypher
MATCH (c:Customer {id: $customerId})-[:PLACED]->(o:Order {status: $status})
RETURN c.id AS customerId, o.id AS orderId
```

Why better:
- Connects the two patterns through the graph model.
- Avoids combining unrelated customers and orders.

## 4. Safer MERGE granularity

Before:
```cypher
MERGE (p:Product {name: $name})
SET p.sku = $sku
```

After:
```cypher
MERGE (p:Product {sku: $sku})
SET p.name = $name,
    p.updatedAt = datetime()
```

Why better:
- Uses a stable identifier as the merge key.
- Avoids duplicate products caused by name changes.
