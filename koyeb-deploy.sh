#!/bin/bash
# Koyeb deployment script for while:unemployed backend

# Install Koyeb CLI if not already installed
if ! command -v koyeb &> /dev/null; then
    echo "Installing Koyeb CLI..."
    curl -fsSL https://cli.koyeb.com/install.sh | sh
fi

# Login (will prompt for credentials)
echo "Logging in to Koyeb..."
koyeb login

# Create or update the service
echo "Deploying backend service..."
koyeb service create while-unemployed-backend \
  --git github.com/lukebrevoort/while_unemployed \
  --git-branch main \
  --git-builder dockerfile \
  --git-dockerfile backend/Dockerfile \
  --git-build-context backend \
  --instance-type nano \
  --port 8000:http \
  --env PORT=8000 \
  --env HOST=0.0.0.0 \
  --env ALLOWED_ORIGINS=https://your-vercel-app.vercel.app \
  --health-check http:8000:/health \
  --region was

echo ""
echo "Deployment initiated! Check status at: https://app.koyeb.com"
echo ""
echo "Don't forget to:"
echo "1. Add OPENAI_API_KEY as a secret in Koyeb dashboard"
echo "2. Update ALLOWED_ORIGINS with your actual Vercel URL"
