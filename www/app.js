const STATE = {
  apiKey: localStorage.getItem('MONDE_KEY') || '',
  voice: localStorage.getItem('MONDE_VOICE') || 'Brian',
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
  speak("Voice settings updated. I am ready, Monde.");
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

// Web Audio Engine (Bypasses Android sound blocks)
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

let activeAudioSource = null;

async function speak(t) {
  const clean = t.replace(/[*#_`~]/g, '').trim();
  if (!clean) return;

  if (statusLabel) statusLabel.innerText = "Speaking...";

  const chosenVoice = STATE.voice || "Brian";
  const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${chosenVoice}&text=${encodeURIComponent(clean.slice(0, 300))}`;

  try {
    const ctx = getAudioContext();
    const response = await fetch(ttsUrl);
    if (!response.ok) throw new Error("HTTP " + response.status);

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    if (activeAudioSource) {
      try { activeAudioSource.stop(); } catch(e){}
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    source.onended = () => {
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    };

    source.start(0);
    activeAudioSource = source;

  } catch (err) {
    console.log("WebAudio failed, using HTML5 fallback:", err);
    try {
      const fallbackAudio = new Audio(ttsUrl);
      fallbackAudio.onended = () => {
        if (statusLabel) statusLabel.innerText = "READY, MONDE";
      };
      await fallbackAudio.play();
    } catch(fallbackErr) {
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    }
  }
}

// Test Voice Button
if (btnTestVoice) {
  btnTestVoice.onclick = () => {
    getAudioContext();
    const voice = selectVoice ? selectVoice.value : "Brian";
    const displayName = voice === "Brian" ? "Monde" : (voice === "Matthew" ? "Alex" : "Emma");
    speak("Hello! I am your AI assistant speaking with the " + displayName + " voice.");
  };
}

// Text Input Handling
function submitTextMessage() {
  if (!textInput) return;
  const msg = textInput.value.trim();
  if (!msg) return;

  getAudioContext(); // Unlocks sound channel on phone

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
  getAudioContext();

  if (!rec) return;
  if (activeAudioSource) {
    try { activeAudioSource.stop(); } catch(e){}
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

// AI Query (Gemini 3.5 Flash Lite)
async function handleQuery(cmd) {
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your API key.');
    speak("Please tap Settings and enter your API key.");
    return;
  }

  if (statusLabel) statusLabel.innerText = "THINKING...";

  const now = new Date();
  const liveDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const systemPrompt = `You are Monde AI, a fast personal companion created for Monde Dubasi. 
Today's actual real-time date is ${liveDate}, and the current year is ${now.getFullYear()}.
Always speak in concise, natural, fluent English (1 to 2 sentences max). Do not use bullet points or markdown symbols because your response is spoken aloud.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${STATE.apiKey}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: cmd }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    });

    const d = await res.json();
    if (d.candidates && d.candidates[0].content && d.candidates[0].content.parts[0].text) {
      const reply = d.candidates[0].content.parts[0].text;
      appendMsg('MONDE AI', reply);
      speak(reply);
    } else {
      appendMsg('MONDE AI', 'Servers busy, please try again.');
    }
  } catch(e) {
    appendMsg('MONDE AI', 'Network error.');
  }
}
