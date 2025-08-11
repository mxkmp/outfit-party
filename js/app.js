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
            
            // Determine and navigate to appropriate starting page
            this.navigateToAppropriateStartPage();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            // Add ripple effects
            Utils.addRippleStyles();
            
            Utils.performanceMonitor.end('appInit');
            console.log('App initialized successfully');
            
        } catch (error) {
            console.error('Error initializing app:', error);
            Utils.showErrorToast(
                'Fehler beim Laden der Anwendung',
                error.details || 'Die Anwendung konnte nicht vollständig geladen werden. Bitte laden Sie die Seite neu.'
            );
        }
    }

    async checkUserState() {
        try {
            this.hasVoted = await LocalStorage.hasUserVoted();
            this.hasUploaded = await LocalStorage.hasUserUploaded();
            
            // Get user's vote to know which outfit they voted for
            if (this.hasVoted) {
                const userVote = await LocalStorage.getUserVote();
                this.userVotedFor = userVote ? userVote.outfitId : null;
            }
            
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
            
            // Lightbox elements
            imageLightbox: document.getElementById('imageLightbox'),
            lightboxBackdrop: document.querySelector('.lightbox-backdrop'),
            lightboxImage: document.getElementById('lightboxImage'),
            lightboxName: document.getElementById('lightboxName'),
            lightboxVoteBtn: document.getElementById('lightboxVoteBtn'),
            closeLightbox: document.getElementById('closeLightbox'),
            
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
        
        // Lightbox
        this.setupLightbox();
        
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

        // Handle escape key for lightbox
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeLightbox();
            }
        });
    }

    setupLightbox() {
        // Close lightbox events
        this.elements.closeLightbox?.addEventListener('click', () => {
            this.closeLightbox();
        });

        this.elements.lightboxBackdrop?.addEventListener('click', () => {
            this.closeLightbox();
        });

        // Lightbox vote button
        this.elements.lightboxVoteBtn?.addEventListener('click', () => {
            const outfitId = this.elements.lightboxVoteBtn.getAttribute('data-outfit-id');
            if (outfitId) {
                this.handleVote(outfitId);
                this.closeLightbox();
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

    navigateToAppropriateStartPage() {
        // Check if event has ended
        if (LocalStorage.isEventEnded()) {
            this.showEventEndedMessage();
            return;
        }

        // Determine appropriate starting page based on user state
        let targetPage = 'uploadPage'; // Default

        if (this.hasUploaded && this.hasVoted) {
            // User has uploaded and voted -> show ranking
            targetPage = 'resultsPage';
            console.log('User has uploaded and voted -> navigating to results');
        } else if (this.hasUploaded && !this.hasVoted) {
            // User has uploaded but not voted -> show gallery for voting
            targetPage = 'galleryPage';
            console.log('User has uploaded but not voted -> navigating to gallery');
        } else if (!this.hasUploaded) {
            // User hasn't uploaded yet -> show upload page
            targetPage = 'uploadPage';
            console.log('User hasn\'t uploaded -> staying on upload page');
        }

        // Navigate to determined page
        this.navigateToPage(targetPage);
        
        // Show appropriate messages
        this.showStartPageMessages(targetPage);
    }

    showStartPageMessages(currentPage) {
        switch (currentPage) {
            case 'galleryPage':
                if (this.hasUploaded && !this.hasVoted) {
                    Utils.showMessage('uploadMessage', 'Dein Outfit wurde hochgeladen! Jetzt kannst du für andere Outfits abstimmen.', 'success', 4000);
                }
                break;
            case 'resultsPage':
                if (this.hasUploaded && this.hasVoted) {
                    Utils.showMessage('uploadMessage', 'Danke für deine Teilnahme! Hier siehst du die aktuellen Ergebnisse.', 'success', 4000);
                }
                break;
            case 'uploadPage':
                if (!LocalStorage.isUploadsEnabled()) {
                    Utils.showMessage('uploadMessage', 'Das Hochladen ist derzeit deaktiviert.', 'warning', 4000);
                }
                break;
        }
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
            case 'uploadPage':
                // Validate upload form on page load
                this.validateUploadForm();
                break;
            default:
                break;
        }
    }

    async loadData() {
        Utils.showLoading();
        
        try {
            // Check backend health first
            const backendHealthy = await CloudStorage.checkBackendHealth();
            if (!backendHealthy) {
                console.warn('Backend not available, using local storage as fallback');
            }
            
            // Load initial data for all pages
            await this.loadGallery();
            await this.loadResults();
            
        } catch (error) {
            console.error('Error loading data:', error);
            Utils.showErrorToast(
                'Fehler beim Laden der Daten',
                error.details || 'Die Daten konnten nicht geladen werden. Bitte aktualisieren Sie die Seite.'
            );
        } finally {
            Utils.hideLoading();
        }
    }

    async loadGallery() {
        try {
            // Try to load from cloud first, fallback to local storage
            const outfits = await CloudStorage.getOutfits();
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
            const sortedOutfits = outfits.sort((a, b) => new Date(b.uploadedAt || b.timestamp) - new Date(a.uploadedAt || a.timestamp));

            for (const outfit of sortedOutfits) {
                const card = await this.createOutfitCard(outfit);
                gallery.appendChild(card);
            }
        } catch (error) {
            console.error('Error loading gallery:', error);
            // Fallback to local storage if cloud fails
            const localOutfits = LocalStorage.getOutfits();
            if (localOutfits.length > 0) {
                const gallery = this.elements.gallery;
                gallery.innerHTML = '';
                for (const outfit of localOutfits) {
                    const card = await this.createOutfitCard(outfit);
                    gallery.appendChild(card);
                }
            }
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
            <img src="${outfit.imageData}" alt="Outfit von ${Utils.sanitizeHTML(outfit.name)}" class="outfit-card__image" data-outfit='${JSON.stringify({id: outfit.id, name: outfit.name, imageData: outfit.imageData})}'>
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

        // Add image click event for lightbox
        const image = card.querySelector('.outfit-card__image');
        if (image) {
            image.addEventListener('click', () => {
                this.openLightbox(outfit);
            });
            image.style.cursor = 'pointer';
        }

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
        try {
            // Try to load from cloud first, fallback to local storage
            const rankedResults = await CloudStorage.getResults();
            const resultsContainer = this.elements.results;
            const noResults = this.elements.noResults;
            
            if (rankedResults.length === 0) {
                if (resultsContainer) resultsContainer.style.display = 'none';
                if (noResults) noResults.style.display = 'flex';
                return;
            }
            
            // Continue with displaying results...
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
            
        } catch (error) {
            console.error('Error loading results:', error);
            // Fallback to local storage
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
    }

    handleFileSelection(file) {
        if (!file) {
            this.clearFilePreview();
            return;
        }

        // Validate file
        const errors = ImageUtils.validateFile(file);
        if (errors.length > 0) {
            Utils.showErrorToast(
                'Ungültige Datei',
                errors.join(', ')
            );
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
            Utils.showErrorToast(
                'Fehler beim Anzeigen der Vorschau',
                'Das ausgewählte Bild konnte nicht als Vorschau angezeigt werden.'
            );
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
        
        // Check if name is already taken (only if name is valid)
        if (name && nameErrors.length === 0 && Utils.isNameTaken(name)) {
            nameErrors.push('Dieser Name ist bereits vergeben');
        }
        
        const isValid = nameErrors.length === 0 && fileErrors.length === 0;
        
        // Only disable button if there are actual errors, not just empty fields
        if (this.elements.uploadBtn) {
            this.elements.uploadBtn.disabled = !isValid;
        }
        
        // Only show validation errors if user has interacted with the form
        const hasUserInput = name.length > 0 || (file && file.size > 0);
        
        if (hasUserInput && (nameErrors.length > 0 || fileErrors.length > 0)) {
            const allErrors = [...nameErrors, ...fileErrors];
            Utils.showMessage('uploadMessage', allErrors.join(', '), 'error', 3000);
        } else if (hasUserInput && isValid) {
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
            
            // Create outfit object for cloud upload
            const outfit = {
                userName: name,
                imageFile: file,
                userIdentifier: this.userIdentifier
            };
            
            // Save outfit to cloud
            const savedOutfit = await CloudStorage.saveOutfit(outfit);
            
            // Mark user as uploaded
            await LocalStorage.markUserAsUploaded();
            this.hasUploaded = true;
            
            // Reset form and show disabled message
            this.resetUploadForm();
            this.showUploadDisabledMessage();
            
            // Switch to gallery page automatically
            this.navigateToPage('galleryPage');
            
            // Load updated data
            await this.loadData();
            
            Utils.showMessage('uploadMessage', 'Outfit erfolgreich hochgeladen!', 'success');
            
        } catch (error) {
            console.error('Error uploading outfit:', error);
            
            // Show detailed error from backend
            Utils.showErrorToast(
                error.message || 'Fehler beim Hochladen',
                error.details || 'Das Outfit konnte nicht hochgeladen werden. Bitte versuchen Sie es erneut.'
            );
            
            // Fallback to local storage if cloud upload fails
            try {
                const name = this.elements.userName.value.trim();
                const file = this.elements.imageFile.files[0];
                
                // Resize and compress image for local storage
                const resizedBlob = await ImageUtils.resizeImage(file);
                const imageData = await ImageUtils.fileToDataURL(resizedBlob);
                
                const outfit = {
                    name: name,
                    imageData: imageData,
                    userIdentifier: this.userIdentifier
                };
                
                const savedOutfit = LocalStorage.saveOutfit(outfit);
                await LocalStorage.markUserAsUploaded();
                this.hasUploaded = true;
                
                this.resetUploadForm();
                this.showUploadDisabledMessage();
                this.navigateToPage('galleryPage');
                await this.loadData();
                
                Utils.showMessage('uploadMessage', 'Outfit lokal gespeichert (Backend nicht verfügbar)', 'warning');
                
            } catch (fallbackError) {
                console.error('Error with fallback upload:', fallbackError);
                Utils.showErrorToast(
                    'Upload komplett fehlgeschlagen',
                    'Das Outfit konnte weder online noch lokal gespeichert werden. Bitte versuchen Sie es später erneut.'
                );
            }
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
            // Try to vote via cloud first
            await CloudStorage.vote(outfitId, this.userIdentifier);
            
            // Also save locally for consistency
            await LocalStorage.addVote(outfitId);
            this.hasVoted = true;
            
            // Refresh data to show updated vote counts
            await this.loadData();
            
            // If user has now both uploaded and voted, navigate to results
            if (this.hasUploaded && this.hasVoted) {
                setTimeout(() => {
                    this.navigateToPage('resultsPage');
                }, 2000); // Wait 2 seconds to show success message
            }
            
            Utils.showMessage('uploadMessage', 'Deine Stimme wurde gezählt!', 'success');
            
        } catch (error) {
            console.error('Error voting:', error);
            Utils.showErrorToast(
                error.message || 'Fehler beim Abstimmen',
                error.details || 'Ihre Stimme konnte nicht gezählt werden. Bitte versuchen Sie es erneut.'
            );
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

    openLightbox(outfit) {
        if (!this.elements.imageLightbox) return;

        // Set lightbox content
        this.elements.lightboxImage.src = outfit.imageData;
        this.elements.lightboxImage.alt = `Outfit von ${outfit.name}`;
        this.elements.lightboxName.textContent = outfit.name;

        // Configure vote button
        const userVote = this.hasVoted;
        const hasVotedForThis = userVote && this.userVotedFor === outfit.id;
        const votingEnabled = LocalStorage.isVotingEnabled();

        this.elements.lightboxVoteBtn.setAttribute('data-outfit-id', outfit.id);
        this.elements.lightboxVoteBtn.disabled = !votingEnabled || userVote;

        // Update vote button appearance
        const voteIcon = this.elements.lightboxVoteBtn.querySelector('.material-icons');
        const voteText = this.elements.lightboxVoteBtn.querySelector('.vote-text');
        
        if (hasVotedForThis) {
            voteIcon.textContent = 'favorite';
            voteText.textContent = 'Gewählt';
            this.elements.lightboxVoteBtn.classList.add('voted');
        } else if (userVote) {
            voteIcon.textContent = 'favorite_border';
            voteText.textContent = 'Bereits gewählt';
            this.elements.lightboxVoteBtn.classList.remove('voted');
        } else {
            voteIcon.textContent = 'favorite_border';
            voteText.textContent = 'Abstimmen';
            this.elements.lightboxVoteBtn.classList.remove('voted');
        }

        // Show lightbox
        this.elements.imageLightbox.style.display = 'flex';
        
        // Trigger animation
        setTimeout(() => {
            this.elements.imageLightbox.classList.add('show');
        }, 10);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    closeLightbox() {
        if (!this.elements.imageLightbox) return;

        this.elements.imageLightbox.classList.remove('show');
        
        setTimeout(() => {
            this.elements.imageLightbox.style.display = 'none';
        }, 300);

        // Restore body scroll
        document.body.style.overflow = '';
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
