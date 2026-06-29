MATCH (s:System {name: $name})
RETURN s { .description, .domain, .businessCriticality, .environment } AS props
