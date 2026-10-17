#!/usr/bin/env bash
#
# A local database with a day's work in it, so the DASHBOARD can be looked at.
#
#   bash scripts/local-db.sh
#   npm run build && npx next start
#   open http://localhost:3000/dashboard   (password: smoketest)
#
# Why this exists: every other way of seeing the dashboard needs the real
# DATABASE_URL, which means either pulling a production credential into a
# session or photographing a real customer's name and address. Neither is
# acceptable, so for several versions the dashboard simply went unexamined —
# the one screen the trade actually uses, every day, on a driveway.
#
# Postgres runs as the `postgres` user because initdb refuses to run as root.
# Everything lives under /var/lib/postgresql/ts and dies with the container.
#
set -euo pipefail

PORT="${LOCAL_DB_PORT:-5433}"
DIR=/var/lib/postgresql/ts
URL="postgresql://postgres@localhost:${PORT}/tradestatus"
PG="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n 1)"

say() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
die() { printf '\n\033[1;31mStopped:\033[0m %s\n' "$1" >&2; exit 1; }

[ -n "$PG" ] || die "No Postgres found under /usr/lib/postgresql."
[ -f package.json ] || die "Run this from the root of the tradestatus repo."

if su postgres -c "PATH=$PG:\$PATH pg_ctl -D $DIR status" >/dev/null 2>&1; then
  say "Postgres is already running on $PORT"
else
  say "Starting Postgres on $PORT"
  rm -rf "$DIR"; mkdir -p "$DIR"; chown postgres:postgres "$DIR"; chmod 700 "$DIR"
  su postgres -c "PATH=$PG:\$PATH initdb -D $DIR -U postgres --auth=trust" >/dev/null
  su postgres -c "PATH=$PG:\$PATH pg_ctl -D $DIR -o '-p $PORT -k /tmp -c listen_addresses=localhost' -l $DIR/pg.log start" >/dev/null
  sleep 2
  psql -h localhost -p "$PORT" -U postgres -c "CREATE DATABASE tradestatus;" >/dev/null
fi

say "Creating the tables"
# No --skip-generate: a stale client silently skips the household card in the seed.
DATABASE_URL="$URL" npx prisma db push >/dev/null
echo "    done"

say "Seeding a day's work"
DATABASE_URL="$URL" node scripts/seed-local.mjs

# .env.local is gitignored, and every value in it is throwaway. The real ones
# live in Vercel and are never pulled into a working copy.
say "Writing .env.local"
cat > .env.local <<ENV
NEXT_PUBLIC_TRADE_NAME=Rosebourne Plumbing
NEXT_PUBLIC_TRADE_PHONE=01264 502027
NEXT_PUBLIC_TRADE_PHONE_TEL=01264502027
DATABASE_URL=$URL
JWT_SECRET=local-only-not-a-real-secret
OPERATOR_PASSWORD=smoketest
ENV
echo "    done"

cat <<DONE

────────────────────────────────────────────────────────────
  Local database ready.

    export DATABASE_URL="$URL"      # prisma generate reads the shell, not .env.local
    npm run build && npx next start

  Dashboard   http://localhost:3000/dashboard   (smoketest)
  A customer  http://localhost:3000/t/K7M4PQRT  (on site)
              http://localhost:3000/t/QF52MDKR  (booked, customer
                                                 has countered the hours)
  The fixture http://localhost:3000/preview?stage=BOOKED

  To capture the whole diary, dashboard included:
    DEMO_CODE=K7M4PQRT BASE=http://localhost:3000 \\
      node scripts/capture-diary.mjs
────────────────────────────────────────────────────────────
DONE
