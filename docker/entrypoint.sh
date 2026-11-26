#!/bin/sh
set -e

platforms="${BOT_PLATFORMS:-discord}"
case "$platforms" in
  ""|discord) platforms=discord ;;
  telegram|both) ;;
  *)
    echo "Invalid BOT_PLATFORMS value; expected discord, telegram or both." >&2
    exit 1
    ;;
esac

echo "▶ Running Prisma migrations..."
max_attempts=10
attempt_num=1

until bunx prisma migrate deploy; do
  if [ $attempt_num -ge $max_attempts ]; then
    echo "Migration failed after $attempt_num attempts. Exiting."
    exit 1
  fi
  echo "Waiting for DB... (attempt $attempt_num/$max_attempts)"
  attempt_num=$((attempt_num + 1))
  sleep 3
done

if [ "$platforms" = "discord" ] || [ "$platforms" = "both" ]; then
  echo "▶ Deploying commands..."
  bun commands
fi

echo "▶ Starting application..."
if [ "$NODE_ENV" = "production" ]; then
  exec bun prod
else
  exec bun start
fi
