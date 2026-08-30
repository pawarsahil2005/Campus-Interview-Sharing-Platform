// ==========================================
// Questions Bank Page
// ==========================================

let allQuestions = [];
let filteredQuestions = [];

// Round type color mapping
const ROUND_TYPE_COLORS = {
    'Technical Round': { bg: '#dbeafe', text: '#1d4ed8' },
    'Technical': { bg: '#dbeafe', text: '#1d4ed8' },
    'Coding Round': { bg: '#e0e7ff', text: '#3730a3' },
    'HR Round': { bg: '#fce7f3', text: '#be185d' },
    'HR': { bg: '#fce7f3', text: '#be185d' },
    'Online Test': { bg: '#fef3c7', text: '#92400e' },
    'Aptitude': { bg: '#fef3c7', text: '#92400e' },
    'Group Discussion': { bg: '#d1fae5', text: '#065f46' },
    'Case Study': { bg: '#ede9fe', text: '#5b21b6' },
    'Managerial': { bg: '#ede9fe', text: '#5b21b6' },
    'General': { bg: '#f3f4f6', text: '#374151' },
    'Other': { bg: '#f3f4f6', text: '#374151' }
};

function getRoundTypeStyle(roundType) {
    const colors = ROUND_TYPE_COLORS[roundType] || ROUND_TYPE_COLORS['General'];
    return `background:${colors.bg};color:${colors.text}`;
}

// ==========================================
// Load Initial Data
// ==========================================
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

    // Load companies for filter
    try {
        const data = await api.get('/experiences/companies');
        const companyFilter = document.getElementById('companyFilter');
        if (data.companies) {
            data.companies.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                companyFilter.appendChild(opt);
            });
        }
    } catch (e) { /* ignore */ }

    // Load questions
    await loadQuestions();

    // Wire up events
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    document.getElementById('searchInput').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') applyFilters();
    });

    // Answer modal events
    document.getElementById('closeAnswerModal').addEventListener('click', closeAnswerModal);
    document.getElementById('cancelAnswer').addEventListener('click', closeAnswerModal);
    document.getElementById('answerText').addEventListener('input', updateCharCount);
    document.getElementById('answerForm').addEventListener('submit', submitAnswer);

    // Close modal on backdrop click
    document.getElementById('answerModal').addEventListener('click', function (e) {
        if (e.target === this) closeAnswerModal();
    });
}

async function loadQuestions(params = {}) {
    const resultsCount = document.getElementById('resultsCount');
    resultsCount.textContent = 'Loading questions...';

    let url = '/experiences/questions';
    const queryParts = [];
    for (const [k, v] of Object.entries(params)) {
        if (!v) continue;
        if (Array.isArray(v)) {
            // Handle array params like topics
            queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v.join(','))}`);
        } else {
            queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
        }
    }
    if (queryParts.length > 0) url += '?' + queryParts.join('&');

    try {
        const data = await api.get(url);
        allQuestions = data.questions || [];
        // If topics filter was applied, do client-side filtering since backend may not support it
        if (params.topics && params.topics.length > 0) {
            filteredQuestions = allQuestions.filter(q => {
                // Check if question has any of the selected topics
                if (q.tags && q.tags.length > 0) {
                    return q.tags.some(t => params.topics.includes(t));
                }
                return false;
            });
        } else {
            filteredQuestions = allQuestions;
        }
        renderQuestions(filteredQuestions);
    } catch (err) {
        resultsCount.textContent = 'Error loading questions.';
        console.error(err);
    }
}

// ==========================================
// Filter / Search
// ==========================================
function applyFilters() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const company = document.getElementById('companyFilter').value;
    const roundTypeEl = document.querySelector('input[name="roundType"]:checked');
    const roundType = roundTypeEl ? roundTypeEl.value : '';

    // Get selected topic tags
    const topicCheckboxes = document.querySelectorAll('input[name="topicTag"]:checked');
    const topics = Array.from(topicCheckboxes).map(cb => cb.value);

    const params = {};
    if (company) params.company = company;
    if (roundType) params.roundType = roundType;
    if (search) params.search = search;
    if (topics.length > 0) params.topics = topics;

    loadQuestions(params);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('companyFilter').value = '';
    const firstRadio = document.querySelector('input[name="roundType"]');
    if (firstRadio) firstRadio.checked = true;
    // Uncheck all topic checkboxes
    document.querySelectorAll('input[name="topicTag"]').forEach(cb => cb.checked = false);
    loadQuestions();
}

// ==========================================
// Render Questions
// ==========================================
function renderQuestions(questions) {
    const list = document.getElementById('questionsList');
    const empty = document.getElementById('emptyState');
    const resultsCount = document.getElementById('resultsCount');

    resultsCount.textContent = `${questions.length} question${questions.length !== 1 ? 's' : ''} found`;

    if (questions.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';

    list.innerHTML = questions.map((q, idx) => `
        <div class="question-bank-card" data-idx="${idx}">
            <div class="question-bank-body">
                <p class="question-bank-text"><i class="fas fa-question-circle qicon"></i> ${escapeHtml(q.text)}</p>
                <div class="question-bank-tags">
                    <span class="qtag qtag-company"><i class="fas fa-building"></i> ${escapeHtml(q.companyName)}</span>
                    <span class="qtag qtag-role"><i class="fas fa-briefcase"></i> ${escapeHtml(q.jobRole)}</span>
                    <span class="qtag qtag-round" style="${getRoundTypeStyle(q.roundType)}">
                        <i class="fas fa-layer-group"></i> ${escapeHtml(q.roundType)}
                    </span>
                    ${q.roundName && q.roundName !== 'General' && q.roundName !== q.roundType
            ? `<span class="qtag qtag-roundname"><i class="fas fa-circle-dot"></i> ${escapeHtml(q.roundName)}</span>` : ''}
                </div>
                ${q.tags && q.tags.length > 0 ? `
                <div class="topic-tags-row">
                    ${q.tags.map(t => `<span class="topic-tag"><i class="fas fa-tag"></i> ${escapeHtml(t)}</span>`).join('')}
                </div>` : ''}
            </div>
            <div class="question-bank-actions">
                <a href="/experience/${q.experienceId}" class="btn btn-sm btn-outline" target="_blank">
                    <i class="fas fa-external-link-alt"></i> View Experience
                </a>
                <button class="btn btn-sm btn-primary answer-btn"
                    data-exp="${q.experienceId}"
                    data-round="${q.roundIndex}"
                    data-qidx="${q.questionIndex}"
                    data-qtext="${escapeAttr(q.text)}">
                    <i class="fas fa-pen"></i> Add Answer
                </button>
                <button class="btn btn-sm btn-ghost view-answers-btn"
                    data-exp="${q.experienceId}"
                    data-round="${q.roundIndex}"
                    data-qidx="${q.questionIndex}"
                    data-qtext="${escapeAttr(q.text)}">
                    <i class="fas fa-comments"></i> Answers
                </button>
            </div>
            <div class="answers-inline" id="answers-${q.experienceId}-${q.roundIndex}-${q.questionIndex}"
                style="display:none;"></div>
        </div>
    `).join('');

    // Wire buttons
    list.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', () => openAnswerModal(btn));
    });
    list.querySelectorAll('.view-answers-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleAnswers(btn));
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
}

function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ==========================================
// Answers inline display
// ==========================================
async function toggleAnswers(btn) {
    const expId = btn.dataset.exp;
    const round = btn.dataset.round;
    const qidx = btn.dataset.qidx;
    const containerId = `answers-${expId}-${round}-${qidx}`;
    const container = document.getElementById(containerId);

    if (!container) return;

    if (container.style.display !== 'none') {
        container.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-comments"></i> Answers';
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    container.style.display = 'block';
    container.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Loading answers...</p>';

    try {
        const url = `/experiences/${expId}/answers?roundIndex=${round}&questionIndex=${qidx}`;
        const data = await api.get(url);
        const answers = data.answers || [];

        if (answers.length === 0) {
            container.innerHTML = '<p class="no-answers-text"><i class="fas fa-comment-slash"></i> No answers yet. Be the first to answer!</p>';
        } else {
            container.innerHTML = `
                <div class="answers-list">
                    <h4 class="answers-heading"><i class="fas fa-comments"></i> ${answers.length} Answer${answers.length !== 1 ? 's' : ''}</h4>
                    ${answers.map(a => renderAnswerCard(a, expId)).join('')}
                </div>`;

            // Wire upvote buttons
            container.querySelectorAll('.upvote-btn').forEach(ubtn => {
                ubtn.addEventListener('click', () => handleUpvote(ubtn, expId));
            });
        }
        btn.innerHTML = '<i class="fas fa-comments"></i> Hide Answers';
    } catch (err) {
        container.innerHTML = '<p class="error-text"><i class="fas fa-exclamation-circle"></i> Failed to load answers.</p>';
        btn.innerHTML = '<i class="fas fa-comments"></i> Answers';
    }
}

function renderAnswerCard(answer, expId) {
    const name = answer.submittedBy?.name || 'Anonymous';
    const branch = answer.submittedBy?.branch;
    const date = answer.createdAt ? timeAgo(answer.createdAt) : '';
    const token = localStorage.getItem('token');

    return `
        <div class="answer-card" data-answer-id="${answer._id}">
            <div class="answer-meta">
                <span class="answer-author"><i class="fas fa-user-circle"></i> ${escapeHtml(name)}${branch && branch !== 'N/A' ? ` <span class="answer-branch">&bull; ${escapeHtml(branch)}</span>` : ''}</span>
                <span class="answer-time">${escapeHtml(date)}</span>
            </div>
            <p class="answer-text">${escapeHtml(answer.answerText)}</p>
            <div class="answer-footer">
                <button class="upvote-btn ${answer.upvotes > 0 ? 'has-upvotes' : ''}"
                    data-answer-id="${answer._id}"
                    ${!token ? 'title="Login to upvote"' : ''}>
                    <i class="fas fa-arrow-up"></i> <span class="upvote-count">${answer.upvotes || 0}</span>
                </button>
            </div>
        </div>`;
}

async function handleUpvote(btn, expId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to upvote answers.');
        return;
    }
    const answerId = btn.dataset.answerId;
    try {
        const data = await api.put(`/experiences/${expId}/answers/${answerId}/upvote`, {});
        const countEl = btn.querySelector('.upvote-count');
        if (countEl) countEl.textContent = data.upvotes;
        btn.classList.toggle('has-upvotes', data.upvoted);
    } catch (err) {
        console.error('Upvote failed', err);
    }
}

// ==========================================
// Answer Modal
// ==========================================
function openAnswerModal(btn) {
    const token = localStorage.getItem('token');
    document.getElementById('answerExpId').value = btn.dataset.exp;
    document.getElementById('answerRoundIndex').value = btn.dataset.round;
    document.getElementById('answerQuestionIndex').value = btn.dataset.qidx;
    document.getElementById('answerQuestionText').value = btn.dataset.qtext;
    document.getElementById('answerQuestionPreview').textContent = btn.dataset.qtext;
    document.getElementById('answerText').value = '';
    updateCharCount();

    if (!token) {
        document.getElementById('answerLoginNotice').style.display = 'block';
        document.getElementById('submitAnswerBtn').style.display = 'none';
    } else {
        document.getElementById('answerLoginNotice').style.display = 'none';
        document.getElementById('submitAnswerBtn').style.display = 'inline-flex';
    }

    document.getElementById('answerModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeAnswerModal() {
    document.getElementById('answerModal').style.display = 'none';
    document.body.style.overflow = '';
}

function updateCharCount() {
    const len = document.getElementById('answerText').value.length;
    document.getElementById('charCount').textContent = len;
}

async function submitAnswer(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitAnswerBtn');
    const answerText = document.getElementById('answerText').value.trim();
    if (!answerText) {
        alert('Please enter your answer.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    const body = {
        questionText: document.getElementById('answerQuestionText').value,
        answerText,
        roundIndex: parseInt(document.getElementById('answerRoundIndex').value, 10),
        questionIndex: parseInt(document.getElementById('answerQuestionIndex').value, 10),
        isAnonymous: document.getElementById('answerAnonymous').checked
    };

    const expId = document.getElementById('answerExpId').value;

    try {
        await api.post(`/experiences/${expId}/answers`, body);
        closeAnswerModal();
        if (typeof toast !== 'undefined') {
            toast.success('Answer submitted successfully!');
        } else {
            alert('Answer submitted!');
        }
    } catch (err) {
        alert(err.message || 'Failed to submit answer. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Answer';
    }
}

// ==========================================
// Bootstrap
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return; // Protect route
    init();
});
