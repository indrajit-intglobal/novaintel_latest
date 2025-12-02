# Google Cloud Secret Manager Setup Guide

This guide explains how to set up secrets in Google Cloud Secret Manager for NovaIntel.

## Why Use Secret Manager?

- **Security**: Secrets are encrypted at rest and in transit
- **Access Control**: Fine-grained IAM permissions
- **Audit Logging**: Track who accessed secrets
- **Versioning**: Keep history of secret changes
- **Rotation**: Easy to update secrets without redeploying

## Prerequisites

1. Google Cloud SDK installed and authenticated
2. Project with Secret Manager API enabled
3. Service account created (done in setup-gcp.sh)

## Creating Secrets

### 1. Database URL

```bash
# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe novaintel-db --format='value(connectionName)')

# Create secret
echo -n "postgresql://postgres:YOUR_PASSWORD@/novaintel?host=/cloudsql/${CONNECTION_NAME}" | \
    gcloud secrets create database-url --data-file=-
```

### 2. Secret Key (JWT)

```bash
# Generate and store secret key
openssl rand -hex 32 | gcloud secrets create secret-key --data-file=-
```

### 3. Gemini API Key

```bash
echo -n "your-gemini-api-key" | gcloud secrets create gemini-api-key --data-file=-
```

### 4. OpenAI API Key

```bash
echo -n "your-openai-api-key" | gcloud secrets create openai-api-key --data-file=-
```

### 5. SMTP Password

```bash
echo -n "your-smtp-app-password" | gcloud secrets create smtp-password --data-file=-
```

### 6. Redis Password (if using Cloud Memorystore)

```bash
echo -n "your-redis-password" | gcloud secrets create redis-password --data-file=-
```

### 7. Other API Keys (Optional)

```bash
# Anthropic
echo -n "your-anthropic-key" | gcloud secrets create anthropic-api-key --data-file=-

# Cohere
echo -n "your-cohere-key" | gcloud secrets create cohere-api-key --data-file=-

# SerpAPI
echo -n "your-serpapi-key" | gcloud secrets create serpapi-api-key --data-file=-
```

## Granting Access to Service Account

Grant the service account access to all secrets:

```bash
PROJECT_ID="your-project-id"
SERVICE_ACCOUNT="novaintel-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant access to all secrets
for secret in database-url secret-key gemini-api-key openai-api-key smtp-password redis-password; do
    gcloud secrets add-iam-policy-binding ${secret} \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor"
done
```

## Using Secrets in Cloud Run

### Option 1: Environment Variables (Recommended)

In Cloud Run console or via gcloud:

```bash
gcloud run services update novaintel-backend \
    --region=us-central1 \
    --update-secrets=DATABASE_URL=database-url:latest,SECRET_KEY=secret-key:latest,GEMINI_API_KEY=gemini-api-key:latest
```

### Option 2: Mount as Files

```bash
gcloud run services update novaintel-backend \
    --region=us-central1 \
    --update-secrets=/secrets/database-url=database-url:latest
```

Then read from file in your application.

## Updating Secrets

### Update Existing Secret

```bash
# Update secret value
echo -n "new-secret-value" | gcloud secrets versions add secret-name --data-file=-

# Cloud Run will automatically use the latest version
# Or specify version in Cloud Run configuration
```

### Rollback to Previous Version

```bash
# List versions
gcloud secrets versions list secret-name

# Use specific version
gcloud run services update novaintel-backend \
    --region=us-central1 \
    --update-secrets=SECRET_KEY=secret-key:2
```

## Best Practices

### 1. Use Latest Version by Default

```bash
# This automatically uses the latest version
--update-secrets=SECRET_KEY=secret-key:latest
```

### 2. Rotate Secrets Regularly

- Set up a schedule to rotate secrets
- Use versioning to rollback if needed
- Test secret updates in staging first

### 3. Monitor Secret Access

```bash
# View access logs
gcloud logging read "resource.type=secret" --limit=50
```

### 4. Use Separate Secrets for Each Environment

- `database-url-prod`
- `database-url-staging`
- `secret-key-prod`
- `secret-key-staging`

### 5. Restrict Access

Only grant access to service accounts that need it:

```bash
# Remove access
gcloud secrets remove-iam-policy-binding secret-name \
    --member="user:unwanted-user@example.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Reading Secrets in Application

### Python Example

```python
from google.cloud import secretmanager

def get_secret(project_id: str, secret_id: str) -> str:
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

# Usage
database_url = get_secret("your-project-id", "database-url")
```

### Using Environment Variables (Easier)

If you mount secrets as environment variables in Cloud Run, just read from `os.environ`:

```python
import os
database_url = os.environ.get("DATABASE_URL")
```

## Troubleshooting

### Permission Denied

```bash
# Check service account permissions
gcloud secrets get-iam-policy secret-name

# Grant access
gcloud secrets add-iam-policy-binding secret-name \
    --member="serviceAccount:novaintel-sa@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### Secret Not Found

```bash
# List all secrets
gcloud secrets list

# Verify secret exists
gcloud secrets describe secret-name
```

### Access Denied in Application

- Verify service account is set in Cloud Run
- Check IAM bindings on the secret
- Ensure Secret Manager API is enabled

## Security Checklist

- [ ] All sensitive data stored in Secret Manager
- [ ] Service account has minimal required permissions
- [ ] Secrets are versioned
- [ ] Access logs are monitored
- [ ] Secrets are rotated regularly
- [ ] No secrets in code or environment variables (except via Secret Manager)
- [ ] Separate secrets for prod/staging
- [ ] Backup strategy for secrets

## Cost

Secret Manager pricing:
- **$0.06 per secret version per month**
- **$0.03 per 10,000 operations**

For most applications, this is very affordable (typically < $1/month).

## Additional Resources

- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
- [IAM Permissions](https://cloud.google.com/secret-manager/docs/access-control)

