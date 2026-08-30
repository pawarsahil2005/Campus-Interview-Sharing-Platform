// ==========================================
// Submit Experience Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    theme.init();
    checkAuth();
    initSubmitForm();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = storage.get('user');
    
    if (!token || !user) {
        window.location.href = '/login';
        return;
    }

    // Check if user is final year or admin
    if (user.role !== 'finalyear' && user.role !== 'admin') {
        alert('Only final year students can submit experiences.');
        window.location.href = '/dashboard';
        return;
    }

    // Update user greeting
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting) {
        userGreeting.textContent = `Hello, ${user.name}`;
    }

    // Logout handler
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        storage.remove('user');
        window.location.href = '/login';
    });
}

// Initialize submit form
function initSubmitForm() {
    // Set max date to today
    const dateInput = document.getElementById('interviewDate');
    if (dateInput) {
        dateInput.max = new Date().toISOString().split('T')[0];
    }

    // Add initial round
    addRound();

    // Add round button
    document.getElementById('addRoundBtn')?.addEventListener('click', addRound);

    // Add question button
    document.getElementById('addQuestionBtn')?.addEventListener('click', addQuestion);

    // Form submit handler
    document.getElementById('submitExperienceForm')?.addEventListener('submit', handleSubmit);

    // Setup remove question handlers
    setupRemoveQuestionHandlers();
}

// Round counter
let roundCounter = 0;

// Add interview round
function addRound() {
    roundCounter++;
    const container = document.getElementById('roundsContainer');
    
    const roundDiv = document.createElement('div');
    roundDiv.className = 'round-input';
    roundDiv.id = `round-${roundCounter}`;
    
    roundDiv.innerHTML = `
        <div class="round-header">
            <h4>Round ${roundCounter}</h4>
            <button type="button" class="btn-remove-round" onclick="removeRound(${roundCounter})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Round Type *</label>
                <select name="rounds[${roundCounter}][type]" required>
                    <option value="">Select Type</option>
                    <option value="Online Test">Online Test</option>
                    <option value="Technical Round">Technical Round</option>
                    <option value="HR Round">HR Round</option>
                    <option value="Coding Round">Coding Round</option>
                    <option value="Group Discussion">Group Discussion</option>
                    <option value="Case Study">Case Study</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Duration</label>
                <input type="text" name="rounds[${roundCounter}][duration]" placeholder="e.g., 1 hour">
            </div>
        </div>
        <div class="form-group">
            <label>Description *</label>
            <textarea name="rounds[${roundCounter}][description]" rows="3" required placeholder="Describe what happened in this round..."></textarea>
        </div>
        <div class="form-group">
            <label>Questions in this round (one per line)</label>
            <textarea name="rounds[${roundCounter}][questions]" rows="2" placeholder="Enter questions asked in this round..."></textarea>
        </div>
        <div class="form-group">
            <label>Tips for this round</label>
            <textarea name="rounds[${roundCounter}][tips]" rows="2" placeholder="Any specific tips for this round..."></textarea>
        </div>
    `;
    
    container.appendChild(roundDiv);
}

// Remove round
function removeRound(id) {
    const roundDiv = document.getElementById(`round-${id}`);
    if (roundDiv) {
        roundDiv.remove();
        updateRoundNumbers();
    }
}

// Update round numbers after removal
function updateRoundNumbers() {
    const rounds = document.querySelectorAll('.round-input');
    rounds.forEach((round, index) => {
        const header = round.querySelector('h4');
        if (header) {
            header.textContent = `Round ${index + 1}`;
        }
    });
}

// Add question
function addQuestion() {
    const container = document.getElementById('questionsContainer');
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-input';
    
    questionDiv.innerHTML = `
        <input type="text" name="questions[]" placeholder="Enter a question that was asked">
        <button type="button" class="btn-remove-question">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(questionDiv);
    setupRemoveQuestionHandlers();
}

// Setup remove question handlers
function setupRemoveQuestionHandlers() {
    document.querySelectorAll('.btn-remove-question').forEach(btn => {
        btn.onclick = function() {
            const container = document.getElementById('questionsContainer');
            if (container.children.length > 1) {
                this.parentElement.remove();
            } else {
                this.parentElement.querySelector('input').value = '';
            }
        };
    });
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const errorDiv = document.getElementById('submitFormError');
    
    // Reset error
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    try {
        // Gather form data
        const formData = {
            companyName: document.getElementById('companyName').value.trim(),
            jobRole: document.getElementById('jobRole').value.trim(),
            interviewDate: document.getElementById('interviewDate').value,
            packageOffered: document.getElementById('packageOffered').value.trim(),
            difficulty: document.getElementById('difficulty').value,
            experienceType: document.getElementById('experienceType').value,
            selectionStatus: document.getElementById('selectionStatus').value,
            tips: document.getElementById('tips').value.trim(),
            isAnonymous: document.getElementById('isAnonymous').checked,
            rounds: [],
            questions: []
        };

        // Gather rounds
        const roundInputs = document.querySelectorAll('.round-input');
        roundInputs.forEach(roundDiv => {
            const roundType = roundDiv.querySelector('select[name*="type"]')?.value;
            const description = roundDiv.querySelector('textarea[name*="description"]')?.value;
            
            if (roundType && description) {
                const round = {
                    roundType,
                    description,
                    duration: roundDiv.querySelector('input[name*="duration"]')?.value || '',
                    questions: (roundDiv.querySelector('textarea[name*="questions"]')?.value || '')
                        .split('\n')
                        .map(q => q.trim())
                        .filter(q => q),
                    tips: roundDiv.querySelector('textarea[name*="tips"]')?.value || ''
                };
                formData.rounds.push(round);
            }
        });

        // Gather questions
        document.querySelectorAll('input[name="questions[]"]').forEach(input => {
            const question = input.value.trim();
            if (question) {
                formData.questions.push(question);
            }
        });

        // Validate
        if (!formData.companyName || !formData.jobRole || !formData.interviewDate) {
            throw new Error('Please fill in all required fields');
        }

        if (formData.rounds.length === 0) {
            throw new Error('Please add at least one interview round');
        }

        // Submit
        const response = await api.post('/experiences', formData);
        
        // Show success modal
        document.getElementById('successModal').classList.add('active');
        
    } catch (error) {
        console.error('Submit error:', error);
        errorDiv.textContent = error.message || 'Failed to submit experience. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Experience';
    }
}
