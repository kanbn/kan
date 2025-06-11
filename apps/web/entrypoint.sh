#!/bin/sh

# Run migrations from the Turborepo root context
echo "Running database migrations..."
# Navigate to the Turborepo root to run the db:migrate command
pnpm --prefix /app db:migrate

# Check if migration was successful
if [ $? -ne 0 ]; then
  echo "\nDatabase migration failed! Exiting."
  exit 1
fi

echo "\nStarting Next.js application..."
# Start the Next.js application from the web app's directory
exec node .next/standalone/apps/web/server.js