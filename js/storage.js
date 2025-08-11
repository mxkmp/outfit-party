// Storage utility functions for local data management
class LocalStorage {
    static KEYS = {
        OUTFITS: 'outfits',
        VOTES: 'votes',
        USER_STATE: 'userState',
        ADMIN_SETTINGS: 'adminSettings',
        USER_IP_HASH: 'userIpHash'
    };

    // Get user IP hash for identification
    static async getUserIdentifier() {
        let identifier = localStorage.getItem(this.KEYS.USER_IP_HASH);
        if (!identifier) {
            // Create a unique identifier based on browser fingerprint
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Browser fingerprint', 2, 2);
            
            const fingerprint = canvas.toDataURL() + 
                              navigator.userAgent + 
                              navigator.language + 
                              screen.width + 
                              screen.height + 
                              new Date().getTimezoneOffset();
            
            identifier = this.simpleHash(fingerprint);
            localStorage.setItem(this.KEYS.USER_IP_HASH, identifier);
        }
        return identifier;
    }

    // Simple hash function
    static simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Outfit management
    static saveOutfit(outfit) {
        const outfits = this.getOutfits();
        
        // Check if name already exists (case insensitive)
        const existingOutfit = outfits.find(existing => 
            existing.name.toLowerCase().trim() === outfit.name.toLowerCase().trim()
        );
        
        if (existingOutfit) {
            // If it's a local-only outfit by the same user, allow replacement
            if (existingOutfit.isLocalOnly && existingOutfit.userIdentifier === outfit.userIdentifier) {
                // Update the existing outfit instead of creating a new one
                Object.assign(existingOutfit, outfit);
                existingOutfit.timestamp = new Date().toISOString();
                localStorage.setItem(this.KEYS.OUTFITS, JSON.stringify(outfits));
                return existingOutfit;
            } else {
                throw new Error('Dieser Name ist bereits vergeben. Bitte wähle einen anderen Namen.');
            }
        }
        
        outfit.id = this.generateId();
        outfit.timestamp = new Date().toISOString();
        outfit.votes = 0;
        outfit.voters = [];
        outfits.push(outfit);
        localStorage.setItem(this.KEYS.OUTFITS, JSON.stringify(outfits));
        return outfit;
    }

    static getOutfits() {
        const outfits = localStorage.getItem(this.KEYS.OUTFITS);
        return outfits ? JSON.parse(outfits) : [];
    }

    static deleteOutfit(outfitId) {
        const outfits = this.getOutfits();
        const outfitToDelete = outfits.find(outfit => outfit.id === outfitId);
        
        if (!outfitToDelete) {
            return false; // Outfit not found
        }
        
        // Store the userIdentifier of the outfit being deleted
        const deletedUserIdentifier = outfitToDelete.userIdentifier;
        
        const filteredOutfits = outfits.filter(outfit => outfit.id !== outfitId);
        localStorage.setItem(this.KEYS.OUTFITS, JSON.stringify(filteredOutfits));
        
        // Also remove any votes for this outfit
        const votes = this.getVotes();
        const filteredVotes = votes.filter(vote => vote.outfitId !== outfitId);
        localStorage.setItem(this.KEYS.VOTES, JSON.stringify(filteredVotes));
        
        // Reset upload state for the user whose outfit was deleted
        if (deletedUserIdentifier) {
            this.resetUserUploadState(deletedUserIdentifier);
        }
        
        return true;
    }

    // Vote management
    static async addVote(outfitId) {
        const userIdentifier = await this.getUserIdentifier();
        const votes = this.getVotes();
        
        // Check if user already voted
        const existingVote = votes.find(vote => vote.userIdentifier === userIdentifier);
        if (existingVote) {
            throw new Error('Du hast bereits abgestimmt!');
        }

        // Add new vote
        const vote = {
            id: this.generateId(),
            outfitId,
            userIdentifier,
            timestamp: new Date().toISOString()
        };
        
        votes.push(vote);
        localStorage.setItem(this.KEYS.VOTES, JSON.stringify(votes));
        
        // Update outfit vote count
        this.updateOutfitVoteCount(outfitId);
        
        return vote;
    }

    static getVotes() {
        const votes = localStorage.getItem(this.KEYS.VOTES);
        return votes ? JSON.parse(votes) : [];
    }

    static async hasUserVoted() {
        const userIdentifier = await this.getUserIdentifier();
        const votes = this.getVotes();
        return votes.some(vote => vote.userIdentifier === userIdentifier);
    }

    static async getUserVote() {
        const userIdentifier = await this.getUserIdentifier();
        const votes = this.getVotes();
        return votes.find(vote => vote.userIdentifier === userIdentifier);
    }

    static updateOutfitVoteCount(outfitId) {
        const outfits = this.getOutfits();
        const votes = this.getVotes();
        
        const outfit = outfits.find(o => o.id === outfitId);
        if (outfit) {
            outfit.votes = votes.filter(vote => vote.outfitId === outfitId).length;
            localStorage.setItem(this.KEYS.OUTFITS, JSON.stringify(outfits));
        }
    }

    static getVoteCountForOutfit(outfitId) {
        const votes = this.getVotes();
        return votes.filter(vote => vote.outfitId === outfitId).length;
    }

    static getTotalVotes() {
        return this.getVotes().length;
    }

    static getUniqueVoters() {
        const votes = this.getVotes();
        const uniqueVoters = new Set(votes.map(vote => vote.userIdentifier));
        return uniqueVoters.size;
    }

    // User state management
    static async saveUserState(state) {
        const userIdentifier = await this.getUserIdentifier();
        const userState = {
            userIdentifier,
            ...state,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(this.KEYS.USER_STATE, JSON.stringify(userState));
    }

    static async getUserState() {
        const userIdentifier = await this.getUserIdentifier();
        const state = localStorage.getItem(this.KEYS.USER_STATE);
        const userState = state ? JSON.parse(state) : {};
        
        // Verify the state belongs to current user
        if (userState.userIdentifier !== userIdentifier) {
            return {};
        }
        
        return userState;
    }

    static async hasUserUploaded() {
        const userState = await this.getUserState();
        return !!userState.hasUploaded;
    }

    static async markUserAsUploaded() {
        const currentState = await this.getUserState();
        currentState.hasUploaded = true;
        currentState.uploadTimestamp = new Date().toISOString();
        await this.saveUserState(currentState);
    }

    // Reset user upload state (for when their outfit is deleted)
    static async resetUserUploadState(userIdentifier) {
        // If no userIdentifier provided, reset current user
        if (!userIdentifier) {
            userIdentifier = await this.getUserIdentifier();
        }
        
        // Only reset if it's for the current user (security measure)
        const currentUserIdentifier = await this.getUserIdentifier();
        if (userIdentifier === currentUserIdentifier) {
            const currentState = await this.getUserState();
            currentState.hasUploaded = false;
            delete currentState.uploadTimestamp;
            await this.saveUserState(currentState);
            console.log('User upload state reset for user:', userIdentifier);
        }
    }

    // Check if unlimited uploads are enabled
    static isUnlimitedUploadsEnabled() {
        const settings = this.getAdminSettings();
        return settings.unlimitedUploads;
    }

    // Admin settings
    static getAdminSettings() {
        const settings = localStorage.getItem(this.KEYS.ADMIN_SETTINGS);
        return settings ? JSON.parse(settings) : {
            uploadsEnabled: true,
            votingEnabled: true,
            eventEnded: false,
            unlimitedUploads: false, // Allow unlimited uploads for testing
            adminPassword: 'admin123' // Default password - should be changed
        };
    }

    static saveAdminSettings(settings) {
        localStorage.setItem(this.KEYS.ADMIN_SETTINGS, JSON.stringify(settings));
    }

    static isUploadsEnabled() {
        const settings = this.getAdminSettings();
        return settings.uploadsEnabled && !settings.eventEnded;
    }

    static isVotingEnabled() {
        const settings = this.getAdminSettings();
        return settings.votingEnabled && !settings.eventEnded;
    }

    static isEventEnded() {
        const settings = this.getAdminSettings();
        return settings.eventEnded;
    }

    // Utility functions
    static generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    static clearAllData() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }

    static exportData() {
        const data = {};
        Object.values(this.KEYS).forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                data[key] = JSON.parse(value);
            }
        });
        return data;
    }

    static importData(data) {
        Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
        });
    }

    // Get statistics
    static getStatistics() {
        const outfits = this.getOutfits();
        const votes = this.getVotes();
        
        return {
            totalOutfits: outfits.length,
            totalVotes: votes.length,
            uniqueVoters: this.getUniqueVoters(),
            averageVotesPerOutfit: outfits.length > 0 ? (votes.length / outfits.length).toFixed(1) : 0
        };
    }

    // Get ranked results
    static getRankedResults() {
        const outfits = this.getOutfits();
        const votes = this.getVotes();
        
        // Update vote counts
        outfits.forEach(outfit => {
            outfit.votes = votes.filter(vote => vote.outfitId === outfit.id).length;
        });
        
        // Sort by votes (descending) and then by timestamp (ascending for tiebreaker)
        return outfits.sort((a, b) => {
            if (b.votes !== a.votes) {
                return b.votes - a.votes;
            }
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
    }
}

// Image utility functions
class ImageUtils {
    static MAX_SIZE = 50 * 1024 * 1024; // 50MB
    static MAX_WIDTH = 1200;
    static MAX_HEIGHT = 1200;
    static QUALITY = 0.8;

    static validateFile(file) {
        const errors = [];
        
        if (!file) {
            errors.push('Keine Datei ausgewählt');
            return errors;
        }
        
        if (!file.type.startsWith('image/')) {
            errors.push('Datei muss ein Bild sein');
        }
        
        if (file.size > this.MAX_SIZE) {
            errors.push('Datei ist zu groß (max. 50MB)');
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            errors.push('Unterstützte Formate: JPG, PNG, WebP');
        }
        
        return errors;
    }

    static async resizeImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate new dimensions
                    let { width, height } = this.calculateDimensions(img.width, img.height);
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and compress
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Fehler beim Komprimieren des Bildes'));
                        }
                    }, 'image/jpeg', this.QUALITY);
                };
                img.onerror = () => reject(new Error('Fehler beim Laden des Bildes'));
                img.src = event.target.result;
            };
            reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
            reader.readAsDataURL(file);
        });
    }

    static calculateDimensions(width, height) {
        if (width <= this.MAX_WIDTH && height <= this.MAX_HEIGHT) {
            return { width, height };
        }
        
        const aspectRatio = width / height;
        
        if (width > height) {
            width = this.MAX_WIDTH;
            height = width / aspectRatio;
        } else {
            height = this.MAX_HEIGHT;
            width = height * aspectRatio;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }

    static async fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    static dataURLtoBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        
        return new Blob([u8arr], { type: mime });
    }
}
