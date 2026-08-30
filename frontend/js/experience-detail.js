// ==========================================
// Experience Detail Page JavaScript
// ==========================================

let currentExpId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    theme.init();
    setupAnswerModal();
    loadExperienceDetail();
});

// Get experience ID from URL
function getExperienceId() {
    const path = window.location.pathname;
    const parts = path.split('/');
    return parts[parts.length - 1];
}

// Load experience detail
async function loadExperienceDetail() {
    const id = getExperienceId();
    const contentDiv = document.getElementById('experienceContent');

    try {
        const response = await api.get(`/experiences/${id}`);
        const exp = response.experience;
        currentExpId = id;

        // Update breadcrumb
        document.getElementById('breadcrumbCompany').textContent = exp.companyName;
        document.title = `${exp.companyName} - ${exp.jobRole} | PCCOE Interview`;

        // Render experience detail
        contentDiv.innerHTML = renderExperienceDetail(exp);

        // Wire up Q&A answer buttons on the rendered HTML
        wireAnswerButtons(contentDiv, exp);

        // Load related experiences
        loadRelatedExperiences(exp.companyName, id);
    } catch (error) {
        console.error('Error loading experience:', error);
        contentDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Experience not found</h3>
                <p>The experience you're looking for doesn't exist or has been removed.</p>
                <a href="/experiences" class="btn btn-primary">Browse Experiences</a>
            </div>
        `;
    }
}

// Render experience detail HTML
function renderExperienceDetail(exp) {
    const date = new Date(exp.interviewDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const submitter = exp.isAnonymous ? 'Anonymous' : (exp.submittedBy?.name || 'Student');
    const branch = exp.isAnonymous ? 'N/A' : (exp.submittedBy?.branch || 'N/A');

    return `
    <div class="experience-detail-card" id="experienceDetailCard">
        <div class="experience-detail-header">
            <div class="experience-header-top">
                <h1>${escapeHtml(exp.companyName)}</h1>
                <button class="pdf-export-btn" onclick="exportToPDF()" title="Download as PDF">
                    <i class="fas fa-file-pdf"></i> Download PDF
                </button>
            </div>
            <div class="job-role">${escapeHtml(exp.jobRole)}</div>
            <div class="experience-badges">
                <span class="difficulty-badge difficulty-${exp.difficulty}">${exp.difficulty}</span>
                <span class="experience-type type-${exp.experienceType}">
                    <i class="fas fa-${exp.experienceType === 'Positive' ? 'smile' : exp.experienceType === 'Negative' ? 'frown' : 'meh'}"></i>
                    ${exp.experienceType}
                </span>
                ${exp.selectionStatus && exp.selectionStatus !== 'Waiting' ? `
                <span class="experience-type" style="background:${exp.selectionStatus === 'Selected' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)'}; color:${exp.selectionStatus === 'Selected' ? '#15803d' : '#b91c1c'}">
                    <i class="fas fa-${exp.selectionStatus === 'Selected' ? 'check-circle' : 'times-circle'}"></i>
                    ${exp.selectionStatus}
                </span>` : ''}
            </div>
        </div>

        <div class="experience-detail-meta">
            <div class="meta-card">
                <i class="fas fa-calendar-alt"></i>
                <div>
                    <label>Interview Date</label>
                    <p>${date}</p>
                </div>
            </div>
            <div class="meta-card">
                <i class="fas fa-user"></i>
                <div>
                    <label>Submitted By</label>
                    <p>${escapeHtml(submitter)}</p>
                </div>
            </div>
            <div class="meta-card">
                <i class="fas fa-code-branch"></i>
                <div>
                    <label>Branch</label>
                    <p>${escapeHtml(branch)}</p>
                </div>
            </div>
            ${exp.packageOffered ? `
            <div class="meta-card">
                <i class="fas fa-rupee-sign"></i>
                <div>
                    <label>Package Offered</label>
                    <p>${escapeHtml(exp.packageOffered)} LPA</p>
                </div>
            </div>` : ''}
            <div class="meta-card">
                <i class="fas fa-eye"></i>
                <div>
                    <label>Views</label>
                    <p>${exp.views || 0}</p>
                </div>
            </div>
            ${exp.rounds ? `
            <div class="meta-card">
                <i class="fas fa-layer-group"></i>
                <div>
                    <label>Rounds</label>
                    <p>${exp.rounds.length}</p>
                </div>
            </div>` : ''}
        </div>

        ${exp.rounds && exp.rounds.length > 0 ? `
        <div class="experience-section">
            <h3><i class="fas fa-layer-group"></i> Interview Rounds</h3>
            <div class="rounds-list">
                ${exp.rounds.map((round, index) => `
                    <div class="round-card">
                        <h4>
                            <span class="round-number">${index + 1}</span>
                            ${escapeHtml(round.roundType)}
                            ${round.duration ? `<span style="font-size:0.8rem;font-weight:400;color:var(--text-muted);margin-left:auto">${escapeHtml(round.duration)}</span>` : ''}
                        </h4>
                        <p>${escapeHtml(round.description)}</p>
                        ${round.questions && round.questions.length > 0 ? `
                            <div style="margin-top:0.75rem">
                                <strong style="font-size:0.85rem;color:var(--text-primary)">Questions Asked:</strong>
                                <ul class="questions-list qa-list" style="margin-top:0.4rem">
                                    ${round.questions.map((q, qi) => `
                                    <li class="qa-item">
                                        <span class="qa-question-text">${escapeHtml(q)}</span>
                                        <div class="qa-actions">
                                            <button class="btn btn-xs btn-ghost answer-inline-btn"
                                                data-round="${index}" data-qidx="${qi}" data-qtext="${q.replace(/"/g,'&quot;')}">
                                                <i class="fas fa-pen"></i> Add Answer
                                            </button>
                                            <button class="btn btn-xs btn-ghost view-answers-inline-btn"
                                                data-round="${index}" data-qidx="${qi}">
                                                <i class="fas fa-comments"></i> Answers
                                            </button>
                                        </div>
                                        <div class="answers-inline" id="answers-${index}-${qi}" style="display:none;"></div>
                                    </li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${round.tips ? `
                            <div class="round-tip">
                                <i class="fas fa-lightbulb"></i>
                                <span>${escapeHtml(round.tips)}</span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${exp.questions && exp.questions.length > 0 ? `
        <div class="experience-section">
            <h3><i class="fas fa-question-circle"></i> General Questions Asked</h3>
            <ul class="questions-list qa-list">
                ${exp.questions.map((q, qi) => `
                <li class="qa-item">
                    <span class="qa-question-text">${escapeHtml(q)}</span>
                    <div class="qa-actions">
                        <button class="btn btn-xs btn-ghost answer-inline-btn"
                            data-round="-1" data-qidx="${qi}" data-qtext="${q.replace(/"/g,'&quot;')}">
                            <i class="fas fa-pen"></i> Add Answer
                        </button>
                        <button class="btn btn-xs btn-ghost view-answers-inline-btn"
                            data-round="-1" data-qidx="${qi}">
                            <i class="fas fa-comments"></i> Answers
                        </button>
                    </div>
                    <div class="answers-inline" id="answers-general-${qi}" style="display:none;"></div>
                </li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${exp.tips ? `
        <div class="experience-section">
            <h3><i class="fas fa-lightbulb"></i> Preparation Tips & Advice</h3>
            <div class="tips-content">
                <p>${escapeHtml(exp.tips).replace(/\n/g, '<br>')}</p>
            </div>
        </div>
        ` : ''}

        <div class="experience-section" style="border-bottom:none">
            <div style="display:flex;gap:1rem;flex-wrap:wrap">
                <a href="/experiences" class="btn btn-outline">
                    <i class="fas fa-arrow-left"></i> Back to Experiences
                </a>
                <button class="btn btn-primary" onclick="shareExperience()">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
        </div>
    </div>
    `;
}


// Load related experiences
async function loadRelatedExperiences(companyName, excludeId) {
    const container = document.getElementById('relatedExperiences');

    try {
        const response = await api.get(`/experiences?company=${encodeURIComponent(companyName)}&limit=4`);
        
        const related = response.experiences.filter(exp => exp._id !== excludeId);
        
        if (related.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <p>No other experiences from this company yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = related.slice(0, 3).map(exp => createExperienceCard(exp)).join('');
    } catch (error) {
        console.error('Error loading related experiences:', error);
        container.innerHTML = '';
    }
}

// Create experience card (same as experiences.js)
function createExperienceCard(exp) {
    const date = new Date(exp.interviewDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short'
    });

    const submitter = exp.isAnonymous ? 'Anonymous' : (exp.submittedBy?.name || 'Student');
    const summary = exp.tips ? exp.tips.substring(0, 100) + '...' : 'No tips provided';

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
                    <span class="meta-item">
                        <i class="fas fa-calendar"></i> ${date}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-user"></i> ${escapeHtml(submitter)}
                    </span>
                </div>
                <p class="experience-summary">${escapeHtml(summary)}</p>
            </div>
            <div class="experience-card-footer">
                <span class="experience-type type-${exp.experienceType}">
                    <i class="fas fa-${exp.experienceType === 'Positive' ? 'smile' : exp.experienceType === 'Negative' ? 'frown' : 'meh'}"></i>
                    ${exp.experienceType}
                </span>
                <span class="view-count">
                    <i class="fas fa-eye"></i> ${exp.views || 0}
                </span>
            </div>
        </div>
    `;
}

// Share experience
function shareExperience() {
    if (navigator.share) {
        navigator.share({
            title: document.title,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('Link copied to clipboard!');
        }).catch(() => {
            alert('Copy this link: ' + window.location.href);
        });
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast') || createToastElement();
    const toastMessage = toast.querySelector('#toastMessage') || toast.querySelector('span');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function createToastElement() {
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-check-circle"></i>
            <span id="toastMessage">Success!</span>
        </div>
    `;
    document.body.appendChild(toast);
    return toast;
}

// Helper: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// Q&A Answer System
// ==========================================
function wireAnswerButtons(container, exp) {
    container.querySelectorAll('.answer-inline-btn').forEach(btn => {
        btn.addEventListener('click', () => openAnswerModal(btn.dataset.round, btn.dataset.qidx, btn.dataset.qtext));
    });
    container.querySelectorAll('.view-answers-inline-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleInlineAnswers(btn));
    });
}

function setupAnswerModal() {
    const modal = document.getElementById('answerModal');
    if (!modal) return;

    document.getElementById('closeAnswerModal').addEventListener('click', closeAnswerModal);
    document.getElementById('cancelAnswer').addEventListener('click', closeAnswerModal);
    document.getElementById('answerText').addEventListener('input', updateDetailCharCount);
    document.getElementById('answerForm').addEventListener('submit', submitDetailAnswer);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeAnswerModal(); });
}

function openAnswerModal(roundIndex, questionIndex, questionText) {
    const token = localStorage.getItem('token');
    document.getElementById('answerRoundIndex').value = roundIndex;
    document.getElementById('answerQuestionIndex').value = questionIndex;
    document.getElementById('answerQuestionText').value = questionText;
    document.getElementById('answerQuestionPreview').textContent = questionText;
    document.getElementById('answerText').value = '';
    updateDetailCharCount();

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
    const modal = document.getElementById('answerModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

function updateDetailCharCount() {
    const el = document.getElementById('answerText');
    const counter = document.getElementById('charCount');
    if (el && counter) counter.textContent = el.value.length;
}

async function submitDetailAnswer(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitAnswerBtn');
    const answerText = document.getElementById('answerText').value.trim();
    if (!answerText) { alert('Please enter your answer.'); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    const roundIndex = document.getElementById('answerRoundIndex').value;
    const questionIndex = document.getElementById('answerQuestionIndex').value;
    const body = {
        questionText: document.getElementById('answerQuestionText').value,
        answerText,
        roundIndex: parseInt(roundIndex, 10),
        questionIndex: parseInt(questionIndex, 10),
        isAnonymous: document.getElementById('answerAnonymous')?.checked || false
    };

    try {
        await api.post(`/experiences/${currentExpId}/answers`, body);
        closeAnswerModal();
        showToast('Answer submitted!');
    } catch (err) {
        alert(err.message || 'Failed to submit answer.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Answer';
    }
}

async function toggleInlineAnswers(btn) {
    const roundIndex = btn.dataset.round;
    const qidx = btn.dataset.qidx;
    const isGeneral = roundIndex === '-1';
    const containerId = isGeneral ? `answers-general-${qidx}` : `answers-${roundIndex}-${qidx}`;
    const container = document.getElementById(containerId);
    if (!container) return;

    if (container.style.display !== 'none') {
        container.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-comments"></i> Answers';
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    container.style.display = 'block';
    container.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';

    try {
        const url = `/experiences/${currentExpId}/answers?roundIndex=${roundIndex}&questionIndex=${qidx}`;
        const data = await api.get(url);
        const answers = data.answers || [];

        if (answers.length === 0) {
            container.innerHTML = '<p class="no-answers-text"><i class="fas fa-comment-slash"></i> No answers yet. Be the first!</p>';
        } else {
            container.innerHTML = `
                <div class="answers-list">
                    <h4 class="answers-heading"><i class="fas fa-comments"></i> ${answers.length} Answer${answers.length !== 1 ? 's' : ''}</h4>
                    ${answers.map(a => renderDetailAnswerCard(a)).join('')}
                </div>`;
            container.querySelectorAll('.upvote-btn').forEach(ubtn => {
                ubtn.addEventListener('click', () => handleDetailUpvote(ubtn));
            });
        }
        btn.innerHTML = '<i class="fas fa-comments"></i> Hide';
    } catch (err) {
        container.innerHTML = '<p class="error-text"><i class="fas fa-exclamation-circle"></i> Failed to load answers.</p>';
        btn.innerHTML = '<i class="fas fa-comments"></i> Answers';
    }
}

function renderDetailAnswerCard(answer) {
    const name = answer.submittedBy?.name || 'Anonymous';
    const branch = answer.submittedBy?.branch;
    const date = answer.createdAt ? timeAgo(answer.createdAt) : '';
    return `
        <div class="answer-card" data-answer-id="${answer._id}">
            <div class="answer-meta">
                <span class="answer-author"><i class="fas fa-user-circle"></i> ${escapeHtml(name)}${branch && branch !== 'N/A' ? ` <span class="answer-branch">&bull; ${escapeHtml(branch)}</span>` : ''}</span>
                <span class="answer-time">${escapeHtml(date)}</span>
            </div>
            <p class="answer-text">${escapeHtml(answer.answerText)}</p>
            <div class="answer-footer">
                <button class="upvote-btn ${answer.upvotes > 0 ? 'has-upvotes' : ''}"
                    data-answer-id="${answer._id}">
                    <i class="fas fa-arrow-up"></i> <span class="upvote-count">${answer.upvotes || 0}</span>
                </button>
            </div>
        </div>`;
}

async function handleDetailUpvote(btn) {
    const token = localStorage.getItem('token');
    if (!token) { alert('Please login to upvote.'); return; }
    const answerId = btn.dataset.answerId;
    try {
        const data = await api.put(`/experiences/${currentExpId}/answers/${answerId}/upvote`, {});
        const countEl = btn.querySelector('.upvote-count');
        if (countEl) countEl.textContent = data.upvotes;
        btn.classList.toggle('has-upvotes', data.upvoted);
    } catch (err) { console.error('Upvote failed', err); }
}

// ==========================================
// PDF Export
// ==========================================
function exportToPDF() {
    const element = document.getElementById('experienceDetailCard');
    if (!element) {
        alert('Unable to export PDF. Content not loaded.');
        return;
    }

    // Get company name and job role for filename
    const companyEl = element.querySelector('h1');
    const roleEl = element.querySelector('.job-role');
    const companyName = companyEl ? companyEl.textContent.trim() : 'Experience';
    const jobRole = roleEl ? roleEl.textContent.trim() : '';
    const filename = `${companyName}${jobRole ? '_' + jobRole : ''}_Interview_Experience.pdf`.replace(/\s+/g, '_');

    // Hide elements that shouldn't be in PDF
    const pdfBtn = element.querySelector('.pdf-export-btn');
    const answerBtns = element.querySelectorAll('.add-answer-btn, .upvote-btn');
    if (pdfBtn) pdfBtn.style.display = 'none';
    answerBtns.forEach(btn => btn.style.display = 'none');

    const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        // Restore hidden elements
        if (pdfBtn) pdfBtn.style.display = '';
        answerBtns.forEach(btn => btn.style.display = '');
    }).catch(err => {
        console.error('PDF export failed:', err);
        alert('Failed to export PDF. Please try again.');
        if (pdfBtn) pdfBtn.style.display = '';
        answerBtns.forEach(btn => btn.style.display = '');
    });
}
