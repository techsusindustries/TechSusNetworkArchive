// YouTube MP4 Converter JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const downloadForm = document.getElementById('downloadForm');
    const downloadBtn = document.getElementById('downloadBtn');
    const urlInput = document.getElementById('url');

    // Form validation and submission handling
    if (downloadForm) {
        downloadForm.addEventListener('submit', function(e) {
            const url = urlInput.value.trim();
            
            if (!isValidYouTubeUrl(url)) {
                e.preventDefault();
                showAlert('Please enter a valid YouTube URL', 'error');
                return;
            }

            // Show loading state
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            downloadBtn.disabled = true;
        });
    }

    // URL input validation
    if (urlInput) {
        urlInput.addEventListener('input', function() {
            const url = this.value.trim();
            const isValid = url === '' || isValidYouTubeUrl(url);
            
            this.classList.toggle('is-valid', url !== '' && isValid);
            this.classList.toggle('is-invalid', url !== '' && !isValid);
        });

        // Auto-focus on mobile
        if (window.innerWidth > 768) {
            urlInput.focus();
        }
    }

    // Auto-dismiss alerts
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        if (!alert.querySelector('.btn-close')) return;
        
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
});

/**
 * Validate YouTube URL
 */
function isValidYouTubeUrl(url) {
    const patterns = [
        /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
        /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/
    ];
    
    return patterns.some(pattern => pattern.test(url));
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container .row .col-lg-8, .container .row .col-md-10');
    if (container) {
        container.insertBefore(alertDiv, container.children[1]);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 5000);
    }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date
 */
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showAlert('Copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showAlert('Copied to clipboard!', 'success');
    } catch (err) {
        showAlert('Failed to copy to clipboard', 'error');
    }
    
    document.body.removeChild(textArea);
}

/**
 * Handle service worker for offline functionality
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker for caching (optional enhancement)
        // This would improve performance in Termux environments
    });
}

/**
 * Handle paste events for URL input
 */
document.addEventListener('paste', function(e) {
    const urlInput = document.getElementById('url');
    if (urlInput && document.activeElement === urlInput) {
        setTimeout(() => {
            const url = urlInput.value.trim();
            if (isValidYouTubeUrl(url)) {
                urlInput.classList.add('is-valid');
                urlInput.classList.remove('is-invalid');
            }
        }, 10);
    }
});

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const form = document.getElementById('downloadForm');
        if (form) {
            form.submit();
        }
    }
});

/**
 * Handle network status for offline detection
 */
window.addEventListener('online', function() {
    showAlert('Connection restored', 'success');
});

window.addEventListener('offline', function() {
    showAlert('Connection lost. Some features may not work.', 'error');
});
