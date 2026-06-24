#!/bin/bash
set -e

# ============================================
#  น้องนาโน — Remote Deploy Script
#  Usage: bash deploy.sh
# ============================================

SERVER="root@srv1100100.hstgr.cloud"
REMOTE_DIR="/home/web/nano"
APP_NAME="nano-app"
DOMAIN="https://nano.technomand-ai.cloud"

echo ""
echo "🚀 Preparing remote directory on ${SERVER}..."
ssh "$SERVER" mkdir -p "/home/web"

echo ""
echo "🚀 Deploying น้องนาโน to ${SERVER}..."
echo "============================================"

ssh "$SERVER" bash -s <<'EOF'
set -e

cd /home/web

if [ ! -d "nano/.git" ]; then
  echo "📥 Cloning repository (removing old directory if exists)..."
  rm -rf nano
  git clone https://github.com/mizae1234/nano.git nano
  cd nano
else
  echo "📥 Pulling latest code..."
  cd nano
  git fetch origin
  git reset --hard origin/main
fi
EOF

echo ""
echo "📤 Uploading environment configuration..."
scp .env "$SERVER":"$REMOTE_DIR/.env"

echo ""
echo "🐳 Building and starting Docker container..."
ssh "$SERVER" bash -s <<'EOF'
set -e
cd /home/web/nano

# Ensure .env is present
if [ ! -f ".env" ]; then
  echo "❌ .env file not found!"
  exit 1
fi

echo "🐳 Rebuilding Docker image..."
docker compose down || true
docker compose build --no-cache
docker compose up -d

echo ""
echo "⏳ Waiting for container to start..."
sleep 8

if docker ps --filter "name=nano-app" --filter "status=running" -q | grep -q .; then
    echo ""
    echo "✅ Deploy successful!"
    docker logs --tail 10 nano-app
else
    echo ""
    echo "❌ Container failed to start!"
    docker logs --tail 30 nano-app
    exit 1
fi
EOF

echo ""
echo "🎉 น้องนาโน deployed successfully!"
echo "🌐 URL: ${DOMAIN}"
echo "📡 Port: 3030 (ensure reverse proxy points to port 3030)"
echo ""
