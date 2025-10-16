# Ona Automations

This directory contains automation configurations for the Polaris project.

## Available Tasks

### Automatic Tasks (Run on Environment Start)

These tasks run automatically when the environment starts, but can also be triggered manually:

#### `install-deps`
Installs npm dependencies.
```bash
gitpod automations task start install-deps
```

#### `wait-neo4j`
Waits for Neo4j database to be ready (up to 2 minutes).
```bash
gitpod automations task start wait-neo4j
```

#### `run-migrations`
Runs pending database migrations.
```bash
gitpod automations task start run-migrations
```

### On-Demand Tasks

These tasks only run when manually triggered:

#### `migration-status`
Check the status of database migrations.
```bash
gitpod automations task start migration-status
```

#### `validate-migrations`
Validate migration files without applying them.
```bash
gitpod automations task start validate-migrations
```

#### `seed-database`
Seed the database with fixture data. This is idempotent - running it multiple times will not create duplicates.
```bash
gitpod automations task start seed-database
```

#### `reset-database`
Reset the database to a known state by clearing all non-migration data and reseeding with fixtures.
```bash
gitpod automations task start reset-database
```

## Available Services

### `nuxt-dev`
Nuxt development server with hot module replacement.

Start the service:
```bash
gitpod automations service start nuxt-dev
```

Stop the service:
```bash
gitpod automations service stop nuxt-dev
```

View logs:
```bash
gitpod automations service logs nuxt-dev
```

## Useful Commands

### List all tasks
```bash
gitpod automations task list
```

### List all services
```bash
gitpod automations service list
```

### View task execution history
```bash
gitpod automations task list-executions <task-name>
```

### View task logs
```bash
gitpod automations task logs <task-name>
```

### Stop a running task
```bash
gitpod automations task stop <execution-id>
```

### Update automations configuration
After modifying `automations.yaml`, update the configuration:
```bash
gitpod automations update .ona/automations.yaml
```

## Configuration

The automations are defined in `.ona/automations.yaml`. 

### Task Triggers

Tasks can be configured to run:
- **Automatically**: Add `triggeredBy: [postEnvironmentStart]` to run on environment start
- **On-demand only**: Omit `triggeredBy` to make the task manual-only
- **Both**: Tasks with `triggeredBy` can still be started manually

### Adding New Tasks

1. Edit `.ona/automations.yaml`
2. Add your task under the `tasks:` section
3. Update the configuration: `gitpod automations update .ona/automations.yaml`
4. Test your task: `gitpod automations task start <task-name>`

## Troubleshooting

### Task not found
If you get "task not found" error, update the automations:
```bash
gitpod automations update .ona/automations.yaml
```

### View task execution logs
```bash
gitpod automations task logs <task-name>
```

### Check task execution status
```bash
gitpod automations task list-executions <task-name>
```

## Learn More

- [Gitpod Automations Documentation](https://www.gitpod.io/docs/automations)
- [Gitpod CLI Reference](https://www.gitpod.io/docs/references/gitpod-cli)
