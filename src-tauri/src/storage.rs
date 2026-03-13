use crate::models::AppData;
use std::fs;
use std::path::PathBuf;

pub struct Storage {
    data_path: PathBuf,
}

impl Storage {
    pub fn new() -> Self {
        let data_dir = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("issue-tracker");

        if !data_dir.exists() {
            fs::create_dir_all(&data_dir).expect("Failed to create data directory");
        }

        let data_path = data_dir.join("issues.json");

        Self { data_path }
    }

    pub fn load(&self) -> AppData {
        if !self.data_path.exists() {
            return AppData::default();
        }

        let content = fs::read_to_string(&self.data_path).expect("Failed to read data file");

        serde_json::from_str(&content).unwrap_or_default()
    }

    pub fn save(&self, data: &AppData) -> Result<(), String> {
        let content = serde_json::to_string_pretty(data)
            .map_err(|e| format!("Failed to serialize data: {}", e))?;

        fs::write(&self.data_path, content)
            .map_err(|e| format!("Failed to write data file: {}", e))?;

        Ok(())
    }
}

impl Default for Storage {
    fn default() -> Self {
        Self::new()
    }
}
