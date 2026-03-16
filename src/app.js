const { invoke } = window.__TAURI__.core;

let issues = [];
let allTags = [];
let currentIssueId = null;

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
    } catch (error) {
        console.error('Failed to load tags:', error);
    }
}

function renderIssues() {
    const issuesList = document.getElementById('issuesList');
    const statusFilter = document.getElementById('statusFilter').value;
    const tagFilter = document.getElementById('tagFilter').value;
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
    window.location.hash = `issue/${issueId}`;
}

function navigateToList() {
    window.location.hash = '';
}

function showListView() {
    document.getElementById('listView').classList.remove('hidden');
    document.getElementById('detailView').classList.add('hidden');
    currentIssueId = null;
    loadIssues();
}

function showDetailView(issueId) {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) {
        navigateToList();
        return;
    }

    currentIssueId = issueId;
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');

    const content = document.getElementById('detailContent');
    content.innerHTML = `
        <h1 class="detail-title">${escapeHtml(issue.title)}</h1>
        
        <div class="edit-section">
            <label>Status</label>
            <select id="detailStatus" onchange="updateIssueStatus('${issue.id}', this.value)">
                <option value="Open" ${issue.status === 'Open' ? 'selected' : ''}>Open</option>
                <option value="InProgress" ${issue.status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                <option value="Closed" ${issue.status === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
        </div>

        <div class="detail-section">
            <div class="detail-label">Description</div>
            <div class="detail-value detail-description">${renderMarkdown(issue.description) || 'No description'}</div>
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
                <select id="editStatus">
                    <option value="Open" ${issue.status === 'Open' ? 'selected' : ''}>Open</option>
                    <option value="InProgress" ${issue.status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                    <option value="Closed" ${issue.status === 'Closed' ? 'selected' : ''}>Closed</option>
                </select>
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    document.getElementById('issueId').value = '';
    document.getElementById('status').value = 'Open';
}

function closeModal() {
    document.getElementById('issueModal').classList.remove('show');
}

async function saveIssue(event) {
    event.preventDefault();

    const id = document.getElementById('issueId').value;
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const status = document.getElementById('status').value;
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
        if (!merge) {
            for (const issue of issues) {
                await invoke('delete_issue', { id: issue.id });
            }
        }
        
        for (const item of pendingImportData) {
            await invoke('create_issue', {
                request: {
                    title: item.title || 'Untitled',
                    description: item.description || '',
                    tags: item.tags || []
                }
            });
        }
        
        document.getElementById('importModal').classList.remove('show');
        pendingImportData = null;
        await loadIssues();
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
document.getElementById('backBtn').addEventListener('click', navigateToList);
document.getElementById('editIssueBtn').addEventListener('click', showEditForm);
document.getElementById('deleteIssueBtn').addEventListener('click', showDeleteModal);
document.querySelector('.close').addEventListener('click', closeModal);
document.getElementById('issueForm').addEventListener('submit', saveIssue);
document.getElementById('statusFilter').addEventListener('change', renderIssues);
document.getElementById('tagFilter').addEventListener('change', renderIssues);
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

window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
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
window.removeTag = removeTag;
window.handleTagInput = handleTagInput;
window.updateIssueStatus = updateIssueStatus;
window.showEditForm = showEditForm;
window.cancelEdit = cancelEdit;

handleRouter();
