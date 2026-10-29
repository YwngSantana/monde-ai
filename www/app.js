const STATE = {
  apiKey: localStorage.getItem('MONDE_KEY') || '',
  voice: localStorage.getItem('MONDE_VOICE') || 'Puck',
  isListening: false,
  isProcessing: false,
  memories: JSON.parse(localStorage.getItem('MONDE_MEMORIES')) || []
};

const orb = document.getElementById('orb-core');
const statusLabel = document.getElementById('status-label');
const chat = document.getElementById('chat-stream');
const micBtn = document.getElementById('btn-mic-toggle');

const modalSettings = document.getElementById('modal-settings');
const modalMemory = document.getElementById('modal-memory');
const inputKey = document.getElementById('input-api-key');
const selectVoice = document.getElementById('select-voice');
const btnTestVoice = document.getElementById('btn-test-voice');

const textForm = document.getElementById('text-form');
const textInput = document.getElementById('input-text-msg');
const textSendBtn = document.getElementById('btn-text-send');

if (inputKey && STATE.apiKey) inputKey.value = STATE.apiKey;
if (selectVoice && STATE.voice) selectVoice.value = STATE.voice;

// Settings Modal
document.getElementById('btn-settings').onclick = () => {
  modalSettings.classList.toggle('hidden');
  if (inputKey) inputKey.value = STATE.apiKey;
  if (selectVoice) selectVoice.value = STATE.voice;
};

const btnCloseSettings = document.getElementById('btn-close-settings');
if (btnCloseSettings) {
  btnCloseSettings.onclick = () => modalSettings.classList.add('hidden');
}

document.getElementById('btn-save-settings').onclick = () => {
  STATE.apiKey = inputKey.value.trim();
  STATE.voice = selectVoice.value;
  localStorage.setItem('MONDE_KEY', STATE.apiKey);
  localStorage.setItem('MONDE_VOICE', STATE.voice);
  modalSettings.classList.add('hidden');
  appendMsg('MONDE AI', 'Settings saved! Testing speech...');
  handleQuery("Say hello to Monde and confirm your voice is ready.");
};

// Memory Modal
const btnMemory = document.getElementById('btn-memory');
if (btnMemory && modalMemory) {
  btnMemory.onclick = () => modalMemory.classList.toggle('hidden');
}
const btnCloseMemory = document.getElementById('btn-close-memory');
if (btnCloseMemory && modalMemory) {
  btnCloseMemory.onclick = () => modalMemory.classList.add('hidden');
}

// Big, Clean Chat Bubbles
function appendMsg(sender, text) {
  if (!chat) return;
  const d = document.createElement('div');
  
  if (sender === 'Monde') {
    d.className = 'p-3.5 bg-cyan-950/80 rounded-2xl text-cyan-100 border border-cyan-700/60 self-end ml-8 shadow-sm max-w-[85%]';
    d.innerHTML = `
      <div class="text-[11px] font-bold text-cyan-400 mb-1 uppercase tracking-wider text-right">You</div>
      <div class="text-base font-medium leading-relaxed">${text}</div>
    `;
  } else {
    d.className = 'p-3.5 bg-slate-800/95 rounded-2xl text-slate-100 border border-slate-700/70 mr-8 shadow-sm max-w-[90%]';
    d.innerHTML = `
      <div class="text-[11px] font-bold text-indigo-400 mb-1 uppercase tracking-wider">MONDE AI</div>
      <div class="text-base leading-relaxed">${text}</div>
    `;
  }

  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- HARDWARE SPEAKER CHIME (PROVES PHONE SPEAKER IS AUDIBLE) ---
function playSpeakerChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.log("Speaker chime error:", e);
  }
}

// --- AUDIO PLAYER (PLAYS DIRECT BASE64 AUDIO WITH ZERO NETWORK CALLS) ---
let currentAudio = null;

function playBase64Audio(base64Data, mimeType = 'audio/wav') {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    if (statusLabel) statusLabel.innerText = "Speaking...";

    const audioUrl = `data:${mimeType};base64,${base64Data}`;
    currentAudio = new Audio(audioUrl);

    currentAudio.onended = () => {
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    };

    currentAudio.onerror = (e) => {
      alert("Audio playback error on phone: " + JSON.stringify(e));
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    };

    currentAudio.play().catch(e => {
      alert("Playback blocked by phone. Ensure Media Volume is turned up: " + e.message);
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    });

  } catch(err) {
    alert("Audio decode error: " + err.message);
  }
}

// Test Voice Button
if (btnTestVoice) {
  btnTestVoice.onclick = () => {
    // 1. Play immediate chime directly from device hardware
    playSpeakerChime();
    
    // 2. Trigger native Gemini voice test
    handleQuery("Introduce yourself in one sentence with your name Monde.");
  };
}

// Text Input Handling
function submitTextMessage() {
  if (!textInput) return;
  const msg = textInput.value.trim();
  if (!msg) return;

  textInput.value = '';
  appendMsg('Monde', msg);
  handleQuery(msg);
}

if (textForm) {
  textForm.onsubmit = (e) => {
    e.preventDefault();
    submitTextMessage();
  };
}
if (textSendBtn) {
  textSendBtn.onclick = (e) => {
    e.preventDefault();
    submitTextMessage();
  };
}

// Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec;

if (SpeechRecognition) {
  rec = new SpeechRecognition();
  rec.continuous = false;
  rec.lang = 'en-US';

  rec.onstart = () => {
    STATE.isListening = true;
    if (statusLabel) statusLabel.innerText = "LISTENING... (TAP TO SEND)";
    if (micBtn) micBtn.innerText = "Tap to Send";
  };

  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    if (text && text.trim().length > 0) {
      appendMsg('Monde', text);
      handleQuery(text);
    }
  };

  rec.onerror = () => {
    STATE.isListening = false;
    if (statusLabel) statusLabel.innerText = "READY, MONDE";
    if (micBtn) micBtn.innerText = "Tap to Talk";
  };

  rec.onend = () => {
    STATE.isListening = false;
    if (micBtn) micBtn.innerText = "Tap to Talk";
  };
}

function toggleMic() {
  if (!rec) return;
  if (currentAudio) {
    try { currentAudio.pause(); } catch(e){}
  }

  if (STATE.isListening) {
    rec.stop();
  } else {
    try {
      rec.start();
    } catch(e) {}
  }
}

if (micBtn) micBtn.onclick = toggleMic;
if (orb) orb.onclick = toggleMic;

// --- DUAL-MODALITY QUERY: GETS TEXT AND NATIVE AUDIO DIRECT FROM GEMINI ---
async function handleQuery(cmd) {
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your API key.');
    return;
  }

  if (statusLabel) statusLabel.innerText = "THINKING...";

  const now = new Date();
  const liveDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const chosenVoice = STATE.voice || "Puck";

  const requestBody = {
    contents: [{ parts: [{ text: cmd }] }],
    systemInstruction: {
      parts: [{ text: `You are Monde AI, speaking with Monde Dubasi. Today's live date is ${liveDate}. Speak directly and concisely in 1 or 2 natural sentences.` }]
    },
    generationConfig: {
      responseModalities: ["AUDIO", "TEXT"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: chosenVoice
          }
        }
      }
    }
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${STATE.apiKey}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const d = await res.json();
    
    if (d.candidates && d.candidates[0].content && d.candidates[0].content.parts) {
      let replyText = "";
      let audioBase64 = null;
      let audioMime = "audio/wav";

      for (const part of d.candidates[0].content.parts) {
        if (part.text) {
          replyText += part.text;
        }
        if (part.inlineData) {
          audioBase64 = part.inlineData.data;
          audioMime = part.inlineData.mimeType || "audio/wav";
        }
      }

      if (replyText) appendMsg('MONDE AI', replyText);
      
      // Play voice output directly from Google's response
      if (audioBase64) {
        playBase64Audio(audioBase64, audioMime);
      } else {
        if (statusLabel) statusLabel.innerText = "READY, MONDE";
      }

    } else if (d.error) {
      appendMsg('MONDE AI', 'API Error: ' + d.error.message);
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    }
  } catch(e) {
    appendMsg('MONDE AI', 'Connection error: ' + e.message);
    if (statusLabel) statusLabel.innerText = "READY, MONDE";
  }
}
