use std::sync::{ Arc };
use midir::{ Ignore, MidiInput, MidiOutput, MidiInputConnection, MidiOutputConnection };
use tauri::{ Manager, Window, Wry };
use serde::{ Serialize };
use std::collections::VecDeque;
use tokio::sync::mpsc;
use tokio::sync::Mutex;

use std::thread::sleep;
use std::time::{ Duration, Instant };

pub const NOTE_ON_MESSAGE: u8 = 0x90;
pub const NOTE_OFF_MESSAGE: u8 = 0x80;
pub const MIDI_CHANNEL_COUNT: u8 = 16;
pub const MIDI_NOTE_COUNT: u8 = 128;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MidiNote {
  pub channel: u8,
  pub note_number: u8,
  pub velocity: u8,
  pub duration: u64,
  pub offset: u64,
  pub cc: (bool, u8, u64),
}

impl MidiNote {
  pub fn start(&mut self, conn: &mut MidiOutputConnection) {
    let note_on_message: u8 = NOTE_ON_MESSAGE + self.channel;
    if let Err(err) = conn.send(&[note_on_message, self.note_number, self.velocity]) {
      println!("Midi note on send error: {}", err);
    }
  }

  pub fn stop(&self, conn: &mut MidiOutputConnection) {
    let note_off_message: u8 = NOTE_OFF_MESSAGE + self.channel;
    if let Err(err) = conn.send(&[note_off_message, self.note_number, self.velocity]) {
      println!("Midi note off send error: {}", err);
    }
  }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ActiveNote {
  pub note: MidiNote,
  pub expiry: Instant,
}

#[derive(Default)]
pub struct MidiState {
  pub input: Mutex<Option<MidiInputConnection<()>>>,
  pub output: Mutex<Option<MidiOutputConnection>>,
}

pub struct AsyncInputTx {
  pub inner: Mutex<mpsc::Sender<(MidiNote, String)>>,
}

#[tauri::command]
pub fn init(async_input_rx: mpsc::Receiver<(MidiNote, String)>) {
  let (async_output_tx, mut async_output_rx) = mpsc::channel(1);
  tauri::async_runtime::spawn(async move { async_process_model(async_input_rx, async_output_tx).await });

  tauri::async_runtime::spawn(async move {
    let midi_out = MidiOutput::new("tout").unwrap();
    let midi_out_ports = midi_out.ports();
    let out_port = midi_out_ports.get(2).ok_or("No MIDI output ports available").unwrap();
    let mut port_name: String = midi_out.port_name(out_port).unwrap();
    println!("found port {}", port_name);
    println!("\nOpening connection");
    let mut conn_out = midi_out.connect(out_port, "midir-test").unwrap();
    println!("Connection open. Listen!");
    let mut active_notes: VecDeque<ActiveNote> = VecDeque::new();

    loop {
      while let Some(active_note) = active_notes.front() {
        if active_note.expiry <= Instant::now() {
          active_note.note.stop(&mut conn_out);
          active_notes.pop_front();
        } else {
          break;
        }
      }

      // Process new notes
      if let Some(package) = async_output_rx.recv().await {
        let (mut note, requested_port_name) = package;

        note.start(&mut conn_out);
        let (is_cc, ccn, ccv) = note.cc;
        if is_cc {
          conn_out.send(&[note.channel + 176, ccn, ccv as u8]).unwrap();
        }
        let note_duration = Duration::from_millis(note.duration); // Replace with your note duration
        let expiry = Instant::now() + note_duration;
        active_notes.push_back(ActiveNote { note, expiry });
        // if requested_port_name != port_name {
        //   let mut new_port: usize = 0;

        //   if requested_port_name == "default" {
        //     new_port = 0;
        //   } else {
        //     let midi_out = conn_out.close();
        //     let out_ports = midi_out.ports();
        //     for (i, name) in out_ports.iter().enumerate() {
        //       let new_port_name = midi_out.port_name(name).unwrap();
        //       if new_port_name == requested_port_name {
        //         new_port = i;
        //         port_name = new_port_name;
        //       }
        //     }
        //     let out_port = out_ports.get(new_port).ok_or("No Midi output ports available").unwrap();
        //     conn_out = midi_out.connect(out_port, "tout").unwrap();
        //   }
        // }
      }
    }
  });

  //let handle = Arc::new(window).clone();
  //   let mut midi_in = MidiInput::new("My Test Input").unwrap();

  //   midi_in.ignore(Ignore::None);

  // let mut play_note = |note: u8, duration: u64| {
  //   const NOTE_ON_MSG: u8 = 0x90;
  //   const NOTE_OFF_MSG: u8 = 0x80;
  //   const VELOCITY: u8 = 0x64;
  //   // We're ignoring errors in here
  //   let _ = conn_out.send(&[NOTE_ON_MSG, note, VELOCITY]);
  //   sleep(Duration::from_millis(duration * 150));
  //   let _ = conn_out.send(&[NOTE_OFF_MSG, note, VELOCITY]);
  // };

  // sleep(Duration::from_millis(4 * 150));

  // play_note(66, 4);
  // play_note(65, 3);
  // play_note(63, 1);
  // play_note(61, 6);
  // play_note(59, 2);
  // play_note(58, 4);
  // play_note(56, 4);
  // play_note(54, 4);

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

#[tauri::command]
pub async fn send_tauri_midi_message(
  midichan: u8,
  notenumber: u8,
  velocity: f64,
  duration: f64,
  offset: f64,
  cc: (bool, u8, u64),
  output: String,
  state: tauri::State<'_, AsyncInputTx>
) -> Result<(), String> {
  let async_proc_input_tx = state.inner.lock().await;
  let note = MidiNote {
    channel: midichan.saturating_sub(1),
    note_number: notenumber,
    velocity: (velocity * 100.0) as u8,
    duration: duration as u64,
    offset: offset as u64,
    cc,
  };

  println!("{}", notenumber);
  async_proc_input_tx.send((note, output)).await.map_err(|e| e.to_string())
}

async fn async_process_model(
  mut input_rx: mpsc::Receiver<(MidiNote, String)>,
  output_tx: mpsc::Sender<(MidiNote, String)>
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
  while let Some(input) = input_rx.recv().await {
    let output = input;
    output_tx.send(output).await?;
  }

  Ok(())
}

#[tauri::command]
pub fn test_send(
  midichan: u8,
  notenumber: u8,
  velocity: f64,
  duration: u64,
  offset: u64,
  cc: (bool, u64, u64),
  output: String,
  message: u8
) {
  const NOTE_ON_MSG: u8 = 0x90;
  const VELOCITY: u8 = 0x64;
  const NOTE_OFF_MSG: u8 = 0x80;
  let midi_out = MidiOutput::new("tout").unwrap();
  let midi_out_ports = midi_out.ports();
  let out_port = midi_out_ports.get(2).ok_or("No MIDI output ports available").unwrap();
  let mut conn_out = midi_out.connect(out_port, "midir-test").unwrap();
  let _ = conn_out.send(&[message, notenumber, VELOCITY]);
  // sleep(Duration::from_millis(offset));
  //let _ = conn_out.send(&[NOTE_ON_MSG, notenumber, VELOCITY]);
  // sleep(Duration::from_millis(duration));

  //

  println!("sent note {}", notenumber)
}
