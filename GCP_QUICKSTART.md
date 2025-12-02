# Google Cloud Deployment - Quick Start

This is a quick reference for deploying NovaIntel to Google Cloud Platform. For detailed instructions, see [GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md).

## Prerequisites

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud auth application-default login

# Set project
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
gcloud config set project ${GCP_PROJECT_ID}
```

## Quick Deployment (5 Steps)

### 1. Initial Setup

```bash
./scripts/setup-gcp.sh
```

This creates:
- Cloud SQL instance
- Cloud Storage buckets
- VPC Connector
- Service account

### 2. Create Secrets

```bash
# Database URL
echo -n "postgresql://postgres:PASSWORD@/novaintel?host=/cloudsql/PROJECT_ID:REGION:novaintel-db" | \
    gcloud secrets create database-url --data-file=-

# Secret Key
openssl rand -hex 32 | gcloud secrets create secret-key --data-file=-

# API Keys
echo -n "your-gemini-key" | gcloud secrets create gemini-api-key --data-file=-
echo -n "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
```

### 3. Grant Secret Access

```bash
PROJECT_ID="your-project-id"
gcloud secrets add-iam-policy-binding database-url \
    --member="serviceAccount:novaintel-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Repeat for: secret-key, gemini-api-key, openai-api-key, smtp-password
```

### 4. Deploy Backend

```bash
./scripts/deploy-backend.sh
```

Then configure environment variables in Cloud Run console (see [GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md)).

### 5. Deploy Frontend

```bash
export BACKEND_URL="https://novaintel-backend-xxxxx.run.app"
./scripts/deploy-frontend.sh
```

## Environment Variables for Cloud Run

### Backend

Set these in Cloud Run console:

```
PORT=8080
DATABASE_URL=projects/PROJECT_ID/secrets/database-url:latest
SECRET_KEY=projects/PROJECT_ID/secrets/secret-key:latest
GEMINI_API_KEY=projects/PROJECT_ID/secrets/gemini-api-key:latest
OPENAI_API_KEY=projects/PROJECT_ID/secrets/openai-api-key:latest
USE_CLOUD_STORAGE=true
GCS_BUCKET_NAME=PROJECT_ID-novaintel-uploads
GCS_CHROMADB_BUCKET=PROJECT_ID-novaintel-chromadb
GCS_EXPORTS_BUCKET=PROJECT_ID-novaintel-exports
CORS_ORIGINS=https://novaintel-frontend-xxxxx.run.app
FRONTEND_URL=https://novaintel-frontend-xxxxx.run.app
```

### Frontend

```
VITE_API_BASE_URL=https://novaintel-backend-xxxxx.run.app
```

## Get Service URLs

```bash
# Backend
gcloud run services describe novaintel-backend --region=us-central1 --format='value(status.url)'

# Frontend
gcloud run services describe novaintel-frontend --region=us-central1 --format='value(status.url)'
```

## View Logs

```bash
# Backend logs
gcloud run services logs read novaintel-backend --region=us-central1

# Frontend logs
gcloud run services logs read novaintel-frontend --region=us-central1
```

## Common Issues

### Database Connection Error

- Verify VPC connector is attached
- Check Cloud SQL connection name format
- Verify service account has `cloudsql.client` role

### Secret Access Denied

- Verify service account has `secretmanager.secretAccessor` role
- Check secret name matches exactly

### CORS Errors

- Update `CORS_ORIGINS` in backend with exact frontend URL
- Ensure no trailing slashes

## Next Steps

1. Run database migrations: `./scripts/migrate-db.sh`
2. Test the application
3. Configure custom domain (optional)
4. Set up monitoring

For detailed instructions, see [GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md).

