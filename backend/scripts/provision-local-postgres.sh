#!/usr/bin/env bash
# Ubuntu/Debian, run as root. Creates a NEW database, never overwrites one.
set -euo pipefail
umask 077
backend_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$backend_dir"
[[ "$(id -u)" == 0 ]] || { echo 'Run this script as root.' >&2; exit 1; }
[[ -f .env && -f scripts/bootstrap-local.sql && -f scripts/check-db.js && -f dist/server.js ]] || {
  echo 'Run from a deployed backend with .env, dist/server.js, check-db.js and bootstrap-local.sql.' >&2; exit 1;
}
command -v node >/dev/null
node -e 'require.resolve("pg")'
command -v systemctl >/dev/null
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-client
systemctl enable --now postgresql

pgadmin() { runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -d postgres "$@"; }
if [[ "$(pgadmin -Atc "SELECT 1 FROM pg_database WHERE datname='cloudmind_local'")" == 1 ]]; then
  echo 'Database cloudmind_local already exists. Stopping without changing it.' >&2; exit 1
fi
if [[ "$(pgadmin -Atc "SELECT 1 FROM pg_roles WHERE rolname='cloudmind_local_app'")" == 1 ]]; then
  echo 'Role cloudmind_local_app already exists. Stopping without changing its password.' >&2; exit 1
fi
[[ "$(pgadmin -Atc 'SHOW port')" == 5432 ]] || { echo 'Expected PostgreSQL on port 5432.' >&2; exit 1; }
listen_addresses="$(pgadmin -Atc 'SHOW listen_addresses')"
case "$listen_addresses" in
  localhost|127.0.0.1|127.0.0.1,::1|::1,127.0.0.1) ;;
  *) echo 'PostgreSQL is not restricted to loopback. Check listen_addresses before provisioning.' >&2; exit 1 ;;
esac

db_password="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
# Secret goes through stdin, never a command-line argument or log.
pgadmin >/dev/null <<SQL
CREATE ROLE cloudmind_local_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '$db_password';
CREATE DATABASE cloudmind_local OWNER cloudmind_local_app TEMPLATE template0 ENCODING 'UTF8';
ALTER DATABASE cloudmind_local SET timezone='UTC';
REVOKE CONNECT ON DATABASE cloudmind_local FROM PUBLIC;
GRANT CONNECT ON DATABASE cloudmind_local TO cloudmind_local_app;
SQL

# Fail fast; schema initialization is one transaction, owned by the application role.
runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 --single-transaction \
  -d cloudmind_local -c 'SET ROLE cloudmind_local_app' -f - < scripts/bootstrap-local.sql

# Verify password authentication before changing the live backend configuration.
printf '%s' "$db_password" | node -e '
const {Client}=require("pg");
const fs=require("fs");
(async()=>{const c=new Client({host:"127.0.0.1",port:5432,database:"cloudmind_local",
 user:"cloudmind_local_app",password:fs.readFileSync(0,"utf8"),ssl:false});
try {await c.connect(); const r=await c.query("SELECT COUNT(*)::int AS count FROM users");
 if(r.rows[0].count!==0) throw Error("Expected an empty users table");
 console.log("Local DB authentication verified; users=0");}
finally{await c.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});'

backup=".env.before-local-db.$(date -u +%Y%m%dT%H%M%SZ).$$"
cp -p .env "$backup"
chmod 600 "$backup"
# Replace DB settings only, preserve Qwen/OAuth/mail settings; rotate JWT to invalidate old-database sessions.
printf '%s' "$db_password" | node -e '
const fs=require("fs");const password=fs.readFileSync(0,"utf8");
const updates={DB_HOST:"127.0.0.1",DB_PORT:"5432",DB_NAME:"cloudmind_local",DB_USER:"cloudmind_local_app",DB_PASSWORD:password,JWT_SECRET:require("crypto").randomBytes(64).toString("hex")};
const text=fs.readFileSync(".env","utf8").split(/\r?\n/).filter(line=>
 !/^\s*(?:export\s+)?(?:DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD|DB_SSL_CA_FILE|JWT_SECRET)\s*=/.test(line)).join("\n").trimEnd();
const temporary=".env.local-db.tmp."+process.pid;
fs.writeFileSync(temporary,text+"\n"+Object.entries(updates).map(([k,v])=>k+"="+v).join("\n")+"\n",{mode:0o600});
fs.renameSync(temporary,".env");'
unset db_password
if ! systemctl restart cloudmind; then
  cp -p "$backup" .env
  systemctl restart cloudmind || true
  echo 'Service restart failed; previous .env restored.' >&2; exit 1
fi
# A successful /health alone does not prove database connectivity.
if ! env -u DB_HOST -u DB_PORT -u DB_NAME -u DB_USER -u DB_PASSWORD -u DB_SSL_CA_FILE node scripts/check-db.js > /tmp/cloudmind-local-db-check.log 2>&1; then
  cp -p "$backup" .env
  systemctl restart cloudmind || true
  echo 'DB inspection failed; previous .env restored. See /tmp/cloudmind-local-db-check.log.' >&2; exit 1
fi
echo "Local PostgreSQL provisioned: cloudmind_local, role cloudmind_local_app, UTC."
echo "Previous settings: $backend_dir/$backup (contains secrets; keep private)."
echo 'JWT secret rotated: existing clients must sign in or register again.'
echo 'Cloudflare tunnel was not restarted; its address is unchanged.'
systemctl --no-pager --full status cloudmind
