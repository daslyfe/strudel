// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use log::warn;
use tauri_plugin_log::LogTarget;
mod midi;
use midi::{ send_tauri_midi_message, test_send };
use tokio::sync::mpsc;
use tokio::sync::Mutex;

fn main() {
  let (async_input_tx, async_input_rx) = mpsc::channel(1);
  tauri::Builder
    ::default()
    .plugin(
      tauri_plugin_log::Builder
        ::default()
        .targets([
          // LogTarget::LogDir,
          // LogTarget::Stdout,
          // LogTarget::Webview,
        ])
        .build()
    )
    .manage(midi::AsyncInputTx {
      inner: Mutex::new(async_input_tx),
    })
    .invoke_handler(tauri::generate_handler![send_tauri_midi_message])
    .invoke_handler(tauri::generate_handler![test_send])
    .setup(|_app| {
      warn!("Setting up...");
      midi::init(async_input_rx);
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
