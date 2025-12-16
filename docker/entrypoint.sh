#!/bin/sh
set -e

echo "▶ Running Prisma migrations..."
max_attempts=10
attempt_num=1

until make migrate-up; do
  if [ $attempt_num -ge $max_attempts ]; then
    echo "Migration failed after $attempt_num attempts. Exiting."
    exit 1
  fi
  echo "Waiting for DB... (attempt $attempt_num/$max_attempts)"
  attempt_num=$((attempt_num + 1))
  sleep 3
done

echo "▶ Deploying commands..."
bun commands

echo "▶ Starting application..."
exec bun start