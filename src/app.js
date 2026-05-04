const { invoke } = window.__TAURI__.core;

function initTheme() {
    const savedTheme = localStorage.getItem('issue-tracker-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('issue-tracker-theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.textContent = theme === 'light' ? '☀' : '☾';
    }
}

let issues = [];
let allTags = [];
let currentIssueId = null;
let sortDirection = 'desc';
let navigationStack = [];
let previewTimeout = null;
let currentPreviewIssue = null;

const renderer = {
    code(token) {
        let code, language;
        
        if (typeof token === 'string') {
            code = token;
            language = '';
        } else {
            code = token.text || token;
            language = token.lang || '';
        }
        
        let highlighted;
        try {
            if (language && hljs.getLanguage(language)) {
                const result = hljs.highlight(code, { language: language });
                highlighted = result.value || code;
            } else {
                const result = hljs.highlightAuto(code);
                highlighted = result.value || code;
            }
        } catch (e) {
            console.error('Highlight error:', e);
            highlighted = code;
        }
        return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    }
};

marked.use({ renderer });
marked.setOptions({
    breaks: true,
    gfm: true
});

function renderMarkdown(text) {
    if (!text) return '';
    const html = marked.parse(text);
    return DOMPurify.sanitize(html);
}

async function renderDescription(text) {
    if (!text) return '';
    try {
        const html = marked.parse(text);
        const sanitized = DOMPurify.sanitize(html);
        return processIssueLinks(sanitized);
    } catch (error) {
        console.error('Error rendering description:', error);
        return text;
    }
}

function processIssueLinks(html) {
    return html.replace(/#(\d+)/g, (_, number) => {
        const num = parseInt(number, 10);
        const issue = issues.find(i => i.number === num);
        return issue
            ? `<a href="#issue/${issue.id}" class="issue-ref" data-issue-number="${number}" aria-label="Issue #${number}: ${issue.title}" onclick="event.preventDefault(); navigateViaReference('${issue.id}');">#${number}</a>`
            : `<span class="issue-ref-unresolved">#${number}</span>`;
    });
}

function showIssuePreview(event) {
    const issueNumber = parseInt(event.target.dataset.issueNumber, 10);
    const issue = issues.find(i => i.number === issueNumber);
    if (!issue) return;

    if (previewTimeout) {
        clearTimeout(previewTimeout);
    }

    currentPreviewIssue = issue;

        previewTimeout = setTimeout(() => {
            let preview = document.getElementById('issuePreview');
            if (!preview) {
                preview = document.createElement('div');
                preview.id = 'issuePreview';
                preview.className = 'issue-preview';
                preview.setAttribute('role', 'tooltip');
                preview.setAttribute('aria-live', 'polite');
                document.body.appendChild(preview);
            }

            preview.innerHTML = `
                <div class="issue-preview-title">${escapeHtml(issue.title)}</div>
                <div class="issue-preview-meta">
                    <span class="issue-preview-number">#${issue.number}</span>
                    <span class="issue-status status-${issue.status.toLowerCase()}">${formatStatus(issue.status)}</span>
                </div>
            `;

            positionPreview(event.target, preview);
            preview.style.display = 'block';
        }, 300);
}

function hideIssuePreview() {
    if (previewTimeout) {
        clearTimeout(previewTimeout);
        previewTimeout = null;
    }

    setTimeout(() => {
        const preview = document.getElementById('issuePreview');
        if (preview && !preview.matches(':hover')) {
            preview.style.display = 'none';
            currentPreviewIssue = null;
        }
    }, 100);
}

function positionPreview(targetElement, previewElement) {
    const rect = targetElement.getBoundingClientRect();
    const previewWidth = 320;
    const previewHeight = previewElement.offsetHeight || 100;
    const margin = 8;

    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + margin;

    if (left + previewWidth > window.innerWidth + window.scrollX) {
        left = window.innerWidth + window.scrollX - previewWidth - margin;
    }

    if (top + previewHeight > window.innerHeight + window.scrollY) {
        top = rect.top + window.scrollY - previewHeight - margin;
        previewElement.classList.add('issue-preview-above');
    } else {
        previewElement.classList.remove('issue-preview-above');
    }

    if (left < window.scrollX + margin) {
        left = window.scrollX + margin;
    }

    previewElement.style.left = `${left}px`;
    previewElement.style.top = `${top}px`;
}

async function loadIssues() {
    try {
        issues = await invoke('get_issues');
        renderIssues();
        await loadTags();
    } catch (error) {
        console.error('Failed to load issues:', error);
    }
}

async function loadTags() {
    try {
        allTags = await invoke('get_all_tags');
        renderTagFilters();
        updateTagFilterOptions();
        syncCustomSelects();
    } catch (error) {
        console.error('Failed to load tags:', error);
    }
}

function sortIssues(issues, sortBy, order) {
    return [...issues].sort((a, b) => {
        const dateA = new Date(sortBy === 'created' ? a.created_at : a.updated_at);
        const dateB = new Date(sortBy === 'created' ? b.created_at : b.updated_at);
        return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
}

function toggleDirection() {
    sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    const icon = document.getElementById('directionIcon');
    const text = document.getElementById('directionText');
    if (sortDirection === 'desc') {
        icon.textContent = '↓';
        text.textContent = 'Newest';
    } else {
        icon.textContent = '↑';
        text.textContent = 'Oldest';
    }
    renderIssues();
}

function renderIssues() {
    const issuesList = document.getElementById('issuesList');
    const statusFilter = document.getElementById('statusFilter').value;
    const tagFilter = document.getElementById('tagFilter').value;
    const sortByFilter = document.getElementById('sortByFilter').value;
    const searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();

    let filtered = issues;

    if (searchQuery) {
        filtered = filtered.filter(i => 
            i.title.toLowerCase().includes(searchQuery) ||
            (i.description && i.description.toLowerCase().includes(searchQuery))
        );
    }

    if (statusFilter) {
        filtered = filtered.filter(i => i.status === statusFilter);
    }

    if (tagFilter) {
        filtered = filtered.filter(i => i.tags.includes(tagFilter));
    }

    filtered = sortIssues(filtered, sortByFilter, sortDirection);

    if (filtered.length === 0) {
        issuesList.innerHTML = '<div class="empty-state">No issues found</div>';
        return;
    }

    issuesList.innerHTML = filtered.map(issue => `
        <div class="issue-card" onclick="navigateToDetail('${issue.id}')">
            <div class="issue-header">
                <span class="issue-title">${escapeHtml(issue.title)}</span>
                <span class="issue-status status-${issue.status.toLowerCase()}">${formatStatus(issue.status)}</span>
            </div>
            <div class="issue-number">#${issue.number}</div>
            <div class="issue-tags">
                ${issue.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

function renderTagFilters() {
    const tagFilter = document.getElementById('tagFilter');
    const currentValue = tagFilter.value;
    tagFilter.innerHTML = '<option value="">All Tags</option>' +
        allTags.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
    tagFilter.value = currentValue;
}

function navigateToDetail(issueId) {
    navigationStack = [];
    window.location.hash = `issue/${issueId}`;
}

function navigateToList() {
    navigationStack = [];
    window.location.hash = '';
}

function navigateViaReference(targetIssueId) {
    if (currentIssueId) {
        navigationStack.push(currentIssueId);
    }
    const preview = document.getElementById('issuePreview');
    if (preview) {
        preview.style.display = 'none';
        currentPreviewIssue = null;
    }
    if (previewTimeout) {
        clearTimeout(previewTimeout);
    }
    window.location.hash = `issue/${targetIssueId}`;
}

function goToPrevIssue() {
    if (navigationStack.length === 0) return;
    const prevIssueId = navigationStack.pop();
    if (!issues.some(i => i.id === prevIssueId)) {
        navigationStack = [];
        navigateToList();
        return;
    }
    window.location.hash = `issue/${prevIssueId}`;
}

function updatePrevButtonVisibility() {
    const prevBtn = document.getElementById('prevIssueBtn');
    if (navigationStack.length > 0) {
        prevBtn.classList.remove('hidden');
    } else {
        prevBtn.classList.add('hidden');
    }
}

function showListView() {
    navigationStack = [];
    document.getElementById('listView').classList.remove('hidden');
    document.getElementById('detailView').classList.add('hidden');
    document.getElementById('prevIssueBtn').classList.add('hidden');
    currentIssueId = null;
    loadIssues();
}

async function showDetailView(issueId) {
    try {
        const issue = issues.find(i => i.id === issueId);
        if (!issue) {
            navigateToList();
            return;
        }

        currentIssueId = issueId;
        document.getElementById('listView').classList.add('hidden');
        document.getElementById('detailView').classList.remove('hidden');

        updatePrevButtonVisibility();

        const descriptionHtml = await renderDescription(issue.description);
        
        // Sync custom selects after rendering
        setTimeout(syncCustomSelects, 0);
        
        const content = document.getElementById('detailContent');
        content.innerHTML = `
            <h1 class="detail-title">${escapeHtml(issue.title)}</h1>
            <div class="detail-issue-number">#${issue.number}</div>
            
            <div class="edit-section">
                <label>Status</label>
                <select id="detailStatus" style="display:none;">
                    <option value="Open" ${issue.status === 'Open' ? 'selected' : ''}>Open</option>
                    <option value="InProgress" ${issue.status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                    <option value="Closed" ${issue.status === 'Closed' ? 'selected' : ''}>Closed</option>
                </select>
                <div class="custom-select" data-select-id="detailStatus">
                    <div class="custom-select-trigger">${issue.status === 'Open' ? 'Open' : issue.status === 'InProgress' ? 'In Progress' : 'Closed'}</div>
                    <div class="custom-select-options">
                        <div class="custom-select-option ${issue.status === 'Open' ? 'selected' : ''}" data-value="Open" onclick="document.getElementById('detailStatus').value='Open'; this.parentElement.querySelectorAll('.custom-select-option').forEach(o=>o.classList.remove('selected')); this.classList.add('selected'); this.closest('.custom-select').querySelector('.custom-select-trigger').textContent='Open'; updateIssueStatus('${issue.id}', 'Open')">Open</div>
                        <div class="custom-select-option ${issue.status === 'InProgress' ? 'selected' : ''}" data-value="InProgress" onclick="document.getElementById('detailStatus').value='InProgress'; this.parentElement.querySelectorAll('.custom-select-option').forEach(o=>o.classList.remove('selected')); this.classList.add('selected'); this.closest('.custom-select').querySelector('.custom-select-trigger').textContent='In Progress'; updateIssueStatus('${issue.id}', 'InProgress')">In Progress</div>
                        <div class="custom-select-option ${issue.status === 'Closed' ? 'selected' : ''}" data-value="Closed" onclick="document.getElementById('detailStatus').value='Closed'; this.parentElement.querySelectorAll('.custom-select-option').forEach(o=>o.classList.remove('selected')); this.classList.add('selected'); this.closest('.custom-select').querySelector('.custom-select-trigger').textContent='Closed'; updateIssueStatus('${issue.id}', 'Closed')">Closed</div>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Description</div>
                <div class="detail-value detail-description">${descriptionHtml || 'No description'}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Tags</div>
                <div class="detail-tags" id="detailTags">
                    ${issue.tags.map(tag => `
                        <span class="detail-tag">
                            ${escapeHtml(tag)}
                            <span class="detail-tag-remove" onclick="removeTag('${issue.id}', '${escapeHtml(tag)}')">&times;</span>
                        </span>
                    `).join('')}
                    <div class="tag-input-wrapper">
                        <input type="text" id="newTagInput" placeholder="Add tag..." onkeypress="handleTagInput(event, '${issue.id}')">
                    </div>
                </div>
            </div>

            <div class="detail-meta">
                Created: ${formatDate(issue.created_at)}<br>
                Updated: ${formatDate(issue.updated_at)}
        </div>
    `;
    } catch (error) {
        console.error('Error showing detail view:', error);
        navigateToList();
    }
}

function showEditForm() {
    const issue = issues.find(i => i.id === currentIssueId);
    if (!issue) return;

    const content = document.getElementById('detailContent');
    content.innerHTML = `
        <form id="detailEditForm" class="detail-edit-form">
            <div class="form-group">
                <label for="editTitle">Title</label>
                <input type="text" id="editTitle" value="${escapeHtml(issue.title)}" required>
            </div>
            <div class="form-group">
                <label for="editDescription">Description</label>
                <textarea id="editDescription" rows="6">${escapeHtml(issue.description)}</textarea>
            </div>
            <div class="form-group">
                <label for="editStatus">Status</label>
                <select id="editStatus" style="display:none;">
                    <option value="Open" ${issue.status === 'Open' ? 'selected' : ''}>Open</option>
                    <option value="InProgress" ${issue.status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                    <option value="Closed" ${issue.status === 'Closed' ? 'selected' : ''}>Closed</option>
                </select>
                <div class="custom-select" data-select-id="editStatus">
                    <div class="custom-select-trigger">${issue.status === 'Open' ? 'Open' : issue.status === 'InProgress' ? 'In Progress' : 'Closed'}</div>
                    <div class="custom-select-options">
                        <div class="custom-select-option ${issue.status === 'Open' ? 'selected' : ''}" data-value="Open" onclick="document.getElementById('editStatus').value='Open'; this.parentElement.querySelectorAll('.custom-select-option').forEach(o=>o.classList.remove('selected')); this.classList.add('selected'); this.closest('.custom-select').querySelector('.custom-select-trigger').textContent='Open';">Open</div>
                        <div class="custom-select-option ${issue.status === 'InProgress' ? 'selected' : ''}" data-value="InProgress" onclick="document.getElementById('editStatus').value='InProgress'; this.parentElement.querySelectorAll('.custom-select-option').forEach(o=>o.classList.remove('selected')); this.classList.add('selected'); this.closest('.custom-select').querySelector('.custom-select-trigger').textContent='In Progress';">In Progress</div>
                        <div class="custom-select-option ${issue.status === 'Closed' ? 'selected' : ''}" data-value="Closed" onclick="document.getElementById('editStatus').value='Closed'; this.parentElement.querySelectorAll('.custom-select-option').forEach(o=>o.classList.remove('selected')); this.classList.add('selected'); this.closest('.custom-select').querySelector('.custom-select-trigger').textContent='Closed';">Closed</div>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label for="editTags">Tags (comma separated)</label>
                <input type="text" id="editTags" value="${issue.tags.join(', ')}" placeholder="bug, feature, urgent">
            </div>
            <div class="detail-edit-actions">
                <button type="button" class="btn-secondary" onclick="cancelEdit()">Cancel</button>
                <button type="submit" class="btn-primary">Save</button>
            </div>
        </form>
    `;

    // Sync custom selects after rendering
    setTimeout(syncCustomSelects, 0);
    document.getElementById('detailEditForm').addEventListener('submit', saveDetailEdit);
}

async function saveDetailEdit(event) {
    event.preventDefault();

    const title = document.getElementById('editTitle').value;
    const description = document.getElementById('editDescription').value;
    const status = document.getElementById('editStatus').value;
    const tags = document.getElementById('editTags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

    try {
        await invoke('update_issue', {
            request: { id: currentIssueId, title, description, status, tags }
        });
        await loadIssues();
        showDetailView(currentIssueId);
    } catch (error) {
        console.error('Failed to save issue:', error);
        alert('Failed to save issue: ' + error);
    }
}

function cancelEdit() {
    showDetailView(currentIssueId);
}

async function updateIssueStatus(issueId, status) {
    try {
        await invoke('update_issue', {
            request: { id: issueId, status }
        });
        await loadIssues();
        const issue = issues.find(i => i.id === issueId);
        if (issue && currentIssueId === issueId) {
            showDetailView(issueId);
        }
    } catch (error) {
        console.error('Failed to update status:', error);
        alert('Failed to update status: ' + error);
    }
}

async function handleTagInput(event, issueId) {
    if (event.key === 'Enter') {
        const input = event.target;
        const tag = input.value.trim();
        if (tag) {
            try {
                await invoke('add_tag', { issueId, tag });
                input.value = '';
                await loadIssues();
                showDetailView(issueId);
            } catch (error) {
                console.error('Failed to add tag:', error);
            }
        }
    }
}

async function removeTag(issueId, tag) {
    try {
        await invoke('remove_tag', { issueId, tag });
        await loadIssues();
        showDetailView(issueId);
    } catch (error) {
        console.error('Failed to remove tag:', error);
    }
}

function handleRouter() {
    const hash = window.location.hash.slice(1);
    
    const preview = document.getElementById('issuePreview');
    if (preview) {
        preview.style.display = 'none';
        currentPreviewIssue = null;
    }
    if (previewTimeout) {
        clearTimeout(previewTimeout);
    }
    
    if (hash.startsWith('issue/')) {
        const issueId = hash.replace('issue/', '');
        loadIssues().then(() => showDetailView(issueId));
    } else {
        showListView();
    }
}

function formatStatus(status) {
    const statusMap = {
        'Open': 'Open',
        'InProgress': 'In Progress',
        'Closed': 'Closed'
    };
    return statusMap[status] || status;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
    const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
    return dateFormatter.format(date) + ' ' + timeFormatter.format(date);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openModal() {
    document.getElementById('issueModal').classList.add('show');
    document.getElementById('modalTitle').textContent = 'New Issue';
    document.getElementById('issueForm').reset();
    document.getElementById('status').value = 'Open';
    // Sync custom select for status
    const statusSelect = document.querySelector('[data-select-id="status"]');
    if (statusSelect) {
        const trigger = statusSelect.querySelector('.custom-select-trigger');
        if (trigger) trigger.textContent = 'Open';
        statusSelect.querySelectorAll('.custom-select-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.value === 'Open');
        });
    }
}

function closeModal() {
    document.getElementById('issueModal').classList.remove('show');
}

async function saveIssue(event) {
    event.preventDefault();

    const id = document.getElementById('issueId').value;
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const statusSelect = document.getElementById('status');
    const status = statusSelect ? statusSelect.value : 'Open';
    const tags = document.getElementById('tags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

    try {
        if (id) {
            await invoke('update_issue', {
                request: { id, title, description, status, tags }
            });
        } else {
            await invoke('create_issue', {
                request: { title, description, tags }
            });
        }
        closeModal();
        await loadIssues();
    } catch (error) {
        console.error('Failed to save issue:', error);
        alert('Failed to save issue: ' + error);
    }
}

function showDeleteModal() {
    document.getElementById('deleteModal').classList.add('show');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
}

async function confirmDelete() {
    if (!currentIssueId) return;

    try {
        await invoke('delete_issue', { id: currentIssueId });
        closeDeleteModal();
        navigateToList();
    } catch (error) {
        console.error('Failed to delete issue:', error);
        alert('Failed to delete issue: ' + error);
    }
}

let pendingImportData = null;

async function exportIssues() {
    document.getElementById('menuDropdown').classList.add('hidden');
    
    const { save } = window.__TAURI__.dialog;
    const { writeTextFile } = window.__TAURI__.fs;
    
    try {
        const filePath = await save({
            defaultPath: 'issues.json',
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });
        
        if (filePath) {
            const dataStr = JSON.stringify(issues, null, 2);
            await writeTextFile(filePath, dataStr);
            alert('Issues exported successfully!');
        }
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export: ' + error);
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) {
                throw new Error('Invalid format');
            }
            pendingImportData = data;
            document.getElementById('importModal').classList.add('show');
        } catch (error) {
            alert('Failed to parse file: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

async function performImport(merge) {
    if (!pendingImportData) return;
    
    try {
        await invoke('import_issues', {
            issues: pendingImportData,
            merge: merge
        });
        
        document.getElementById('importModal').classList.remove('show');
        pendingImportData = null;
        await loadIssues();
        
        alert('Issues imported successfully!');
    } catch (error) {
        console.error('Failed to import:', error);
        alert('Failed to import: ' + error);
    }
}

document.getElementById('newIssueBtn').addEventListener('click', openModal);
document.getElementById('searchBtn').addEventListener('click', renderIssues);
document.getElementById('searchInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        renderIssues();
    }
});
document.getElementById('searchInput').addEventListener('input', function() {
    const clearBtn = document.getElementById('clearSearchBtn');
    if (this.value.trim()) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }
});
document.getElementById('clearSearchBtn').addEventListener('click', function() {
    document.getElementById('searchInput').value = '';
    this.classList.add('hidden');
    renderIssues();
});
document.getElementById('backBtn').addEventListener('click', navigateToList);
document.getElementById('prevIssueBtn').addEventListener('click', goToPrevIssue);
document.getElementById('editIssueBtn').addEventListener('click', showEditForm);
document.getElementById('deleteIssueBtn').addEventListener('click', showDeleteModal);
document.querySelector('.close').addEventListener('click', closeModal);
document.getElementById('issueForm').addEventListener('submit', saveIssue);
document.getElementById('statusFilter').addEventListener('change', renderIssues);
document.getElementById('tagFilter').addEventListener('change', renderIssues);
document.getElementById('sortByFilter').addEventListener('change', renderIssues);
document.getElementById('directionBtn').addEventListener('click', toggleDirection);
document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);

document.getElementById('menuBtn').addEventListener('click', function(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('menuDropdown');
    dropdown.classList.toggle('hidden');
});

document.getElementById('exportBtn').addEventListener('click', exportIssues);
document.getElementById('importBtn').addEventListener('click', function() {
    document.getElementById('menuDropdown').classList.add('hidden');
    document.getElementById('fileInput').click();
});
document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('importMerge').addEventListener('click', function() {
    performImport(true);
});
document.getElementById('importOverwrite').addEventListener('click', function() {
    performImport(false);
});
document.getElementById('cancelImport').addEventListener('click', function() {
    document.getElementById('importModal').classList.remove('show');
});

document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

initTheme();

// Custom select handling
document.addEventListener('click', function(e) {
    // Close all custom selects when clicking outside
    if (!e.target.closest('.custom-select')) {
        document.querySelectorAll('.custom-select.open').forEach(select => {
            select.classList.remove('open');
        });
    }
});

document.addEventListener('click', function(e) {
    const trigger = e.target.closest('.custom-select-trigger');
    if (trigger) {
        const select = trigger.closest('.custom-select');
        const isOpen = select.classList.contains('open');
        
        // Close all other selects
        document.querySelectorAll('.custom-select.open').forEach(s => {
            if (s !== select) s.classList.remove('open');
        });
        
        select.classList.toggle('open', !isOpen);
        return;
    }
    
    const option = e.target.closest('.custom-select-option');
    if (option) {
        const select = option.closest('.custom-select');
        const selectId = select.dataset.selectId;
        const value = option.dataset.value;
        const trigger = select.querySelector('.custom-select-trigger');
        
        // Update trigger text
        trigger.textContent = option.textContent;
        
        // Update selected state
        select.querySelectorAll('.custom-select-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');
        
        // Sync the original hidden select
        const origSelect = document.getElementById(selectId);
        if (origSelect) {
            origSelect.value = value;
        }
        
        // Close dropdown
        select.classList.remove('open');
        
        // Trigger change event for the corresponding original select if needed
        if (selectId === 'statusFilter') {
            document.getElementById('statusFilter').value = value;
            renderIssues();
        } else if (selectId === 'tagFilter') {
            document.getElementById('tagFilter').value = value;
            renderIssues();
        } else if (selectId === 'sortByFilter') {
            document.getElementById('sortByFilter').value = value;
            renderIssues();
        } else if (selectId === 'detailStatus') {
            // Original select is updated via onclick in option
            updateIssueStatus(currentIssueId, value);
        } else if (selectId === 'editStatus') {
            // Original select is updated via custom select handler
        }
    }
});

// Sync custom selects with original selects
function syncCustomSelects() {
    document.querySelectorAll('.custom-select').forEach(select => {
        const selectId = select.dataset.selectId;
        const originalSelect = document.getElementById(selectId);
        if (originalSelect) {
            const trigger = select.querySelector('.custom-select-trigger');
            const selectedOption = originalSelect.options[originalSelect.selectedIndex];
            if (selectedOption && trigger) {
                trigger.textContent = selectedOption.text;
                // Update selected state in custom options
                const value = selectedOption.value;
                select.querySelectorAll('.custom-select-option').forEach(opt => {
                    opt.classList.toggle('selected', opt.dataset.value === value);
                });
            }
        }
    });
}

// Update custom tag filter when tags are loaded
function updateTagFilterOptions() {
    const tagFilter = document.getElementById('tagFilter');
    const customSelect = document.querySelector('[data-select-id="tagFilter"]');
    if (!customSelect) return;
    
    const optionsContainer = customSelect.querySelector('.custom-select-options');
    const trigger = customSelect.querySelector('.custom-select-trigger');
    
    // Keep "All Tags" option
    optionsContainer.innerHTML = '<div class="custom-select-option selected" data-value="">All Tags</div>';
    
    allTags.forEach(tag => {
        const option = document.createElement('div');
        option.className = 'custom-select-option';
        option.dataset.value = tag;
        option.textContent = tag;
        optionsContainer.appendChild(option);
    });
}

window.addEventListener('click', (event) => {
    // 只關閉 Import 和 Delete modal，不關閉 New Issue modal
    if (event.target.classList.contains('modal') && 
        !event.target.id.includes('issueModal')) {
        event.target.classList.remove('show');
    }
    
    // 3條線選單：點擊外部關閉
    const menuDropdown = document.getElementById('menuDropdown');
    const menuBtn = document.getElementById('menuBtn');
    if (!menuDropdown.classList.contains('hidden') && 
        !menuDropdown.contains(event.target) && 
        event.target !== menuBtn) {
        menuDropdown.classList.add('hidden');
    }
});

window.addEventListener('hashchange', handleRouter);

window.addEventListener('scroll', function() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (window.scrollY > 200) {
        backToTopBtn.classList.remove('hidden');
    } else {
        backToTopBtn.classList.add('hidden');
    }
});

document.getElementById('backToTopBtn').addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.addEventListener('keydown', function(event) {
    if (event.key === '/') {
        const listView = document.getElementById('listView');
        if (!listView.classList.contains('hidden')) {
            const target = event.target;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
                event.preventDefault();
                document.getElementById('searchInput').focus();
            }
        }
    }
});

window.navigateToDetail = navigateToDetail;
window.navigateViaReference = navigateViaReference;
window.goToPrevIssue = goToPrevIssue;
window.removeTag = removeTag;
window.handleTagInput = handleTagInput;
window.updateIssueStatus = updateIssueStatus;
window.showEditForm = showEditForm;
window.cancelEdit = cancelEdit;

document.addEventListener('mouseover', (event) => {
    if (event.target.classList.contains('issue-ref')) {
        showIssuePreview(event);
    }
});

document.addEventListener('mouseout', (event) => {
    if (event.target.classList.contains('issue-ref')) {
        hideIssuePreview(event);
    }
});

document.addEventListener('mouseover', (event) => {
    if (event.target.closest('#issuePreview')) {
        if (previewTimeout) {
            clearTimeout(previewTimeout);
        }
    }
});

document.addEventListener('mouseout', (event) => {
    if (event.target.closest('#issuePreview')) {
        const preview = document.getElementById('issuePreview');
        if (preview) {
            preview.style.display = 'none';
            currentPreviewIssue = null;
        }
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const preview = document.getElementById('issuePreview');
        if (preview && preview.style.display === 'block') {
            preview.style.display = 'none';
            currentPreviewIssue = null;
            if (previewTimeout) {
                clearTimeout(previewTimeout);
            }
        }
    }
});

handleRouter();
