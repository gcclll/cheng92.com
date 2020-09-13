#!/bin/bash

echo "
ALGOLIA_APP_ID=EDIKM3W4HV
ALGOLIA_INDEX_NAME=cheng92.com
ALGOLIA_INDEX_FILE=public/algolia.json
ALGOLIA_ADMIN_KEY=${ALGOLIA_INDEX_FILE}" > .env

npm install
npm run algolia
