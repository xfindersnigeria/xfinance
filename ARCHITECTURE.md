Need to install the following packages:
mammoth@1.12.0
Ok to proceed? (y) __ARCHITECTURE DECISIONS & AGENT BRIEF__

__SaaS \+ Standalone Deployment Strategy__

NestJS · Next\.js · PostgreSQL · Docker · Cloudinary

Generated 9 April 2026

# 1\. Overview & Purpose

This document is the single source of truth for how the codebase must be structured, configured, and deployed to support both a multi\-tenant SaaS platform and self\-hosted standalone client deployments — from the same codebase, with zero code forking\.

ℹ  Every decision in this document has been agreed upon\. The coding agent must treat this as the authoritative spec before modifying any part of the codebase\.

# 2\. Deployment Modes

## 2\.1 The Two Modes

The application supports two deployment modes, differentiated entirely by environment variables\. No code branching, no separate repos, no separate Dockerfiles — one codebase runs both:

__Mode__

__Description__

saas

Multi\-tenant platform\. Subdomain routing resolves the active group\. Super admin panel active\. Full tenancy logic enabled\.

standalone

Single\-client deployment on their own server\. No subdomain routing\. No super admin panel\. Tenancy resolved from a fixed DEFAULT\_GROUP\_ID env var\.

## 2\.2 The DEPLOYMENT\_MODE Switch

This is the master switch\. Every part of the app that behaves differently between modes reads this variable:

\# \.env — SaaS

DEPLOYMENT\_MODE=saas

SUBDOMAIN\_ROUTING=true

\# \.env — Standalone

DEPLOYMENT\_MODE=standalone

DEFAULT\_GROUP\_ID=xxxxxxxx\-xxxx\-xxxx\-xxxx\-xxxxxxxxxxxx

SUBDOMAIN\_ROUTING=false

## 2\.3 Tenant Resolution Logic \(NestJS\)

A single TenantService resolves the active group on every request\. In standalone mode it reads the fixed env var; in SaaS mode it reads the subdomain:

resolveTenant\(request: Request\): string \{

  if \(process\.env\.DEPLOYMENT\_MODE === "standalone"\) \{

    return process\.env\.DEFAULT\_GROUP\_ID;

  \}

  // SaaS: derive from subdomain

  const subdomain = request\.hostname\.split\("\."\)\[0\];

  return \`tenant\_$\{subdomain\}\`;

\}

# 3\. Super Admin Panel

## 3\.1 SaaS Mode — admin\.myapp\.com

In SaaS mode, the super admin has a dedicated subdomain: admin\.myapp\.com\. This is the only entry point for super admin\. They never log in via a group subdomain\.

- Super admin logs in at admin\.myapp\.com
- They can view all groups, manage subscriptions, and access audit logs
- Impersonation allows them to act as a group admin without leaving the admin subdomain
- When impersonating, the group's theme \(logo, primary colour\) is injected dynamically via CSS variables
- A fixed impersonation banner is always visible: "You are impersonating \[Group Name\] — Exit"

## 3\.2 Impersonation Token Strategy

Two tokens run in parallel during impersonation\. The real admin identity is never lost:

__Token__

__Purpose__

admin\_token \(httpOnly cookie\)

Super admin's real identity — persists entire session

x\-impersonation\-token \(header\)

Scoped to the group being impersonated — short\-lived \(1hr\)

Every API call during impersonation includes both tokens\. NestJS logs the real admin identity for all audit events even when acting as another group\.

## 3\.3 Standalone Mode — No Super Admin

In standalone mode, the super admin panel and all tenancy management routes must be completely disabled\. This includes:

- No /admin routes or subdomain
- No impersonation endpoints
- No cross\-group queries
- No subscription management UI

⚠  Guard all super admin routes with a DeploymentModeGuard that returns 404 in standalone mode — not 403\. The feature should not be discoverable\.

# 4\. Database Schema Changes

## 4\.1 Current State

The current schema uses entityId as the primary FK on most tables, with groupId only where directly needed\. GroupId is derived via join through the entity relationship for app logic — this is correct and stays unchanged for application queries\.

## 4\.2 Required Change — Add groupId to All Major Tables

GroupId must be added as a denormalized column on every table that contains business data\. This is not for application logic — it is purely an extraction and audit handle\. It is populated at insert time and never changes\.

⚠  This is the single most critical schema change\. Without it, exporting a client's data requires complex joins across tables\. With it, export is a single WHERE group\_id = ? on every table\.

Tables that must have group\_id added:

- users
- entities
- invoices / transactions \(any financial table\)
- documents / assets metadata tables
- activity\_logs / audit\_logs
- settings / configurations
- notifications
- Any other table with business data scoped to a group

## 4\.3 Migration Pattern

\-\- Add to each major table

ALTER TABLE users

  ADD COLUMN group\_id UUID NOT NULL REFERENCES groups\(id\);

ALTER TABLE invoices

  ADD COLUMN group\_id UUID NOT NULL REFERENCES groups\(id\);

\-\- Index every one of them

CREATE INDEX idx\_users\_group\_id ON users\(group\_id\);

CREATE INDEX idx\_invoices\_group\_id ON invoices\(group\_id\);

## 4\.4 Prisma Schema Pattern

model User \{

  id        String   @id @default\(uuid\(\)\)

  entityId  String

  groupId   String   // denormalized — extraction handle

  entity    Entity   @relation\(fields: \[entityId\], references: \[id\]\)

  group     Group    @relation\(fields: \[groupId\], references: \[id\]\)

  @@index\(\[groupId\]\)

\}

The entityId relationship remains the primary app\-level FK\. groupId is additional — populated at insert, indexed, never updated\.

# 5\. Asset Storage — Cloudinary Structure

## 5\.1 Folder Naming Convention

All Cloudinary uploads must follow this path structure from day one\. This is non\-negotiable — it is what makes asset export possible by prefix:

groups/\{groupId\}/logo\.png

groups/\{groupId\}/banner\.jpg

groups/\{groupId\}/entities/\{entityId\}/profile\.jpg

groups/\{groupId\}/entities/\{entityId\}/documents/invoice\_123\.pdf

groups/\{groupId\}/entities/\{entityId\}/products/item\_456\.png

## 5\.2 Upload Service Pattern \(NestJS\)

buildAssetPath\(groupId: string, entityId?: string, category?: string\): string \{

  if \(entityId && category\)

    return \`groups/$\{groupId\}/entities/$\{entityId\}/$\{category\}\`;

  if \(entityId\)

    return \`groups/$\{groupId\}/entities/$\{entityId\}\`;

  return \`groups/$\{groupId\}\`;

\}

async uploadFile\(file: Buffer, groupId: string, entityId?: string, category?: string\) \{

  const folder = this\.buildAssetPath\(groupId, entityId, category\);

  return cloudinary\.uploader\.upload\(file, \{ folder \}\);

\}

## 5\.3 Client Asset Migration \(On Opt\-Out\)

When a client leaves SaaS, all their Cloudinary assets are migrated to a new Cloudinary account created for them\. The public\_id \(filename\) is preserved so no DB records need updating:

// 1\. Fetch all assets under their group prefix

const \{ resources \} = await cloudinary\.api\.resources\(\{

  type: "upload",

  prefix: \`groups/$\{groupId\}/\`,

  max\_results: 500,

\}\);

// 2\. Re\-upload to client Cloudinary preserving public\_id

for \(const asset of resources\) \{

  await clientCloudinary\.uploader\.upload\(asset\.secure\_url, \{

    public\_id: asset\.public\_id,

    overwrite: true,

  \}\);

\}

// 3\. Delete from SaaS Cloudinary after confirming success

for \(const asset of resources\) \{

  await cloudinary\.uploader\.destroy\(asset\.public\_id\);

\}

# 6\. Docker & Image Strategy

## 6\.1 Registry — GitHub Container Registry \(GHCR\)

Docker Hub is NOT used\. All images are stored in GitHub Container Registry \(GHCR\), which is free with the existing GitHub account and integrates directly with GitHub Actions:

ghcr\.io/yourorg/myapp\-api:latest      \# SaaS — always current

ghcr\.io/yourorg/myapp\-api:stable      \# managed standalone clients

ghcr\.io/yourorg/myapp\-api:v1\.4\.2      \# frozen — full handoff clients

ghcr\.io/yourorg/myapp\-web:latest

ghcr\.io/yourorg/myapp\-web:stable

ghcr\.io/yourorg/myapp\-web:v1\.4\.2

## 6\.2 Tag Channel Strategy

__Client Type__

__Tag Used__

__Updates How__

__Your Control__

SaaS \(your infra\)

:latest

Every deploy, automatic

Full — you own infra

Managed standalone

:stable

You push when ready, Watchtower pulls

Strong — 2 levers

Self\-managed handoff

:v1\.x\.x\-final

They contact you, paid update

License key only

Stopped paying

Any

License key revoked

Kill on next restart

## 6\.3 GitHub Actions Workflow

\# \.github/workflows/deploy\.yml

on:

  push:

    branches: \[main\]          \# triggers SaaS deploy

  workflow\_dispatch:          \# manual trigger for standalone push

jobs:

  build:

    steps:

      \- name: Build and tag

        run: |

          docker build \-t ghcr\.io/yourorg/myapp\-api:$\{\{ github\.sha \}\} \.

          docker push ghcr\.io/yourorg/myapp\-api:$\{\{ github\.sha \}\}

          \# Always update :latest for SaaS

          docker tag \.\.\. ghcr\.io/yourorg/myapp\-api:latest

          docker push ghcr\.io/yourorg/myapp\-api:latest

      \- name: Deploy SaaS

        run: ssh your\-saas "docker compose pull && docker compose up \-d"

      \# Run manually only — does NOT run on every push

      \- name: Push to managed standalone clients

        if: github\.event\_name == "workflow\_dispatch"

        run: |

          docker tag \.\.\. ghcr\.io/yourorg/myapp\-api:stable

          docker push ghcr\.io/yourorg/myapp\-api:stable

          \# Watchtower on client server detects and pulls automatically

## 6\.4 Watchtower — Automatic Client Updates

Watchtower runs on managed standalone client servers\. It polls GHCR and restarts containers when a new image is detected on their tag\. You push the image; they get the update automatically:

\# client docker\-compose\.yml \(managed standalone\)

services:

  api:

    image: ghcr\.io/yourorg/myapp\-api:stable

  web:

    image: ghcr\.io/yourorg/myapp\-web:stable

  watchtower:

    image: containrrr/watchtower

    volumes:

      \- /var/run/docker\.sock:/var/run/docker\.sock

    environment:

      WATCHTOWER\_POLL\_INTERVAL: 3600    \# check every hour

      WATCHTOWER\_CLEANUP: true

    restart: always

## 6\.5 DB Migrations on Startup

NestJS must run Prisma migrations before the app starts\. This ensures every Watchtower\-triggered update automatically applies schema changes without manual intervention:

// main\.ts

async function bootstrap\(\) \{

  await runMigrations\(\);   // prisma migrate deploy

  const app = await NestFactory\.create\(AppModule\);

  await app\.listen\(3000\);

\}

# 7\. License Key & Access Control

## 7\.1 License Server

A lightweight NestJS license server must be deployed separately from the main SaaS — on its own VPS\. If the SaaS goes down, standalone clients must not go down with it:

- POST /validate — check key \+ domain, return valid/invalid
- POST /issue — create a new license key \(internal use only\)
- POST /revoke — kill a key immediately \(internal use only\)

## 7\.2 License Check in NestJS \(Standalone\)

async validateLicense\(\) \{

  const key = process\.env\.LICENSE\_KEY;

  try \{

    const res = await fetch\("https://license\.yourapp\.com/validate", \{

      method: "POST",

      body: JSON\.stringify\(\{ key, domain: process\.env\.APP\_DOMAIN \}\)

    \}\);

    if \(\!res\.ok\) \{

      this\.logger\.error\("License invalid — shutting down"\);

      process\.exit\(1\);

    \}

  \} catch \(e\) \{

    // License server unreachable — allow 72hr grace period

    // If grace period exceeded, process\.exit\(1\)

  \}

\}

⚠  The license key is the most important lever\. Without it, a client on a pinned Docker tag with Watchtower removed has zero technical obligation to stop using your software\.

## 7\.3 GHCR Token Control

Standalone clients pull images using a read\-only GHCR personal access token you issue\. On contract termination, revoke the token — they can no longer pull new images\. Currently running containers are unaffected until next restart, giving a natural grace window\.

# 8\. Client Opt\-Out — Full Data Migration Flow

## 8\.1 Step\-by\-Step

__Step__

__Action__

1\. Freeze

Enable read\-only mode on their group via super admin panel \(flag on groups table\)\. No writes during export\.

2\. Export DB

Run export script: SELECT \* FROM each table WHERE group\_id = client\-uuid → seed\.sql

3\. Export Assets

Cloudinary prefix migration: groups/\{groupId\}/ → their new Cloudinary account

4\. Package

Copy standalone/ deploy folder, drop in seed\.sql, fill \.env\.example

5\. Provision

On client server: docker compose up \-d → psql < seed\.sql

6\. Verify

Confirm record counts match, app loads correctly

7\. Cut over

Point their domain DNS to new server, SSL via Certbot

8\. Remove from SaaS

Delete their group data, revoke GHCR token, archive their records

## 8\.2 Export Script Structure

\-\- export\_group\.sql

COPY \(SELECT \* FROM groups WHERE id = :group\_id\)

  TO "/export/groups\.csv" CSV HEADER;

COPY \(SELECT \* FROM entities WHERE group\_id = :group\_id\)

  TO "/export/entities\.csv" CSV HEADER;

COPY \(SELECT \* FROM users WHERE group\_id = :group\_id\)

  TO "/export/users\.csv" CSV HEADER;

COPY \(SELECT \* FROM invoices WHERE group\_id = :group\_id\)

  TO "/export/invoices\.csv" CSV HEADER;

\-\- Repeat for every table with group\_id column

# 9\. Source Code Handoff \(Premium Tier\)

## 9\.1 When Source Code Is Given

Source code is only handed over when a client has explicitly paid the source license fee AND has a developer capable of maintaining a NestJS/Next\.js codebase\. This is the most expensive tier\.

## 9\.2 What Gets Handed Over

- Both repos pushed to a GitHub org created under their account
- standalone branch only — SaaS\-specific code stripped
- \.env\.example files, fully commented for every variable
- All Prisma migration history and seed files
- SETUP\.md, DEPLOYMENT\.md, ENV\.md, ARCHITECTURE\.md
- Their data export \(seed\.sql \+ Cloudinary migration\)
- One handoff call \(recorded\) walking their developer through the codebase

## 9\.3 What Is Stripped Before Handoff

- Super admin panel and all tenancy management routes
- Multi\-tenant subdomain routing logic
- License validation code \(they've paid — remove the leash\)
- Your SaaS infrastructure references \(DB URLs, S3 buckets, etc\.\)
- CI/CD pipelines that deploy to your servers
- Any cross\-tenant references or other client data

⚠  Maintain a standalone branch in your private repo that has all SaaS\-specific code pre\-stripped\. When handoff time comes, fork that branch into their org\. Never give them main\.

⚠  Code leaves your hands only after full payment is received and confirmed\. Not before\.

# 10\. Client Tier Summary

__Tier__

__What They Get__

__What You Retain__

__Update Model__

SaaS

Subdomain, shared infra, full features

Full infra \+ code ownership

Every deploy, automatic

Managed Standalone

Their server \+ domain, Docker image, you manage

Code ownership \+ SSH access

You push :stable manually

Self\-Managed Standalone

Their server, Docker image, they manage ops

Code ownership, license key

Paid update engagements

Source License

Full source code, their GitHub, full independence

Contractual no\-redistribution clause

Their own developer

# 11\. Repository & Deploy Structure

your\-repo/

├── apps/

│   ├── api/                   \# NestJS — same code for all modes

│   └── web/                   \# Next\.js — same code for all modes

├── deploy/

│   ├── saas/

│   │   ├── docker\-compose\.yml

│   │   └── \.env\.saas

│   └── standalone/            \# what gets handed to clients

│       ├── docker\-compose\.yml \# pinned tag \+ Watchtower

│       ├── \.env\.example       \# fully commented

│       ├── nginx\.conf

│       └── seed\.sql           \# populated at handoff time

├── scripts/

│   ├── export\_group\.sql       \# data export script

│   └── migrate\-cloudinary\.ts  \# asset migration script

├── prisma/

│   ├── schema\.prisma

│   ├── seed\.ts

│   └── migrations/

└── \.github/

    └── workflows/

        └── deploy\.yml

# 12\. Pre\-Production Checklist

## Schema

- group\_id column added to all major tables
- group\_id indexed on every table it appears on
- group\_id populated at insert time in all create operations
- Prisma schema updated and migration files committed

## App

- DEPLOYMENT\_MODE env switch implemented in TenantService
- Super admin routes guarded by DeploymentModeGuard \(404 in standalone\)
- Cloudinary uploads namespaced under groups/\{groupId\}/\.\.\.
- Prisma migrate deploy runs on app bootstrap

## DevOps

- GHCR set up under your GitHub org
- GitHub Actions builds and pushes :latest on every merge to main
- workflow\_dispatch job exists to push :stable to managed clients
- standalone/ deploy folder created and tested
- deploy/saas/\.env created on server \(gitignored\): DB\_NAME, DB\_USER, DB\_PASSWORD
- apps/api/\.env and apps/web/\.env created on server \(gitignored\): full app config
- deploy/standalone/\.env created on each client server \(gitignored\): see \.env\.example
- export\_group\.sql written and tested against real data
- migrate\-cloudinary\.ts script written and tested

## License & Access

- License server deployed on a separate VPS
- License validation runs on app bootstrap in standalone mode
- 72hr grace period implemented for license server downtime
- GHCR read\-only token issuance and revocation process documented

*This document reflects all agreed architectural decisions\. Treat it as the authoritative spec\.*

