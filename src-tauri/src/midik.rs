use midir::{ MidiOutputConnection };

use tokio::sync::mpsc;
use tokio::sync::Mutex;
use tokio::time::{ timeout, Duration, sleep };

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
  pub cc: (bool, u8, u8),
  pub offset: u64,
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

pub struct AsyncInputTransmit {
  pub inner: Mutex<mpsc::Sender<(MidiNote, String)>>,
}

pub async fn async_process_model(
  mut input_reciever: mpsc::Receiver<(MidiNote, String)>,
  output_transmitter: mpsc::Sender<(MidiNote, String)>
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
  while let Some(input) = input_reciever.recv().await {
    let output = input;
    output_transmitter.send(output).await?;
  }

  Ok(())
}

#[tauri::command]
pub async fn sendmidi(
  notenumber: u8,
  velocity: u8,
  duration: u64,
  offset: u64,
  cc: (bool, u8, u8),
  outputport: String,
  midichan: u8,
  state: tauri::State<'_, AsyncInputTransmit>
) -> Result<(), String> {
  let async_proc_input_tx = state.inner.lock().await;

  let note = MidiNote {
    channel: midichan.saturating_sub(1),
    note_number: notenumber,
    velocity,
    duration,
    cc,
    offset,
  };

  async_proc_input_tx.send((note, outputport)).await.map_err(|e| e.to_string())
}
