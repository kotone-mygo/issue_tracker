use crate::models::{AppData, CreateIssueRequest, Issue, IssueStatus, UpdateIssueRequest};
use crate::storage::Storage;
use chrono::Utc;
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub storage: Storage,
    pub data: Mutex<AppData>,
}

impl AppState {
    pub fn new() -> Self {
        let storage = Storage::new();
        let data = storage.load();
        Self {
            storage,
            data: Mutex::new(data),
        }
    }

    pub fn with_data(storage: Storage, data: AppData) -> Self {
        Self {
            storage,
            data: Mutex::new(data),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

#[tauri::command]
pub fn get_issues(state: State<AppState>) -> Result<Vec<Issue>, String> {
    let data = state.data.lock().map_err(|e| e.to_string())?;
    Ok(data.issues.clone())
}

#[tauri::command]
pub fn get_issue(state: State<AppState>, id: String) -> Result<Option<Issue>, String> {
    let data = state.data.lock().map_err(|e| e.to_string())?;
    Ok(data.issues.iter().find(|i| i.id == id).cloned())
}

#[tauri::command]
pub fn create_issue(state: State<AppState>, request: CreateIssueRequest) -> Result<Issue, String> {
    let mut data = state.data.lock().map_err(|e| e.to_string())?;

    let issue = Issue::new(request.title, request.description, request.tags);
    data.issues.push(issue.clone());

    state.storage.save(&data)?;

    Ok(issue)
}

#[tauri::command]
pub fn update_issue(
    state: State<AppState>,
    request: UpdateIssueRequest,
) -> Result<Option<Issue>, String> {
    let mut data = state.data.lock().map_err(|e| e.to_string())?;

    let issue = data.issues.iter_mut().find(|i| i.id == request.id);

    if let Some(issue) = issue {
        if let Some(title) = request.title {
            issue.title = title;
        }
        if let Some(description) = request.description {
            issue.description = description;
        }
        if let Some(status) = request.status {
            issue.status = status;
        }
        if let Some(tags) = request.tags {
            issue.tags = tags;
        }
        issue.updated_at = Utc::now();

        let updated = issue.clone();
        state.storage.save(&data)?;
        Ok(Some(updated))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn delete_issue(state: State<AppState>, id: String) -> Result<bool, String> {
    let mut data = state.data.lock().map_err(|e| e.to_string())?;

    let initial_len = data.issues.len();
    data.issues.retain(|i| i.id != id);

    let deleted = data.issues.len() < initial_len;

    if deleted {
        state.storage.save(&data)?;
    }

    Ok(deleted)
}

#[tauri::command]
pub fn add_tag(
    state: State<AppState>,
    issue_id: String,
    tag: String,
) -> Result<Option<Issue>, String> {
    let mut data = state.data.lock().map_err(|e| e.to_string())?;

    let issue = data.issues.iter_mut().find(|i| i.id == issue_id);

    if let Some(issue) = issue {
        if !issue.tags.contains(&tag) {
            issue.tags.push(tag);
            issue.updated_at = Utc::now();
            let updated = issue.clone();
            state.storage.save(&data)?;
            Ok(Some(updated))
        } else {
            Ok(Some(issue.clone()))
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn remove_tag(
    state: State<AppState>,
    issue_id: String,
    tag: String,
) -> Result<Option<Issue>, String> {
    let mut data = state.data.lock().map_err(|e| e.to_string())?;

    let issue = data.issues.iter_mut().find(|i| i.id == issue_id);

    if let Some(issue) = issue {
        issue.tags.retain(|t| t != &tag);
        issue.updated_at = Utc::now();
        let updated = issue.clone();
        state.storage.save(&data)?;
        Ok(Some(updated))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn filter_by_tag(state: State<AppState>, tag: String) -> Result<Vec<Issue>, String> {
    let data = state.data.lock().map_err(|e| e.to_string())?;
    Ok(data
        .issues
        .iter()
        .filter(|i| i.tags.contains(&tag))
        .cloned()
        .collect())
}

#[tauri::command]
pub fn filter_by_status(state: State<AppState>, status: IssueStatus) -> Result<Vec<Issue>, String> {
    let data = state.data.lock().map_err(|e| e.to_string())?;
    Ok(data
        .issues
        .iter()
        .filter(|i| i.status == status)
        .cloned()
        .collect())
}

#[tauri::command]
pub fn get_all_tags(state: State<AppState>) -> Result<Vec<String>, String> {
    let data = state.data.lock().map_err(|e| e.to_string())?;
    let mut tags: Vec<String> = data.issues.iter().flat_map(|i| i.tags.clone()).collect();
    tags.sort();
    tags.dedup();
    Ok(tags)
}

#[tauri::command]
pub fn import_issues(
    state: State<AppState>,
    issues: Vec<Issue>,
    merge: bool,
) -> Result<(), String> {
    let mut data = state.data.lock().map_err(|e| e.to_string())?;

    if merge {
        // Merge mode: add all issues, generate new ID for conflicts
        let existing_ids: HashSet<String> = data.issues.iter().map(|i| i.id.clone()).collect();

        let mut new_issues: Vec<Issue> = Vec::new();
        for mut issue in issues {
            if existing_ids.contains(&issue.id) {
                issue.id = uuid::Uuid::new_v4().to_string();
            }
            new_issues.push(issue);
        }
        data.issues.extend(new_issues);
    } else {
        // Overwrite mode: replace all existing data with imported data
        data.issues = issues;
    }

    state.storage.save(&data)?;

    Ok(())
}
