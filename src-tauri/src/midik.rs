use std::collections::VecDeque;
use std::sync::Arc;

use midir::{ MidiOutputConnection, MidiOutput };

use tokio::sync::mpsc;
use tokio::sync::Mutex;
use tokio::time::{ Duration, sleep, Instant };

pub const NOTE_ON_MESSAGE: u8 = 0x90;
pub const NOTE_OFF_MESSAGE: u8 = 0x80;

#[derive(Debug, Copy, Clone, PartialEq, Eq)]
pub struct MidiNote {
  pub channel: u8,
  pub note_number: u8,
  pub velocity: u8,
  pub duration: u64,
  pub cc: (bool, u8, u8),
  pub offset: u64,
}

pub struct MidiMessage {
  pub message: u8,
  pub note_number: u8,
  pub cc: (bool, u8, u8),
  pub instant: Instant,
  pub velocity: u8,
  pub offset: u64,
  pub requested_out_port_name: String,
}

impl MidiMessage {
  pub fn new_on_message(note: MidiNote, requested_out_port_name: String) -> Self {
    return Self {
      message: NOTE_ON_MESSAGE + note.channel,
      note_number: note.note_number,
      cc: note.cc,
      instant: Instant::now(),
      velocity: note.velocity,
      offset: note.offset,
      requested_out_port_name,
    };
  }

  pub fn new_off_message(note: MidiNote, requested_out_port_name: String) -> Self {
    return Self {
      message: NOTE_OFF_MESSAGE + note.channel,
      note_number: note.note_number,
      cc: note.cc,
      instant: Instant::now(),
      velocity: note.velocity,
      offset: note.duration + note.offset,
      requested_out_port_name,
    };
  }
}
// impl MidiNote {
//   pub fn start(&mut self, conn: &mut MidiOutputConnection) {
//     let note_on_message: u8 = NOTE_ON_MESSAGE + self.channel;
//     if let Err(err) = conn.send(&[note_on_message, self.note_number, self.velocity]) {
//       println!("Midi note on send error: {}", err);
//     }
//   }

//   pub fn stop(&self, conn: &mut MidiOutputConnection) {
//     let note_off_message: u8 = NOTE_OFF_MESSAGE + self.channel;
//     if let Err(err) = conn.send(&[note_off_message, self.note_number, self.velocity]) {
//       println!("Midi note off send error: {}", err);
//     }
//   }
// }

pub struct AsyncInputTransmit {
  pub inner: Mutex<mpsc::Sender<(MidiNote, String)>>,
}

pub fn init(
  async_input_receiver: mpsc::Receiver<(MidiNote, String)>,
  mut async_output_receiver: mpsc::Receiver<(MidiNote, String)>,
  async_output_transmitter: mpsc::Sender<(MidiNote, String)>
) {
  tauri::async_runtime::spawn(async move { async_process_model(async_input_receiver, async_output_transmitter).await });
  let active_notes: Arc<Mutex<VecDeque<MidiMessage>>> = Arc::new(Mutex::new(VecDeque::new()));

  let active_notes_clone = Arc::clone(&active_notes);
  tauri::async_runtime::spawn(async move {
    loop {
      if let Some(package) = async_output_receiver.recv().await {
        let (note, requested_output_port_name) = package;
        let mut active_notes = active_notes_clone.lock().await;
        let on_messsage = MidiMessage::new_on_message(note, requested_output_port_name.clone());
        let off_message = MidiMessage::new_off_message(note, requested_output_port_name.clone());
        (*active_notes).push_back(on_messsage);
        (*active_notes).push_back(off_message);
      }
    }
  });

  let active_notes_clone = Arc::clone(&active_notes);
  tauri::async_runtime::spawn(async move {
    //let midi_out = Arc::new(std::sync::Mutex::new(MidiOutput::new("strudel").unwrap()));
    let midiout = MidiOutput::new("test").unwrap();
    let ports = midiout.ports();
    let out_port = ports.get(2).unwrap();
    let mut out_con = midiout.connect(out_port, "test").unwrap();

    loop {
      let mut active_notes = active_notes_clone.lock().await;

      for i in 1..=active_notes.len() {
        let index = i.saturating_sub(1);
        let m = active_notes.get(index);
        if m.is_some() {
          let message = m.unwrap();
          if message.instant.elapsed().as_millis() >= message.offset.into() {
            println!("{}", message.instant.elapsed().as_millis());
            if let Err(err) = out_con.send(&[message.message, message.note_number, message.velocity]) {
              println!("Midi message send error: {}", err);
            }
            active_notes.remove(index);
          }
        }
      }
      // while let Some(message) = active_notes.front() {
      //   if message.instant.elapsed().as_millis() >= message.offset.into() {
      //     println!("{}", message.note_number);
      //     if let Err(err) = out_con.send(&[message.message, message.note_number, message.velocity]) {
      //       println!("Midi message send error: {}", err);
      //     }
      //     active_notes.pop_front();
      //   } else {
      //     break;
      //   }
      // }
      // for message in iter {
      //   if Instant::now() < message.instant {
      //     return;
      //   }
      //   println!("{}", message.note_number);
      //   if let Err(err) = out_con.send(&[message.message, message.note_number, message.velocity]) {
      //     println!("Midi message send error: {}", err);
      //   }

      //   // active_notes.pop_front();
      // }
    }

    // let out_ports = midi_out.ports();
    // if out_ports.len() == 0 {
    //   println!(" No MIDI devices found. Connect a device or enable IAC Driver.");
    //   return;
    // }
    // println!("Found {} midi devices!", out_ports.len());
    // out_ports.iter().for_each(|midi_port| {
    //   let port_name = midi_out.port_name(midi_port).unwrap();
    //   println!("{}", port_name);
    // });

    // let count = Arc::new(Mutex::new(0));

    // for i in 0..5 {
    //   let my_count = Arc::clone(&count);
    //   tokio::spawn(async move {
    //     for j in 0..10 {
    //       let mut lock = my_count.lock().await;
    //       *lock += 1;
    //       println!("{} {} {}", i, j, lock);
    //     }
    //   });
    // }

    // loop {
    //   if let Some(package) = async_output_receiver.recv().await {
    //     let (mut note, requested_output_port_name) = package;
    //     let midi_out_clone = Arc::clone(&midi_out);
    //     let out_con_clone = Arc::clone(&out_con);
    //     // create a non blocking async process to play the note at the correct time
    //     tokio::spawn(async move {
    //       // let mut midi_out = midi_out_clone.lock().unwrap();

    //       let mut out_con = out_con_clone.lock().await;
    //       // let midi_out = MidiOutput::new("strudel").unwrap();

    //       // let out_ports = midi_out.ports();

    //       // let mut out_port = out_ports.iter().find(|midi_port| {
    //       //   let port_name = midi_out.port_name(midi_port).unwrap();
    //       //   return port_name == requested_output_port_name;
    //       // });

    //       // if out_port.is_none() {
    //       //   out_port = out_ports.iter().find(|midi_port| {
    //       //     let port_name = midi_out.port_name(midi_port).unwrap();
    //       //     return port_name.contains(&requested_output_port_name);
    //       //   });
    //       // }

    //       // if out_port.is_none() {
    //       //   println!("failed to find midi device: {}", requested_output_port_name);
    //       //   return;
    //       // }
    //       // let unwrapped_port = out_port.unwrap();

    //       // let out_con = midi_out.connect(unwrapped_port, "strudel-connections").unwrap();
    //       sleep(Duration::from_millis(note.offset)).await;
    //       note.start(&mut out_con);
    //       sleep(Duration::from_millis(note.duration)).await;
    //       note.stop(&mut out_con);
    //     });
    //   }
    // }
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

  async_proc_input_tx.send((note, outputport.clone())).await.map_err(|e| e.to_string())
}
