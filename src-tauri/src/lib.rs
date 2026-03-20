pub mod commands;
pub mod models;
pub mod storage;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_issues,
            commands::get_issue,
            commands::create_issue,
            commands::update_issue,
            commands::delete_issue,
            commands::add_tag,
            commands::remove_tag,
            commands::filter_by_tag,
            commands::filter_by_status,
            commands::get_all_tags,
            commands::import_issues,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
