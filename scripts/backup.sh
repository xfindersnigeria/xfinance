#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="xfinance_${TIMESTAMP}.sql"
BACKUP_DIR="/app/backups"
COMPOSE_FILE="/app/xfinance/deploy/saas/docker-compose.yml"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

echo "[$(date)] Starting backup..."

docker compose -f $COMPOSE_FILE exec -T postgres \
  pg_dump -U ${DB_USER:-postgres} ${DB_NAME:-xfinance} \
  > /tmp/${BACKUP_FILE}

gzip /tmp/${BACKUP_FILE}
mv /tmp/${BACKUP_FILE}.gz $BACKUP_DIR/

echo "[$(date)] Backup saved: $BACKUP_DIR/${BACKUP_FILE}.gz"

find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Cleanup done. Kept last ${RETENTION_DAYS} days."

# Optional S3 upload — uncomment and configure AWS CLI if needed
# aws s3 cp $BACKUP_DIR/${BACKUP_FILE}.gz s3://your-backup-bucket/db/

echo "[$(date)] Backup complete."
