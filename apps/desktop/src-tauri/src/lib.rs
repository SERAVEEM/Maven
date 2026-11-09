pub mod db;
pub mod commands;

use db::{DatabaseState, run_migrations};
use std::fs;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent app from quitting, minimize/hide to System Tray instead
                api.prevent_close();
                let _ = window.hide();
                println!("[MAVEN] Window minimized to System Tray. Running in background.");
            }
        })
        .setup(|app| {
            // Resolve local app data directory for SQLite database
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
                std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
            });

            if !app_data_dir.exists() {
                let _ = fs::create_dir_all(&app_data_dir);
            }

            let db_path = app_data_dir.join("maven_local.db");
            println!("[MAVEN] Initializing local SQLite database at: {:?}", db_path);

            let db_state = DatabaseState::new(db_path)
                .or_else(|_| DatabaseState::in_memory())
                .expect("Failed to initialize SQLite database");

            // Execute versioned migrations
            {
                let mut conn = db_state.conn.lock().expect("Failed to lock database mutex");
                run_migrations(&mut conn).expect("Failed to run initial SQLite migrations");
            }

            // Register state in Tauri runtime
            app.manage(db_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::create_task,
            commands::soft_delete_task,
            commands::restore_task,
            commands::get_notes,
            commands::create_note,
            commands::search_notes,
            commands::soft_delete_note,
            commands::get_projects,
            commands::create_project,
            commands::get_calendar_events,
            commands::create_calendar_event,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MAVEN tauri application");
}

