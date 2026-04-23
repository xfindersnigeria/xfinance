# XFinance Standalone Deployment Guide

## Prerequisites
- Ubuntu 20.04+ server
- Docker and Docker Compose installed
- Domain name pointed to this server
- Cloudinary account (free at cloudinary.com)
- Resend account (free at resend.com)

## First Time Setup

**1. Login to GHCR** with the token provided by the XFinance team:
```bash
echo YOUR_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

**2. Copy and fill the env file:**
```bash
cp .env.example .env
nano .env   # fill all values except DEFAULT_GROUP_ID for now
```

**3. Start services:**
```bash
docker compose up -d
```

**4. Run migrations and seeders in this exact order:**
```bash
docker compose exec api npm run seed:permissions
docker compose exec api npm run seed:admin-role
docker compose exec api npm run seed:modules
docker compose exec api npm run seed:account-types
```

**5. Run standalone setup:**
```bash
STANDALONE_GROUP_NAME="Your Company" \
STANDALONE_GROUP_EMAIL="admin@yourdomain.com" \
docker compose exec api npm run setup:standalone
```

**6. Copy the printed Group ID into `.env`:**
```
DEFAULT_GROUP_ID=<printed-id>
```

**7. Restart the API:**
```bash
docker compose restart api
```

**8. Set up Nginx and SSL** (see Nginx section below).

**9. Login** at your domain with the email and password printed in step 5.

---

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name finance.clientdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name finance.clientdomain.com;

    ssl_certificate     /etc/letsencrypt/live/finance.clientdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/finance.clientdomain.com/privkey.pem;

    # API proxy
    location /backend/ {
        rewrite ^/backend/(.*)$ /api/v1/$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /cache/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Install SSL with Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d finance.clientdomain.com
sudo systemctl reload nginx
```

---

## How To Update

When the XFinance team releases an update:
```bash
docker compose pull
docker compose up -d
```
Migrations run automatically on startup.

---

## Manual Backup

```bash
docker compose exec -T postgres pg_dump \
  -U postgres xfinance > backup_$(date +%Y%m%d).sql
```

## Restore From Backup

```bash
docker compose exec -T postgres psql \
  -U postgres xfinance < backup_file.sql
```

---

## Support

Contact the XFinance team for support.
Include your domain and a description of the issue.
