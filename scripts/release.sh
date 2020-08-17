#!/bin/sh

VERSION=$(cat package.json | jq -r .version)
hub release create "v${VERSION}" -m "v${VERSION}"
