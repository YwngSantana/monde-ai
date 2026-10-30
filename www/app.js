const STATE = {
  apiKey: localStorage.getItem('MONDE_KEY') || '',
  voice: localStorage.getItem('MONDE_VOICE') || 'Brian',
  isListening: false,
  isProcessing: false,
  history: JSON.parse(localStorage.getItem('MONDE_CHAT_LOG')) || []
};

const orb = document.getElementById('orb-core');
const statusLabel = document.getElementById('status-label');
const chat = document.getElementById('chat-stream');
const micBtn = document.getElementById('btn-mic-toggle');
const btnNewChat = document.getElementById('btn-new-chat');

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

// Restore saved messages on startup
window.onload = () => {
  if (STATE.history.length > 0) {
    chat.innerHTML = '';
    STATE.history.forEach(item => {
      renderBubble(item.sender, item.text);
    });
  }
};

// + New Chat
if (btnNewChat) {
  btnNewChat.onclick = () => {
    STATE.history = [];
    localStorage.removeItem('MONDE_CHAT_LOG');
    chat.innerHTML = `
      <div class="p-3.5 bg-slate-800/90 rounded-2xl text-slate-100 border border-slate-700/60 mr-6 shadow-sm">
        <div class="text-[11px] font-bold text-cyan-400 mb-1 uppercase tracking-wider">MONDE AI</div>
        <div class="text-base leading-relaxed">Fresh conversation started, Monde. What's on your mind?</div>
      </div>
    `;
    speak("Starting a fresh conversation. What is on your mind, Monde?");
  };
}

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
  appendMsg('MONDE AI', 'Settings saved!');
  speak("Settings saved. I am ready, Monde.");
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

// Render Chat Bubble
function renderBubble(sender, text) {
  if (!chat) return;
  const d = document.createElement('div');
  
  if (sender === 'Monde' || sender === 'You') {
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

function appendMsg(sender, text) {
  renderBubble(sender, text);
}

// =====================================================================
// --- BULLETPROOF AUDIO ENGINE: UNLOCKED WEBAUDIO CONTEXT ---
// =====================================================================
let audioCtx = null;
let currentSource = null;

function unlockAudioHardware() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx && AudioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    // Play a 1-millisecond silent buffer to permanently unlock Android hardware
    if (audioCtx) {
      const buffer = audioCtx.createBuffer(1, 1, 22050);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(0);
    }
  } catch (e) {
    console.log("Audio unlock:", e);
  }
}

// Speak Function: Decodes raw audio into hardware-authorized buffer
async function speak(textToSpeak) {
  const clean = textToSpeak.replace(/[*#_`~]/g, '').trim();
  if (!clean) return;

  if (statusLabel) statusLabel.innerText = "SPEAKING...";

  const chosenVoice = STATE.voice || "Brian";
  const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(chosenVoice)}&text=${encodeURIComponent(clean.slice(0, 300))}`;

  // Make sure hardware is awake
  unlockAudioHardware();

  try {
    // Stop any existing sound
    if (currentSource) {
      try { currentSource.stop(); } catch(e){}
      currentSource = null;
    }

    // Fetch the MP3 as raw binary data
    const res = await fetch(ttsUrl);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const arrayBuf = await res.arrayBuffer();

    // Decode in hardware audio context (IMMUNE TO ANDROID AUTOPLAY BLOCK)
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    source.onended = () => {
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    };

    source.start(0);
    currentSource = source;

  } catch (err) {
    console.log("StreamElements blocked, using Native TTS fallback:", err);

    // Fallback: Android's native speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.0;
      u.pitch = 0.9;
      u.onend = () => {
        if (statusLabel) statusLabel.innerText = "READY, MONDE";
      };
      window.speechSynthesis.speak(u);
    } else {
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    }
  }
}

// Test Voice Button
if (btnTestVoice) {
  btnTestVoice.onclick = () => {
    unlockAudioHardware();
    const voice = selectVoice ? selectVoice.value : "Brian";
    const displayName = voice === "Brian" ? "Monde" : (voice === "Matthew" ? "Alex" : "Emma");
    speak("Hello Monde! I am your AI assistant speaking with the " + displayName + " voice.");
  };
}

// Text Input Handling
function submitTextMessage() {
  if (!textInput) return;
  const msg = textInput.value.trim();
  if (!msg) return;

  // Crucial: Unlock hardware on user tap!
  unlockAudioHardware();

  textInput.value = '';
  appendMsg('You', msg);
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
      appendMsg('You', text);
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
  unlockAudioHardware();

  if (!rec) return;
  if (currentSource) {
    try { currentSource.stop(); } catch(e){}
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

// --- FAST AI QUERY WITH MEMORY CONTEXT ---
async function handleQuery(cmd) {
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your API key.');
    return;
  }

  if (statusLabel) statusLabel.innerText = "THINKING...";

  const now = new Date();
  const liveDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Format the conversation log for memory
  const recentHistory = STATE.history.slice(-6);
  let conversationContext = "";
  if (recentHistory.length > 0) {
    conversationContext = "Previous conversation:\n" + recentHistory.map(h => `${h.sender}: ${h.text}`).join("\n") + "\n\n";
  }

  const promptWithContext = `${conversationContext}Monde: ${cmd}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${STATE.apiKey}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptWithContext }] }],
        systemInstruction: {
          parts: [{
            text: `You are Monde AI, a fast personal companion created for Monde Dubasi.
Today's actual real-time date is ${liveDate}, and the current year is ${now.getFullYear()}.
Stay in natural dialogue with Monde. Use the previous conversation context so you never sound like you forgot the topic.
Always speak in concise, natural, fluent English (1 to 2 sentences max). Do not use bullet points or markdown symbols because your response is spoken aloud.`
          }]
        }
      })
    });

    const d = await res.json();
    if (d.candidates && d.candidates[0].content && d.candidates[0].content.parts[0].text) {
      const reply = d.candidates[0].content.parts[0].text;

      // Save context
      STATE.history.push({ sender: 'Monde', text: cmd });
      STATE.history.push({ sender: 'MONDE AI', text: reply });
      if (STATE.history.length > 16) STATE.history = STATE.history.slice(-16);
      localStorage.setItem('MONDE_CHAT_LOG', JSON.stringify(STATE.history));

      appendMsg('MONDE AI', reply);

      // Play audio via pre-authorized Web Audio
      speak(reply);

    } else if (d.error) {
      appendMsg('MONDE AI', 'API Error: ' + d.error.message);
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    }
  } catch(e) {
    appendMsg('MONDE AI', 'Network error.');
    if (statusLabel) statusLabel.innerText = "READY, MONDE";
  }
}
