#!/bin/bash
# Deploy frontend to Google Cloud Run

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="novaintel-frontend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
BACKEND_URL="${BACKEND_URL:-https://novaintel-backend-xxxxx.run.app}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying NovaIntel Frontend to Cloud Run${NC}"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "Backend URL: ${BACKEND_URL}"
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

# Build and push Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
gcloud builds submit --tag ${IMAGE_NAME} --timeout=20m

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --timeout 60 \
    --max-instances 10 \
    --min-instances 0 \
    --port 8080 \
    --set-env-vars VITE_API_BASE_URL=${BACKEND_URL}

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo ""
echo -e "${GREEN}✓ Frontend deployed successfully!${NC}"
echo -e "Service URL: ${SERVICE_URL}"
echo ""
echo "Note: The frontend is built with the backend URL baked in."
echo "If you need to change it, rebuild and redeploy."

