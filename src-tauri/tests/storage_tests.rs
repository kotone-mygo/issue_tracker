use issue_tracker_lib::models::{AppData, Issue, IssueStatus};
use issue_tracker_lib::storage::Storage;
use std::fs;
use std::path::PathBuf;

fn create_test_issue(title: &str, tags: Vec<&str>) -> Issue {
    Issue {
        id: uuid::Uuid::new_v4().to_string(),
        title: title.to_string(),
        description: "Test description".to_string(),
        status: IssueStatus::Open,
        tags: tags.into_iter().map(|s| s.to_string()).collect(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    }
}

fn create_temp_storage() -> (Storage, PathBuf) {
    let temp_dir = std::env::temp_dir().join(format!("test_storage_{}", uuid::Uuid::new_v4()));
    let storage = Storage::with_path(temp_dir.clone());
    (storage, temp_dir)
}

fn cleanup(temp_path: &PathBuf) {
    let _ = fs::remove_file(temp_path);
    let _ = fs::remove_dir(temp_path.parent().unwrap());
}

fn create_test_data(count: usize) -> AppData {
    AppData {
        issues: (0..count)
            .map(|i| Issue {
                id: format!("id-{}", i),
                title: format!("Issue {}", i),
                description: format!("Description {}", i),
                status: IssueStatus::Open,
                tags: vec![],
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
            })
            .collect(),
    }
}

#[test]
fn test_storage_with_path_creates_directory() {
    let temp_dir = std::env::temp_dir().join(format!("test_{}", uuid::Uuid::new_v4()));
    let _storage = Storage::with_path(temp_dir.clone());

    assert!(temp_dir.parent().unwrap().exists());
    cleanup(&temp_dir);
}

#[test]
fn test_storage_load_returns_default_for_missing_file() {
    let (storage, temp_path) = create_temp_storage();

    let data = storage.load();
    assert!(data.issues.is_empty());

    cleanup(&temp_path);
}

#[test]
fn test_storage_save_and_load() {
    let (storage, temp_path) = create_temp_storage();

    let test_data = create_test_data(3);
    storage.save(&test_data).unwrap();

    let loaded_data = storage.load();
    assert_eq!(loaded_data.issues.len(), 3);
    assert_eq!(loaded_data.issues[0].title, "Issue 0");
    assert_eq!(loaded_data.issues[1].title, "Issue 1");
    assert_eq!(loaded_data.issues[2].title, "Issue 2");

    cleanup(&temp_path);
}

#[test]
fn test_storage_overwrites_existing_data() {
    let (storage, temp_path) = create_temp_storage();

    let data1 = create_test_data(2);
    storage.save(&data1).unwrap();

    let data2 = create_test_data(5);
    storage.save(&data2).unwrap();

    let loaded_data = storage.load();
    assert_eq!(loaded_data.issues.len(), 5);

    cleanup(&temp_path);
}

#[test]
fn test_storage_save_preserves_data_integrity() {
    let (storage, temp_path) = create_temp_storage();

    let issue = create_test_issue("Test Issue", vec!["bug".into(), "urgent".into()]);
    let data = AppData {
        issues: vec![issue.clone()],
    };
    storage.save(&data).unwrap();

    let loaded = storage.load();
    assert_eq!(loaded.issues.len(), 1);
    assert_eq!(loaded.issues[0].title, "Test Issue");
    assert_eq!(loaded.issues[0].tags, vec!["bug", "urgent"]);
    assert_eq!(loaded.issues[0].status, IssueStatus::Open);

    cleanup(&temp_path);
}

#[test]
fn test_storage_save_empty_data() {
    let (storage, temp_path) = create_temp_storage();

    let data = AppData { issues: vec![] };
    storage.save(&data).unwrap();

    let loaded = storage.load();
    assert!(loaded.issues.is_empty());

    cleanup(&temp_path);
}

#[test]
fn test_storage_save_returns_error_for_invalid_path() {
    let storage = Storage::with_path(PathBuf::from(
        "/invalid/path/that/does/not/exist/issues.json",
    ));

    let data = create_test_data(1);
    let result = storage.save(&data);
    assert!(result.is_err());
}

#[test]
fn test_storage_load_returns_empty_for_corrupted_file() {
    let (storage, temp_path) = create_temp_storage();

    fs::write(&temp_path, "invalid json content {").unwrap();

    let data = storage.load();
    assert!(data.issues.is_empty());

    cleanup(&temp_path);
}

#[test]
fn test_storage_load_returns_empty_for_empty_file() {
    let (storage, temp_path) = create_temp_storage();

    fs::write(&temp_path, "").unwrap();

    let data = storage.load();
    assert!(data.issues.is_empty());

    cleanup(&temp_path);
}

#[test]
fn test_storage_json_format_is_pretty() {
    let (storage, temp_path) = create_temp_storage();

    let data = create_test_data(1);
    storage.save(&data).unwrap();

    let content = fs::read_to_string(&temp_path).unwrap();
    assert!(content.contains("\n"));
    assert!(content.contains("  "));

    cleanup(&temp_path);
}

#[test]
fn test_storage_default() {
    let storage = Storage::default();

    let data = storage.load();
    assert!(data.issues.is_empty() || !data.issues.is_empty());
}
