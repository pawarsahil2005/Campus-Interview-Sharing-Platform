// ==========================================
// Dashboard Script
// ==========================================

let currentPage = 1;
let currentFilters = {};

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!requireAuth()) return;

    // Redirect admin to admin dashboard
    if (isAdmin()) {
        window.location.href = '/admin';
        return;
    }

    // Initialize dashboard
    await initDashboard();
});

async function initDashboard() {
    const user = getCurrentUser();

    // Update user info
    updateUserInfo(user);

    // Show final year specific elements
    if (isFinalYear() || isAdmin() || user.year === 'Final Year') {
        document.querySelectorAll('.final-year-only').forEach(el => {
            el.style.display = '';
        });
    }

    // Setup navigation
    setupSidebarNav();

    // Setup filters
    await setupFilters();

    // Setup submit form
    setupSubmitForm();

    // Setup profile section
    setupProfile();

    // Load initial data
    await loadOverviewData();
}

function updateUserInfo(user) {
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userGreeting = document.getElementById('userGreeting');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const welcomeDesc = document.getElementById('welcomeDesc');

    if (userName) userName.textContent = user.name;
    if (userRole) userRole.textContent = user.role === 'finalyear' ? 'Final Year' : user.year;
    if (userGreeting) userGreeting.textContent = `Hello, ${user.name.split(' ')[0]}`;
    if (welcomeMessage) welcomeMessage.textContent = `Welcome back, ${user.name.split(' ')[0]}!`;

    if (welcomeDesc) {
        if (isFinalYear() || user.year === 'Final Year') {
            welcomeDesc.textContent = 'Share your interview experiences and help juniors prepare better.';
        } else {
            welcomeDesc.textContent = 'Explore interview experiences and prepare for your placements.';
        }
    }
}

function setupSidebarNav() {
    const navLinks = document.querySelectorAll('[data-section]');
    const sections = document.querySelectorAll('.dashboard-section');

    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;

            // Update active states for sidebar links specifically
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            const activeSidebar = document.querySelector(`.sidebar-link[data-section="${sectionId}"]`);
            if (activeSidebar) activeSidebar.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Load section data
            switch (sectionId) {
                case 'overview':
                    await loadOverviewData();
                    break;
                case 'experiences':
                    await loadExperiences();
                    break;
                case 'saved':
                    await loadSavedItems();
                    break;
                case 'my-submissions':
                    await loadMySubmissions();
                    break;
                case 'profile':
                    await loadProfile();
                    break;
            }
        });
    });

    // Handle hash navigation
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        const link = document.querySelector(`.sidebar-link[data-section="${hash}"]`);
        if (link) link.click();
    }
}

async function setupFilters() {
    // Load companies
    try {
        const companiesRes = await api.get('/experiences/companies');
        const companyFilter = document.getElementById('companyFilter');
        if (companyFilter && companiesRes.success) {
            companyFilter.innerHTML = '<option value="">All Companies</option>';
            companiesRes.companies.forEach(company => {
                companyFilter.innerHTML += `<option value="${escapeHtml(company)}">${escapeHtml(company)}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }

    // Load years
    try {
        const yearsRes = await api.get('/experiences/years');
        const yearFilter = document.getElementById('yearFilter');
        if (yearFilter && yearsRes.success) {
            yearFilter.innerHTML = '<option value="">All Years</option>';
            yearsRes.years.forEach(year => {
                yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading years:', error);
    }

    // Setup filter buttons
    const applyBtn = document.getElementById('applyFilters');
    const clearBtn = document.getElementById('clearFilters');

    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            currentPage = 1;
            currentFilters = {
                company: document.getElementById('companyFilter')?.value || '',
                difficulty: document.getElementById('difficultyFilter')?.value || '',
                year: document.getElementById('yearFilter')?.value || '',
                search: document.getElementById('searchInput')?.value || ''
            };
            loadExperiences();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.getElementById('companyFilter').value = '';
            document.getElementById('difficultyFilter').value = '';
            document.getElementById('yearFilter').value = '';
            document.getElementById('searchInput').value = '';
            currentFilters = {};
            currentPage = 1;
            loadExperiences();
        });
    }

    // Search on enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                applyBtn?.click();
            }
        });
    }
}

async function loadOverviewData() {
    // Load stats
    try {
        const expRes = await api.get('/experiences?limit=1');
        if (expRes.success) {
            const totalEl = document.getElementById('totalExperiences');
            if (totalEl) totalEl.textContent = expRes.total || 0;
        }

        const companiesRes = await api.get('/experiences/companies');
        if (companiesRes.success) {
            const totalEl = document.getElementById('totalCompanies');
            if (totalEl) totalEl.textContent = companiesRes.count || 0;
        }

        if (isFinalYear() || (getCurrentUser() && getCurrentUser().year === 'Final Year')) {
            const myRes = await api.get('/experiences/my');
            if (myRes.success) {
                const totalEl = document.getElementById('mySubmissions');
                if (totalEl) totalEl.textContent = myRes.count || 0;
            }
        }
    } catch (error) {
        console.error('Error loading overview stats:', error);
    }

    // Load recent experiences
    const container = document.getElementById('recentExperiencesList');
    if (container) {
        try {
            const res = await api.get('/experiences?limit=5');
            if (res.success && res.experiences.length > 0) {
                container.innerHTML = res.experiences.map(exp => `
                    <div class="experience-card" onclick="window.location.href='/experience/${exp._id}'">
                        <div class="experience-card-header">
                            <h3>${escapeHtml(exp.companyName)}</h3>
                            <p>${escapeHtml(exp.jobRole)}</p>
                        </div>
                        <div class="experience-card-body">
                            <div class="experience-meta">
                                <span class="experience-tag ${getDifficultyClass(exp.difficulty)}">${exp.difficulty}</span>
                                <span class="experience-tag ${getExperienceTypeClass(exp.experienceType)}">${exp.experienceType}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                showEmptyState(container, 'No experiences yet');
            }
        } catch (error) {
            showError(container, 'Failed to load experiences');
        }
    }
}

async function loadExperiences() {
    const container = document.getElementById('experiencesGrid');
    if (!container) return;

    showLoading(container);

    try {
        let url = `/experiences?page=${currentPage}&limit=12`;

        if (currentFilters.company) url += `&company=${encodeURIComponent(currentFilters.company)}`;
        if (currentFilters.difficulty) url += `&difficulty=${currentFilters.difficulty}`;
        if (currentFilters.year) url += `&year=${currentFilters.year}`;
        if (currentFilters.search) url += `&search=${encodeURIComponent(currentFilters.search)}`;

        const res = await api.get(url);

        if (res.success && res.experiences.length > 0) {
            container.innerHTML = res.experiences.map(exp => createExperienceCard(exp)).join('');
            renderPagination(res.currentPage, res.totalPages);
        } else {
            showEmptyState(container, 'No experiences found matching your criteria');
            document.getElementById('pagination').innerHTML = '';
        }
    } catch (error) {
        showError(container, 'Failed to load experiences');
    }
}

function renderPagination(currentPage, totalPages) {
    const container = document.getElementById('pagination');
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<span>...</span>';
        }
    }

    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadExperiences();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadMySubmissions() {
    const container = document.getElementById('submissionsList');
    if (!container) return;

    showLoading(container);

    try {
        const res = await api.get('/experiences/my');

        if (res.success && res.experiences.length > 0) {
            container.innerHTML = res.experiences.map(exp => `
                <div class="submission-card">
                    <div class="submission-info">
                        <h4>${escapeHtml(exp.companyName)} - ${escapeHtml(exp.jobRole)}</h4>
                        <p>Submitted on ${formatDate(exp.createdAt)}</p>
                    </div>
                    <div class="submission-status">
                        ${getStatusBadge(exp.status)}
                        <button class="btn btn-sm btn-outline" onclick="viewExperience('${exp._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            showEmptyState(container, 'You haven\'t submitted any experiences yet');
        }
    } catch (error) {
        showError(container, 'Failed to load submissions');
    }
}

function viewExperience(id) {
    window.location.href = `/experience/${id}`;
}

// Submit Experience Form
function setupSubmitForm() {
    const form = document.getElementById('submitExperienceForm');
    const roundsContainer = document.getElementById('roundsContainer');
    const questionsContainer = document.getElementById('questionsContainer');
    const addRoundBtn = document.getElementById('addRoundBtn');
    const addQuestionBtn = document.getElementById('addQuestionBtn');

    if (!form) return;

    // Add initial round
    addRound();

    // Add round button
    if (addRoundBtn) {
        addRoundBtn.addEventListener('click', addRound);
    }

    // Add question button
    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', addQuestion);
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitExperience();
    });
}

let roundCount = 0;

const AVAILABLE_TOPICS = ['DSA', 'System Design', 'DBMS', 'OOPs', 'Operating Systems', 'Computer Networks', 'HR Interview', 'Puzzles', 'Coding', 'Web Development', 'Backend Development', 'Machine Learning', 'Online Assessment', 'Technical Interview', 'Aptitude', 'Logical Reasoning', 'Behavioural', 'Project Discussion', 'Other'];

function addRound() {
    const container = document.getElementById('roundsContainer');
    if (!container) return;

    roundCount++;
    const roundHtml = `
        <div class="round-item" id="round-${roundCount}">
            <div class="round-header">
                <h4>Round ${roundCount}</h4>
                <button type="button" class="btn-remove-round" onclick="removeRound(${roundCount})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="form-group">
                <label>Round Type</label>
                <select name="roundType-${roundCount}" required>
                    <option value="Online Test">Online Test</option>
                    <option value="Technical Round">Technical Round</option>
                    <option value="HR Round">HR Round</option>
                    <option value="Group Discussion">Group Discussion</option>
                    <option value="Coding Round">Coding Round</option>
                    <option value="Case Study">Case Study</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea name="roundDesc-${roundCount}" rows="3" placeholder="Describe what happened in this round..."></textarea>
            </div>
            <div class="form-group">
                <label style="display:flex; justify-content:space-between; align-items:center;">
                    Key Questions
                    <button type="button" class="btn btn-sm btn-outline" onclick="addRoundQuestion(${roundCount})">
                        <i class="fas fa-plus"></i> Add Question
                    </button>
                </label>
                <div id="roundQuestionsContainer-${roundCount}">
                    <!-- Dynamic round questions go here -->
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', roundHtml);
}

function addRoundQuestion(roundId) {
    const container = document.getElementById(`roundQuestionsContainer-${roundId}`);
    if (!container) return;

    const questionHtml = `
        <div class="round-question-item" style="background:var(--bg-secondary); padding:1rem; border-radius:0.5rem; margin-bottom:1rem; border:1px dashed var(--border-color);">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; align-items:center;">
                <label style="font-weight:600; font-size:0.85rem;">Question</label>
                <button type="button" class="btn-icon btn-icon-danger" onclick="this.closest('.round-question-item').remove()" title="Remove Question">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <input type="text" class="round-question-text" placeholder="e.g. Briefly explain polymorphism" style="width:100%; margin-bottom:0.5rem; padding: 0.6rem; border-radius: 0.4rem; border: 1px solid var(--border-color);">
            
            <label style="font-weight:600; font-size:0.8rem; margin-bottom:0.3rem; display:block;">Topics</label>
            <div class="topic-pills-container" style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                ${AVAILABLE_TOPICS.map(topic => `
                    <button type="button" class="topic-pill" style="font-size:0.75rem; padding:0.2rem 0.6rem;" onclick="this.classList.toggle('active')" data-topic="${topic}">
                        ${topic}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', questionHtml);
}

function removeRound(id) {
    const round = document.getElementById(`round-${id}`);
    if (round) round.remove();
}

function addQuestion() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;

    const questionHtml = `
        <div class="question-item" style="background:var(--bg-tertiary); padding:1rem; border-radius:0.5rem; margin-bottom:1rem; border:1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.8rem; align-items:center;">
                <label style="font-weight:600; font-size:0.9rem; margin-bottom:0;">Question Text</label>
                <button type="button" class="btn-icon btn-icon-danger" onclick="this.closest('.question-item').remove()" title="Remove Question">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <input type="text" class="question-text-input" placeholder="e.g. Briefly explain polymorphism" style="width:100%; margin-bottom:1rem; padding: 0.8rem; border-radius: 0.5rem; border: 1px solid var(--border-color);">
            
            <label style="font-weight:600; font-size:0.9rem; margin-bottom:0.5rem; display:block;">Select Topics</label>
            <div class="topic-pills-container" style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                ${AVAILABLE_TOPICS.map(topic => `
                    <button type="button" class="topic-pill" onclick="this.classList.toggle('active')" data-topic="${topic}">
                        ${topic}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', questionHtml);
}

async function submitExperience() {
    const form = document.getElementById('submitExperienceForm');
    const submitBtn = document.getElementById('submitBtn');
    const formError = document.getElementById('submitFormError');

    // Gather form data
    const companyName = document.getElementById('companyName').value.trim();
    const jobRole = document.getElementById('jobRole').value.trim();
    const interviewDate = document.getElementById('interviewDate').value;
    const packageOffered = document.getElementById('packageOffered')?.value.trim();
    const difficulty = document.getElementById('difficulty').value;
    const experienceType = document.getElementById('experienceType').value;
    const selectionStatus = document.getElementById('selectionStatus').value;
    const tips = document.getElementById('tips').value.trim();
    const isAnonymous = document.getElementById('isAnonymous').checked;

    // Gather rounds
    const rounds = [];
    const roundItems = document.querySelectorAll('.round-item');
    roundItems.forEach((item, index) => {
        const id = item.id.replace('round-', '');
        const roundType = item.querySelector(`[name="roundType-${id}"]`)?.value;
        const description = item.querySelector(`[name="roundDesc-${id}"]`)?.value || '';

        const questions = [];
        const questionTags = [];
        const roundQuestionItems = item.querySelectorAll('.round-question-item');

        let rqIndex = 0;
        roundQuestionItems.forEach(rqItem => {
            const textInput = rqItem.querySelector('.round-question-text');
            if (textInput && textInput.value.trim()) {
                questions.push(textInput.value.trim());

                const activePills = rqItem.querySelectorAll('.topic-pill.active');
                if (activePills.length > 0) {
                    const tags = Array.from(activePills).map(pill => pill.dataset.topic);
                    questionTags.push({
                        questionIndex: rqIndex,
                        tags: tags
                    });
                }
                rqIndex++;
            }
        });

        if (roundType && (description.trim() || questions.length > 0)) {
            rounds.push({ roundType, description, questions, questionTags });
        }
    });

    // Gather questions
    const questionItems = document.querySelectorAll('.question-item');
    const questions = [];
    const questionTags = [];
    let qIndex = 0;

    questionItems.forEach(item => {
        const textInput = item.querySelector('.question-text-input');
        if (textInput && textInput.value.trim()) {
            questions.push(textInput.value.trim());

            const activePills = item.querySelectorAll('.topic-pill.active');
            if (activePills.length > 0) {
                const tags = Array.from(activePills).map(pill => pill.dataset.topic);
                questionTags.push({
                    questionIndex: qIndex,
                    tags: tags
                });
            }
            qIndex++;
        }
    });

    // Validate
    if (!companyName || !jobRole || !interviewDate || !difficulty || !experienceType) {
        formError.textContent = 'Please fill in all required fields';
        formError.style.display = 'block';
        return;
    }

    // Submit
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    formError.style.display = 'none';

    try {
        const response = await api.post('/experiences', {
            companyName,
            jobRole,
            interviewDate,
            packageOffered,
            difficulty,
            experienceType,
            selectionStatus,
            tips,
            isAnonymous,
            rounds,
            questions,
            questionTags
        });

        if (response.success) {
            toast.success('Experience submitted successfully!');
            form.reset();

            // Reset rounds
            document.getElementById('roundsContainer').innerHTML = '';
            roundCount = 0;
            addRound();

            // Go to my submissions
            const link = document.querySelector('[data-section="my-submissions"]');
            if (link) link.click();
        }
    } catch (error) {
        formError.textContent = error.message || 'Failed to submit experience';
        formError.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Experience';
    }
}

// Profile Section
function setupProfile() {
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const modal = document.getElementById('changePasswordModal');
    const closeBtn = document.getElementById('closePasswordModal');
    const form = document.getElementById('changePasswordForm');

    if (changePasswordBtn && modal) {
        changePasswordBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await changePassword();
        });
    }
}

async function loadProfile() {
    const user = getCurrentUser();

    document.getElementById('profileName').textContent = user.name || '-';
    document.getElementById('profileEmail').textContent = user.email || '-';
    document.getElementById('profileRollNumber').textContent = user.rollNumber || '-';
    document.getElementById('profileBranch').textContent = user.branch || '-';
    document.getElementById('profileYear').textContent = user.year || '-';
    document.getElementById('profileRole').textContent = user.role === 'finalyear' ? 'Final Year Student' : (user.role === 'junior' ? 'Junior Student' : 'Admin');
    document.getElementById('profileCreatedAt').textContent = user.createdAt ? formatDate(user.createdAt) : '-';
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const formError = document.getElementById('passwordFormError');

    if (newPassword !== confirmNewPassword) {
        formError.textContent = 'New passwords do not match';
        formError.style.display = 'block';
        return;
    }

    if (newPassword.length < 6) {
        formError.textContent = 'Password must be at least 6 characters';
        formError.style.display = 'block';
        return;
    }

    try {
        const response = await api.put('/auth/updatepassword', {
            currentPassword,
            newPassword
        });

        if (response.success) {
            localStorage.setItem('token', response.token);
            document.getElementById('changePasswordModal').classList.remove('active');
            document.getElementById('changePasswordForm').reset();
            toast.success('Password updated successfully!');
        }
    } catch (error) {
        formError.textContent = error.message || 'Failed to update password';
        formError.style.display = 'block';
    }
}

// ==========================================
// Saved Items Section
// ==========================================

async function loadSavedItems() {
    // Setup tab switching
    document.querySelectorAll('.saved-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.saved-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabId = tab.dataset.tab;
            document.querySelectorAll('.saved-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Load bookmarks
    try {
        const res = await api.get('/bookmarks');
        renderSavedExperiences(res.experiences || []);
        renderSavedQuestions(res.questions || []);
    } catch (error) {
        console.error('Error loading bookmarks:', error);
    }
}

function renderSavedExperiences(experiences) {
    const grid = document.getElementById('savedExperiencesGrid');
    const empty = document.getElementById('noSavedExperiences');

    if (experiences.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    grid.innerHTML = experiences.map(exp => `
        <div class="experience-card saved-experience-card" data-id="${exp._id}">
            <button class="remove-bookmark-btn" onclick="removeExperienceBookmark('${exp._id}')" title="Remove bookmark">
                <i class="fas fa-times"></i>
            </button>
            <div class="experience-card-content" onclick="window.location.href='/experience/${exp._id}'">
                <div class="experience-card-header">
                    <div class="company-info">
                        <h3>${escapeHtml(exp.companyName)}</h3>
                        <p>${escapeHtml(exp.jobRole)}</p>
                    </div>
                    <span class="difficulty-badge difficulty-${exp.difficulty}">${exp.difficulty}</span>
                </div>
                <div class="experience-card-body">
                    <div class="experience-meta">
                        <span class="meta-item">
                            <i class="fas fa-calendar"></i> ${formatDate(exp.interviewDate)}
                        </span>
                    </div>
                    <p class="experience-summary">${escapeHtml((exp.tips || '').substring(0, 100))}...</p>
                </div>
                <div class="experience-card-footer">
                    <span class="experience-type type-${exp.experienceType}">
                        <i class="fas fa-${exp.experienceType === 'Positive' ? 'smile' : exp.experienceType === 'Negative' ? 'frown' : 'meh'}"></i>
                        ${exp.experienceType}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderSavedQuestions(questions) {
    const list = document.getElementById('savedQuestionsList');
    const empty = document.getElementById('noSavedQuestions');

    if (questions.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = questions.map((q, idx) => `
        <div class="saved-question-card" data-idx="${idx}">
            <button class="remove-bookmark-btn" onclick="removeQuestionBookmark('${q.experienceId}', ${q.roundIndex}, ${q.questionIndex})" title="Remove bookmark">
                <i class="fas fa-times"></i>
            </button>
            <p><i class="fas fa-question-circle" style="color:var(--primary-color);margin-right:0.4rem;"></i> ${escapeHtml(q.questionText)}</p>
            <div class="saved-question-meta">
                <span><i class="fas fa-building"></i> ${escapeHtml(q.companyName || 'Company')}</span>
                <a href="/experience/${q.experienceId}" class="btn btn-sm btn-outline" style="margin-left:auto;">
                    <i class="fas fa-external-link-alt"></i> View Experience
                </a>
            </div>
        </div>
    `).join('');
}

async function removeExperienceBookmark(expId) {
    try {
        await api.post(`/bookmarks/experience/${expId}`);
        // Refresh saved items
        await loadSavedItems();
        toast.success('Bookmark removed');
    } catch (error) {
        console.error('Error removing bookmark:', error);
        toast.error('Failed to remove bookmark');
    }
}

async function removeQuestionBookmark(experienceId, roundIndex, questionIndex) {
    try {
        await api.post('/bookmarks/question', { experienceId, roundIndex, questionIndex });
        // Refresh saved items
        await loadSavedItems();
        toast.success('Bookmark removed');
    } catch (error) {
        console.error('Error removing bookmark:', error);
        toast.error('Failed to remove bookmark');
    }
}
