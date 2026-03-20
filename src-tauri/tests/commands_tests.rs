mod common;

use common::fixtures::{
    create_empty_app_data, create_test_app_data, create_test_issue, create_test_issue_with_id,
    create_test_issue_with_status,
};
use issue_tracker_lib::models::{
    AppData, CreateIssueRequest, Issue, IssueStatus, UpdateIssueRequest,
};
use std::collections::HashSet;
use std::sync::Mutex;

fn create_test_state(data: AppData) -> TestAppState {
    TestAppState {
        data: Mutex::new(data),
    }
}

struct TestAppState {
    data: Mutex<AppData>,
}

impl TestAppState {
    fn get_issues(&self) -> Vec<Issue> {
        self.data.lock().unwrap().issues.clone()
    }

    fn get_issue(&self, id: &str) -> Option<Issue> {
        self.data
            .lock()
            .unwrap()
            .issues
            .iter()
            .find(|i| i.id == id)
            .cloned()
    }

    fn create_issue(&self, request: CreateIssueRequest) -> Issue {
        let mut data = self.data.lock().unwrap();
        let issue = Issue::new(request.title, request.description, request.tags);
        data.issues.push(issue.clone());
        issue
    }

    fn update_issue(&self, request: UpdateIssueRequest) -> Option<Issue> {
        let mut data = self.data.lock().unwrap();
        let issue = data.issues.iter_mut().find(|i| i.id == request.id)?;

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
        issue.updated_at = chrono::Utc::now();

        Some(issue.clone())
    }

    fn delete_issue(&self, id: &str) -> bool {
        let mut data = self.data.lock().unwrap();
        let initial_len = data.issues.len();
        data.issues.retain(|i| i.id != id);
        data.issues.len() < initial_len
    }

    fn add_tag(&self, issue_id: &str, tag: &str) -> Option<Issue> {
        let mut data = self.data.lock().unwrap();
        let issue = data.issues.iter_mut().find(|i| i.id == issue_id)?;

        if !issue.tags.contains(&tag.to_string()) {
            issue.tags.push(tag.to_string());
            issue.updated_at = chrono::Utc::now();
        }

        Some(issue.clone())
    }

    fn remove_tag(&self, issue_id: &str, tag: &str) -> Option<Issue> {
        let mut data = self.data.lock().unwrap();
        let issue = data.issues.iter_mut().find(|i| i.id == issue_id)?;

        issue.tags.retain(|t| t != tag);
        issue.updated_at = chrono::Utc::now();

        Some(issue.clone())
    }

    fn filter_by_tag(&self, tag: &str) -> Vec<Issue> {
        let data = self.data.lock().unwrap();
        data.issues
            .iter()
            .filter(|i| i.tags.contains(&tag.to_string()))
            .cloned()
            .collect()
    }

    fn filter_by_status(&self, status: IssueStatus) -> Vec<Issue> {
        let data = self.data.lock().unwrap();
        data.issues
            .iter()
            .filter(|i| i.status == status)
            .cloned()
            .collect()
    }

    fn get_all_tags(&self) -> Vec<String> {
        let data = self.data.lock().unwrap();
        let mut tags: Vec<String> = data.issues.iter().flat_map(|i| i.tags.clone()).collect();
        tags.sort();
        tags.dedup();
        tags
    }

    fn import_issues(&self, issues: Vec<Issue>, merge: bool) {
        let mut data = self.data.lock().unwrap();

        if merge {
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
            data.issues = issues;
        }
    }
}

#[test]
fn test_get_issues_empty_database() {
    let state = create_test_state(create_empty_app_data());
    let issues = state.get_issues();
    assert!(issues.is_empty());
}

#[test]
fn test_get_issues_with_data() {
    let issue1 = create_test_issue("Issue 1", vec![]);
    let issue2 = create_test_issue("Issue 2", vec![]);
    let state = create_test_state(create_test_app_data(vec![issue1, issue2]));

    let issues = state.get_issues();
    assert_eq!(issues.len(), 2);
}

#[test]
fn test_get_issue_found() {
    let issue = create_test_issue("Test Issue", vec![]);
    let state = create_test_state(create_test_app_data(vec![issue.clone()]));

    let found = state.get_issue(&issue.id);
    assert!(found.is_some());
    assert_eq!(found.unwrap().title, "Test Issue");
}

#[test]
fn test_get_issue_not_found() {
    let state = create_test_state(create_empty_app_data());
    let found = state.get_issue("non-existent-id");
    assert!(found.is_none());
}

#[test]
fn test_create_issue() {
    let state = create_test_state(create_empty_app_data());
    let request = CreateIssueRequest {
        title: "New Issue".into(),
        description: "Description".into(),
        tags: vec!["bug".into()],
    };

    let issue = state.create_issue(request);

    assert!(!issue.id.is_empty());
    assert_eq!(issue.title, "New Issue");
    assert_eq!(issue.description, "Description");
    assert_eq!(issue.tags, vec!["bug"]);
    assert_eq!(issue.status, IssueStatus::Open);
}

#[test]
fn test_update_issue_title() {
    let issue = create_test_issue("Original Title", vec![]);
    let state = create_test_state(create_test_app_data(vec![issue.clone()]));

    let request = UpdateIssueRequest {
        id: issue.id.clone(),
        title: Some("Updated Title".into()),
        description: None,
        status: None,
        tags: None,
    };

    let updated = state.update_issue(request);
    assert!(updated.is_some());
    assert_eq!(updated.unwrap().title, "Updated Title");
}

#[test]
fn test_update_issue_status() {
    let issue = create_test_issue("Title", vec![]);
    let state = create_test_state(create_test_app_data(vec![issue.clone()]));

    let request = UpdateIssueRequest {
        id: issue.id.clone(),
        title: None,
        description: None,
        status: Some(IssueStatus::Closed),
        tags: None,
    };

    let updated = state.update_issue(request);
    assert!(updated.is_some());
    assert_eq!(updated.unwrap().status, IssueStatus::Closed);
}

#[test]
fn test_update_issue_tags() {
    let issue = create_test_issue("Title", vec![]);
    let state = create_test_state(create_test_app_data(vec![issue.clone()]));

    let request = UpdateIssueRequest {
        id: issue.id.clone(),
        title: None,
        description: None,
        status: None,
        tags: Some(vec!["new-tag".into()]),
    };

    let updated = state.update_issue(request);
    assert!(updated.is_some());
    assert_eq!(updated.unwrap().tags, vec!["new-tag"]);
}

#[test]
fn test_update_issue_not_found() {
    let state = create_test_state(create_empty_app_data());
    let request = UpdateIssueRequest {
        id: "non-existent".into(),
        title: Some("Title".into()),
        description: None,
        status: None,
        tags: None,
    };

    let updated = state.update_issue(request);
    assert!(updated.is_none());
}

#[test]
fn test_delete_issue_success() {
    let issue = create_test_issue("To Delete", vec![]);
    let state = create_test_state(create_test_app_data(vec![issue.clone()]));

    let deleted = state.delete_issue(&issue.id);
    assert!(deleted);
    assert!(state.get_issues().is_empty());
}

#[test]
fn test_delete_issue_not_found() {
    let state = create_test_state(create_empty_app_data());
    let deleted = state.delete_issue("non-existent-id");
    assert!(!deleted);
}

#[test]
fn test_add_tag_new() {
    let issue = create_test_issue("Title", vec![]);
    let state = create_test_state(create_test_app_data(vec![issue.clone()]));

    let updated = state.add_tag(&issue.id, "bug");
    assert!(updated.is_some());
    assert!(updated.unwrap().tags.contains(&"bug".to_string()));
}

#[test]
fn test_add_tag_existing() {
    let issue = create_test_issue("Title", vec!["bug".into()]);
    let state = create_test_state(create_test_app_data(vec![issue.clone()]));

    let updated = state.add_tag(&issue.id, "bug");
    assert!(updated.is_some());
    assert_eq!(updated.unwrap().tags.len(), 1);
}

#[test]
fn test_add_tag_not_found() {
    let state = create_test_state(create_empty_app_data());
    let updated = state.add_tag("non-existent", "bug");
    assert!(updated.is_none());
}

#[test]
fn test_remove_tag_success() {
    let issue = create_test_issue("Title", vec!["bug".into(), "urgent".into()]);
    let state = create_test_state(create_test_app_data(vec![issue.clone()]));

    let updated = state.remove_tag(&issue.id, "bug");
    assert!(updated.is_some());
    let tags = updated.unwrap().tags;
    assert!(!tags.contains(&"bug".to_string()));
    assert!(tags.contains(&"urgent".to_string()));
}

#[test]
fn test_remove_tag_not_found() {
    let issue = create_test_issue("Title", vec![]);
    let state = create_test_state(create_test_app_data(vec![issue.clone()]));

    let updated = state.remove_tag(&issue.id, "non-existent");
    assert!(updated.is_some());
    assert!(updated.unwrap().tags.is_empty());
}

#[test]
fn test_filter_by_tag() {
    let issue1 = create_test_issue("Issue 1", vec!["bug".into()]);
    let issue2 = create_test_issue("Issue 2", vec!["feature".into()]);
    let issue3 = create_test_issue("Issue 3", vec!["bug".into()]);
    let state = create_test_state(create_test_app_data(vec![issue1, issue2, issue3]));

    let filtered = state.filter_by_tag("bug");
    assert_eq!(filtered.len(), 2);
}

#[test]
fn test_filter_by_tag_no_match() {
    let issue = create_test_issue("Issue", vec!["bug".into()]);
    let state = create_test_state(create_test_app_data(vec![issue]));

    let filtered = state.filter_by_tag("feature");
    assert!(filtered.is_empty());
}

#[test]
fn test_filter_by_status() {
    let issue1 = create_test_issue("Issue 1", vec![]);
    let issue2 = create_test_issue_with_status("Issue 2", IssueStatus::InProgress, vec![]);
    let issue3 = create_test_issue_with_status("Issue 3", IssueStatus::Closed, vec![]);
    let state = create_test_state(create_test_app_data(vec![issue1, issue2, issue3]));

    let filtered = state.filter_by_status(IssueStatus::InProgress);
    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].title, "Issue 2");
}

#[test]
fn test_get_all_tags() {
    let issue1 = create_test_issue("Issue 1", vec!["bug".into()]);
    let issue2 = create_test_issue("Issue 2", vec!["feature".into(), "urgent".into()]);
    let issue3 = create_test_issue("Issue 3", vec!["bug".into()]);
    let state = create_test_state(create_test_app_data(vec![issue1, issue2, issue3]));

    let tags = state.get_all_tags();
    assert_eq!(tags.len(), 3);
    assert_eq!(tags, vec!["bug", "feature", "urgent"]);
}

#[test]
fn test_get_all_tags_sorted() {
    let issue1 = create_test_issue("Issue 1", vec!["zebra".into()]);
    let issue2 = create_test_issue("Issue 2", vec!["apple".into()]);
    let state = create_test_state(create_test_app_data(vec![issue1, issue2]));

    let tags = state.get_all_tags();
    assert_eq!(tags, vec!["apple", "zebra"]);
}

#[test]
fn test_import_issues_merge_mode() {
    let existing = create_test_issue("Existing", vec![]);
    let state = create_test_state(create_test_app_data(vec![existing.clone()]));

    let new_issues = vec![
        create_test_issue_with_id(&existing.id, "Duplicate ID", vec![]),
        create_test_issue("New Issue", vec![]),
    ];

    state.import_issues(new_issues, true);

    let issues = state.get_issues();
    assert_eq!(issues.len(), 3);
}

#[test]
fn test_import_issues_overwrite_mode() {
    let existing = create_test_issue("Existing", vec![]);
    let state = create_test_state(create_test_app_data(vec![existing]));

    let new_issues = vec![create_test_issue("Imported", vec![])];

    state.import_issues(new_issues, false);

    let issues = state.get_issues();
    assert_eq!(issues.len(), 1);
    assert_eq!(issues[0].title, "Imported");
}
