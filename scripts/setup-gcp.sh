#!/bin/bash
# Initial GCP setup script for NovaIntel

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up Google Cloud Platform for NovaIntel${NC}"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo -e "${YELLOW}Setting GCP project...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    storage-component.googleapis.com \
    secretmanager.googleapis.com \
    vpcaccess.googleapis.com \
    redis.googleapis.com

# Create Cloud SQL instance
echo -e "${YELLOW}Creating Cloud SQL PostgreSQL instance...${NC}"
gcloud sql instances create novaintel-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=${REGION} \
    --root-password=$(openssl rand -base64 32) \
    --storage-type=SSD \
    --storage-size=20GB \
    --backup-start-time=03:00 \
    --enable-bin-log \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=04 \
    --database-flags=max_connections=100

# Create database
echo -e "${YELLOW}Creating database...${NC}"
gcloud sql databases create novaintel --instance=novaintel-db

# Create Cloud Storage buckets
echo -e "${YELLOW}Creating Cloud Storage buckets...${NC}"
gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${PROJECT_ID}-novaintel-uploads || true
gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${PROJECT_ID}-novaintel-exports || true
gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${PROJECT_ID}-novaintel-chromadb || true

# Set bucket permissions
echo -e "${YELLOW}Setting bucket permissions...${NC}"
gsutil iam ch allUsers:objectViewer gs://${PROJECT_ID}-novaintel-uploads || true

# Create VPC Connector (for private Cloud SQL access)
echo -e "${YELLOW}Creating VPC Connector...${NC}"
gcloud compute networks vpc-access connectors create novaintel-vpc-connector \
    --region=${REGION} \
    --range=10.8.0.0/28 \
    --min-instances=2 \
    --max-instances=3 \
    --machine-type=e2-micro || echo "VPC Connector may already exist"

# Create service account for Cloud Run
echo -e "${YELLOW}Creating service account...${NC}"
gcloud iam service-accounts create novaintel-sa \
    --display-name="NovaIntel Service Account" \
    --description="Service account for NovaIntel Cloud Run services" || echo "Service account may already exist"

# Grant necessary permissions
echo -e "${YELLOW}Granting permissions...${NC}"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:novaintel-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:novaintel-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:novaintel-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Get database connection name
DB_CONNECTION_NAME=$(gcloud sql instances describe novaintel-db --format='value(connectionName)')

echo ""
echo -e "${GREEN}✓ GCP setup completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Get database connection string:"
echo "   gcloud sql instances describe novaintel-db --format='value(connectionName)'"
echo ""
echo "2. Create secrets in Secret Manager:"
echo "   - DATABASE_URL"
echo "   - SECRET_KEY"
echo "   - GEMINI_API_KEY"
echo "   - (and other API keys)"
echo ""
echo "3. Deploy backend:"
echo "   ./scripts/deploy-backend.sh"
echo ""
echo "4. Deploy frontend:"
echo "   ./scripts/deploy-frontend.sh"
echo ""
echo "Database Connection Name: ${DB_CONNECTION_NAME}"

