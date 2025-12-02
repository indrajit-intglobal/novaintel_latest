#!/bin/bash
# Run database migrations on Cloud SQL

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
INSTANCE_NAME="novaintel-db"
DATABASE_NAME="novaintel"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Running database migrations${NC}"
echo "Project: ${PROJECT_ID}"
echo "Instance: ${INSTANCE_NAME}"
echo "Database: ${DATABASE_NAME}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    exit 1
fi

# Set project
gcloud config set project ${PROJECT_ID}

# Get database password from Secret Manager or prompt
DB_PASSWORD=$(gcloud secrets versions access latest --secret="database-password" 2>/dev/null || echo "")

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}Database password not found in Secret Manager${NC}"
    echo "Enter database password:"
    read -s DB_PASSWORD
fi

# Run migrations using Cloud SQL Proxy or direct connection
echo -e "${YELLOW}Running migrations...${NC}"

# Option 1: Using Cloud SQL Proxy (recommended)
if command -v cloud-sql-proxy &> /dev/null; then
    echo "Using Cloud SQL Proxy..."
    # Start proxy in background
    cloud-sql-proxy ${PROJECT_ID}:${REGION}:${INSTANCE_NAME} &
    PROXY_PID=$!
    sleep 2
    
    # Run migrations
    cd backend
    export DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@127.0.0.1:5432/${DATABASE_NAME}"
    python -m db.run_migration || python run_migration.py
    
    # Stop proxy
    kill $PROXY_PID
else
    # Option 2: Direct connection (requires authorized network or SSL)
    echo "Using direct connection..."
    echo -e "${YELLOW}Note: Ensure your IP is authorized or use Cloud SQL Proxy${NC}"
    
    DB_IP=$(gcloud sql instances describe ${INSTANCE_NAME} --format='value(ipAddresses[0].ipAddress)')
    
    cd backend
    export DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@${DB_IP}:5432/${DATABASE_NAME}"
    python -m db.run_migration || python run_migration.py
fi

echo ""
echo -e "${GREEN}✓ Migrations completed!${NC}"

