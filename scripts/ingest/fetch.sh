#!/usr/bin/env bash
# Download every page named in manifest.json into .cache/.
#
# curl does the fetching because Python's SSL stack is unusable in the
# sandbox this was built in. Pages are cached so a rebuild is offline and
# byte-identical.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .cache

grep -o '"url": "[^"]*"' manifest.json | cut -d'"' -f4 | sort -u | while read -r url; do
  out=".cache/${url##*/}"
  if [ -f "$out" ]; then
    echo "cached  ${url##*/}"
  else
    curl -sfS "$url" -o "$out"
    echo "fetched ${url##*/} ($(wc -c <"$out") bytes)"
  fi
done
