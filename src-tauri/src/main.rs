// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use log::warn;
use tauri_plugin_log::{LogTarget};
mod midi;

// fn main() {
//   tauri::Builder::default()
//     .run(tauri::generate_context!())
//     .expect("error while running tauri application");
//   warn!("leeeroy jeeenkins");

//   println!("asfaijasfajsfiajfs");
//   let x = 2;
//   let  _y = 2 + x;
//   midi::initialize();
// }

fn main() {
  tauri::Builder::default()
      .plugin(tauri_plugin_log::Builder::default().targets([
        // LogTarget::LogDir,
          LogTarget::Stdout,
         // LogTarget::Webview,
      ]).build())
     .setup(|_app| {
      warn!("Setting up...");
      midi::initialize();
      Ok(())
     })
      .run(tauri::generate_context!())
      .expect("error while running tauri application");

}