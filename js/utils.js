// Utility functions for the application
class Utils {
    // Show loading overlay
    static showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    // Hide loading overlay
    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Show message
    static showMessage(elementId, message, type = 'info', duration = 5000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = message;
        element.className = `message ${type} show`;
        element.style.display = 'block';

        if (duration > 0) {
            setTimeout(() => {
                element.classList.remove('show');
                setTimeout(() => {
                    element.style.display = 'none';
                }, 300);
            }, duration);
        }
    }

    // Hide message
    static hideMessage(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.classList.remove('show');
        setTimeout(() => {
            element.style.display = 'none';
        }, 300);
    }

    // Format timestamp
    static formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Format time ago
    static timeAgo(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'vor wenigen Sekunden';
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `vor ${diffInMinutes} Minute${diffInMinutes !== 1 ? 'n' : ''}`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `vor ${diffInHours} Stunde${diffInHours !== 1 ? 'n' : ''}`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        return `vor ${diffInDays} Tag${diffInDays !== 1 ? 'en' : ''}`;
    }

    // Sanitize HTML to prevent XSS
    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Truncate text
    static truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength - 3) + '...';
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Add fade in animation
    static fadeIn(element, duration = 300) {
        element.style.opacity = 0;
        element.style.display = 'block';
        
        const start = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                element.style.opacity = progress;
                requestAnimationFrame(animate);
            } else {
                element.style.opacity = 1;
            }
        }
        
        requestAnimationFrame(animate);
    }

    // Add fade out animation
    static fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                element.style.opacity = startOpacity * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                element.style.opacity = 0;
                element.style.display = 'none';
            }
        }
        
        requestAnimationFrame(animate);
    }

    // Slide in animation
    static slideIn(element, direction = 'left', duration = 300) {
        const startPosition = direction === 'left' ? '-100%' : '100%';
        element.style.transform = `translateX(${startPosition})`;
        element.style.display = 'block';
        
        const start = performance.now();
        
        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const currentPosition = parseFloat(startPosition) * (1 - progress);
                element.style.transform = `translateX(${currentPosition}%)`;
                requestAnimationFrame(animate);
            } else {
                element.style.transform = 'translateX(0)';
            }
        }
        
        requestAnimationFrame(animate);
    }

    // Copy to clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (fallbackErr) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    // Get responsive image size
    static getResponsiveImageSize() {
        const width = window.innerWidth;
        if (width < 480) return 'small';
        if (width < 768) return 'medium';
        return 'large';
    }

    // Format file size
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Validate name input
    static validateName(name) {
        const errors = [];
        
        if (!name || name.trim().length === 0) {
            errors.push('Name ist erforderlich');
        } else {
            const trimmedName = name.trim();
            if (trimmedName.length < 2) {
                errors.push('Name muss mindestens 2 Zeichen haben');
            }
            if (trimmedName.length > 50) {
                errors.push('Name darf maximal 50 Zeichen haben');
            }
            if (!/^[a-zA-ZäöüÄÖÜß\s\-\.0-9]+$/.test(trimmedName)) {
                errors.push('Name darf nur Buchstaben, Zahlen, Leerzeichen, Bindestriche und Punkte enthalten');
            }
        }
        
        return errors;
    }

    // Check if name is already taken
    static isNameTaken(name) {
        const outfits = JSON.parse(localStorage.getItem('outfits') || '[]');
        return outfits.some(outfit => 
            outfit.name.toLowerCase().trim() === name.toLowerCase().trim()
        );
    }

    // Generate color from string (for consistent user colors)
    static stringToColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    // Check if device is mobile
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Check if device supports touch
    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    // Smooth scroll to element
    static scrollToElement(elementId, offset = 0) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const targetPosition = element.offsetTop - offset;
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }

    // Create ripple effect (Material Design)
    static createRipple(event, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            left: ${x}px;
            top: ${y}px;
            width: ${size}px;
            height: ${size}px;
            pointer-events: none;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Add ripple effect styles
    static addRippleStyles() {
        if (document.getElementById('ripple-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ripple-styles';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize tooltips
    static initTooltips() {
        const elementsWithTitle = document.querySelectorAll('[title]');
        elementsWithTitle.forEach(element => {
            const title = element.getAttribute('title');
            element.removeAttribute('title');
            
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = title;
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.2s;
                white-space: nowrap;
            `;
            
            document.body.appendChild(tooltip);
            
            element.addEventListener('mouseenter', (e) => {
                const rect = element.getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
                tooltip.style.opacity = '1';
            });
            
            element.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });
        });
    }

    // Performance monitoring
    static performanceMonitor = {
        marks: {},
        
        start(name) {
            this.marks[name] = performance.now();
        },
        
        end(name) {
            if (this.marks[name]) {
                const duration = performance.now() - this.marks[name];
                console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`);
                delete this.marks[name];
                return duration;
            }
        }
    };

    // Local storage with expiration
    static storage = {
        set(key, value, expirationMinutes = null) {
            const item = {
                value: value,
                timestamp: Date.now(),
                expiration: expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : null
            };
            localStorage.setItem(key, JSON.stringify(item));
        },
        
        get(key) {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            try {
                const parsed = JSON.parse(item);
                if (parsed.expiration && Date.now() > parsed.expiration) {
                    localStorage.removeItem(key);
                    return null;
                }
                return parsed.value;
            } catch {
                return null;
            }
        },
        
        remove(key) {
            localStorage.removeItem(key);
        },
        
        clear() {
            localStorage.clear();
        }
    };
}
