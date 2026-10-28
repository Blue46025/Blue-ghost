#!/usr/bin/env bash
# Genera los .zip instalables desde el panel de WordPress (Apariencia › Temas › Subir tema / Plugins › Añadir nuevo › Subir).
set -euo pipefail
cd "$(dirname "$0")/../wordpress"
mkdir -p ../entregables
rm -f ../entregables/zona.zip ../entregables/zona-core.zip
zip -qr -X ../entregables/zona.zip zona -x '*.DS_Store'
zip -qr -X ../entregables/zona-core.zip zona-core -x '*.DS_Store'
ls -la ../entregables
