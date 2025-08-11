# Outfit-Voting Website

Eine moderne Web-App für Outfit-Voting mit Google Cloud Backend.

## Features

### 🎯 Hauptfunktionen
- **Upload-System**: Einmaliger Upload pro Nutzer mit Name und Foto
- **Voting-System**: Eine Stimme pro Nutzer
- **Echtzeit-Ranking**: Live-Anzeige der aktuellen Ergebnisse
- **Cloud Storage**: Bilder werden in Google Cloud Storage gespeichert
- **CI/CD**: Automatisches Deployment via GitHub Actions
- **Nutzer-Identifikation**: Über Browser-Fingerprinting (kein Login erforderlich)

### 🎨 Design & UX
- **Material Design 3**: Moderne, konsistente Benutzeroberfläche
- **Mobile-First**: Optimiert für Smartphones und Tablets
- **Responsive**: Funktioniert auf allen Bildschirmgrößen
- **Animationen**: Flüssige Übergänge und Material Design Ripple-Effekte

### 🔧 Admin-Bereich
- **Passwort-geschützter Zugang**: Sichere Verwaltung
- **Upload-Kontrolle**: Globales An-/Ausschalten von Uploads
- **Voting-Kontrolle**: Voting aktivieren/deaktivieren
- **Content-Moderation**: Unangemessene Inhalte entfernen
- **Event-Management**: Event komplett beenden und Daten löschen
- **Echtzeit-Statistiken**: Übersicht über Uploads, Votes und Nutzer

### 🛡️ Sicherheit & Datenschutz
- **Anonyme Abstimmung**: Votes sind nicht zurückverfolgbar
- **Doppel-Upload-Schutz**: Technische Verhinderung von Mehrfach-Uploads
- **Doppel-Vote-Schutz**: Technische Verhinderung von Mehrfach-Abstimmungen
- **Datenbereinigung**: Automatische Löschung nach Event-Ende

## Technische Details

### 🏗️ Architektur
- **Frontend-Only**: Läuft komplett im Browser
- **Local Storage**: Datenspeicherung im Browser
- **Vanilla JavaScript**: Keine externen Frameworks
- **Progressive Web App**: Offline-fähig und installierbar

### 📱 Browser-Kompatibilität
- Chrome/Chromium (empfohlen)
- Firefox
- Safari
- Edge
- Mobile Browser (iOS Safari, Chrome Mobile)

### 🎯 Nutzer-Identifikation
Die App nutzt Browser-Fingerprinting zur eindeutigen Identifikation:
- Canvas-Rendering
- User Agent
- Bildschirmauflösung
- Zeitzone
- Sprache

## Installation & Setup

### 1. Dateien herunterladen
Alle Dateien in einen Webserver-Ordner kopieren.

### 2. Webserver starten
Die Website kann über jeden Webserver bereitgestellt werden:

**Lokaler Entwicklungsserver (Python):**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Node.js (mit http-server):**
```bash
npm install -g http-server
http-server
```

**Live Server (VS Code Extension):**
- Rechtsklick auf `index.html` → "Open with Live Server"

### 3. Zugriff
- **Hauptseite**: `http://localhost:8000`
- **Admin-Bereich**: `http://localhost:8000/admin.html`

### 4. Admin-Passwort
Das Standard-Passwort ist: `admin123`

## Nutzung

### 👥 Für Teilnehmer

1. **Outfit hochladen**:
   - Name eingeben
   - Foto auswählen (wird automatisch komprimiert)
   - "Outfit hochladen" klicken

2. **Abstimmen**:
   - Durch die Galerie scrollen
   - Auf "Abstimmen" beim gewünschten Outfit klicken
   - Nur eine Stimme pro Nutzer möglich

3. **Ergebnisse ansehen**:
   - Echtzeit-Ranking wird automatisch aktualisiert
   - Platzierungen mit Stimmenzahl und Prozentangabe

### 🔧 Für Administratoren

1. **Admin-Bereich aufrufen**: `/admin.html`
2. **Anmelden** mit Admin-Passwort
3. **Event verwalten**:
   - Uploads aktivieren/deaktivieren
   - Voting aktivieren/deaktivieren
   - Statistiken überwachen
   - Unangemessene Inhalte löschen
   - Event beenden (löscht alle Daten)

## Schnellstart Konfiguration

### 🚀 Minimale Produktions-Setup

1. **Google Cloud Project erstellen**
   ```bash
   gcloud projects create my-outfit-voting-project
   gcloud config set project my-outfit-voting-project
   ```

2. **GitHub Secrets konfigurieren** (Repository Settings → Secrets)
   - `GCP_PROJECT_ID`: `my-outfit-voting-project`
   - `GCP_SERVICE_ACCOUNT_KEY`: [Service Account JSON base64]
   - `GCP_BUCKET_NAME`: `my-outfit-voting-project-outfit-images`

3. **Push zu main branch** → Automatisches Deployment startet

### 🏠 Lokale Entwicklung Setup

1. **Repository klonen und Setup**
   ```bash
   git clone <repository-url>
   cd outfit-party
   ./setup-dev.sh
   ```

2. **`.env.local` anpassen**
   ```bash
   PROJECT_ID=my-actual-project-id
   BUCKET_NAME=my-actual-bucket-name
   ```

3. **Frontend starten**
   ```bash
   python -m http.server 8080
   # Öffne: http://localhost:8080
   ```

### ⚡ Wichtige Standard-Einstellungen

- **Admin-Passwort**: `admin123` (sowohl Frontend als auch Backend)
- **Upload-Limit**: 50MB (Frontend), 10MB (Backend)
- **Bild-Auflösung**: Max 1200x1200px bei 80% Qualität
- **Region**: europe-west3
- **Node.js**: Version 18+ erforderlich

## Konfiguration & Umgebungsvariablen

### 🔧 Backend-Umgebungsvariablen

Diese Variablen werden im Backend (Google Cloud Functions) verwendet:

| Variable | Beschreibung | Standard | Erforderlich |
|----------|--------------|----------|---------------|
| `BUCKET_NAME` | Google Cloud Storage Bucket-Name für Bilder | `your-outfit-voting-project-outfit-images` | Ja (Produktion) |
| `ADMIN_PASSWORD` | Backend Admin-Passwort für API-Authentifizierung | `admin123` | Nein |
| `NODE_ENV` | Umgebungsmodus | `production` | Nein |

**Beispiel Cloud Function Deployment:**
```bash
gcloud functions deploy outfit-voting \
  --set-env-vars BUCKET_NAME=my-project-outfit-images,ADMIN_PASSWORD=mysecretpassword
```

### 🚀 GitHub Actions Secrets

Für automatisches Deployment via CI/CD Pipeline:

| Secret | Beschreibung | Format | Erforderlich |
|--------|--------------|--------|---------------|
| `GCP_PROJECT_ID` | Google Cloud Project ID | `my-project-123` | Ja |
| `GCP_SERVICE_ACCOUNT_KEY` | Service Account JSON Key (base64) | `eyJ0eXBlIjoic2VydmljZV9hY2NvdW50...` | Ja |
| `GCP_BUCKET_NAME` | Cloud Storage Bucket Name | `my-project-outfit-images` | Ja |

**Setup Secrets:**
1. Repository Settings → Secrets and variables → Actions
2. Klicke "New repository secret"
3. Füge alle drei Secrets hinzu

### 🏠 Lokale Entwicklung (.env.local)

Die Datei `.env.local` wird automatisch von `./setup-dev.sh` erstellt:

```bash
# Local development environment
NODE_ENV=development
PROJECT_ID=your-project-id
BUCKET_NAME=your-bucket-name
FUNCTION_REGION=europe-west3
BACKEND_URL=http://localhost:8080
```

**Anpassung für lokale Entwicklung:**
```bash
# Ihre Projekt-Einstellungen
PROJECT_ID=my-actual-project-id
BUCKET_NAME=my-actual-bucket-name
FUNCTION_REGION=europe-west3
BACKEND_URL=https://europe-west3-my-project.cloudfunctions.net/outfit-voting
```

### 🎯 Frontend-Konfiguration

#### Admin-Einstellungen (js/storage.js)
```javascript
static getAdminSettings() {
    return {
        uploadsEnabled: true,        // Upload-Funktion aktiviert
        votingEnabled: true,         // Voting-Funktion aktiviert
        eventEnded: false,          // Event-Status
        unlimitedUploads: false,    // Unlimited Uploads für Tests
        adminPassword: 'admin123'   // Frontend Admin-Passwort
    };
}
```

#### Bild-Verarbeitung (js/storage.js)
```javascript
class ImageUtils {
    static MAX_SIZE = 50 * 1024 * 1024; // 50MB max Dateigröße
    static MAX_WIDTH = 1200;             // Max Bildbreite in Pixeln
    static MAX_HEIGHT = 1200;            // Max Bildhöhe in Pixeln
    static QUALITY = 0.8;                // JPEG Komprimierungsqualität (0.1-1.0)
}
```

#### Backend-URL Konfiguration (js/cloud-storage.js)
```javascript
// Automatische Erkennung oder globale Konfiguration
if (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) {
    this.baseURL = window.APP_CONFIG.BACKEND_URL;
} else {
    // Fallback-URLs
    this.baseURL = window.location.hostname === 'localhost'
        ? 'http://localhost:8080'
        : 'https://europe-west3-your-project.cloudfunctions.net/outfit-voting';
}
```

### ☁️ Google Cloud Konfiguration

#### Cloud Function Einstellungen
- **Runtime**: Node.js 18+ (empfohlen: Node.js 22)
- **Memory**: 256MB
- **Timeout**: 30 Sekunden
- **Region**: europe-west3
- **Trigger**: HTTP (unauthenticated)

#### Cloud Storage Einstellungen
- **Bucket-Name**: `${PROJECT_ID}-outfit-images`
- **Location**: europe-west3 (empfohlen)
- **Storage Class**: Standard
- **Public Access**: Ja (für Bildanzeige)

#### CORS-Konfiguration (automatisch)
Die Cloud Function ist für folgende Origins konfiguriert:
- `http://localhost:3000`
- `http://localhost:8080`
- `http://localhost:8000`
- `https://mxkmp.github.io`
- `https://*.github.io`
- `https://*.netlify.app`
- `https://*.vercel.app`

### 🔒 Sicherheitseinstellungen

#### Passwort-Konfiguration
```javascript
// Frontend (js/storage.js)
adminPassword: 'admin123'

// Backend (index.js)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
```

#### Datei-Upload-Limits
```javascript
// Frontend (js/storage.js)
MAX_SIZE = 50 * 1024 * 1024; // 50MB

// Backend (index.js)
limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
}
```

#### Erlaubte Dateitypen
```javascript
// Frontend
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Backend
if (file.mimetype.startsWith('image/')) {
    // Erlaubt alle Bildformate
}
```

### 🔄 Auto-Refresh Konfiguration

#### Frontend Aktualisierungsintervalle (js/app.js)
```javascript
// Galerie-Updates alle 10 Sekunden
setInterval(() => this.loadGallery(), 10000);

// Ranking-Updates alle 5 Sekunden
setInterval(() => this.loadRanking(), 5000);
```

#### Admin-Panel Updates (js/admin.js)
```javascript
// Statistiken alle 5 Sekunden
setInterval(() => this.updateStatistics(), 5000);
```

## Anpassungen

### 🎨 Design anpassen
- **Farben**: In `css/styles.css` die CSS-Variablen ändern
- **Logo**: Eigenes Logo in der Header-Komponente einbauen
- **Schriftarten**: Google Fonts Links in HTML anpassen

### ⚙️ Erweiterte Einstellungen
- **Admin-Passwort**: Frontend in `js/storage.js`, Backend via `ADMIN_PASSWORD` env var
- **Bild-Größen**: `ImageUtils` Konstanten in `js/storage.js` anpassen
- **Auto-Refresh**: Intervalle in `js/app.js` und `js/admin.js` ändern
- **Upload-Limits**: Frontend und Backend Limits separat konfigurieren
- **Bucket-Name**: Via `BUCKET_NAME` Umgebungsvariable
- **Function-Region**: In Deployment-Scripts anpassen (`europe-west3`)

### 🚀 Deployment

**Automatisches CI/CD (empfohlen):**
1. Google Cloud Project erstellen und konfigurieren
2. Service Account Key als GitHub Secret hinzufügen
3. GitHub Secrets konfigurieren:
   - `GCP_PROJECT_ID`: Ihre Google Cloud Project ID
   - `GCP_SERVICE_ACCOUNT_KEY`: Service Account JSON (base64 encoded)
   - `GCP_BUCKET_NAME`: Cloud Storage Bucket Name
4. Push zu `main` Branch löst automatisches Deployment aus
   - Backend wird zu Google Cloud Functions deployed
   - Frontend wird zu GitHub Pages deployed
   - Konfiguration wird automatisch erstellt

**GitHub Pages:**
1. Repository erstellen
2. Dateien hochladen
3. GitHub Pages in Repository-Settings aktivieren

**Netlify:**
1. Ordner zu Netlify ziehen
2. Automatisches Deployment

**Vercel:**
```bash
npm i -g vercel
vercel
```

## Dateistruktur

```
outfit-voting/
├── index.html          # Hauptseite
├── admin.html          # Admin-Panel
├── css/
│   ├── styles.css      # Haupt-Styles
│   └── admin.css       # Admin-spezifische Styles
├── js/
│   ├── app.js          # Haupt-App-Logik
│   ├── admin.js        # Admin-Panel-Logik
│   ├── storage.js      # Datenmanagement
│   └── utils.js        # Hilfsfunktionen
└── README.md           # Diese Datei
```

## Erweiterte Features (Roadmap)

### 🔮 Geplante Erweiterungen
- **Cloud Storage**: Integration mit Google Cloud Storage
- **Push-Benachrichtigungen**: Neue Uploads und Voting-Updates
- **Social Sharing**: Teilen der Ergebnisse
- **Export-Funktionen**: PDF-Reports, CSV-Export
- **Kategorien**: Verschiedene Outfit-Kategorien
- **Kommentare**: Kommentare zu Outfits

### 🛠️ Cloud-Migration
Die App ist bereits für Cloud-Storage vorbereitet:
1. `LocalStorage` Klasse durch Cloud-Storage-API ersetzen
2. Bild-Upload zu Cloud-Storage umleiten
3. Echtzeit-Updates via WebSockets implementieren

## Fehlerbehebung

### ❗ Häufige Probleme

**"Datei zu groß" Fehler:**
- Bildgröße reduzieren (max. 5MB)
- Komprimierung in `ImageUtils` anpassen

**Upload funktioniert nicht:**
- Browser-Kompatibilität prüfen
- JavaScript-Konsole auf Fehler überprüfen
- Local Storage verfügbar?

**Admin-Login funktioniert nicht:**
- Passwort überprüfen (`admin123`)
- Browser-Cache leeren
- JavaScript aktiviert?

**Daten verschwunden:**
- Local Storage wurde geleert
- Anderer Browser/Incognito-Modus
- Event wurde vom Admin beendet

**CI/CD Deployment Probleme:**
- GitHub Secrets korrekt konfiguriert? (GCP_PROJECT_ID, GCP_SERVICE_ACCOUNT_KEY, GCP_BUCKET_NAME)
- Service Account hat ausreichende Berechtigungen?
- Cloud Functions API aktiviert?
- Cloud Storage Bucket existiert?
- GitHub Pages aktiviert in Repository Settings?

**Konfigurationsfehler:**
- `.env.local` Datei erstellt und angepasst?
- Backend-URL korrekt in Frontend konfiguriert?
- CORS-Einstellungen erlauben Ihre Domain?
- Umgebungsvariablen im Cloud Function gesetzt?
- Bucket-Berechtigungen für öffentlichen Zugriff?

**Admin-Zugang Probleme:**
- Richtiges Passwort verwendet? (Standard: `admin123`)
- Frontend und Backend Passwort stimmen überein?
- Admin-Passwort via `ADMIN_PASSWORD` env var gesetzt?

**Upload/Storage Probleme:**
- Dateigröße unter Limits? (Frontend: 50MB, Backend: 10MB)
- Erlaubtes Dateiformat? (JPG, PNG, WebP)
- Cloud Storage Bucket erreichbar?
- Service Account Berechtigungen für Storage?

**Backend Verbindungsfehler:**
- Cloud Function deployed und erreichbar?
- Backend-URL korrekt konfiguriert?
- CORS-Fehler in Browser-Konsole?
- Function Region korrekt? (Standard: europe-west3)

### 🔍 Debug-Modus
Browser-Entwicklertools öffnen (F12) für detaillierte Logs.

## Support

Bei Fragen oder Problemen:
1. README.md vollständig lesen
2. Browser-Konsole auf Fehler prüfen
3. GitHub Issues erstellen (falls Repository verfügbar)

## Lizenz

MIT License - Freie Nutzung für private und kommerzielle Projekte.

---

**Viel Spaß beim Outfit-Voting! 🎉👗👔**
