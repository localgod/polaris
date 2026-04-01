# Infrastructure

Production deployment for Polaris on a single Hetzner Ubuntu VM.

## Stack

- **App**: Nuxt 4 SSR in a Docker container (image from Docker Hub)
- **Database**: Neo4j 5 Community + APOC in a Docker container
- **Proxy**: Caddy in a Docker container (HTTP on port 80; swap `:80` for a domain name to get automatic TLS)
- **Orchestration**: Docker Compose at `/opt/polaris/` (all three services)
- **Provisioning**: Ansible playbook (one-time, idempotent) — installs Docker, configures UFW, creates system user
- **Deploys**: GitHub Actions on push to `main`

## Prerequisites

- Ansible 2.14+ with `community.general` and `ansible.posix` collections:
  ```bash
  ansible-galaxy collection install community.general ansible.posix
  ```
- A Docker Hub account and repository named `polaris`
- A GitHub OAuth app (create at <https://github.com/settings/developers>)
- SSH access to the Hetzner VM as `root`

## First-time setup

### 1. Generate the deploy SSH key pair

```bash
ssh-keygen -t ed25519 -C "polaris-deploy" -f ~/.ssh/polaris_deploy
```

- **Private key** (`~/.ssh/polaris_deploy`) → add as GitHub secret `DEPLOY_SSH_KEY`
- **Public key** (`~/.ssh/polaris_deploy.pub`) → passed to the Ansible playbook below

### 2. Run the Ansible playbook

```bash
cd infra/ansible

# Copy and edit the inventory
cp inventory.ini.example inventory.ini
# Edit inventory.ini: replace the example IP with your VM's IP (IPv4 or IPv6)

# Run the playbook
ansible-playbook playbook.yml \
  -i inventory.ini \
  --extra-vars "dockerhub_username=<your-dockerhub-user>" \
  --extra-vars "deploy_public_key=$(cat ~/.ssh/polaris_deploy.pub)"
```

The playbook installs Docker, creates the `polaris` system user, sets up
`/opt/polaris/`, deploys the compose file and Caddyfile, and configures UFW.
Caddy runs as a Docker Compose service — it is not installed on the host.

### 3. Configure GitHub secrets

In your repository go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (not your password) |
| `DEPLOY_HOST` | `2a01:4f9:c014:472c::1` |
| `DEPLOY_SSH_KEY` | Contents of `~/.ssh/polaris_deploy` |
| `NEO4J_URI` | `bolt://neo4j:7687` |
| `NEO4J_USERNAME` | `neo4j` |
| `NEO4J_PASSWORD` | A strong password (used for both Neo4j auth and the app) |
| `NEO4J_DATABASE` | `neo4j` |
| `AUTH_SECRET` | Output of `openssl rand -base64 32` |
| `GITHUB_CLIENT_ID` | From your GitHub OAuth app |
| `GITHUB_CLIENT_SECRET` | From your GitHub OAuth app |
| `SUPERUSER_EMAILS` | Comma-separated admin email addresses |

### 4. Trigger the first deploy

Push any commit to `main`. The `Deploy` workflow will:

1. Build the Docker image and push it to Docker Hub
2. SSH into the VM as `polaris`
3. Write `/opt/polaris/.env` from the secrets above
4. Run `docker compose pull && docker compose up -d`
5. Run `npm run migrate:up` inside the app container

After the workflow completes, `curl http://[2a01:4f9:c014:472c::1]` should return the Polaris app.

## Enabling TLS (when you have a domain)

1. Point your domain's DNS at the VM IP (AAAA record for IPv6, A record for IPv4)
2. Edit `/opt/polaris/Caddyfile` on the VM (or update `infra/ansible/templates/Caddyfile.j2`
   and re-run the playbook) — replace the IPv6 address with your domain name:
   ```
   your.domain.com {
       reverse_proxy app:3000
   }
   ```
3. `docker compose restart caddy` — Caddy fetches a Let's Encrypt certificate automatically

## Directory layout on the VM

```
/opt/polaris/
├── .env                  # Written by GitHub Actions on each deploy
├── docker-compose.yml    # Deployed by Ansible
├── Caddyfile             # Deployed by Ansible
└── data/
    └── neo4j/
        ├── data/         # Neo4j database files (persisted)
        ├── logs/
        ├── import/
        └── plugins/
```

## Re-running the playbook

The playbook is idempotent. Re-run it any time to apply config changes or provision a
replacement VM:

```bash
ansible-playbook infra/ansible/playbook.yml \
  -i infra/ansible/inventory.ini \
  --extra-vars "dockerhub_username=<user>" \
  --extra-vars "deploy_public_key=$(cat ~/.ssh/polaris_deploy.pub)"
```
