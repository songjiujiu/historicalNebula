#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

release_id="$1"
archive_sha="$2"
index_sha="$3"
expected_files="$4"
[[ "$release_id" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]
[[ "$archive_sha" =~ ^[a-f0-9]{64}$ ]]
[[ "$index_sha" =~ ^[a-f0-9]{64}$ ]]
[[ "$expected_files" =~ ^[0-9]+$ ]]

base=/srv/historical-nebula
release="$base/releases/$release_id"
archive="/tmp/historical-nebula-$release_id.tar.gz"
nginx_site=/etc/nginx/sites-available/historical-nebula
previous="$(readlink -f "$base/current")"
case "$previous" in "$base/releases/"*) ;; *) echo 'Unexpected current deployment'; exit 1;; esac
test -f "$previous/index.html"
test ! -e "$release"
test ! -L "$release"
test "$(readlink -f "$base/releases")" = "$base/releases"

printf '%s  %s\n' "$archive_sha" "$archive" | sha256sum -c -
sudo -n install -d -m 755 "$release"
sudo -n tar -xzf "$archive" --no-same-owner -C "$release"
sudo -n chmod -R u=rwX,go=rX "$release"
cd "$release"
test "$(wc -l < SHA256SUMS)" -eq "$expected_files"
sha256sum -c SHA256SUMS --quiet
test ! -e "$release/data"
test "$(sha256sum index.html | cut -d ' ' -f1)" = "$index_sha"
echo "FRONTEND_VERIFIED $expected_files files; no static corpus"

sudo -n install -m 644 "$base/source/deploy/historical-nebula-api.service" /etc/systemd/system/historical-nebula-api.service
sudo -n systemctl daemon-reload
sudo -n systemctl enable --now historical-nebula-api
sudo -n systemctl restart historical-nebula-api
health="$(curl -fsS --retry 10 --retry-connrefused --retry-delay 1 --max-time 15 http://127.0.0.1:18763/api/v1/health)"
python3 -c 'import json,sys; h=json.loads(sys.argv[1]); assert h["ok"] and h["documents"] >= 3800, h' "$health"
for resource in /api/v1/data/shiji/001.json /api/v1/data/histories/hanshu/004.json /api/v1/data/modern/chapters/hong-kong-return.json /api/v1/data/modern/documents/hong-kong-declaration.json /api/v1/data/modern/qingshigao/529.json; do
    curl -fsS --max-time 30 "http://127.0.0.1:18763$resource" -o /dev/null
done
echo 'API_VERIFIED'

backup="/tmp/historical-nebula-nginx-$release_id.conf"
sudo -n cp "$nginx_site" "$backup"
activated=0
rollback() {
    status=$?
    trap - ERR
    if [ "$activated" = 1 ]; then
        sudo -n ln -s "$previous" "$base/rollback-$release_id"
        sudo -n mv -Tf "$base/rollback-$release_id" "$base/current"
    fi
    sudo -n cp "$backup" "$nginx_site"
    sudo -n nginx -t && sudo -n systemctl reload nginx || true
    echo "ROLLED_BACK $previous"
    exit "$status"
}
trap rollback ERR
sudo -n install -m 644 "$base/source/deploy/nginx.conf" "$nginx_site"
sudo -n nginx -t
sudo -n ln -s "$release" "$base/current-$release_id"
sudo -n mv -Tf "$base/current-$release_id" "$base/current"
activated=1
sudo -n systemctl reload nginx
actual_index="$(curl -fsS --max-time 15 -H 'Host: 82.157.197.102' http://127.0.0.1/ | sha256sum | cut -d ' ' -f1)"
test "$actual_index" = "$index_sha"
curl -fsS --max-time 15 -H 'Host: 82.157.197.102' http://127.0.0.1/api/v1/health -o /dev/null
curl -fsS --max-time 15 -H 'Host: 82.157.197.102' http://127.0.0.1/api/v1/data/modern/chapters/change-six.json -o /dev/null
test "$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: 82.157.197.102' http://127.0.0.1/data/shiji/001.json)" = 404
trap - ERR
echo "DEPLOYED $release"
echo "API_HEALTH $health"
echo 'PUBLIC_ROUTING_OK'

# Requested replacement: remove retired frontend deployments after the new one is verified.
for old in "$base"/releases/*; do
    test -d "$old" || continue
    test "$old" != "$release" || continue
    name="${old##*/}"
    [[ "$name" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || continue
    test "$(readlink -f "$old")" = "$old" || continue
    case "$old" in "$base/releases/"*) sudo -n rm -rf -- "$old";; esac
done
echo 'OLD_FRONTEND_RELEASES_REMOVED'
