mod common;

use common::fixtures::{
    create_empty_app_data, create_test_app_data, create_test_issue, create_test_issue_with_id,
    create_test_issue_with_status,
};
use issue_tracker_lib::models::{AppData, Issue, IssueStatus};

#[test]
fn test_issue_new_creates_issue_with_valid_uuid() {
    let issue = Issue::new(
        "Test Title".into(),
        "Test Description".into(),
        vec!["bug".into()],
    );

    assert!(!issue.id.is_empty(), "Issue ID should not be empty");
    assert_eq!(issue.id.len(), 36, "UUID v4 has 36 characters");
}

#[test]
fn test_issue_new_sets_title_and_description() {
    let issue = Issue::new("My Title".into(), "My Description".into(), vec![]);

    assert_eq!(issue.title, "My Title");
    assert_eq!(issue.description, "My Description");
}

#[test]
fn test_issue_new_sets_default_status_to_open() {
    let issue = Issue::new("Title".into(), "Description".into(), vec![]);

    assert_eq!(issue.status, IssueStatus::Open);
}

#[test]
fn test_issue_new_sets_tags() {
    let issue = Issue::new(
        "Title".into(),
        "Description".into(),
        vec!["bug".into(), "urgent".into()],
    );

    assert_eq!(issue.tags.len(), 2);
    assert!(issue.tags.contains(&"bug".to_string()));
    assert!(issue.tags.contains(&"urgent".to_string()));
}

#[test]
fn test_issue_new_sets_timestamps_equal() {
    let issue = Issue::new("Title".into(), "Description".into(), vec![]);

    assert_eq!(issue.created_at, issue.updated_at);
}

#[test]
fn test_issue_status_default_returns_open() {
    let status = IssueStatus::default();
    assert_eq!(status, IssueStatus::Open);
}

#[test]
fn test_issue_status_variants() {
    assert_ne!(IssueStatus::Open, IssueStatus::InProgress);
    assert_ne!(IssueStatus::InProgress, IssueStatus::Closed);
    assert_ne!(IssueStatus::Closed, IssueStatus::Open);
}

#[test]
fn test_issue_status_serialization() {
    let json = serde_json::to_string(&IssueStatus::Open).unwrap();
    assert_eq!(json, "\"Open\"");

    let json = serde_json::to_string(&IssueStatus::InProgress).unwrap();
    assert_eq!(json, "\"InProgress\"");

    let json = serde_json::to_string(&IssueStatus::Closed).unwrap();
    assert_eq!(json, "\"Closed\"");
}

#[test]
fn test_issue_deserialization() {
    let open: IssueStatus = serde_json::from_str("\"Open\"").unwrap();
    assert_eq!(open, IssueStatus::Open);

    let in_progress: IssueStatus = serde_json::from_str("\"InProgress\"").unwrap();
    assert_eq!(in_progress, IssueStatus::InProgress);

    let closed: IssueStatus = serde_json::from_str("\"Closed\"").unwrap();
    assert_eq!(closed, IssueStatus::Closed);
}

#[test]
fn test_app_data_default_is_empty() {
    let data = AppData::default();
    assert!(data.issues.is_empty());
}

#[test]
fn test_app_data_new_is_empty() {
    let data = AppData::new();
    assert!(data.issues.is_empty());
}

#[test]
fn test_app_data_with_issues() {
    let issue1 = create_test_issue("Issue 1", vec![]);
    let issue2 = create_test_issue("Issue 2", vec![]);
    let data = create_test_app_data(vec![issue1.clone(), issue2.clone()]);

    assert_eq!(data.issues.len(), 2);
    assert_eq!(data.issues[0].title, "Issue 1");
    assert_eq!(data.issues[1].title, "Issue 2");
}

#[test]
fn test_create_test_issue_with_id() {
    let issue = create_test_issue_with_id("test-id-123", "Titled Issue", vec!["tag1"]);

    assert_eq!(issue.id, "test-id-123");
    assert_eq!(issue.title, "Titled Issue");
    assert!(issue.tags.contains(&"tag1".to_string()));
}

#[test]
fn test_create_test_issue_with_status() {
    let issue = create_test_issue_with_status("Title", IssueStatus::Closed, vec![]);

    assert_eq!(issue.status, IssueStatus::Closed);
}

#[test]
fn test_create_empty_app_data() {
    let data = create_empty_app_data();
    assert!(data.issues.is_empty());
}

#[test]
fn test_issue_serialization_roundtrip() {
    let issue = Issue::new(
        "Test Title".into(),
        "Test Description".into(),
        vec!["bug".into()],
    );

    let json = serde_json::to_string(&issue).unwrap();
    let deserialized: Issue = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.id, issue.id);
    assert_eq!(deserialized.title, issue.title);
    assert_eq!(deserialized.description, issue.description);
    assert_eq!(deserialized.status, issue.status);
    assert_eq!(deserialized.tags, issue.tags);
}
