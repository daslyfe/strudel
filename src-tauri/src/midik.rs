use std::collections::HashMap;
use std::collections::VecDeque;
use std::sync::Arc;
use midir::MidiOutput;
use tokio::sync::mpsc;
use tokio::sync::Mutex;
use tokio::time::Instant;

pub const NOTE_ON_MESSAGE: u8 = 0x90;
pub const NOTE_OFF_MESSAGE: u8 = 0x80;

pub struct MidiMessage {
  pub message: u8,
  pub note_number: u8,
  pub cc: (bool, u8, u8),
  pub instant: Instant,
  pub velocity: u8,
  pub offset: u64,
  pub requested_out_port_name: String,
}

pub struct AsyncInputTransmit {
  pub inner: Mutex<mpsc::Sender<Vec<MidiMessage>>>,
}

pub fn init(
  async_input_receiver: mpsc::Receiver<Vec<MidiMessage>>,
  mut async_output_receiver: mpsc::Receiver<Vec<MidiMessage>>,
  async_output_transmitter: mpsc::Sender<Vec<MidiMessage>>
) {
  tauri::async_runtime::spawn(async move { async_process_model(async_input_receiver, async_output_transmitter).await });
  let message_queue: Arc<Mutex<VecDeque<MidiMessage>>> = Arc::new(Mutex::new(VecDeque::new()));

  /* ...........................................................
         Listen For incoming messages and add to queue
  ............................................................*/
  let message_queue_clone = Arc::clone(&message_queue);
  tauri::async_runtime::spawn(async move {
    loop {
      if let Some(package) = async_output_receiver.recv().await {
        let messages = package;
        let mut message_queue = message_queue_clone.lock().await;
        for message in messages {
          (*message_queue).push_back(message);
        }
      }
    }
  });

  let message_queue_clone = Arc::clone(&message_queue);
  tauri::async_runtime::spawn(async move {
    /* ...........................................................
                        Open Midi Ports
    ............................................................*/
    let midiout = MidiOutput::new("strudel").unwrap();
    let out_ports = midiout.ports();
    let mut port_names = Vec::new();
    //TODO: Send these print messages to the UI logger instead of the rust console so the user can see them
    if out_ports.len() == 0 {
      println!(" No MIDI devices found. Connect a device or enable IAC Driver.");
      return;
    }
    println!("Found {} midi devices!", out_ports.len());

    // the user could reference any port at anytime during runtime,
    // so let's go ahead and open them all (same behavior as web app)
    let mut output_connections = HashMap::new();
    for i in 0..=out_ports.len().saturating_sub(1) {
      let midiout = MidiOutput::new("strudel").unwrap();
      let ports = midiout.ports();
      let port = ports.get(i).unwrap();
      let port_name = midiout.port_name(port).unwrap();
      let out_con = midiout.connect(port, &port_name).unwrap();
      println!("{}", port_name);
      port_names.insert(i, port_name.clone());
      output_connections.insert(port_name, out_con);
    }
    /* ...........................................................
                        Process queued messages 
    ............................................................*/
    loop {
      let mut message_queue = message_queue_clone.lock().await;

      for i in 0..=message_queue.len().saturating_sub(1) {
        let m = message_queue.get(i);
        if m.is_none() {
          continue;
        }
        let message = m.unwrap();

        // dont play the message if its offset time has not elapsed
        if message.instant.elapsed().as_millis() < message.offset.into() {
          continue;
        }
        let mut out_con = output_connections.get_mut(&message.requested_out_port_name);

        // WebMidi supports getting a connection by part of its name
        // ex: 'bus 1' instead of 'IAC Driver bus 1' so let's emulate that behavior
        if out_con.is_none() {
          let key = port_names.iter().find(|port_name| {
            return port_name.contains(&message.requested_out_port_name);
          });
          if key.is_some() {
            out_con = output_connections.get_mut(key.unwrap());
          }
        }

        if out_con.is_none() {
          println!("failed to find midi device: {}", message.requested_out_port_name);
          return;
        }
        println!("note:{}, message:{}, velocity: {} ", message.note_number, message.message, message.velocity);

        if let Err(err) = (&mut out_con.unwrap()).send(&[message.message, message.note_number, message.velocity]) {
          println!("Midi message send error: {}", err);
        }
        // the message has been processed, so remove it from the queue
        message_queue.remove(i);
      }
    }
  });
}

pub async fn async_process_model(
  mut input_reciever: mpsc::Receiver<Vec<MidiMessage>>,
  output_transmitter: mpsc::Sender<Vec<MidiMessage>>
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
  while let Some(input) = input_reciever.recv().await {
    let output = input;
    output_transmitter.send(output).await?;
  }
  Ok(())
}

// Called from JS
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

  let on_messsage = MidiMessage {
    message: NOTE_ON_MESSAGE + midichan.saturating_sub(1),
    note_number: notenumber,
    cc,
    instant: Instant::now(),
    velocity,
    offset,
    requested_out_port_name: outputport.clone(),
  };

  let off_message = MidiMessage {
    message: NOTE_OFF_MESSAGE + midichan.saturating_sub(1),
    note_number: notenumber,
    cc,
    instant: Instant::now(),
    velocity,
    offset: duration + offset,
    requested_out_port_name: outputport,
  };

  async_proc_input_tx.send(vec![on_messsage, off_message]).await.map_err(|e| e.to_string())
}
