# CLI Befehle aus setup-gcp.md ausführen
export PROJECT_ID="personal-468620"
export BUCKET_NAME="${PROJECT_ID}-outfit-images"

# Bucket erstellen
gcloud storage buckets create gs://$BUCKET_NAME --project=$PROJECT_ID --location=europe-west3 --uniform-bucket-level-access
gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME --member=allUsers --role=roles/storage.objectViewer
#gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME