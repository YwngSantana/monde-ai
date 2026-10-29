const STATE = {
  apiKey: localStorage.getItem('MONDE_KEY') || '',
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

if (inputKey && STATE.apiKey) {
  inputKey.value = STATE.apiKey;
}

// Settings Modal
document.getElementById('btn-settings').onclick = () => {
  modalSettings.classList.toggle('hidden');
  if (inputKey) inputKey.value = STATE.apiKey;
};

const btnCloseSettings = document.getElementById('btn-close-settings');
if (btnCloseSettings) {
  btnCloseSettings.onclick = () => modalSettings.classList.add('hidden');
}

document.getElementById('btn-save-settings').onclick = () => {
  STATE.apiKey = inputKey.value.trim();
  localStorage.setItem('MONDE_KEY', STATE.apiKey);
  modalSettings.classList.add('hidden');
  speak("API key saved. I am ready, Monde.");
};

// Memory Modal
const btnMemory = document.getElementById('btn-memory');
if (btnMemory && modalMemory) {
  btnMemory.onclick = () => modalMemory.classList.toggle('hidden');
}

// Chat UI Helper
function appendMsg(sender, text) {
  if (!chat) return;
  const d = document.createElement('div');
  d.className = sender === 'Monde' ? 'p-2 bg-cyan-950/60 rounded mb-2 text-cyan-200' : 'p-2 bg-slate-800 rounded mb-2 text-white';
  d.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// --- GUARANTEED ANDROID AUDIO ENGINE (FLUENT MALE VOICE) ---
let currentAudio = null;

function speak(t) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  // Strip markdown (*, #) and limit sentence length for instant speech
  const clean = t.replace(/[*#_`~]/g, '').trim();
  if (!clean) return;

  if (statusLabel) statusLabel.innerText = "Speaking...";

  // HTML5 Audio stream - works 100% on Android WebView
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(clean.slice(0, 200))}`;
  currentAudio = new Audio(url);
  
  // Lower pitch to create a natural, deep male voice
  currentAudio.preservesPitch = false;
  currentAudio.playbackRate = 0.88; 

  currentAudio.onended = () => {
    if (statusLabel) statusLabel.innerText = "Ready, Monde.";
  };

  currentAudio.onerror = () => {
    if (statusLabel) statusLabel.innerText = "Ready, Monde.";
  };

  currentAudio.play().catch(e => console.log('Audio playback error:', e));
}

// --- INSTANT SPEECH RECOGNITION ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec;

if (SpeechRecognition) {
  rec = new SpeechRecognition();
  rec.continuous = false;
  rec.lang = 'en-US';

  rec.onstart = () => {
    STATE.isListening = true;
    if (statusLabel) statusLabel.innerText = "Listening... (Tap button to send)";
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
    if (statusLabel) statusLabel.innerText = "Ready, Monde.";
    if (micBtn) micBtn.innerText = "Tap to Talk";
  };

  rec.onend = () => {
    STATE.isListening = false;
    if (micBtn) micBtn.innerText = "Tap to Talk";
  };
}

// Tap to Talk / Tap to Stop & Send
function toggleMic() {
  if (!rec) return;
  if (currentAudio) currentAudio.pause();

  if (STATE.isListening) {
    rec.stop(); // Stops mic and sends what you said immediately
  } else {
    try {
      rec.start();
    } catch(e) {}
  }
}

if (micBtn) micBtn.onclick = toggleMic;
if (orb) orb.onclick = toggleMic;

// --- FAST AI QUERY WITH REAL-TIME DATE/YEAR INJECTION ---
async function handleQuery(cmd) {
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your API key.');
    speak("Please tap Settings and enter your API key.");
    return;
  }

  if (statusLabel) statusLabel.innerText = "Thinking...";

  // Real-time live date and time injection
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
