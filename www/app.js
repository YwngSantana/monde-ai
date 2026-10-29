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

// Modals
const modalSettings = document.getElementById('modal-settings');
const modalMemory = document.getElementById('modal-memory');
const inputKey = document.getElementById('input-api-key');

if (inputKey && STATE.apiKey) {
  inputKey.value = STATE.apiKey;
}

// Open/Close Settings
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
  appendMsg('MONDE AI', 'API Key saved successfully! Tap talk to speak.');
  speak("API key saved. I am ready, Monde.");
};

// Open/Close Memory
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

// Natural English Male Voice
function speak(t) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  // Strip markdown formatting (*, #, _) so it doesn't read symbols out loud
  const cleanText = t.replace(/[*#_`~]/g, '');

  const u = new SpeechSynthesisUtterance(cleanText);
  const voices = window.speechSynthesis.getVoices();

  // Search for an English male voice
  const male = voices.find(v => 
    v.lang.startsWith('en') && 
    (v.name.toLowerCase().includes('male') || 
     v.name.toLowerCase().includes('david') || 
     v.name.toLowerCase().includes('google us english') ||
     v.name.toLowerCase().includes('en-us-x-sfg#male'))
  );

  if (male) u.voice = male;
  u.pitch = 0.9; // Deeper masculine tone
  u.rate = 1.0;
  u.lang = 'en-US';

  if (statusLabel) statusLabel.innerText = "Speaking...";
  u.onend = () => {
    if (statusLabel) statusLabel.innerText = "Ready, Monde.";
  };

  window.speechSynthesis.speak(u);
}

if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec;

if (SpeechRecognition) {
  rec = new SpeechRecognition();
  rec.continuous = false; // Only listens when tapped (stops infinite beep loop)
  rec.lang = 'en-US';

  rec.onstart = () => {
    if (statusLabel) statusLabel.innerText = "Listening...";
  };

  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    if (text && text.trim().length > 0) {
      appendMsg('Monde', text);
      handleQuery(text);
    }
  };

  rec.onerror = (err) => {
    console.log("Mic error:", err);
    if (statusLabel) statusLabel.innerText = "Ready, Monde.";
  };

  rec.onend = () => {
    if (statusLabel && statusLabel.innerText === "Listening...") {
      statusLabel.innerText = "Ready, Monde.";
    }
  };
}

// Toggle Mic Button and Orb
function startListening() {
  if (!rec) {
    alert("Speech recognition not supported on this device.");
    return;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  try {
    rec.start();
  } catch (e) {
    try { rec.stop(); } catch(err){}
  }
}

if (micBtn) micBtn.onclick = startListening;
if (orb) orb.onclick = startListening;

// AI Query Handler (Gemini 2.5 Flash)
async function handleQuery(cmd) {
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your Gemini API key.');
    speak("Please tap Settings and enter your API key.");
    return;
  }

  if (statusLabel) statusLabel.innerText = "Thinking...";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${STATE.apiKey}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: cmd }] }],
        systemInstruction: {
          parts: [{ text: "You are Monde AI, a highly intelligent and friendly personal assistant speaking with Monde Dubasi. Give natural, concise, conversational responses in fluent English. Do not write markdown or bullet points since your answers are spoken aloud." }]
        }
      })
    });

    const d = await res.json();
    if (d.candidates && d.candidates[0].content && d.candidates[0].content.parts[0].text) {
      const reply = d.candidates[0].content.parts[0].text;
      appendMsg('MONDE AI', reply);
      speak(reply);
    } else if (d.error) {
      appendMsg('MONDE AI', 'API Error: ' + d.error.message);
      speak("There was an error with the API key: " + d.error.message);
    } else {
      appendMsg('MONDE AI', 'No response received.');
    }
  } catch(e) {
    appendMsg('MONDE AI', 'Network Error: ' + e.message);
    speak("I had trouble connecting to the network.");
  }
}
