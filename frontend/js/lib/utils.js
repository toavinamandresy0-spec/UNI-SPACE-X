// Utilitaires généraux pour Spatial Research Lab

// Formatage des nombres
export function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return 'N/A';
    
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
    
    return num.toFixed(decimals);
}

export function formatScientific(num, decimals = 2) {
    if (num === 0) return '0';
    
    const exponent = Math.floor(Math.log10(Math.abs(num)));
    const coefficient = num / Math.pow(10, exponent);
    
    return `${coefficient.toFixed(decimals)}×10<sup>${exponent}</sup>`;
}

// Dates et heures
export function formatDate(date, includeTime = true) {
    const d = new Date(date);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return d.toLocaleDateString('fr-FR', options);
}

export function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Manipulation du DOM
export function createElement(tag, classes = [], attributes = {}) {
    const element = document.createElement(tag);
    
    if (classes.length > 0) {
        element.classList.add(...classes);
    }
    
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
    
    return element;
}

export function showElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.remove('hidden');
    }
}

export function hideElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.add('hidden');
    }
}

export function toggleElement(id) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.toggle('hidden');
    }
}

// Stockage local avec chiffrement
export class SecureStorage {
    constructor(encryptionKey = 'spatial_research_2024') {
        this.key = encryptionKey;
    }
    
    set(key, value, encrypt = false) {
        try {
            const storageKey = `spatial_${key}`;
            const dataToStore = encrypt ? this.encrypt(value) : JSON.stringify(value);
            localStorage.setItem(storageKey, dataToStore);
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            return false;
        }
    }
    
    get(key, decrypt = false) {
        try {
            const storageKey = `spatial_${key}`;
            const item = localStorage.getItem(storageKey);
            
            if (!item) return null;
            
            return decrypt ? this.decrypt(item) : JSON.parse(item);
        } catch (error) {
            console.error('Erreur lecture:', error);
            return null;
        }
    }
    
    remove(key) {
        try {
            const storageKey = `spatial_${key}`;
            localStorage.removeItem(storageKey);
            return true;
        } catch (error) {
            console.error('Erreur suppression:', error);
            return false;
        }
    }
    
    encrypt(data) {
        try {
            const text = JSON.stringify(data);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length));
            }
            return btoa(result);
        } catch (error) {
            console.error('Erreur chiffrement:', error);
            return JSON.stringify(data);
        }
    }
    
    decrypt(encryptedData) {
        try {
            const text = atob(encryptedData);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length));
            }
            return JSON.parse(result);
        } catch (error) {
            console.error('Erreur déchiffrement:', error);
            return null;
        }
    }
}

// Gestion des erreurs
export class ErrorHandler {
    static handle(error, context = '') {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        console.error('🚨 Erreur:', errorInfo);
        
        // Envoyer à un service de suivi des erreurs
        this.reportError(errorInfo);
        
        // Afficher à l'utilisateur
        this.showUserError(error.message, context);
    }
    
    static reportError(errorInfo) {
        // Implémentation pour envoyer les erreurs à un service externe
        // Sentry, LogRocket, etc.
        if (window.APP_CONFIG?.errorReporting) {
            // Envoyer l'erreur
        }
    }
    
    static showUserError(message, context) {
        // Afficher une notification d'erreur élégante
        const notification = createElement('div', ['error-notification']);
        notification.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-content">
                <div class="error-title">Erreur</div>
                <div class="error-message">${message}</div>
                ${context ? `<div class="error-context">${context}</div>` : ''}
            </div>
            <button class="error-close">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-suppression après 5 secondes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Fermeture manuelle
        notification.querySelector('.error-close').addEventListener('click', () => {
            notification.parentNode.removeChild(notification);
        });
    }
}

// Validation de données
export class Validator {
    static isEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static isStrongPassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
        
        return password.length >= minLength && 
               hasUpperCase && 
               hasLowerCase && 
               hasNumbers && 
               hasSpecialChar;
    }
    
    static isNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }
    
    static isInRange(value, min, max) {
        return value >= min && value <= max;
    }
}

// Fonctions de débogage
export function debug(...args) {
    if (window.APP_CONFIG?.debug) {
        console.log('🐛 DEBUG:', ...args);
    }
}

export function performanceTimer(name) {
    const start = performance.now();
    
    return {
        end: () => {
            const duration = performance.now() - start;
            console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
            return duration;
        }
    };
}

// Export global
window.SpatialUtils = {
    formatNumber,
    formatScientific,
    formatDate,
    formatDuration,
    createElement,
    showElement,
    hideElement,
    toggleElement,
    SecureStorage,
    ErrorHandler,
    Validator,
    debug,
    performanceTimer
};