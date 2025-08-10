// Main application logic
class OutfitVotingApp {
    constructor() {
        this.userIdentifier = null;
        this.hasVoted = false;
        this.hasUploaded = false;
        this.refreshInterval = null;
        
        this.init();
    }

    async init() {
        Utils.performanceMonitor.start('appInit');
        
        try {
            // Initialize user identifier
            this.userIdentifier = await LocalStorage.getUserIdentifier();
            
            // Check user state
            await this.checkUserState();
            
            // Initialize UI
            this.initializeElements();
            this.setupEventListeners();
            
            // Load data
            await this.loadData();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            // Add ripple effects
            Utils.addRippleStyles();
            
            Utils.performanceMonitor.end('appInit');
            console.log('App initialized successfully');
            
        } catch (error) {
            console.error('Error initializing app:', error);
            Utils.showMessage('uploadMessage', 'Fehler beim Laden der Anwendung', 'error');
        }
    }

    async checkUserState() {
        try {
            this.hasVoted = await LocalStorage.hasUserVoted();
            this.hasUploaded = await LocalStorage.hasUserUploaded();
            
            // Check admin settings
            if (LocalStorage.isEventEnded()) {
                this.showEventEndedMessage();
                return;
            }
            
            if (!LocalStorage.isUploadsEnabled() && !this.hasUploaded) {
                this.disableUploads();
            }
            
            if (this.hasUploaded) {
                this.showUploadDisabledMessage();
            }
            
            if (!LocalStorage.isVotingEnabled()) {
                this.disableVoting();
            }
            
        } catch (error) {
            console.error('Error checking user state:', error);
        }
    }

    initializeElements() {
        this.elements = {
            // Upload elements
            userName: document.getElementById('userName'),
            imageFile: document.getElementById('imageFile'),
            selectFileBtn: document.getElementById('selectFileBtn'),
            uploadBtn: document.getElementById('uploadBtn'),
            uploadForm: document.getElementById('uploadForm'),
            uploadMessage: document.getElementById('uploadMessage'),
            uploadDisabledMessage: document.getElementById('uploadDisabledMessage'),
            filePreview: document.getElementById('filePreview'),
            uploadPage: document.getElementById('uploadPage'),
            
            // Gallery elements
            gallery: document.getElementById('gallery'),
            noOutfits: document.getElementById('noOutfits'),
            galleryPage: document.getElementById('galleryPage'),
            
            // Results elements
            results: document.getElementById('results'),
            noResults: document.getElementById('noResults'),
            resultsPage: document.getElementById('resultsPage'),
            
            // Navigation elements
            bottomNav: document.querySelector('.bottom-nav'),
            navItems: document.querySelectorAll('.nav-item'),
            pages: document.querySelectorAll('.page'),
            
            // UI elements
            refreshBtn: document.getElementById('refreshBtn'),
            refreshGalleryBtn: document.getElementById('refreshGalleryBtn'),
            refreshResultsBtn: document.getElementById('refreshResultsBtn'),
            votingEndedMessage: document.getElementById('votingEndedMessage'),
            loadingOverlay: document.getElementById('loadingOverlay')
        };
    }

    setupEventListeners() {
        // Navigation
        this.setupNavigation();
        
        // File selection
        this.elements.selectFileBtn.addEventListener('click', () => {
            this.elements.imageFile.click();
        });

        // File change
        this.elements.imageFile.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files[0]);
        });

        // Name input validation with debouncing
        this.elements.userName.addEventListener('input', Utils.debounce(() => {
            this.validateUploadForm();
        }, 500));

        // Upload button
        this.elements.uploadBtn.addEventListener('click', () => {
            this.handleUpload();
        });

        // Refresh buttons
        this.elements.refreshBtn?.addEventListener('click', () => {
            this.refreshData();
        });
        
        this.elements.refreshGalleryBtn?.addEventListener('click', () => {
            this.refreshData();
        });
        
        this.elements.refreshResultsBtn?.addEventListener('click', () => {
            this.refreshData();
        });

        // Add ripple effects to buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('button')) {
                Utils.createRipple(e, e.target);
            }
        });

        // Handle visibility change for auto-refresh
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoRefresh();
            } else {
                this.startAutoRefresh();
                this.refreshData();
            }
        });
    }

    setupNavigation() {
        this.elements.navItems.forEach(navItem => {
            navItem.addEventListener('click', (e) => {
                const targetPage = e.currentTarget.getAttribute('data-page');
                this.navigateToPage(targetPage);
            });
        });
    }

    navigateToPage(pageId) {
        // Update nav items
        this.elements.navItems.forEach(nav => nav.classList.remove('active'));
        const activeNav = document.querySelector(`[data-page="${pageId}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        // Update pages
        this.elements.pages.forEach(page => {
            page.classList.remove('active', 'prev');
            if (page.id !== pageId) {
                page.classList.add('prev');
            }
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            setTimeout(() => {
                targetPage.classList.add('active');
                targetPage.classList.remove('prev');
            }, 50);
        }

        // Load data for the specific page
        this.loadPageData(pageId);
    }

    async loadPageData(pageId) {
        switch (pageId) {
            case 'galleryPage':
                await this.loadGallery();
                break;
            case 'resultsPage':
                await this.loadResults();
                break;
            default:
                break;
        }
    }

    async loadData() {
        Utils.showLoading();
        
        try {
            // Load initial data for all pages
            await this.loadGallery();
            await this.loadResults();
            
        } catch (error) {
            console.error('Error loading data:', error);
            Utils.showMessage('uploadMessage', 'Fehler beim Laden der Daten', 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    async loadGallery() {
        const outfits = LocalStorage.getOutfits();
        const gallery = this.elements.gallery;
        const noOutfits = this.elements.noOutfits;

        if (outfits.length === 0) {
            gallery.style.display = 'none';
            noOutfits.style.display = 'flex';
            return;
        }

        gallery.style.display = 'flex';
        noOutfits.style.display = 'none';
        gallery.innerHTML = '';

        // Sort by timestamp (newest first)
        const sortedOutfits = outfits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        for (const outfit of sortedOutfits) {
            const card = await this.createOutfitCard(outfit);
            gallery.appendChild(card);
        }
    }

    async createOutfitCard(outfit) {
        const userVote = await LocalStorage.getUserVote();
        const hasUserVoted = !!userVote;
        const hasVotedForThis = userVote && userVote.outfitId === outfit.id;
        const votingEnabled = LocalStorage.isVotingEnabled();

        const card = document.createElement('div');
        card.className = 'outfit-card fade-in';
        
        const voteCount = LocalStorage.getVoteCountForOutfit(outfit.id);
        
        card.innerHTML = `
            <img src="${outfit.imageData}" alt="Outfit von ${Utils.sanitizeHTML(outfit.name)}" class="outfit-card__image">
            <div class="outfit-card__content">
                <h3 class="outfit-card__name">${Utils.sanitizeHTML(outfit.name)}</h3>
                <div class="outfit-card__votes">
                    <div class="outfit-card__vote-count">
                        <span class="material-icons">favorite</span>
                        <span>${voteCount} ${voteCount === 1 ? 'Stimme' : 'Stimmen'}</span>
                    </div>
                    <small class="outfit-card__timestamp">${Utils.timeAgo(outfit.timestamp)}</small>
                </div>
                <div class="outfit-card__actions">
                    <button class="button vote-button ${hasVotedForThis ? 'voted' : ''}" 
                            data-outfit-id="${outfit.id}"
                            ${!votingEnabled || hasUserVoted ? 'disabled' : ''}>
                        <span class="material-icons">${hasVotedForThis ? 'favorite' : 'favorite_border'}</span>
                        ${hasVotedForThis ? 'Gewählt' : (hasUserVoted ? 'Bereits gewählt' : 'Abstimmen')}
                    </button>
                </div>
            </div>
        `;

        // Add vote event listener
        const voteBtn = card.querySelector('.vote-button');
        if (voteBtn && !voteBtn.disabled) {
            voteBtn.addEventListener('click', () => {
                this.handleVote(outfit.id);
            });
        }

        return card;
    }

    async loadResults() {
        const rankedResults = LocalStorage.getRankedResults();
        const resultsContainer = this.elements.results;
        const noResults = this.elements.noResults;
        
        if (rankedResults.length === 0) {
            if (resultsContainer) resultsContainer.style.display = 'none';
            if (noResults) noResults.style.display = 'flex';
            return;
        }

        if (resultsContainer) resultsContainer.style.display = 'flex';
        if (noResults) noResults.style.display = 'none';
        if (resultsContainer) resultsContainer.innerHTML = '';

        const totalVotes = LocalStorage.getTotalVotes();

        rankedResults.forEach((outfit, index) => {
            const percentage = totalVotes > 0 ? (outfit.votes / totalVotes * 100) : 0;
            const rank = index + 1;
            
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item fade-in';
            
            let rankClass = '';
            if (rank === 1) rankClass = 'first';
            else if (rank === 2) rankClass = 'second';
            else if (rank === 3) rankClass = 'third';

            resultItem.innerHTML = `
                <div class="result-item__rank ${rankClass}">
                    ${rank}
                </div>
                <div class="result-item__content">
                    <div class="result-item__name">${Utils.sanitizeHTML(outfit.name)}</div>
                    <div class="result-item__votes">
                        ${outfit.votes} ${outfit.votes === 1 ? 'Stimme' : 'Stimmen'} 
                        (${percentage.toFixed(1)}%)
                    </div>
                </div>
                <div class="result-item__bar">
                    <div class="result-item__bar-fill" style="width: ${percentage}%"></div>
                </div>
            `;

            if (resultsContainer) resultsContainer.appendChild(resultItem);
        });
    }

    handleFileSelection(file) {
        if (!file) {
            this.clearFilePreview();
            return;
        }

        // Validate file
        const errors = ImageUtils.validateFile(file);
        if (errors.length > 0) {
            Utils.showMessage('uploadMessage', errors.join(', '), 'error');
            this.clearFilePreview();
            return;
        }

        // Show preview
        this.showFilePreview(file);
        this.validateUploadForm();
    }

    async showFilePreview(file) {
        try {
            const dataURL = await ImageUtils.fileToDataURL(file);
            this.elements.filePreview.innerHTML = `
                <img src="${dataURL}" alt="Vorschau">
                <p>${file.name} (${Utils.formatFileSize(file.size)})</p>
            `;
            this.elements.filePreview.classList.add('show');
        } catch (error) {
            console.error('Error showing preview:', error);
            Utils.showMessage('uploadMessage', 'Fehler beim Anzeigen der Vorschau', 'error');
        }
    }

    clearFilePreview() {
        this.elements.filePreview.classList.remove('show');
        this.elements.filePreview.innerHTML = '';
        this.elements.imageFile.value = '';
        this.validateUploadForm();
    }

    validateUploadForm() {
        const name = this.elements.userName.value.trim();
        const file = this.elements.imageFile.files[0];
        
        const nameErrors = Utils.validateName(name);
        const fileErrors = ImageUtils.validateFile(file);
        
        // Check if name is already taken
        if (name && nameErrors.length === 0 && Utils.isNameTaken(name)) {
            nameErrors.push('Dieser Name ist bereits vergeben');
        }
        
        const isValid = nameErrors.length === 0 && fileErrors.length === 0;
        this.elements.uploadBtn.disabled = !isValid;
        
        // Show validation errors
        if (nameErrors.length > 0 || fileErrors.length > 0) {
            const allErrors = [...nameErrors, ...fileErrors];
            Utils.showMessage('uploadMessage', allErrors.join(', '), 'error', 3000);
        } else {
            Utils.hideMessage('uploadMessage');
        }
        
        return isValid;
    }

    async handleUpload() {
        if (this.hasUploaded) {
            Utils.showMessage('uploadMessage', 'Du kannst nur ein Outfit pro Person hochladen!', 'warning');
            return;
        }

        if (!LocalStorage.isUploadsEnabled()) {
            Utils.showMessage('uploadMessage', 'Uploads sind derzeit deaktiviert', 'warning');
            return;
        }

        if (!this.validateUploadForm()) {
            Utils.showMessage('uploadMessage', 'Bitte fülle alle Felder korrekt aus', 'error');
            return;
        }

        Utils.showLoading();
        
        try {
            const name = this.elements.userName.value.trim();
            const file = this.elements.imageFile.files[0];
            
            // Resize and compress image
            const resizedBlob = await ImageUtils.resizeImage(file);
            const imageData = await ImageUtils.fileToDataURL(resizedBlob);
            
            // Create outfit object
            const outfit = {
                name: name,
                imageData: imageData,
                userIdentifier: this.userIdentifier
            };
            
            // Save outfit
            const savedOutfit = LocalStorage.saveOutfit(outfit);
            
            // Mark user as uploaded
            await LocalStorage.markUserAsUploaded();
            this.hasUploaded = true;
            
            // Reset form and show disabled message
            this.resetUploadForm();
            this.showUploadDisabledMessage();
            
            // Switch to gallery page
            this.navigateToPage('galleryPage');
            
            // Refresh data
            await this.loadData();
            
            Utils.showMessage('uploadMessage', 'Outfit erfolgreich hochgeladen!', 'success');
            
        } catch (error) {
            console.error('Error uploading outfit:', error);
            Utils.showMessage('uploadMessage', 'Fehler beim Hochladen: ' + error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    resetUploadForm() {
        this.elements.userName.value = '';
        this.elements.imageFile.value = '';
        this.clearFilePreview();
        this.elements.uploadBtn.disabled = true;
    }

    async handleVote(outfitId) {
        if (this.hasVoted) {
            Utils.showMessage('uploadMessage', 'Du hast bereits abgestimmt!', 'warning');
            return;
        }

        if (!LocalStorage.isVotingEnabled()) {
            Utils.showMessage('uploadMessage', 'Das Voting ist derzeit deaktiviert', 'warning');
            return;
        }

        Utils.showLoading();
        
        try {
            await LocalStorage.addVote(outfitId);
            this.hasVoted = true;
            
            // Refresh data to show updated vote counts
            await this.loadData();
            
            Utils.showMessage('uploadMessage', 'Deine Stimme wurde gezählt!', 'success');
            
        } catch (error) {
            console.error('Error voting:', error);
            Utils.showMessage('uploadMessage', error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    async refreshData() {
        console.log('Refreshing data...');
        
        try {
            // Check for admin setting changes
            await this.checkUserState();
            
            // Reload data
            await this.loadData();
            
            // Show brief confirmation
            const refreshBtn = this.elements.refreshBtn;
            const originalIcon = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<span class="material-icons">check</span>';
            
            setTimeout(() => {
                refreshBtn.innerHTML = originalIcon;
            }, 1000);
            
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing interval
        
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (!document.hidden) {
                this.refreshData();
            }
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    showUploadDisabledMessage() {
        if (this.elements.uploadForm) {
            this.elements.uploadForm.style.display = 'none';
        }
        if (this.elements.uploadDisabledMessage) {
            this.elements.uploadDisabledMessage.style.display = 'block';
        }
    }

    disableUploads() {
        this.elements.uploadPage.style.display = 'none';
        Utils.showMessage('uploadMessage', 'Pro Person ist nur ein Outfit-Upload erlaubt', 'warning', 0);
    }

    disableVoting() {
        // This will be handled in loadGallery() by checking LocalStorage.isVotingEnabled()
        Utils.showMessage('uploadMessage', 'Das Voting ist beendet', 'warning', 0);
    }

    showEventEndedMessage() {
        this.elements.votingEndedMessage.style.display = 'flex';
        this.elements.uploadPage.style.display = 'none';
        this.stopAutoRefresh();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Outfit Voting App...');
    window.outfitApp = new OutfitVotingApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.outfitApp) {
        window.outfitApp.stopAutoRefresh();
    }
});
