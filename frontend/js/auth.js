// ==========================================
// Authentication Functions
// ==========================================

// Check if user is logged in
function isLoggedIn() {
    const token = localStorage.getItem('token');
    const user = storage.get('user');
    return token && user;
}

// Get current user
function getCurrentUser() {
    return storage.get('user');
}

// Get user role
function getUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

// Check if user is admin
function isAdmin() {
    return getUserRole() === 'admin';
}

// Check if user is final year
function isFinalYear() {
    const user = getCurrentUser();
    return user ? (user.role === 'finalyear' || user.year === 'Final Year') : false;
}

// Logout user
function logout() {
    localStorage.removeItem('token');
    storage.remove('user');
    window.location.href = '/login';
}

// Update navigation based on auth state
function updateNavigation() {
    const navAuth = document.getElementById('navAuth');
    const navUser = document.getElementById('navUser');
    const userGreeting = document.getElementById('userGreeting');

    if (isLoggedIn()) {
        const user = getCurrentUser();

        if (navAuth) navAuth.style.display = 'none';
        if (navUser) navUser.style.display = 'flex';
        if (userGreeting) userGreeting.textContent = `Hello, ${user.name.split(' ')[0]}`;
    } else {
        if (navAuth) navAuth.style.display = 'flex';
        if (navUser) navUser.style.display = 'none';
    }
}

// Setup logout button
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Protect route - redirect if not logged in
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Protect admin route
function requireAdmin() {
    if (!isLoggedIn()) {
        window.location.href = '/login';
        return false;
    }
    if (!isAdmin()) {
        window.location.href = '/dashboard';
        return false;
    }
    return true;
}

// Protect final year route
function requireFinalYear() {
    if (!isLoggedIn()) {
        window.location.href = '/login';
        return false;
    }
    if (!isFinalYear() && !isAdmin()) {
        window.location.href = '/dashboard';
        return false;
    }
    return true;
}

// Redirect logged in users away from auth pages
function redirectIfLoggedIn() {
    if (isLoggedIn()) {
        const user = getCurrentUser();
        if (user.role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/dashboard';
        }
        return true;
    }
    return false;
}

// Verify token with server
async function verifyToken() {
    try {
        const response = await api.get('/auth/me');
        if (response.success) {
            storage.set('user', response.user);
            return true;
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        logout();
    }
    return false;
}

// Initialize auth state
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
    setupLogout();
});
