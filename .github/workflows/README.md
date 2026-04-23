# CI/CD Workflow

## How It Works

Every push to `main` triggers the full pipeline:
1. `build-api` and `build-web` run **in parallel** — both build and push `:latest` + `:<sha>` tags to GHCR.
2. `deploy-saas` runs after both build jobs complete — SSHs into the SaaS server, pulls the new images, restarts the stack, and prunes dangling images.

Manual runs (`workflow_dispatch`) only push tags — they do **not** trigger `deploy-saas`. Standalone clients update automatically via Watchtower polling GHCR every hour.

## Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Description |
|--------|-------------|
| `GHCR_TOKEN` | Personal Access Token with `read:packages` and `write:packages` scope. Generate at: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) |
| `SAAS_SERVER_HOST` | Your Ubuntu server IP or hostname |
| `SAAS_SERVER_USER` | SSH username (usually `ubuntu`) |
| `SAAS_SERVER_SSH_KEY` | Full content of your SSH private key (`~/.ssh/id_rsa`) |

## Pushing :stable to Standalone Clients

Standalone clients run Watchtower configured to watch the `:stable` tag. To promote the current build to stable:

1. Go to **Actions → Build and Deploy → Run workflow**
2. Check **"Push :stable tag to managed standalone clients?"**
3. Click **Run workflow**

Watchtower on each standalone server will pick up the new `:stable` image within the hour and restart automatically.

## Pushing to a Specific Client Tag

To push to a single client without affecting all standalone clients:

1. Go to **Actions → Build and Deploy → Run workflow**
2. Leave `push_stable` unchecked
3. Enter the client tag in **"Push to specific client tag?"** (e.g. `acme`, `zenith`)
4. Click **Run workflow**

The client's Watchtower must be configured to watch their specific tag (e.g. `:acme`).

## Setting Up GitHub Secrets

1. Open your repository on GitHub
2. Go to **Settings** (top nav)
3. In the left sidebar: **Secrets and variables → Actions**
4. Click **New repository secret** for each secret above
5. Paste the value and save

For the SSH key, generate a dedicated deploy key on your server:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/deploy_key   # copy this into SAAS_SERVER_SSH_KEY secret
```
