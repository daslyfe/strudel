use std::sync::{ Arc, Mutex };
use midir::{ Ignore, MidiInput, MidiOutput, MidiInputConnection, MidiOutputConnection };
use tauri::{ Manager, Window, Wry };
use serde::{ Serialize };
use std::thread::sleep;
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MidiNote {
  pub channel: u8,
  pub note_number: u8,
  pub velocity: u8,
  pub duration: u64,
  pub cc: (bool, u8, u64),
}

#[derive(Default)]
pub struct MidiState {
  pub input: Mutex<Option<MidiInputConnection<()>>>,
  pub output: Mutex<Option<MidiOutputConnection>>,
}

#[tauri::command]
pub fn init() {
  //let handle = Arc::new(window).clone();
  //   let mut midi_in = MidiInput::new("My Test Input").unwrap();

  //   midi_in.ignore(Ignore::None);

  let midi_out = MidiOutput::new("tout").unwrap();
  // let midi_in_ports = midi_in.ports();
  let midi_out_ports = midi_out.ports();

  let out_port = midi_out_ports.get(2).ok_or("No MIDI output ports available").unwrap();

  let a = midi_out.port_name(out_port).unwrap();
  println!("{}", a);

  println!("\nOpening connection");
  let mut conn_out = midi_out.connect(out_port, "midir-test").unwrap();
  println!("Connection open. Listen!");

  let mut play_note = |note: u8, duration: u64| {
    const NOTE_ON_MSG: u8 = 0x90;
    const NOTE_OFF_MSG: u8 = 0x80;
    const VELOCITY: u8 = 0x64;
    // We're ignoring errors in here
    let _ = conn_out.send(&[NOTE_ON_MSG, note, VELOCITY]);
    sleep(Duration::from_millis(duration * 150));
    let _ = conn_out.send(&[NOTE_OFF_MSG, note, VELOCITY]);
  };

  sleep(Duration::from_millis(4 * 150));

  play_note(66, 4);
  play_note(65, 3);
  play_note(63, 1);
  play_note(61, 6);
  play_note(59, 2);
  play_note(58, 4);
  play_note(56, 4);
  play_note(54, 4);

  // *midi_state.output.lock().unwrap() = Some(conn_out);

  //   if let Some(in_port) = midi_in_ports.get(input_idx) {
  //     let conn_in = midi_in.connect(in_port, "midir-test", move |stamp, message, log| {

  //       // The last of the three callback parameters is the object that we pass in as last parameter of `connect`.

  //      // handle.emit_all("midi_message",  MidiMessage { message: message.to_vec() });

  //       println!("{}: {:?} (len = {})", stamp, message, message.len());
  //     }, ()).unwrap();
  //     *midi_state.input.lock().unwrap() = Some(conn_in);
  //   }
}
