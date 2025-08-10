# Google Cloud Platform Setup

## Voraussetzungen
1. Google Cloud CLI installieren: https://cloud.google.com/sdk/docs/install
2. Ein Google Cloud Projekt erstellen

## CLI Befehle für Setup

### 1. Authentifizierung
```bash
# Bei Google Cloud anmelden
gcloud auth login

# Projekt setzen (ersetze YOUR_PROJECT_ID mit deiner Projekt-ID)
export PROJECT_ID="your-outfit-voting-project"
gcloud config set project $PROJECT_ID

# Billing Account aktivieren (falls nötig)
gcloud alpha billing projects link $PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID
```

### 2. APIs aktivieren
```bash
# Cloud Functions API
gcloud services enable cloudfunctions.googleapis.com

# Cloud Storage API
gcloud services enable storage.googleapis.com

# Cloud Build API (für CI/CD)
gcloud services enable cloudbuild.googleapis.com

# Cloud Run API (optional für erweiterte Features)
gcloud services enable run.googleapis.com
```

### 3. Storage Bucket erstellen
```bash
# Bucket für Bilder erstellen (global eindeutiger Name)
export BUCKET_NAME="${PROJECT_ID}-outfit-images"
gsutil mb -p $PROJECT_ID -c STANDARD -l europe-west3 gs://$BUCKET_NAME

# Öffentlichen Zugriff für Bilder konfigurieren
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# CORS für Web-Zugriff konfigurieren
echo '[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]' > cors.json
gsutil cors set cors.json gs://$BUCKET_NAME
rm cors.json
```

### 4. Service Account für Cloud Function erstellen
```bash
# Service Account erstellen
gcloud iam service-accounts create outfit-voting-service \
    --display-name="Outfit Voting Service"

# Rechte für Storage zuweisen
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:outfit-voting-service@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Key für lokale Entwicklung erstellen (optional)
gcloud iam service-accounts keys create ./service-account-key.json \
    --iam-account=outfit-voting-service@$PROJECT_ID.iam.gserviceaccount.com
```

### 5. Environment Variablen setzen
```bash
echo "PROJECT_ID=$PROJECT_ID" > .env
echo "BUCKET_NAME=$BUCKET_NAME" >> .env
echo "FUNCTION_REGION=europe-west3" >> .env
```

## Nächste Schritte
1. Cloud Function Code deployen
2. GitHub Actions für CI/CD einrichten
3. Domain für GitHub Pages konfigurieren
