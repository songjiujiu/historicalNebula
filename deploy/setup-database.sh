#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Port 3306 belongs to an unrelated container on this host.
test "$(sudo -n mysql --protocol=socket -N -e 'SELECT @@port')" = 3307
sudo -n install -d -m 700 /etc/historical-nebula
reader_password="$(openssl rand -hex 32)"
import_password="$(openssl rand -hex 32)"

sudo -n mysql --protocol=socket <<SQL
CREATE DATABASE IF NOT EXISTS historical_nebula CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER IF NOT EXISTS 'hn_reader'@'127.0.0.1' IDENTIFIED BY '$reader_password';
CREATE USER IF NOT EXISTS 'hn_importer'@'127.0.0.1' IDENTIFIED BY '$import_password';
ALTER USER 'hn_reader'@'127.0.0.1' IDENTIFIED BY '$reader_password';
ALTER USER 'hn_importer'@'127.0.0.1' IDENTIFIED BY '$import_password';
GRANT SELECT ON historical_nebula.* TO 'hn_reader'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON historical_nebula.* TO 'hn_importer'@'127.0.0.1';
SQL

printf 'HISTORY_DB_HOST=127.0.0.1\nHISTORY_DB_PORT=3307\nHISTORY_DB_NAME=historical_nebula\nHISTORY_DB_USER=hn_reader\nHISTORY_DB_PASSWORD=%s\n' "$reader_password" | sudo -n tee /etc/historical-nebula/api.env >/dev/null
printf 'HISTORY_DB_HOST=127.0.0.1\nHISTORY_DB_PORT=3307\nHISTORY_DB_NAME=historical_nebula\nHISTORY_DB_USER=hn_importer\nHISTORY_DB_PASSWORD=%s\n' "$import_password" | sudo -n tee /etc/historical-nebula/import.env >/dev/null
sudo -n chmod 600 /etc/historical-nebula/api.env /etc/historical-nebula/import.env
unset reader_password import_password
echo 'DB_READY local port 3307; credentials stored root-only'
