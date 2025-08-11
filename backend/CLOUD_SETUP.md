# Cloud Testing Configuration

This file provides examples for setting up cloud testing.

## Environment Variables

```bash
# Required: Google Cloud Storage bucket name
export BUCKET_NAME="your-outfit-voting-bucket"

# Required: Google Cloud credentials (choose one method)

# Method 1: Service Account Key File
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Method 2: Application Default Credentials (after running gcloud auth)
# gcloud auth application-default login

# Method 3: In Google Cloud environments (automatic)
# No setup needed when running on GCP
```

## Setup Steps

1. **Create Google Cloud Storage Bucket**:
   ```bash
   gsutil mb gs://your-outfit-voting-bucket
   gsutil iam ch allUsers:objectViewer gs://your-outfit-voting-bucket
   ```

2. **Create Service Account** (if using Method 1):
   ```bash
   gcloud iam service-accounts create outfit-voting-test \
     --display-name="Outfit Voting Test Account"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:outfit-voting-test@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.objectAdmin"
   
   gcloud iam service-accounts keys create ./service-account-key.json \
     --iam-account=outfit-voting-test@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

3. **Test Configuration**:
   ```bash
   # Test bucket access
   echo "test" | gsutil cp - gs://your-bucket-name/test.txt
   gsutil rm gs://your-bucket-name/test.txt
   
   # Run cloud tests
   npm run test:cloud
   ```

## Example .env File

Create a `.env` file in the backend directory:

```bash
BUCKET_NAME=your-outfit-voting-bucket
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

Load it before running tests:
```bash
source .env && npm run test:cloud
```

## Troubleshooting

- **Authentication Error**: Verify credentials are set correctly
- **Bucket Access Error**: Check bucket exists and permissions are correct
- **Network Error**: Ensure internet connectivity and firewall rules
- **Timeout Error**: Cloud tests may take longer; increase Jest timeout if needed