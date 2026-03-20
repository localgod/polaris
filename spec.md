# Spec: Production Server Provisioning on Hetzner

## Problem Statement

Provision a fresh Ubuntu VM on Hetzner to host the Polaris application stack (Nuxt 4 SSR +
Neo4j 5) with automated deploys triggered by pushes to `main`. No production infra config
exists today. The VM is created manually in the Hetzner console; this spec covers everything
from first SSH login to a running, continuously-deployed stack.

---

## Stack

| Component | Runtime |
|-----------|---------|
| Nuxt 4 (SSR) | Docker container, image from Docker Hub |
| Neo4j 5 Community + APOC | Docker container, same VM |
| Reverse proxy | Caddy on `:80` (IP-only, no domain) |
| Orchestration | Docker Compose at `/opt/polaris/` |
| Initial OS setup | Ansible playbook (`infra/ansible/`) |
| Continuous deploy | GitHub Actions → SSH → `docker compose pull && up` |

---

## Requirements

### 1. Production Dockerfile (`Dockerfile`)

Multi-stage build at the repo root (the `.devcontainer/Dockerfile` is dev-only):

- **Stage `builder`:** Node LTS, `npm ci --omit=dev`, `npm run build` → produces `.output/`
- **Stage `runner`:** Node LTS slim, copy `.output/` from builder, `CMD ["node", ".output/server/index.mjs"]`

No secrets baked into the image. All runtime config via environment variables.

### 2. Production `docker-compose.yml` (`infra/docker-compose.yml`)

Services:

- **`app`** — `<dockerhub-user>/polaris:latest`
  - Port 3000 exposed only to the internal Docker network (not to host)
  - Reads env vars from `/opt/polaris/.env` on the host (bind-mounted or `env_file`)
  - Depends on `neo4j`
- **`neo4j`** — `neo4j:5-community`
  - Ports 7474/7687 internal only
  - `NEO4J_PLUGINS: '["apoc"]'` and `NEO4J_dbms_security_procedures_unrestricted: apoc.*`
  - Bind mounts to `/opt/polaris/data/neo4j/{data,logs,import,plugins}`

Both services on a shared internal bridge network (`polaris-net`). No database ports exposed to the host.

### 3. Caddyfile (`infra/Caddyfile`)

```
:80 {
    reverse_proxy app:3000
}
```

When a domain is added later, replace `:80` with the domain name — Caddy auto-provisions TLS via Let's Encrypt with no other changes.

### 4. Ansible Playbook (`infra/ansible/`)

Files:

- `playbook.yml` — main playbook
- `inventory.ini.example` — example inventory (operator copies and fills in VM IP)
- `templates/docker-compose.yml.j2` — Jinja2 template for the compose file
- `templates/Caddyfile.j2` — Jinja2 template for Caddyfile

The playbook targets a single host and must be idempotent. Tasks in order:

1. Install Docker Engine from the official Docker apt repository (not the Ubuntu `docker.io` package)
2. Install Docker Compose plugin (`docker compose` v2)
3. Install Caddy from the official Caddy apt repository
4. Create system user `polaris` (no login shell) to own app files
5. Create directory tree owned by `polaris`:
   - `/opt/polaris/`
   - `/opt/polaris/data/neo4j/data`
   - `/opt/polaris/data/neo4j/logs`
   - `/opt/polaris/data/neo4j/import`
   - `/opt/polaris/data/neo4j/plugins`
6. Deploy `docker-compose.yml` template to `/opt/polaris/docker-compose.yml`
7. Deploy `Caddyfile` template to `/etc/caddy/Caddyfile`
8. Enable and start `caddy` and `docker` systemd services
9. Configure UFW firewall: allow ports 22, 80, 443; deny everything else
10. Add the deploy SSH public key to `~polaris/.ssh/authorized_keys`

The `.env` file is **not** written by Ansible — it is written by the CD pipeline on first deploy.

### 5. GitHub Actions CD Workflow (`.github/workflows/deploy.yml`)

Trigger: push to `main` (runs after the existing CI workflow passes).

Steps:

1. Check out repo
2. Log in to Docker Hub using `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` secrets
3. Build Docker image from repo root
4. Push tags `<user>/polaris:latest` and `<user>/polaris:<git-sha>`
5. SSH into the Hetzner VM as the `polaris` user using `DEPLOY_SSH_KEY`
6. Write `/opt/polaris/.env` from GitHub secrets (see table below)
7. `cd /opt/polaris && docker compose pull`
8. `docker compose up -d`
9. `docker compose exec app npm run migrate:up`

**GitHub secrets required:**

| Secret | Purpose |
|--------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub login |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `DEPLOY_HOST` | VM IP address |
| `DEPLOY_SSH_KEY` | Private key for `polaris` deploy user |
| `NEO4J_URI` | `bolt://neo4j:7687` (internal Docker network) |
| `NEO4J_USERNAME` | `neo4j` |
| `NEO4J_PASSWORD` | Production Neo4j password |
| `NEO4J_DATABASE` | `neo4j` |
| `AUTH_SECRET` | NextAuth secret (`openssl rand -base64 32`) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `SUPERUSER_EMAILS` | Comma-separated admin email addresses |

### 6. Infrastructure README (`infra/README.md`)

Documents:

- Prerequisites (Ansible, Docker Hub account, GitHub OAuth app)
- How to run the Ansible playbook for the first time
- How to generate and register the deploy SSH key pair
- How to configure GitHub secrets
- How to trigger the first deploy manually

---

## Acceptance Criteria

- [ ] `ansible-playbook infra/ansible/playbook.yml -i inventory.ini` on a fresh Ubuntu 24.04 VM
      completes without errors and leaves Docker, Caddy, and the `polaris` user in place
- [ ] Pushing to `main` triggers the deploy workflow; the new image is built, pushed, and running
      on the VM without manual intervention
- [ ] `curl http://<VM_IP>` returns the Polaris app (HTTP 200)
- [ ] Neo4j data survives `docker compose restart` (bind mount persists to `/opt/polaris/data/`)
- [ ] Database migrations run automatically on each deploy
- [ ] No secrets are stored in the repository or baked into the Docker image
- [ ] Replacing `:80` with a domain name in the Caddyfile is the only change needed to enable TLS

---

## Implementation Steps (ordered)

1. Write production `Dockerfile` (multi-stage, Node LTS) at repo root
2. Create `infra/docker-compose.yml` (app + neo4j, internal network, bind mounts)
3. Create `infra/Caddyfile` (`:80` reverse proxy to `app:3000`)
4. Create `infra/ansible/` directory with `playbook.yml`, `inventory.ini.example`,
   and Jinja2 templates for compose file and Caddyfile
5. Create `.github/workflows/deploy.yml` (build → push → SSH deploy → migrate)
6. Create `infra/README.md` documenting first-run setup and secret configuration

---

## Out of Scope

- Hetzner VM creation (done manually in the Hetzner console)
- Domain name / DNS configuration
- TLS certificate provisioning (automatic once a domain is set in Caddyfile)
- Neo4j backups
- Monitoring and alerting
- Ansible Vault (secrets flow through GitHub Actions, not Ansible)
