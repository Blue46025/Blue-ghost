#!/usr/bin/env bash
# Arranca un WordPress de pruebas (WordPress Playground) con el tema y el plugin montados desde este repositorio.
# Uso: tests/wp-up.sh <carpeta-con-@wp-playground>   → deja WordPress en http://127.0.0.1:9400
# Requiere los paquetes npm @wp-playground/cli y @wp-playground/wordpress-builds instalados en esa carpeta.
set -euo pipefail
PG="${1:?carpeta con node_modules de @wp-playground}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
BUILDS="$PG/node_modules/@wp-playground/wordpress-builds/src"

# Sirve el zip de WordPress en local: Playground solo acepta versiones o URLs y wordpress.org puede no ser accesible.
if ! curl -s -o /dev/null -m 2 http://127.0.0.1:8099/wordpress/wp-6.5.zip; then
  (cd "$BUILDS" && nohup python3 -m http.server 8099 --bind 127.0.0.1 >/dev/null 2>&1 &)
  sleep 1
fi

cd "$PG"
nohup npx @wp-playground/cli server \
  --wp=http://127.0.0.1:8099/wordpress/wp-6.5.zip --port 9400 \
  --mount-before-install="$REPO/wordpress/zona:/wordpress/wp-content/themes/zona" \
  --mount-before-install="$REPO/wordpress/zona-core:/wordpress/wp-content/plugins/zona-core" \
  --mount-before-install="$REPO/tests/mu-setup.php:/wordpress/wp-content/mu-plugins/zona-test-setup.php" \
  --define WP_ENVIRONMENT_TYPE local > "$PG/srv.log" 2>&1 &

for _ in $(seq 1 60); do
  sleep 3
  if grep -q "Ready" "$PG/srv.log"; then break; fi
  if grep -q "Error" "$PG/srv.log"; then cat "$PG/srv.log"; exit 1; fi
done
# Dos peticiones: la primera prepara el sitio (mu-setup), la segunda aplica los enlaces permanentes.
curl -s -o /dev/null http://127.0.0.1:9400/
curl -s -o /dev/null http://127.0.0.1:9400/
echo "WordPress de pruebas en http://127.0.0.1:9400"
