const generateButton = document.getElementById('generateButton');
const stopButton = document.getElementById('stopButton');
const recordButton = document.getElementById('recordButton');
const statusText = document.getElementById('status');
const filterFreqInput = document.getElementById('filterFreq');
const distortionInput = document.getElementById('distortion');
const reverbInput = document.getElementById('reverb');
const visualizer = document.getElementById('visualizer');

let synths = [];  
let analyser, recorder, recording = false, playing = false;
let audioContext = new (window.AudioContext || window.webkitAudioContext)(); 


function initializeSynth() {
  const synth = new Tone.AMSynth().chain(
    new Tone.Filter(filterFreqInput.value, 'lowpass').toDestination(),
    new Tone.Distortion(distortionInput.value).toDestination(),
    new Tone.Reverb(reverbInput.value).toDestination()
  );

  synths.push(synth); 

  analyser = new Tone.Analyser('waveform', 256);
  synth.connect(analyser); 

  if (recorder) {
    synth.connect(recorder); 
  }

  return synth;
}

function generateRandomMusic() {
  const synth = initializeSynth();  

  const notes = ["C4", "D#4", "F4", "G4", "A#4", "C5", "D5", "F5"];
  const randomDuration = Math.random() * (3 - 0.5) + 0.5; 
  const sequence = [];

  for (let i = 0; i < 16; i++) {
    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    const randomTime = i * randomDuration;
    sequence.push({ time: randomTime, note: randomNote });
  }

  const now = Tone.now();
  sequence.forEach(n => {
    synth.triggerAttackRelease(n.note, `${randomDuration}s`, now + n.time);
  });

  statusText.innerText = "Generate random music...";
  playing = true;
  visualizeMusic();
}


function stopAllMusic() {
  if (playing) {
    synths.forEach(synth => synth.dispose());  
    synths = []; 
    statusText.innerText = "The music has stopped.";
    playing = false;
  }
}


function visualizeMusic() {
  const visualizerContext = visualizer.getContext('2d');
  visualizerContext.clearRect(0, 0, visualizer.width, visualizer.height);

  function drawWaveform() {
    visualizerContext.fillStyle = '#2c3e50';
    visualizerContext.fillRect(0, 0, visualizer.width, visualizer.height);

    const waveform = analyser.getValue();
    visualizerContext.beginPath();
    visualizerContext.moveTo(0, visualizer.height / 2);

    for (let i = 0; i < waveform.length; i++) {
      const x = (i / waveform.length) * visualizer.width;
      const y = (1 - waveform[i]) * visualizer.height / 2;
      visualizerContext.lineTo(x, y);
    }

    visualizerContext.strokeStyle = '#f39c12';
    visualizerContext.lineWidth = 2;
    visualizerContext.stroke();

    if (playing) {
      requestAnimationFrame(drawWaveform);
    }
  }

  drawWaveform();
}

function convertBlobToAudioBuffer(blob) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onloadend = async () => {
      const arrayBuffer = fileReader.result;
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      resolve(audioBuffer);
    };
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(blob);
  });
}

function convertToMp3(buffer) {
  const mp3Encoder = new lamejs.Mp3Encoder(1, 44100, 128);  
  const samples = new Int16Array(buffer.getChannelData(0).length);
  for (let i = 0; i < buffer.getChannelData(0).length; i++) {
    samples[i] = buffer.getChannelData(0)[i] * 32767.5; 
  }

  const mp3Data = [];
  let mp3Buffer = mp3Encoder.encodeBuffer(samples);
  if (mp3Buffer.length > 0) {
    mp3Data.push(mp3Buffer);
  }
  mp3Buffer = mp3Encoder.flush();
  if (mp3Buffer.length > 0) {
    mp3Data.push(mp3Buffer);
  }

  const blob = new Blob(mp3Data, { type: 'audio/mp3' });
  return blob;
}


recordButton.addEventListener('click', async () => {
  if (!recording) {
    statusText.innerText = "Start recording...";
    recorder = new Tone.Recorder();
    
    synths.forEach(synth => synth.connect(recorder));

    await recorder.start();
    recordButton.textContent = "Stop recording";
    recording = true;
  } else {
    statusText.innerText = "Stop recording, saving...";

    const recordingBlob = await recorder.stop();
    
    const audioBuffer = await convertBlobToAudioBuffer(recordingBlob);
    
    const mp3Blob = convertToMp3(audioBuffer);

    const url = URL.createObjectURL(mp3Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recorded_music.mp3';
    a.click();

    statusText.innerText = "Recording saved";
    recordButton.textContent = "Start recording";
    recording = false;
  }
});

generateButton.addEventListener('click', () => {
  if (Tone.context.state !== 'running') {
    Tone.context.resume();
  }
  generateRandomMusic();
  visualizer.style.backgroundColor = '#0000CD';
});

stopButton.addEventListener('click', () => {
  stopAllMusic();
});
