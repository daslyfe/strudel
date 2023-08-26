// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use log::warn;
use tauri_plugin_log::LogTarget;
use midir::{ MidiOutput, MidiOutputConnection };

mod midik;
use tokio::sync::mpsc;
use tokio::sync::Mutex;
use tokio::time::{ timeout, Duration, sleep };

use crate::midik::MidiNote;

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

      async fn noteoff(note: &mut MidiNote, out_con: &mut MidiOutputConnection) {
        note.stop(out_con);
        println!("note off ");
      }

      async fn noteon(note: &mut MidiNote, out_con: &mut MidiOutputConnection) {
        sleep(Duration::from_millis(note.offset)).await;
        note.start(out_con);
        println!("note on ");
      }

      tauri::async_runtime::spawn(async move {
        let midi_out = MidiOutput::new("strudel").unwrap();
        let out_ports = midi_out.ports();

        if out_ports.len() == 0 {
          println!("unable to find any midi ports");
          return;
        }
        let out_port = out_ports.get(2).ok_or("No MIDI output ports available").unwrap();
        let mut x = 0;
        let mut out_con: MidiOutputConnection = midi_out.connect(out_port, "strudel-connections").unwrap();
        loop {
          if let Some(package) = async_output_recieve.recv().await {
            let (mut note, requested_output_port_name) = package;

            tokio::spawn(async move {
              let midi_out = MidiOutput::new("strudel").unwrap();
              let out_ports = midi_out.ports();
              let out_port = out_ports.get(2).ok_or("No MIDI output ports available").unwrap();
              let mut out_con: MidiOutputConnection = midi_out.connect(out_port, "strudel-connections").unwrap();
              sleep(Duration::from_millis(note.offset)).await;
              note.start(&mut out_con);
              sleep(Duration::from_millis(note.duration)).await;
              note.stop(&mut out_con);
            });

            // note.start(&mut out_con);
            // note.start(&mut out_con);
            // let _ = timeout(Duration::from_millis(note.offset), noteon(&mut note, &mut out_con)).await;
            // noteon(&mut note, &mut out_con).await;
            // let _ = timeout(Duration::from_millis(note.duration + note.offset), noteoff(&mut note, &mut out_con)).await;
            // println!("note recieved! {}", note.offset);
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
