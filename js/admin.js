// Admin panel logic
class AdminPanel {
    constructor() {
        this.isLoggedIn = false;
        this.refreshInterval = null;
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.checkLoginState();
    }

    initializeElements() {
        this.elements = {
            // Login elements
            loginScreen: document.getElementById('loginScreen'),
            adminPassword: document.getElementById('adminPassword'),
            loginBtn: document.getElementById('loginBtn'),
            loginError: document.getElementById('loginError'),
            
            // Dashboard elements
            adminDashboard: document.getElementById('adminDashboard'),
            logoutBtn: document.getElementById('logoutBtn'),
            
            // Statistics
            totalUploads: document.getElementById('totalUploads'),
            totalVotes: document.getElementById('totalVotes'),
            uniqueVoters: document.getElementById('uniqueVoters'),
            
            // Controls
            uploadsEnabled: document.getElementById('uploadsEnabled'),
            votingEnabled: document.getElementById('votingEnabled'),
            unlimitedUploads: document.getElementById('unlimitedUploads'),
            endEventBtn: document.getElementById('endEventBtn'),
            
            // Content
            adminGallery: document.getElementById('adminGallery'),
            noUploadsAdmin: document.getElementById('noUploadsAdmin'),
            adminResults: document.getElementById('adminResults'),
            
            // Dialog
            confirmDialog: document.getElementById('confirmDialog'),
            confirmTitle: document.getElementById('confirmTitle'),
            confirmMessage: document.getElementById('confirmMessage'),
            confirmOk: document.getElementById('confirmOk'),
            confirmCancel: document.getElementById('confirmCancel')
        };
    }

    setupEventListeners() {
        // Login
        this.elements.loginBtn.addEventListener('click', async () => {
            await this.handleLogin();
        });

        this.elements.adminPassword.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await this.handleLogin();
            }
        });

        // Logout
        this.elements.logoutBtn.addEventListener('click', () => {
            this.handleLogout();
        });

        // Controls
        this.elements.uploadsEnabled.addEventListener('change', () => {
            this.updateAdminSetting('uploadsEnabled', this.elements.uploadsEnabled.checked);
        });

        this.elements.votingEnabled.addEventListener('change', () => {
            this.updateAdminSetting('votingEnabled', this.elements.votingEnabled.checked);
        });

        this.elements.unlimitedUploads.addEventListener('change', () => {
            this.updateAdminSetting('unlimitedUploads', this.elements.unlimitedUploads.checked);
        });

        this.elements.endEventBtn.addEventListener('click', () => {
            this.confirmEndEvent();
        });

        // Dialog
        this.elements.confirmCancel.addEventListener('click', () => {
            this.hideConfirmDialog();
        });

        // Auto-refresh when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isLoggedIn) {
                this.loadDashboardData();
            }
        });
    }

    checkLoginState() {
        // Check if there's a stored admin session (expires after 1 hour)
        const adminSession = Utils.storage.get('adminSession');
        if (adminSession) {
            this.showDashboard();
        } else {
            this.showLogin();
        }
    }

    async handleLogin() {
        const password = this.elements.adminPassword.value;
        
        // Try backend authentication first
        try {
            const backendResult = await CloudStorage.verifyAdminPassword(password);
            
            if (backendResult.success) {
                // Backend authentication successful
                Utils.storage.set('adminSession', true, 60);
                Utils.storage.set('adminPassword', password, 60); // Store for backend requests
                this.backendAPI = backendResult.api; // Store authenticated API instance
                this.showDashboard();
                this.elements.loginError.classList.remove('show');
                console.log('Admin authenticated via backend');
                return;
            } else {
                throw new Error(backendResult.error || 'Backend authentication failed');
            }
        } catch (error) {
            console.warn('Backend authentication failed, falling back to local:', error);
            
            // Fallback to local authentication
            const settings = LocalStorage.getAdminSettings();
            
            if (password === settings.adminPassword) {
                // Store session for 1 hour
                Utils.storage.set('adminSession', true, 60);
                Utils.storage.set('adminPassword', password, 60);
                this.showDashboard();
                this.elements.loginError.classList.remove('show');
                console.log('Admin authenticated via local storage fallback');
            } else {
                this.elements.loginError.textContent = 'Falsches Passwort';
                this.elements.loginError.classList.add('show');
                this.elements.adminPassword.value = '';
            }
        }
    }

    handleLogout() {
        Utils.storage.remove('adminSession');
        Utils.storage.remove('adminPassword');
        this.backendAPI = null;
        this.showLogin();
        this.stopAutoRefresh();
    }

    showLogin() {
        this.isLoggedIn = false;
        this.elements.loginScreen.style.display = 'flex';
        this.elements.adminDashboard.style.display = 'none';
        this.elements.adminPassword.focus();
    }

    showDashboard() {
        this.isLoggedIn = true;
        this.elements.loginScreen.style.display = 'none';
        this.elements.adminDashboard.style.display = 'block';
        this.loadDashboardData();
        this.startAutoRefresh();
    }

    async loadDashboardData() {
        try {
            await this.loadStatistics();
            await this.loadControls();
            await this.loadAdminGallery();
            await this.loadAdminResults();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    loadStatistics() {
        const stats = LocalStorage.getStatistics();
        
        this.elements.totalUploads.textContent = stats.totalOutfits;
        this.elements.totalVotes.textContent = stats.totalVotes;
        this.elements.uniqueVoters.textContent = stats.uniqueVoters;
    }

    loadControls() {
        const settings = LocalStorage.getAdminSettings();
        
        this.elements.uploadsEnabled.checked = settings.uploadsEnabled;
        this.elements.votingEnabled.checked = settings.votingEnabled;
        this.elements.unlimitedUploads.checked = settings.unlimitedUploads;
        this.elements.endEventBtn.disabled = settings.eventEnded;
        
        if (settings.eventEnded) {
            this.elements.endEventBtn.textContent = 'Event beendet';
            this.elements.endEventBtn.innerHTML = '<span class="material-icons">check</span> Event beendet';
        }
    }

    async loadAdminGallery() {
        const outfits = LocalStorage.getOutfits();
        const gallery = this.elements.adminGallery;
        const noUploads = this.elements.noUploadsAdmin;

        if (outfits.length === 0) {
            gallery.style.display = 'none';
            noUploads.style.display = 'flex';
            return;
        }

        gallery.style.display = 'grid';
        noUploads.style.display = 'none';
        gallery.innerHTML = '';

        // Sort by timestamp (newest first)
        const sortedOutfits = outfits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        sortedOutfits.forEach(outfit => {
            const card = this.createAdminOutfitCard(outfit);
            gallery.appendChild(card);
        });
    }

    createAdminOutfitCard(outfit) {
        const voteCount = LocalStorage.getVoteCountForOutfit(outfit.id);
        
        const card = document.createElement('div');
        card.className = 'admin-outfit-card';
        
        card.innerHTML = `
            <img src="${outfit.imageData}" alt="Outfit von ${Utils.sanitizeHTML(outfit.name)}" class="admin-outfit-card__image">
            <div class="admin-outfit-card__content">
                <div class="admin-outfit-card__header">
                    <div class="admin-outfit-card__info">
                        <h3>${Utils.sanitizeHTML(outfit.name)}</h3>
                        <div class="admin-outfit-card__meta">
                            ${voteCount} ${voteCount === 1 ? 'Stimme' : 'Stimmen'} • 
                            ${Utils.formatTimestamp(outfit.timestamp)}
                        </div>
                    </div>
                </div>
                <div class="admin-outfit-card__actions">
                    <button class="button button--outlined delete-button" data-outfit-id="${outfit.id}">
                        <span class="material-icons">delete</span>
                        Löschen
                    </button>
                </div>
            </div>
        `;

        // Add delete event listener
        const deleteBtn = card.querySelector('.delete-button');
        deleteBtn.addEventListener('click', () => {
            this.confirmDeleteOutfit(outfit.id, outfit.name);
        });

        return card;
    }

    loadAdminResults() {
        const rankedResults = LocalStorage.getRankedResults();
        const resultsContainer = this.elements.adminResults;
        
        if (rankedResults.length === 0) {
            resultsContainer.innerHTML = '<div class="no-content"><p>Noch keine Ergebnisse verfügbar</p></div>';
            return;
        }

        resultsContainer.innerHTML = '';
        const totalVotes = LocalStorage.getTotalVotes();

        rankedResults.forEach((outfit, index) => {
            const percentage = totalVotes > 0 ? (outfit.votes / totalVotes * 100) : 0;
            const rank = index + 1;
            
            const resultItem = document.createElement('div');
            resultItem.className = 'admin-result-item';
            
            let rankClass = '';
            if (rank === 1) rankClass = 'first';
            else if (rank === 2) rankClass = 'second';
            else if (rank === 3) rankClass = 'third';

            resultItem.innerHTML = `
                <div class="admin-result-item__rank ${rankClass}">
                    ${rank}
                </div>
                <div class="admin-result-item__content">
                    <div class="admin-result-item__name">${Utils.sanitizeHTML(outfit.name)}</div>
                    <div class="admin-result-item__votes">
                        ${outfit.votes} ${outfit.votes === 1 ? 'Stimme' : 'Stimmen'}
                        <span class="admin-result-item__percentage">${percentage.toFixed(1)}%</span>
                    </div>
                </div>
            `;

            resultsContainer.appendChild(resultItem);
        });
    }

    updateAdminSetting(key, value) {
        const settings = LocalStorage.getAdminSettings();
        settings[key] = value;
        LocalStorage.saveAdminSettings(settings);
        
        console.log(`Admin setting updated: ${key} = ${value}`);
        
        // Show brief confirmation
        const element = this.elements[key];
        const parent = element.closest('.control-item');
        const originalBg = parent.style.backgroundColor;
        
        parent.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        parent.style.transition = 'background-color 0.3s ease';
        
        setTimeout(() => {
            parent.style.backgroundColor = originalBg;
        }, 1000);
    }

    confirmDeleteOutfit(outfitId, outfitName) {
        this.elements.confirmTitle.textContent = 'Outfit löschen';
        this.elements.confirmMessage.textContent = `Möchtest du das Outfit von "${outfitName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`;
        
        this.elements.confirmOk.onclick = () => {
            this.deleteOutfit(outfitId);
            this.hideConfirmDialog();
        };
        
        this.showConfirmDialog();
    }

    confirmEndEvent() {
        this.elements.confirmTitle.textContent = 'Event beenden';
        this.elements.confirmMessage.textContent = 'Möchtest du das Event wirklich beenden? Alle Uploads und das Voting werden deaktiviert. Die Voting-Ergebnisse bleiben erhalten.';
        
        this.elements.confirmOk.onclick = () => {
            this.endEvent();
            this.hideConfirmDialog();
        };
        
        this.showConfirmDialog();
    }

    async deleteOutfit(outfitId) {
        try {
            // Try backend deletion first if we have an authenticated API
            if (this.backendAPI) {
                try {
                    const result = await this.backendAPI.deleteOutfit(outfitId);
                    console.log(`Outfit ${outfitId} deleted via backend`);
                    
                    // Reset upload state for the user if their outfit was deleted
                    if (result.deletedUserIdentifier) {
                        await LocalStorage.resetUserUploadState(result.deletedUserIdentifier);
                    }
                } catch (error) {
                    console.warn('Backend deletion failed, falling back to local:', error);
                    LocalStorage.deleteOutfit(outfitId);
                }
            } else {
                // Check if we have stored admin password for authentication
                const storedPassword = Utils.storage.get('adminPassword');
                if (storedPassword) {
                    const api = new BackendAPI();
                    api.setAdminPassword(storedPassword);
                    try {
                        const result = await api.deleteOutfit(outfitId);
                        console.log(`Outfit ${outfitId} deleted via backend with stored password`);
                        
                        // Reset upload state for the user if their outfit was deleted
                        if (result.deletedUserIdentifier) {
                            await LocalStorage.resetUserUploadState(result.deletedUserIdentifier);
                        }
                    } catch (error) {
                        console.warn('Backend deletion with stored password failed, falling back to local:', error);
                        LocalStorage.deleteOutfit(outfitId);
                    }
                } else {
                    // Fallback to local storage
                    LocalStorage.deleteOutfit(outfitId);
                    console.log(`Outfit ${outfitId} deleted via local storage fallback`);
                }
            }
            
            this.loadDashboardData();
        } catch (error) {
            console.error('Error deleting outfit:', error);
        }
    }

    endEvent() {
        try {
            const settings = LocalStorage.getAdminSettings();
            settings.eventEnded = true;
            settings.uploadsEnabled = false;
            settings.votingEnabled = false;
            LocalStorage.saveAdminSettings(settings);
            
            // No data deletion - preserve voting results and outfits
            console.log('Event ended - voting closed, data preserved');
            
            this.loadDashboardData();
            
        } catch (error) {
            console.error('Error ending event:', error);
        }
    }

    showConfirmDialog() {
        this.elements.confirmDialog.style.display = 'flex';
    }

    hideConfirmDialog() {
        this.elements.confirmDialog.style.display = 'none';
    }

    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing interval
        
        // Refresh every 15 seconds
        this.refreshInterval = setInterval(() => {
            if (!document.hidden && this.isLoggedIn) {
                this.loadDashboardData();
            }
        }, 15000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Admin Panel...');
    window.adminPanel = new AdminPanel();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.adminPanel) {
        window.adminPanel.stopAutoRefresh();
    }
});
