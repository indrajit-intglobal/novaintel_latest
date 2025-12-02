# NovaIntel Google Cloud Deployment Checklist

Use this checklist to ensure a complete and successful deployment.

## Pre-Deployment

- [ ] Google Cloud account created and billing enabled
- [ ] Google Cloud SDK installed and authenticated
- [ ] GCP project created or selected
- [ ] All required APIs enabled (run `setup-gcp.sh` or enable manually)
- [ ] Service account created with necessary permissions

## Infrastructure Setup

- [ ] Cloud SQL PostgreSQL instance created
- [ ] Database `novaintel` created in Cloud SQL
- [ ] Cloud Storage buckets created:
  - [ ] `PROJECT_ID-novaintel-uploads`
  - [ ] `PROJECT_ID-novaintel-exports`
  - [ ] `PROJECT_ID-novaintel-chromadb`
- [ ] VPC Connector created
- [ ] Bucket permissions configured

## Secrets Configuration

- [ ] Database URL stored in Secret Manager
- [ ] Secret key (JWT) generated and stored
- [ ] Gemini API key stored
- [ ] OpenAI API key stored (if using)
- [ ] SMTP credentials stored
- [ ] Redis password stored (if using Cloud Memorystore)
- [ ] Service account granted access to all secrets

## Database Setup

- [ ] Database migrations run successfully
- [ ] Test database connection
- [ ] Verify tables created
- [ ] Test with sample data (optional)

## Backend Deployment

- [ ] Backend Dockerfile created and tested locally
- [ ] Environment variables prepared
- [ ] Backend deployed to Cloud Run
- [ ] Service account configured in Cloud Run
- [ ] VPC connector attached
- [ ] Cloud SQL instance connected
- [ ] Environment variables set in Cloud Run:
  - [ ] `DATABASE_URL` (from Secret Manager)
  - [ ] `SECRET_KEY` (from Secret Manager)
  - [ ] `GEMINI_API_KEY` (from Secret Manager)
  - [ ] `USE_CLOUD_STORAGE=true`
  - [ ] `GCS_BUCKET_NAME`
  - [ ] `GCS_CHROMADB_BUCKET`
  - [ ] `GCS_EXPORTS_BUCKET`
  - [ ] `CORS_ORIGINS` (frontend URL)
  - [ ] `FRONTEND_URL`
  - [ ] Other API keys and configuration
- [ ] Backend health check passes (`/health` endpoint)
- [ ] Backend URL obtained and saved

## Frontend Deployment

- [ ] Frontend Dockerfile created and tested locally
- [ ] Nginx configuration verified
- [ ] Frontend built with correct `VITE_API_BASE_URL`
- [ ] Frontend deployed to Cloud Run
- [ ] Environment variable `VITE_API_BASE_URL` set
- [ ] Frontend URL obtained and saved

## Post-Deployment Configuration

- [ ] Backend CORS updated with frontend URL
- [ ] Frontend API URL updated (if needed, rebuild)
- [ ] Test user registration
- [ ] Test user login
- [ ] Test file upload
- [ ] Test RAG functionality
- [ ] Test proposal generation
- [ ] Verify Cloud Storage file uploads
- [ ] Verify ChromaDB persistence

## Security

- [ ] HTTPS enforced (Cloud Run default)
- [ ] CORS restricted to frontend domain only
- [ ] Secrets stored in Secret Manager (not env vars)
- [ ] Service account has minimal permissions
- [ ] Database access via private IP (VPC)
- [ ] No sensitive data in logs
- [ ] Security headers configured (Nginx)

## Monitoring & Logging

- [ ] Cloud Run logs accessible
- [ ] Error tracking configured (optional)
- [ ] Monitoring alerts set up (optional)
- [ ] Billing alerts configured

## Performance

- [ ] Auto-scaling configured appropriately
- [ ] Resource limits set (memory, CPU)
- [ ] Timeout values configured
- [ ] Database connection pooling configured
- [ ] CDN enabled for frontend (optional)

## Testing

- [ ] Backend API endpoints tested
- [ ] Frontend loads correctly
- [ ] Authentication flow works
- [ ] File upload works
- [ ] RAG search works
- [ ] Proposal generation works
- [ ] WebSocket connections work (chat)
- [ ] Email verification works (if configured)

## Documentation

- [ ] Deployment guide reviewed
- [ ] Team members have access to:
  - [ ] GCP project
  - [ ] Cloud Run services
  - [ ] Secret Manager
  - [ ] Cloud SQL
  - [ ] Cloud Storage buckets

## Rollback Plan

- [ ] Previous version tagged (if using versioning)
- [ ] Database backup strategy in place
- [ ] Rollback procedure documented
- [ ] Test rollback process (optional)

## Cost Optimization

- [ ] Min instances set to 0 (for cost savings)
- [ ] Resource sizes appropriate for workload
- [ ] Unused resources identified
- [ ] Billing alerts configured

## Final Verification

- [ ] Application accessible via public URL
- [ ] All features working in production
- [ ] Performance acceptable
- [ ] No critical errors in logs
- [ ] Security checklist complete
- [ ] Team notified of deployment

## Troubleshooting Reference

If issues occur, check:
- [ ] Cloud Run logs: `gcloud run services logs read SERVICE_NAME --region=REGION`
- [ ] Cloud SQL connection: Verify VPC connector and connection name
- [ ] Secret Manager access: Check IAM permissions
- [ ] Cloud Storage: Verify bucket permissions and service account access
- [ ] CORS errors: Check CORS_ORIGINS configuration
- [ ] Database errors: Verify connection string and network access

## Next Steps After Deployment

- [ ] Set up custom domain (optional)
- [ ] Configure CI/CD pipeline
- [ ] Set up staging environment
- [ ] Implement monitoring dashboards
- [ ] Schedule regular backups
- [ ] Plan for scaling

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Backend URL**: _______________
**Frontend URL**: _______________
**Notes**: _______________

