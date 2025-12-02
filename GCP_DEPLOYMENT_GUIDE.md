# Google Cloud Platform Deployment Guide for NovaIntel

This guide provides step-by-step instructions for deploying NovaIntel to Google Cloud Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Setup](#database-setup)
4. [Cloud Storage Setup](#cloud-storage-setup)
5. [Secret Manager Setup](#secret-manager-setup)
6. [Backend Deployment](#backend-deployment)
7. [Frontend Deployment](#frontend-deployment)
8. [Post-Deployment Configuration](#post-deployment-configuration)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### 1. Install Google Cloud SDK

```bash
# Download and install from:
# https://cloud.google.com/sdk/docs/install

# Verify installation
gcloud --version
```

### 2. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud auth application-default login
```

### 3. Create or Select a GCP Project

```bash
# Create a new project
gcloud projects create novaintel-project --name="NovaIntel"

# Or select an existing project
gcloud config set project YOUR_PROJECT_ID
```

### 4. Enable Billing

Ensure billing is enabled for your project:
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Navigate to Billing
- Link a billing account to your project

## Initial Setup

Run the automated setup script:

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"  # or your preferred region

./scripts/setup-gcp.sh
```

This script will:
- Enable required APIs
- Create Cloud SQL PostgreSQL instance
- Create Cloud Storage buckets
- Create VPC Connector
- Create service account with necessary permissions

### Manual Setup (Alternative)

If you prefer manual setup, follow these steps:

#### 1. Enable Required APIs

```bash
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    storage-component.googleapis.com \
    secretmanager.googleapis.com \
    vpcaccess.googleapis.com \
    redis.googleapis.com
```

#### 2. Create Cloud SQL Instance

```bash
gcloud sql instances create novaintel-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --root-password=$(openssl rand -base64 32) \
    --storage-type=SSD \
    --storage-size=20GB \
    --backup-start-time=03:00 \
    --enable-bin-log
```

#### 3. Create Database

```bash
gcloud sql databases create novaintel --instance=novaintel-db
```

#### 4. Create Cloud Storage Buckets

```bash
PROJECT_ID="your-project-id"
REGION="us-central1"

# Uploads bucket
gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${PROJECT_ID}-novaintel-uploads

# Exports bucket
gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${PROJECT_ID}-novaintel-exports

# ChromaDB bucket
gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${PROJECT_ID}-novaintel-chromadb
```

#### 5. Create VPC Connector

```bash
gcloud compute networks vpc-access connectors create novaintel-vpc-connector \
    --region=us-central1 \
    --range=10.8.0.0/28 \
    --min-instances=2 \
    --max-instances=3 \
    --machine-type=e2-micro
```

#### 6. Create Service Account

```bash
gcloud iam service-accounts create novaintel-sa \
    --display-name="NovaIntel Service Account"

# Grant permissions
PROJECT_ID="your-project-id"
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:novaintel-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:novaintel-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:novaintel-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Database Setup

### 1. Get Database Connection Details

```bash
# Get connection name
gcloud sql instances describe novaintel-db --format='value(connectionName)'

# Get IP address
gcloud sql instances describe novaintel-db --format='value(ipAddresses[0].ipAddress)'
```

### 2. Create Database User (Optional)

```bash
gcloud sql users create novaintel_user \
    --instance=novaintel-db \
    --password=$(openssl rand -base64 32)
```

### 3. Run Migrations

```bash
# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

# Run migration script
./scripts/migrate-db.sh
```

Or manually:

```bash
# Install Cloud SQL Proxy
# https://cloud.google.com/sql/docs/postgres/sql-proxy

# Start proxy
cloud-sql-proxy PROJECT_ID:REGION:novaintel-db &

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:PASSWORD@127.0.0.1:5432/novaintel"

# Run migrations
cd backend
python run_migration.py
```

## Cloud Storage Setup

### 1. Configure Bucket Permissions

```bash
PROJECT_ID="your-project-id"

# Make uploads bucket publicly readable (for serving files)
gsutil iam ch allUsers:objectViewer gs://${PROJECT_ID}-novaintel-uploads

# Set CORS for uploads bucket (if needed)
gsutil cors set cors.json gs://${PROJECT_ID}-novaintel-uploads
```

### 2. Create CORS Configuration (Optional)

Create `cors.json`:

```json
[
  {
    "origin": ["https://your-frontend-url.run.app"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

## Secret Manager Setup

Store sensitive configuration in Secret Manager:

### 1. Create Secrets

```bash
PROJECT_ID="your-project-id"

# Database URL
echo -n "postgresql://user:password@/novaintel?host=/cloudsql/PROJECT_ID:REGION:novaintel-db" | \
    gcloud secrets create database-url --data-file=-

# Secret Key
openssl rand -hex 32 | gcloud secrets create secret-key --data-file=-

# Gemini API Key
echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key --data-file=-

# OpenAI API Key (if using)
echo -n "your-openai-api-key" | gcloud secrets create openai-api-key --data-file=-

# SMTP Credentials
echo -n "your-smtp-password" | gcloud secrets create smtp-password --data-file=-
```

### 2. Grant Access to Service Account

```bash
PROJECT_ID="your-project-id"
gcloud secrets add-iam-policy-binding database-url \
    --member="serviceAccount:novaintel-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Repeat for other secrets
```

## Backend Deployment

### 1. Configure Environment Variables

Before deploying, prepare your environment variables. See `backend/.env.production` template.

### 2. Deploy to Cloud Run

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

./scripts/deploy-backend.sh
```

### 3. Configure Cloud Run Service

After deployment, update environment variables in Cloud Run console:

1. Go to Cloud Run → `novaintel-backend` → Edit & Deploy New Revision
2. Add environment variables:
   - `PORT=8080`
   - `DATABASE_URL` (from Secret Manager)
   - `SECRET_KEY` (from Secret Manager)
   - `GEMINI_API_KEY` (from Secret Manager)
   - `USE_CLOUD_STORAGE=true`
   - `GCS_BUCKET_NAME=your-project-id-novaintel-uploads`
   - `GCS_CHROMADB_BUCKET=your-project-id-novaintel-chromadb`
   - `GCS_EXPORTS_BUCKET=your-project-id-novaintel-exports`
   - `CORS_ORIGINS=https://your-frontend-url.run.app`
   - `FRONTEND_URL=https://your-frontend-url.run.app`
   - `REDIS_HOST` (if using Cloud Memorystore)
   - Other API keys and configuration

3. Set service account:
   - Service account: `novaintel-sa@PROJECT_ID.iam.gserviceaccount.com`

4. Configure VPC:
   - VPC connector: `novaintel-vpc-connector`
   - VPC egress: `All traffic`

5. Configure Cloud SQL:
   - Add Cloud SQL instance: `PROJECT_ID:REGION:novaintel-db`

6. Click "Deploy"

### 4. Get Backend URL

```bash
gcloud run services describe novaintel-backend \
    --region=us-central1 \
    --format='value(status.url)'
```

## Frontend Deployment

### 1. Update API URL

Before building, ensure the frontend knows the backend URL. The build process will use `VITE_API_BASE_URL` environment variable.

### 2. Deploy to Cloud Run

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export BACKEND_URL="https://novaintel-backend-xxxxx.run.app"

./scripts/deploy-frontend.sh
```

### 3. Configure Environment Variables

After deployment, update in Cloud Run console:

1. Go to Cloud Run → `novaintel-frontend` → Edit & Deploy New Revision
2. Add environment variable:
   - `VITE_API_BASE_URL=https://your-backend-url.run.app`

Note: For Vite, environment variables must be prefixed with `VITE_` and are baked into the build. You may need to rebuild if changing the backend URL.

## Post-Deployment Configuration

### 1. Update CORS Settings

Update backend CORS to allow your frontend domain:

```bash
# In Cloud Run console, update CORS_ORIGINS environment variable
CORS_ORIGINS=https://novaintel-frontend-xxxxx.run.app
```

### 2. Configure Custom Domain (Optional)

1. Go to Cloud Run → Your Service → Manage Custom Domains
2. Add your domain
3. Follow DNS configuration instructions

### 3. Set Up Monitoring

1. Enable Cloud Monitoring
2. Set up alerts for:
   - High error rates
   - High latency
   - Resource exhaustion

### 4. Configure Auto-scaling

Cloud Run auto-scales by default, but you can configure:

- Min instances: 0 (to save costs) or 1+ (for faster cold starts)
- Max instances: Based on expected traffic
- Concurrency: Default is 80, adjust based on your app

## Troubleshooting

### Backend Issues

#### Database Connection Errors

```bash
# Check Cloud SQL instance status
gcloud sql instances describe novaintel-db

# Verify VPC connector
gcloud compute networks vpc-access connectors describe novaintel-vpc-connector --region=us-central1

# Check service account permissions
gcloud projects get-iam-policy PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:novaintel-sa@*"
```

#### Storage Errors

```bash
# Verify bucket exists
gsutil ls gs://PROJECT_ID-novaintel-uploads

# Check service account has storage permissions
gsutil iam get gs://PROJECT_ID-novaintel-uploads
```

#### Secret Manager Errors

```bash
# Verify secret exists
gcloud secrets list

# Check secret access
gcloud secrets get-iam-policy SECRET_NAME
```

### Frontend Issues

#### API Connection Errors

- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS settings in backend
- Verify backend is accessible

#### Build Errors

- Check Node.js version (should be 20+)
- Verify all dependencies are installed
- Check build logs in Cloud Build

### General Issues

#### View Logs

```bash
# Backend logs
gcloud run services logs read novaintel-backend --region=us-central1

# Frontend logs
gcloud run services logs read novaintel-frontend --region=us-central1
```

#### Check Service Status

```bash
gcloud run services describe novaintel-backend --region=us-central1
```

## Cost Optimization

1. **Use minimum instances**: Set min-instances to 0 when not in use
2. **Right-size resources**: Start with smaller memory/CPU, scale up as needed
3. **Use Cloud SQL smaller tiers**: db-f1-micro for development
4. **Enable Cloud CDN**: For frontend static assets
5. **Monitor usage**: Set up billing alerts

## Security Best Practices

1. **Use Secret Manager**: Never store secrets in environment variables
2. **Enable VPC**: Use private IP for Cloud SQL connections
3. **Restrict CORS**: Only allow your frontend domain
4. **Use IAM**: Follow principle of least privilege
5. **Enable audit logs**: Monitor access and changes
6. **Regular updates**: Keep dependencies updated

## Next Steps

1. Set up CI/CD pipeline (Cloud Build)
2. Configure monitoring and alerting
3. Set up backup strategy
4. Configure custom domain
5. Set up staging environment
6. Implement logging and error tracking

## Support

For issues or questions:
- Check Cloud Run logs
- Review GCP documentation
- Check NovaIntel GitHub issues

