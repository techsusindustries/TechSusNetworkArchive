/**
 * Embed manager for handling site embedding functionality
 * Used specifically for anysite.html functionality
 */

class EmbedManager {
    constructor() {
        this.currentUrl = '';
        this.isLoading = false;
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupValidation();
    }
    
    bindEvents() {
        const submitBtn = document.querySelector('[data-embed-submit]');
        const urlInput = document.querySelector('[data-site-url]');
        const closeBtn = document.querySelector('[data-embed-close]');
        
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleEmbedSubmit();
            });
        }
        
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleEmbedSubmit();
                }
            });
            
            // Real-time URL validation
            urlInput.addEventListener('input', () => {
                this.validateUrl();
                this.clearErrorMessage();
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeEmbed();
            });
        }
    }
    
    setupValidation() {
        // Add input validation styling
        const urlInput = document.querySelector('[data-site-url]');
        if (urlInput) {
            urlInput.addEventListener('blur', () => {
                this.validateUrl(true);
            });
        }
    }
    
    validateUrl(showErrors = false) {
        const urlInput = document.querySelector('[data-site-url]');
        if (!urlInput) return false;
        
        const url = urlInput.value.trim();
        
        if (!url) {
            this.setInputState(urlInput, 'neutral');
            return false;
        }
        
        try {
            new URL(url);
            
            if (!url.startsWith('https://') && !url.startsWith('http://')) {
                if (showErrors) {
                    this.showErrorMessage('URL must start with https:// or http://');
                }
                this.setInputState(urlInput, 'error');
                return false;
            }
            
            this.setInputState(urlInput, 'success');
            return true;
        } catch {
            if (showErrors) {
                this.showErrorMessage('Please enter a valid URL (e.g., https://example.com)');
            }
            this.setInputState(urlInput, 'error');
            return false;
        }
    }
    
    setInputState(input, state) {
        input.classList.remove('input-success', 'input-error');
        
        if (state === 'success') {
            input.classList.add('input-success');
        } else if (state === 'error') {
            input.classList.add('input-error');
        }
    }
    
    async handleEmbedSubmit() {
        if (this.isLoading) return;
        
        const urlInput = document.querySelector('[data-site-url]');
        const siteUrl = urlInput?.value.trim();
        
        if (!siteUrl) {
            this.showErrorMessage('Please enter a URL to embed.');
            urlInput?.focus();
            return;
        }
        
        if (!this.validateUrl(true)) {
            urlInput?.focus();
            return;
        }
        
        this.setLoadingState(true);
        
        try {
            await this.embedSite(siteUrl);
        } catch (error) {
            this.showErrorMessage('Failed to load the website. Please try again.');
            console.error('Embed error:', error);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    async embedSite(url) {
        this.currentUrl = url;
        
        // Create embed container with improved structure
        const embedContainer = document.querySelector('[data-embed-container]');
        if (!embedContainer) return;
        
        const embedHTML = `
            <div class="embed-header">
                <div class="embed-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    ${this.formatUrl(url)}
                </div>
                <button class="close-btn" data-embed-close>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Close
                </button>
            </div>
            <div class="embed-content">
                <embed src="${this.sanitizeUrl(url)}" class="embed-frame" />
                <div class="embed-error hidden-content">
                    <div class="embed-error-content">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <h3>Unable to load website</h3>
                        <p>This website cannot be embedded due to security restrictions or connection issues.</p>
                        <a href="${this.sanitizeUrl(url)}" target="_blank" class="btn btn-primary">
                            Open in New Tab
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15,3 21,3 21,9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        embedContainer.innerHTML = embedHTML;
        
        // Show embed container
        embedContainer.classList.remove('hidden-content');
        embedContainer.classList.add('visible-content');
        
        // Set full viewport styles
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflow = 'hidden';
        
        // Hide site input form
        const siteInput = document.querySelector('[data-site-input]');
        if (siteInput) {
            siteInput.classList.add('hidden-content');
        }
        
        // Rebind close button
        const newCloseBtn = embedContainer.querySelector('[data-embed-close]');
        if (newCloseBtn) {
            newCloseBtn.addEventListener('click', () => {
                this.closeEmbed();
            });
        }
        
        // Handle embed errors
        this.setupEmbedErrorHandling(embedContainer);
    }
    
    setupEmbedErrorHandling(container) {
        const embed = container.querySelector('.embed-frame');
        const errorDiv = container.querySelector('.embed-error');
        
        if (embed && errorDiv) {
            embed.addEventListener('error', () => {
                embed.style.display = 'none';
                errorDiv.classList.remove('hidden-content');
            });
            
            // Timeout fallback for sites that don't trigger error event
            setTimeout(() => {
                if (embed.style.display !== 'none') {
                    try {
                        // Try to access embed document (will fail for blocked sites)
                        embed.contentDocument;
                    } catch (e) {
                        embed.style.display = 'none';
                        errorDiv.classList.remove('hidden-content');
                    }
                }
            }, 5000);
        }
    }
    
    formatUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }
    
    sanitizeUrl(url) {
        // Basic URL sanitization
        return url.replace(/[<>"']/g, '');
    }
    
    closeEmbed() {
        const embedContainer = document.querySelector('[data-embed-container]');
        const siteInput = document.querySelector('[data-site-input]');
        
        if (embedContainer) {
            embedContainer.classList.add('hidden-content');
            embedContainer.classList.remove('visible-content');
            embedContainer.innerHTML = '';
        }
        
        if (siteInput) {
            siteInput.classList.remove('hidden-content');
            siteInput.classList.add('visible-content');
        }
        
        // Reset body styles
        document.body.style.margin = '';
        document.body.style.padding = '';
        document.body.style.overflow = '';
        
        this.currentUrl = '';
    }
    
    setLoadingState(loading) {
        this.isLoading = loading;
        const submitBtn = document.querySelector('[data-embed-submit]');
        const urlInput = document.querySelector('[data-site-url]');
        
        if (submitBtn) {
            submitBtn.disabled = loading;
            if (loading) {
                submitBtn.innerHTML = '<span class="loading"><span class="loading-spinner"></span>Loading...</span>';
            } else {
                submitBtn.innerHTML = 'Submit';
            }
        }
        
        if (urlInput) {
            urlInput.disabled = loading;
        }
    }
    
    showErrorMessage(message) {
        const messageElement = document.querySelector('[data-embed-message]');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = 'message message-error';
            messageElement.style.display = 'block';
        }
    }
    
    clearErrorMessage() {
        const messageElement = document.querySelector('[data-embed-message]');
        if (messageElement) {
            messageElement.textContent = '';
            messageElement.style.display = 'none';
        }
    }
}

// Add CSS for input states
const inputStateCSS = `
.input-success {
    border-color: hsl(var(--success)) !important;
    box-shadow: 0 0 0 3px hsla(var(--success), 0.1) !important;
}

.input-error {
    border-color: hsl(var(--error)) !important;
    box-shadow: 0 0 0 3px hsla(var(--error), 0.1) !important;
}

.embed-error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: hsl(var(--background));
}

.embed-error-content {
    text-align: center;
    max-width: 400px;
    padding: var(--space-8);
}

.embed-error-content svg {
    color: hsl(var(--error));
    margin-bottom: var(--space-4);
}

.embed-error-content h3 {
    font-size: var(--text-xl);
    font-weight: 600;
    color: hsl(var(--text-primary));
    margin-bottom: var(--space-3);
}

.embed-error-content p {
    color: hsl(var(--text-secondary));
    margin-bottom: var(--space-6);
    line-height: 1.6;
}

.embed-content {
    height: calc(100vh - 60px);
    position: relative;
}
`;

const embedStyleSheet = document.createElement('style');
embedStyleSheet.textContent = inputStateCSS;
document.head.appendChild(embedStyleSheet);

// Initialize embed manager when DOM is ready (only for anysite page)
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('anysite')) {
        window.embedManager = new EmbedManager();
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmbedManager;
}
