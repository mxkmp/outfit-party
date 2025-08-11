# Outfit Voting Web Application

Outfit Voting is a modern web application for outfit voting events with Google Cloud backend integration. It features a pure HTML/CSS/JavaScript frontend with a Node.js Google Cloud Functions backend for image storage and voting.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap, Build, and Test Repository
- **Setup development environment**: `./setup-dev.sh` -- takes 1-2 seconds on clean setup, 24 seconds for first npm install. NEVER CANCEL.
- **Validate deployment readiness**: `./verify-deployment.sh` -- takes 5 seconds. NEVER CANCEL.
- **Backend dependency install**: `cd backend && npm install` -- takes 20-30 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
- **Backend syntax check**: `cd backend && node -c index.js` -- takes <1 second.
- **Frontend validation**: Runs automatically via deployment verification script.

### Local Development
- **Start frontend locally**: `python3 -m http.server 8080` (from repository root) -- starts immediately.
  - Alternative if Node.js http-server is available: `npx http-server -p 8080`
  - Alternative with PHP: `php -S localhost:8080`
- **Access application**: http://localhost:8080 (main app), http://localhost:8080/admin.html (admin panel)
- **Backend local testing**: `cd backend && npm start` (starts and exits immediately - normal for Cloud Functions)
- **ALWAYS test both main app and admin functionality after changes**

### Deployment and CI/CD
- **Deploy to production**: Push to `main` branch triggers GitHub Actions automatic deployment
- **GitHub Actions workflow**: `.github/workflows/deploy.yml` -- takes 3-5 minutes total. NEVER CANCEL. Set timeout to 10+ minutes.
  - Backend deployment: ~2-3 minutes to Google Cloud Functions
  - Frontend deployment: ~1-2 minutes to GitHub Pages
- **Manual deployment verification**: `./verify-deployment.sh` validates all deployment prerequisites

## Validation Scenarios

### Required Manual Testing
ALWAYS manually test these complete user scenarios after making changes:

#### User Upload and Voting Flow
1. **Upload Test**: 
   - Open http://localhost:8080
   - Enter a name in "Dein Name" field
   - Click "Foto auswählen" and select an image file
   - Click "Outfit hochladen" button (should become enabled after name + image)
   - Verify upload success message appears

2. **Navigation Test**:
   - Click "Galerie" tab in bottom navigation
   - Verify uploaded outfit appears in gallery
   - Click "Ranking" tab
   - Verify ranking section displays

3. **Admin Access Test**:
   - Navigate to http://localhost:8080/admin.html
   - Enter password: `admin123`
   - Click "Anmelden"
   - Verify admin dashboard loads with statistics and controls

#### Production Deployment Validation
After deployment to production:
1. **Frontend URL**: https://[username].github.io/[repository-name]
2. **Backend URL**: https://europe-west3-[project-id].cloudfunctions.net/outfit-voting
3. **Test basic functionality**: Upload, voting, admin access

## Build Time Expectations
- **Initial setup**: 24 seconds for npm install (first time)
- **Subsequent setups**: 1-2 seconds
- **Deployment verification**: 5 seconds
- **GitHub Actions deployment**: 3-5 minutes total
  - Backend deployment phase: 2-3 minutes  
  - Frontend deployment phase: 1-2 minutes
- **NEVER CANCEL any build or deployment process**: Set timeouts to 10+ minutes for deployments

## Key Projects in Codebase

### Frontend (Static Web App)
**Location**: Repository root
- `index.html` - Main application page with Material Design UI
- `admin.html` - Password-protected admin panel 
- `js/` - JavaScript modules:
  - `app.js` - Main application logic and UI management
  - `admin.js` - Admin panel functionality
  - `storage.js` - Local storage and data management
  - `cloud-storage.js` - Cloud backend integration
  - `utils.js` - Utility functions and Material Design helpers
- `css/` - Stylesheets:
  - `styles.css` - Main application Material Design styles
  - `admin.css` - Admin panel specific styles

### Backend (Google Cloud Functions)
**Location**: `backend/`
- `index.js` - Node.js Express server for Cloud Functions
- `package.json` - Dependencies: @google-cloud/functions-framework, @google-cloud/storage, cors, multer, express
- **Runtime**: Node.js 18+ required
- **Memory**: 256MB allocated
- **Timeout**: 30 seconds

### Deployment Infrastructure
- `.github/workflows/deploy.yml` - CI/CD pipeline for automatic deployment
- `setup-dev.sh` - Local development environment setup
- `setup-service-account.sh` - Google Cloud service account creation (interactive)
- `deploy-backend.sh` - Manual backend deployment script
- `verify-deployment.sh` - Deployment readiness validation
- `setup-gcp.md` - Google Cloud Platform setup instructions
- `github-setup.md` - GitHub repository configuration guide

## Common Tasks

### Development Workflow
1. **Start development**: `./setup-dev.sh` then `python3 -m http.server 8080`
2. **Test changes**: Always run `./verify-deployment.sh` before committing
3. **Deploy**: Push to `main` branch for automatic deployment

### Troubleshooting
- **Application fails to load**: Check browser console, ensure Material Design CDN accessible
- **Backend errors**: Application gracefully falls back to local storage
- **Admin login**: Default password is `admin123` (configurable in `js/storage.js`)
- **Deployment failures**: Check GitHub Actions logs, verify all secrets are configured
- **Configuration issues**: 
  - Verify `.env.local` exists and contains correct values
  - Check GitHub repository secrets are set (GCP_PROJECT_ID, GCP_SERVICE_ACCOUNT_KEY, GCP_BUCKET_NAME)
  - Ensure backend URL matches deployed Cloud Function URL
  - Verify Cloud Storage bucket exists and has public read permissions
  - Check CORS configuration allows your domain
  - Validate admin passwords match between frontend and backend

### Admin Configuration
- **Default admin password**: `admin123` (changeable in `js/storage.js`)
- **Admin features**: Toggle uploads/voting, view statistics, moderate content, end events
- **Access**: http://localhost:8080/admin.html (local) or production URL + /admin.html

### Environment Configuration
- **Local config**: `.env.local` (created by setup script)
- **Production secrets**: GitHub repository secrets (GCP_PROJECT_ID, GCP_SERVICE_ACCOUNT_KEY, GCP_BUCKET_NAME)
- **Backend fallback**: Application works offline with local storage when backend unavailable

### Configuration Management
Always update configuration documentation when adding new environment variables or settings:

#### Environment Variables
- **Backend Environment Variables**: `BUCKET_NAME`, `ADMIN_PASSWORD`, `NODE_ENV`
- **GitHub Secrets**: `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_KEY`, `GCP_BUCKET_NAME`
- **Local Development**: `.env.local` with PROJECT_ID, BUCKET_NAME, FUNCTION_REGION, BACKEND_URL
- **Testing Variables**: `USE_REAL_GCS` for cloud testing

#### Configuration Files and Settings
- **Admin Settings** (js/storage.js): uploadsEnabled, votingEnabled, eventEnded, unlimitedUploads, adminPassword
- **Image Processing** (js/storage.js): MAX_SIZE (50MB), MAX_WIDTH (1200px), MAX_HEIGHT (1200px), QUALITY (0.8)
- **Backend Limits** (backend/index.js): fileSize limit (10MB), timeout (30s), memory (256MB)
- **Cloud Function Config**: Runtime (Node.js 18+), Region (europe-west3), HTTP trigger
- **CORS Origins**: localhost ports, GitHub Pages, Netlify, Vercel domains
- **Auto-refresh Intervals**: Gallery (10s), Ranking (5s), Admin stats (5s)

#### Configuration Best Practices
- Document all new environment variables in README immediately
- Use consistent naming conventions (UPPERCASE for env vars, camelCase for JS settings)
- Provide sensible defaults for all optional configurations
- Include configuration troubleshooting in error scenarios
- Update copilot instructions when adding new configuration options

## Architecture Notes
- **Frontend-only**: Can run completely in browser with local storage fallback
- **Progressive Web App**: Offline capable and installable
- **Material Design 3**: Modern UI components and animations
- **Browser fingerprinting**: Anonymous user identification for voting/upload limits
- **Cloud storage**: Google Cloud Storage for image hosting
- **Serverless backend**: Google Cloud Functions for API endpoints

## Critical Reminders
- **NEVER CANCEL builds or deployments** - they may take 5+ minutes
- **ALWAYS test both frontend and admin functionality** after changes
- **ALWAYS run verification script** before committing: `./verify-deployment.sh`
- **Set proper timeouts**: 60+ seconds for builds, 10+ minutes for deployments
- **Test complete user scenarios**, not just application startup