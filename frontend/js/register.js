// ==========================================
// Register Page Script with OTP Verification
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (redirectIfLoggedIn()) return;

    // State
    let emailVerified = false;

    // DOM Elements
    const registerForm = document.getElementById('registerForm');
    const formError = document.getElementById('formError');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const registerBtn = document.getElementById('registerBtn');
    const emailInput = document.getElementById('email');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const otpSection = document.getElementById('otpSection');
    const otpInput = document.getElementById('otp');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const verifiedBadge = document.getElementById('verifiedBadge');
    const emailHint = document.getElementById('emailHint');
    const otpHint = document.getElementById('otpHint');

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }

    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', () => {
            const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
            confirmPasswordInput.type = type;
            toggleConfirmPassword.querySelector('i').className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
    }

    // Send OTP button handler
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();

            // Validate email
            if (!email) {
                showHint(emailHint, 'Please enter your email', 'error');
                return;
            }

            // Check PCCOE domain
            const pccoeDomainRegex = /@pccoepune\.org$/i;
            if (!pccoeDomainRegex.test(email)) {
                showHint(emailHint, 'Please use your PCCOE email (@pccoepune.org)', 'error');
                return;
            }

            // Disable button and show loading
            sendOtpBtn.disabled = true;
            sendOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                const response = await api.post('/auth/send-otp', { email });
                
                if (response.success) {
                    // Show OTP section
                    otpSection.style.display = 'block';
                    emailInput.disabled = true;
                    sendOtpBtn.innerHTML = 'Resend';
                    sendOtpBtn.disabled = false;
                    
                    if (response.devOtp) {
                        // Development fallback: auto-fill OTP and show it visibly
                        otpInput.value = response.devOtp;
                        showHint(otpHint,
                            `⚡ Dev Mode: OTP is ${response.devOtp} (email delivery unavailable on this network)`,
                            'info'
                        );
                        showHint(emailHint, 'OTP auto-filled (dev mode)', 'info');
                    } else if (response.development) {
                        showHint(emailHint, 'Dev Mode: Check server console for OTP', 'info');
                    } else {
                        showHint(emailHint, '✓ OTP sent! Check your inbox.', 'success');
                    }
                    
                    otpInput.focus();
                }
            } catch (error) {
                showHint(emailHint, error.message || 'Failed to send OTP', 'error');
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerHTML = 'Send OTP';
            }
        });
    }

    // Verify OTP button handler
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const otp = otpInput.value.trim();

            if (!otp || otp.length !== 6) {
                showHint(otpHint, 'Please enter a valid 6-digit OTP', 'error');
                return;
            }

            verifyOtpBtn.disabled = true;
            verifyOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            try {
                const response = await api.post('/auth/verify-otp', { email, otp });
                
                if (response.success) {
                    emailVerified = true;
                    
                    // Hide OTP section, show verified badge
                    otpSection.style.display = 'none';
                    verifiedBadge.style.display = 'flex';
                    sendOtpBtn.style.display = 'none';
                    emailInput.disabled = true;
                    
                    showHint(emailHint, '', 'success');
                    showFormError('');
                }
            } catch (error) {
                showHint(otpHint, error.message || 'Invalid OTP', 'error');
            } finally {
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.innerHTML = 'Verify';
            }
        });
    }

    // Handle registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear previous errors
            formError.style.display = 'none';
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const rollNumber = document.getElementById('rollNumber').value.trim();
            const branch = document.getElementById('branch').value;
            const year = document.getElementById('year').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validation
            if (!name || !email || !branch || !year || !password || !confirmPassword) {
                showFormError('Please fill in all required fields');
                return;
            }

            // Check if email is verified
            if (!emailVerified) {
                showFormError('Please verify your email address first');
                return;
            }

            if (password.length < 6) {
                showFormError('Password must be at least 6 characters');
                return;
            }

            if (password !== confirmPassword) {
                showFormError('Passwords do not match');
                return;
            }

            // Disable button and show loading
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

            try {
                const response = await api.post('/auth/register', {
                    name,
                    email,
                    rollNumber,
                    branch,
                    year,
                    password
                });
                
                if (response.success) {
                    // Store token and user data
                    localStorage.setItem('token', response.token);
                    storage.set('user', response.user);

                    // Redirect to dashboard
                    window.location.href = '/dashboard';
                }
            } catch (error) {
                showFormError(error.message || 'Registration failed. Please try again.');
            } finally {
                registerBtn.disabled = false;
                registerBtn.innerHTML = '<span>Create Account</span><i class="fas fa-arrow-right"></i>';
            }
        });
    }

    function showFormError(message) {
        if (message) {
            formError.textContent = message;
            formError.style.display = 'block';
        } else {
            formError.style.display = 'none';
        }
    }

    function showHint(element, message, type = 'info') {
        if (!element) return;
        element.textContent = message;
        element.className = `form-hint hint-${type}`;
    }
});
