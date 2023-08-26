use midir::{ MidiOutputConnection, MidiOutput };

use tokio::sync::mpsc;
use tokio::sync::Mutex;
use tokio::time::{ Duration, sleep };

pub const NOTE_ON_MESSAGE: u8 = 0x90;
pub const NOTE_OFF_MESSAGE: u8 = 0x80;

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

pub fn init(
  async_input_receiver: mpsc::Receiver<(MidiNote, String)>,
  mut async_output_receiver: mpsc::Receiver<(MidiNote, String)>,
  async_output_transmitter: mpsc::Sender<(MidiNote, String)>
) {
  tauri::async_runtime::spawn(async move { async_process_model(async_input_receiver, async_output_transmitter).await });

  tauri::async_runtime::spawn(async move {
    let midi_out = MidiOutput::new("strudel").unwrap();
    let out_ports = midi_out.ports();
    if out_ports.len() == 0 {
      println!(" No MIDI devices found. Connect a device or enable IAC Driver.");
      return;
    }
    println!("Found {} midi devices!", out_ports.len());
    out_ports.iter().for_each(|midi_port| {
      let port_name = midi_out.port_name(midi_port).unwrap();
      println!("{}", port_name);
    });

    loop {
      if let Some(package) = async_output_receiver.recv().await {
        let (mut note, requested_output_port_name) = package;

        // create a non blocking async process to play the note at the correct time
        tokio::spawn(async move {
          let midi_out = MidiOutput::new("strudel").unwrap();
          let out_ports = midi_out.ports();

          let mut out_port = out_ports.iter().find(|midi_port| {
            let port_name = midi_out.port_name(midi_port).unwrap();
            return port_name == requested_output_port_name;
          });

          if out_port.is_none() {
            out_port = out_ports.iter().find(|midi_port| {
              let port_name = midi_out.port_name(midi_port).unwrap();
              return port_name.contains(&requested_output_port_name);
            });
          }

          if out_port.is_none() {
            println!("failed to find midi device: {}", requested_output_port_name);
            return;
          }

          let mut out_con: MidiOutputConnection = midi_out.connect(out_port.unwrap(), "strudel-connections").unwrap();
          sleep(Duration::from_millis(note.offset)).await;
          note.start(&mut out_con);
          sleep(Duration::from_millis(note.duration)).await;
          note.stop(&mut out_con);
        });
      }
    }
  });
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
