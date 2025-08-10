# GitHub Repository Setup für Outfit Voting App

## 1. Repository Secrets konfigurieren

Gehe zu: **Settings** → **Secrets and variables** → **Actions**

Füge folgende Repository Secrets hinzu:

### `GCP_PROJECT_ID`
- **Wert**: Deine Google Cloud Projekt-ID
- **Beispiel**: `my-outfit-voting-project`

### `GCP_SERVICE_ACCOUNT_KEY`
- **Wert**: Der komplette JSON-Inhalt des Service Account Keys
- **Generierung**:
  ```bash
  gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=outfit-voting-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
  
  # Dann den Inhalt der Datei kopieren
  cat service-account-key.json
  ```

### `GCP_BUCKET_NAME`
- **Wert**: Name deines Cloud Storage Buckets
- **Beispiel**: `my-outfit-voting-project-outfit-images`

## 2. GitHub Pages aktivieren

1. Gehe zu **Settings** → **Pages**
2. **Source**: GitHub Actions auswählen
3. **Custom domain** (optional): Deine eigene Domain eingeben

## 3. Branch Protection (empfohlen)

1. Gehe zu **Settings** → **Branches**
2. Klicke auf **Add rule**
3. **Branch name pattern**: `main`
4. Aktiviere:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

## 4. Repository Topics (für bessere Auffindbarkeit)

Gehe zu **Code** Tab → **About** → ⚙️ **Edit**

Füge Topics hinzu:
- `outfit-voting`
- `google-cloud`
- `github-pages`
- `javascript`
- `material-design`
- `progressive-web-app`

## 5. Deployment Workflow

Nach dem Setup ist der Workflow wie folgt:

### Automatisches Deployment
1. **Push zu `main` Branch** → Automatisches Deployment
2. **Pull Request** → Test-Build (ohne Deployment)

### Manuelles Deployment
1. Gehe zu **Actions** Tab
2. Wähle **Deploy to GitHub Pages** Workflow
3. Klicke **Run workflow**

## 6. Monitoring

### GitHub Actions Status
- **Actions** Tab zeigt alle Workflow-Runs
- **Environment** Tab zeigt Deployment-History

### URLs nach Deployment
- **Frontend**: `https://[username].github.io/[repository-name]`
- **Backend**: `https://europe-west3-[project-id].cloudfunctions.net/outfit-voting`

## 7. Troubleshooting

### Häufige Probleme

**❌ "Secret not found"**
- Überprüfe, dass alle Secrets korrekt gesetzt sind
- Secrets sind case-sensitive

**❌ "Invalid service account key"**
- Stelle sicher, dass der gesamte JSON-Inhalt kopiert wurde
- Keine Leerzeichen am Anfang/Ende

**❌ "Permission denied in Cloud Function"**
- Überprüfe Service Account Berechtigung
- Stelle sicher, dass APIs aktiviert sind

**❌ "GitHub Pages deployment failed"**
- Überprüfe, dass Pages in Repository Settings aktiviert ist
- Warte einige Minuten - GitHub Pages kann verzögert sein

### Debug-Schritte

1. **Actions Logs prüfen**:
   - Gehe zu Actions Tab → fehlgeschlagenen Run anklicken
   - Erweitere die einzelnen Steps für Details

2. **Cloud Function Logs prüfen**:
   ```bash
   gcloud functions logs read outfit-voting --region=europe-west3
   ```

3. **Lokale Tests**:
   ```bash
   # Backend testen
   cd backend && npm test
   
   # Frontend testen
   python -m http.server 8080
   ```

## 8. Weitere Konfiguration

### Custom Domain für GitHub Pages
1. Kaufe eine Domain bei einem Anbieter
2. Konfiguriere DNS-Einträge:
   ```
   Type: CNAME
   Name: www (oder subdomain)
   Value: [username].github.io
   ```
3. Füge Domain in Repository Settings → Pages hinzu

### Monitoring & Analytics
- **Google Analytics**: Tracking Code in HTML einfügen
- **Google Search Console**: Für SEO-Monitoring
- **Uptime Monitoring**: Services wie UptimeRobot für Verfügbarkeit

## 9. Sicherheit

### Repository Security
- ✅ Dependabot Alerts aktivieren
- ✅ Code Scanning aktivieren
- ✅ Secret Scanning aktivieren

### Cloud Security
- 🔒 Service Account mit minimalen Rechten
- 🔒 CORS richtig konfiguriert
- 🔒 Regelmäßige Security Updates

## 10. Backup & Recovery

### Automatische Backups
- GitHub speichert automatisch alle Code-Versionen
- Cloud Storage hat automatische Redundanz

### Manuelles Backup
```bash
# Repository klonen
git clone https://github.com/[username]/[repository].git

# Cloud Storage Backup
gsutil -m cp -r gs://[bucket-name] ./backup/
```
