#!/usr/bin/env bash
set -euo pipefail
revision=${1:?Git commit SHA required}
[[ "$revision" =~ ^[0-9a-f]{40}$ ]]
output=${2:-.deploy/bundle}
mkdir -p "$output/app" "$output/deploy"
cp -a .next/standalone/. "$output/app/"
# Production secrets must only exist on the host.
find "$output/app" -maxdepth 1 -name '.env*' -delete
cp -a public "$output/app/"
cp -a .next/static "$output/app/.next/"
mkdir -p "$output/app/src/assets"
cp -a src/assets/fonts "$output/app/src/assets/"
cp -a prisma "$output/"
cp package.json package-lock.json "$output/"
cp deploy/ec2-release.sh "$output/deploy/"
printf 'DEPLOYMENT_SHA=%s\n' "$revision" > "$output/app/release.env"
tar -czf .deploy/release.tar.gz -C "$output" .
