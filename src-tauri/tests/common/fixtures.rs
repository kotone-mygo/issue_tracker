use chrono::Utc;
use issue_tracker_lib::models::{AppData, Issue, IssueStatus};

pub fn create_test_issue(title: &str, tags: Vec<&str>) -> Issue {
    Issue {
        id: uuid::Uuid::new_v4().to_string(),
        title: title.to_string(),
        description: "Test description".to_string(),
        status: IssueStatus::Open,
        tags: tags.into_iter().map(|s| s.to_string()).collect(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    }
}

pub fn create_test_issue_with_status(title: &str, status: IssueStatus, tags: Vec<&str>) -> Issue {
    Issue {
        id: uuid::Uuid::new_v4().to_string(),
        title: title.to_string(),
        description: "Test description".to_string(),
        status,
        tags: tags.into_iter().map(|s| s.to_string()).collect(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    }
}

pub fn create_test_issue_with_id(id: &str, title: &str, tags: Vec<&str>) -> Issue {
    Issue {
        id: id.to_string(),
        title: title.to_string(),
        description: "Test description".to_string(),
        status: IssueStatus::Open,
        tags: tags.into_iter().map(|s| s.to_string()).collect(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    }
}

pub fn create_test_app_data(issues: Vec<Issue>) -> AppData {
    AppData { issues }
}

pub fn create_empty_app_data() -> AppData {
    AppData::new()
}
