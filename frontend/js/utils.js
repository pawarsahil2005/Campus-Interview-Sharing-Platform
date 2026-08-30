// ==========================================
// Utility Functions
// ==========================================

const API_BASE_URL = '/api';

// API Helper
const api = {
    async get(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    async post(endpoint, data) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    },

    async put(endpoint, data) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        return this.handleResponse(response);
    },

    async delete(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    },

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    async handleResponse(response) {
        const data = await response.json();
        if (!response.ok) {
            const err = new Error(data.message || 'Something went wrong');
            err.status = response.status;
            err.dbConnecting = !!data.dbConnecting; // propagate DB-connecting flag
            throw err;
        }
        return data;
    }
};

// Storage Helper
const storage = {
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    get(key) {
        const value = localStorage.getItem(key);
        try {
            return value ? JSON.parse(value) : null;
        } catch {
            return value;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    clear() {
        localStorage.clear();
    }
};

// Theme Management
const theme = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.apply(savedTheme);
        this.setupToggle();
    },

    apply(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('theme', themeName);
        this.updateIcon(themeName);
    },

    toggle() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.apply(newTheme);
    },

    updateIcon(themeName) {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = themeName === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            }
        }
    },

    setupToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    }
};

// Toast Notification
const toast = {
    show(message, type = 'success') {
        const toastEl = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toastEl && toastMessage) {
            toastMessage.textContent = message;
            toastEl.classList.remove('error');
            if (type === 'error') {
                toastEl.classList.add('error');
            }
            toastEl.classList.add('active');
            
            setTimeout(() => {
                toastEl.classList.remove('active');
            }, 3000);
        }
    },

    success(message) {
        this.show(message, 'success');
    },

    error(message) {
        this.show(message, 'error');
    }
};

// Date Formatting
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

function formatDateShort(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

function timeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'Just now';
}

// Difficulty Badge Color
function getDifficultyClass(difficulty) {
    switch (difficulty) {
        case 'Easy': return 'tag-easy';
        case 'Medium': return 'tag-medium';
        case 'Hard': return 'tag-hard';
        default: return '';
    }
}

// Experience Type Badge Color
function getExperienceTypeClass(type) {
    switch (type) {
        case 'Positive': return 'tag-positive';
        case 'Neutral': return 'tag-neutral';
        case 'Negative': return 'tag-negative';
        default: return '';
    }
}

// Status Badge
function getStatusBadge(status) {
    const classes = {
        'approved': 'status-approved',
        'pending': 'status-pending',
        'rejected': 'status-rejected'
    };
    return `<span class="status-badge ${classes[status] || ''}">${status}</span>`;
}

// Create Experience Card HTML
function createExperienceCard(experience) {
    const submitter = experience.submittedBy;
    const submitterName = experience.isAnonymous ? 'Anonymous' : (submitter?.name || 'Unknown');
    
    return `
        <div class="experience-card" onclick="window.location.href='/experience/${experience._id}'">
            <div class="experience-card-header">
                <h3>${escapeHtml(experience.companyName)}</h3>
                <p>${escapeHtml(experience.jobRole)}</p>
            </div>
            <div class="experience-card-body">
                <div class="experience-meta">
                    <span class="experience-tag ${getDifficultyClass(experience.difficulty)}">${experience.difficulty}</span>
                    <span class="experience-tag ${getExperienceTypeClass(experience.experienceType)}">${experience.experienceType}</span>
                </div>
                <p class="experience-preview">${escapeHtml(truncateText(experience.tips || 'No tips provided', 100))}</p>
            </div>
            <div class="experience-card-footer">
                <span><i class="fas fa-user"></i> ${escapeHtml(submitterName)}</span>
                <span><i class="fas fa-calendar"></i> ${formatDateShort(experience.interviewDate)}</span>
            </div>
        </div>
    `;
}

// Truncate Text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce function
function debounce(func, wait) {
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

// Show/Hide Loading
function showLoading(element) {
    element.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading...</p>
        </div>
    `;
}

// Show Empty State
function showEmptyState(element, message = 'No data found') {
    element.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>${message}</p>
        </div>
    `;
}

// Show Error
function showError(element, message = 'Something went wrong') {
    element.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Mobile Navigation Toggle
function setupMobileNav() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
}

// Initialize common functionality
document.addEventListener('DOMContentLoaded', () => {
    theme.init();
    setupMobileNav();
});
