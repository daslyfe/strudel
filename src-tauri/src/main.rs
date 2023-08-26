// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use log::warn;
use tauri_plugin_log::LogTarget;
use midir::{ MidiOutput, MidiOutputConnection };

mod midik;
use tokio::sync::mpsc;
use tokio::sync::Mutex;

fn main() {
  let (async_input_transmit, async_input_recieve) = mpsc::channel(1);
  let (async_output_transmit, mut async_output_recieve) = mpsc::channel(1);
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
    .manage(midik::AsyncInputTransmit {
      inner: Mutex::new(async_input_transmit),
    })
    .invoke_handler(tauri::generate_handler![midik::sendmidi])
    // .invoke_handler(tauri::generate_handler![midik::test_send])
    .setup(|_app| {
      println!("Setting up...");
      // midi::init(async_input_rx);

      tauri::async_runtime::spawn(async move {
        midik::async_process_model(async_input_recieve, async_output_transmit).await
      });

      tauri::async_runtime::spawn(async move {
        let midi_out = MidiOutput::new("strudel").unwrap();
        let out_ports = midi_out.ports();
        let out_port = out_ports.get(2).ok_or("No MIDI output ports available").unwrap();
        let mut x = 0;
        let mut out_con = midi_out.connect(out_port, "strudel-connections").unwrap();
        loop {
          x = x + 1;
          if let Some(package) = async_output_recieve.recv().await {
            let (mut note, requested_output_port_name) = package;
            note.start(&mut out_con);
            println!("note recieved! {}", x);
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
