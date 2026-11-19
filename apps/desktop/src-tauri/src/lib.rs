pub mod commands;
pub mod db;

use db::{run_migrations, DatabaseState};
use std::fs;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent app from quitting, minimize/hide to System Tray instead
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
                std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
            });

            if !app_data_dir.exists() {
                fs::create_dir_all(&app_data_dir)?;
            }

            let db_path = app_data_dir.join("maven_local.db");
            let db_state = DatabaseState::new(db_path)?;

            {
                let mut conn = db_state
                    .conn
                    .lock()
                    .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
                run_migrations(&mut conn)
                    .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            }

            app.manage(db_state);

            let show_item = MenuItem::with_id(app, "show", "Show MAVEN", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit MAVEN", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("MAVEN - Personal AI Assistant")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                });

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }
            tray_builder.build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::create_task,
            commands::update_task,
            commands::soft_delete_task,
            commands::restore_task,
            commands::get_notes,
            commands::create_note,
            commands::update_note,
            commands::restore_note,
            commands::search_notes,
            commands::soft_delete_note,
            commands::get_tags,
            commands::create_tag,
            commands::set_note_tags,
            commands::get_projects,
            commands::create_project,
            commands::get_calendar_events,
            commands::create_calendar_event,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MAVEN tauri application");
}
