# Outfit-Voting Website

Eine moderne, mobile-first Website für Outfit-Voting Events mit Material Design 3.

## Features

### 🎯 Hauptfunktionen
- **Upload-System**: Einmaliger Upload pro Nutzer mit Name und Foto
- **Voting-System**: Eine Stimme pro Nutzer
- **Echtzeit-Ranking**: Live-Anzeige der aktuellen Ergebnisse
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

## Anpassungen

### 🎨 Design anpassen
- **Farben**: In `css/styles.css` die CSS-Variablen ändern
- **Logo**: Eigenes Logo in der Header-Komponente einbauen
- **Schriftarten**: Google Fonts Links in HTML anpassen

### ⚙️ Einstellungen
- **Admin-Passwort**: In `js/storage.js` unter `getAdminSettings()` ändern
- **Bild-Größen**: In `js/storage.js` unter `ImageUtils` anpassen
- **Auto-Refresh**: Intervalle in `js/app.js` und `js/admin.js` ändern

### 🚀 Deployment

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
