// ==========================================
// Login Page Script
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (redirectIfLoggedIn()) return;

    const loginForm = document.getElementById('loginForm');
    const formError = document.getElementById('formError');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear previous errors
            formError.style.display = 'none';
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // Basic validation
            if (!email || !password) {
                showFormError('Please fill in all fields');
                return;
            }

            // Disable button and show loading
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

            try {
                const response = await api.post('/auth/login', { email, password });
                
                if (response.success) {
                    // Store token and user data
                    localStorage.setItem('token', response.token);
                    storage.set('user', response.user);

                    // Redirect based on role
                    if (response.user.role === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/dashboard';
                    }
                }
            } catch (error) {
                showFormError(error.message || 'Login failed. Please try again.');
            } finally {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
            }
        });
    }

    function showFormError(message) {
        formError.textContent = message;
        formError.style.display = 'block';
    }
});
