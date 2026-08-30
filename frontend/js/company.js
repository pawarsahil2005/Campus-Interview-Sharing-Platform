// ==========================================
// Company Page JavaScript
// ==========================================
// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return; // Protect route
    init();
});

function getCompanyName() {
    const path = window.location.pathname;
    const parts = path.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
}

async function init() {
    // Auth nav
    const token = localStorage.getItem('token');
    if (token) {
        document.getElementById('navAuth').style.display = 'none';
        document.getElementById('navUser').style.display = 'flex';
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        });
    }

    // Nav toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle) {
        navToggle.addEventListener('click', () => navMenu.classList.toggle('active'));
    }

    // Theme
    if (typeof theme !== 'undefined') theme.init();

    // Load company data
    await loadCompanyData();
}

async function loadCompanyData() {
    const companyName = getCompanyName();
    document.getElementById('companyName').textContent = companyName;
    document.title = `${companyName} - PCCOE Interviews`;

    try {
        const data = await api.get(`/experiences/company/${encodeURIComponent(companyName)}/stats`);

        // Update header
        document.getElementById('companyName').textContent = data.companyName;
        document.getElementById('companyMeta').innerHTML = `
            <span><i class="fas fa-briefcase"></i> ${data.stats.jobRoles.join(', ')}</span>
            <span><i class="fas fa-calendar"></i> ${data.stats.years.join(', ')}</span>
        `;

        // Stats
        document.getElementById('statExperiences').textContent = data.stats.totalExperiences;
        document.getElementById('statSuccessRate').textContent = data.stats.successRate + '%';
        document.getElementById('statPackage').textContent = data.stats.avgPackage || '-';
        document.getElementById('statViews').textContent = data.stats.totalViews;

        // Difficulty bars
        const total = data.stats.totalExperiences;
        const dc = data.stats.difficultyCount;
        document.getElementById('difficultyBars').innerHTML = ['Easy', 'Medium', 'Hard'].map(d => {
            const count = dc[d] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const color = d === 'Easy' ? '#22c55e' : d === 'Medium' ? '#f59e0b' : '#ef4444';
            return `
                <div class="diff-bar-row">
                    <span class="diff-label">${d}</span>
                    <div class="diff-bar-track">
                        <div class="diff-bar-fill" style="width:${pct}%;background:${color}"></div>
                    </div>
                    <span class="diff-count">${count}</span>
                </div>
            `;
        }).join('');

        // Round types
        const rt = data.stats.roundTypes;
        document.getElementById('roundTags').innerHTML = Object.entries(rt)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => `<span class="round-type-tag">${escapeHtml(type)} <b>${count}</b></span>`)
            .join('');

        // Questions
        if (data.questions && data.questions.length > 0) {
            document.getElementById('companyQuestions').innerHTML = data.questions.map(q => `
                <li>
                    <span class="cq-text">${escapeHtml(q.text)}</span>
                    <span class="cq-round">${escapeHtml(q.roundType)}</span>
                </li>
            `).join('');
        } else {
            document.getElementById('companyQuestions').innerHTML = '<li class="no-data">No questions recorded yet</li>';
        }

        // Experiences grid
        if (data.experiences && data.experiences.length > 0) {
            document.getElementById('companyExperiences').innerHTML = data.experiences.map(exp => createExperienceCard(exp)).join('');
        } else {
            document.getElementById('companyExperiences').innerHTML = '<p class="no-data">No experiences yet</p>';
        }

    } catch (error) {
        console.error('Load company data error:', error);
        document.getElementById('companyName').textContent = 'Company Not Found';
        document.getElementById('statsGrid').innerHTML = '<p class="error-text">No data found for this company</p>';
    }
}

function createExperienceCard(exp) {
    const date = new Date(exp.interviewDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const submitter = exp.isAnonymous ? 'Anonymous' : (exp.submittedBy?.name || 'Student');

    return `
        <div class="experience-card" onclick="window.location.href='/experience/${exp._id}'">
            <div class="experience-card-header">
                <div class="company-info">
                    <h3>${escapeHtml(exp.companyName)}</h3>
                    <p>${escapeHtml(exp.jobRole)}</p>
                </div>
                <span class="difficulty-badge difficulty-${exp.difficulty}">${exp.difficulty}</span>
            </div>
            <div class="experience-card-body">
                <div class="experience-meta">
                    <span class="meta-item"><i class="fas fa-calendar"></i> ${date}</span>
                    <span class="meta-item"><i class="fas fa-user"></i> ${escapeHtml(submitter)}</span>
                </div>
            </div>
            <div class="experience-card-footer">
                <span class="experience-type type-${exp.experienceType}">
                    <i class="fas fa-${exp.experienceType === 'Positive' ? 'smile' : exp.experienceType === 'Negative' ? 'frown' : 'meh'}"></i>
                    ${exp.experienceType}
                </span>
                <span class="view-count"><i class="fas fa-eye"></i> ${exp.views || 0}</span>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
