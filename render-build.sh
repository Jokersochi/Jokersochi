#!/usr/bin/env sh
set -eu

OUTPUT_DIR="render-static"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/css" "$OUTPUT_DIR/js"

cp index.html "$OUTPUT_DIR/"
cp -R css/. "$OUTPUT_DIR/css/"
cp -R js/. "$OUTPUT_DIR/js/"
