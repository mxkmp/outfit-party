// Backend API integration
class BackendAPI {
    constructor() {
        // Use global config if available, otherwise fallback to environment detection
        if (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) {
            this.baseURL = window.APP_CONFIG.BACKEND_URL;
        } else {
            // Update this URL after deploying your Cloud Function
            // Detect production environment using window.location
            const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
            this.baseURL = isProduction 
                ? 'https://europe-west3-personal-468620.cloudfunctions.net/outfit-voting'
                : 'http://localhost:8080';
        }
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async uploadOutfit(userName, imageFile, userIdentifier) {
        const formData = new FormData();
        formData.append('userName', userName);
        formData.append('userIdentifier', userIdentifier);
        formData.append('image', imageFile);

        return this.makeRequest('/api/outfits', {
            method: 'POST',
            body: formData,
            headers: {} // Remove Content-Type to let browser set it for FormData
        });
    }

    async getOutfits() {
        return this.makeRequest('/api/outfits');
    }

    async vote(outfitId, userIdentifier) {
        return this.makeRequest('/api/vote', {
            method: 'POST',
            body: JSON.stringify({
                outfitId,
                userIdentifier
            })
        });
    }

    async getResults() {
        return this.makeRequest('/api/results');
    }

    async deleteOutfit(outfitId) {
        return this.makeRequest(`/api/outfits/${outfitId}`, {
            method: 'DELETE'
        });
    }

    async healthCheck() {
        return this.makeRequest('/api/health');
    }
}

// Cloud storage integration
class CloudStorage {
    static async saveOutfit(outfit) {
        try {
            const api = new BackendAPI();
            const result = await api.uploadOutfit(
                outfit.userName,
                outfit.imageFile,
                outfit.userIdentifier
            );
            return result.outfit;
        } catch (error) {
            console.error('Error saving outfit to cloud:', error);
            throw error;
        }
    }

    static async getOutfits() {
        try {
            const api = new BackendAPI();
            const result = await api.getOutfits();
            return result.outfits || [];
        } catch (error) {
            console.error('Error fetching outfits from cloud:', error);
            // Fallback to local storage
            return LocalStorage.getOutfits();
        }
    }

    static async vote(outfitId, userIdentifier) {
        try {
            const api = new BackendAPI();
            await api.vote(outfitId, userIdentifier);
            return true;
        } catch (error) {
            console.error('Error voting on cloud:', error);
            throw error;
        }
    }

    static async getResults() {
        try {
            const api = new BackendAPI();
            const result = await api.getResults();
            return result.results || [];
        } catch (error) {
            console.error('Error fetching results from cloud:', error);
            // Fallback to local storage
            const outfits = LocalStorage.getOutfits();
            return outfits.sort((a, b) => b.votes - a.votes);
        }
    }

    static async deleteOutfit(outfitId) {
        try {
            const api = new BackendAPI();
            await api.deleteOutfit(outfitId);
            return true;
        } catch (error) {
            console.error('Error deleting outfit from cloud:', error);
            throw error;
        }
    }

    static async checkBackendHealth() {
        try {
            const api = new BackendAPI();
            await api.healthCheck();
            return true;
        } catch (error) {
            console.warn('Backend health check failed:', error);
            return false;
        }
    }
}
