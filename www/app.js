const STATE = {
  apiKey: localStorage.getItem('MONDE_KEY') || '',
  voice: localStorage.getItem('MONDE_VOICE') || 'Puck',
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

// Pre-created audio element that stays bound to the user session
let player = new Audio();
player.preload = "auto";

// Unlocks Android audio hardware during any tap
function primeAudio() {
  player.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
  player.play().catch(() => {});
}

// Restore saved messages
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
    handleQuery("Greet Monde and tell him you are ready for a new conversation.");
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
  primeAudio();
  playVoiceAudio("Settings saved, Monde. I am ready.");
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

// Direct Audio Player
function playBase64(base64Data, mimeType = 'audio/wav') {
  try {
    player.pause();
    player.src = `data:${mimeType};base64,${base64Data}`;
    statusLabel.innerText = "SPEAKING...";

    player.onended = () => {
      statusLabel.innerText = "READY, MONDE";
    };

    player.onerror = (e) => {
      statusLabel.innerText = "AUDIO ERROR: " + (player.error ? player.error.code : "ERR");
    };

    const p = player.play();
    if (p) {
      p.catch(err => {
        statusLabel.innerText = "AUDIO BLOCKED: " + err.name;
      });
    }
  } catch (e) {
    statusLabel.innerText = "PLAY ERR: " + e.message;
  }
}

// Fallback Voice generator using responsive TTS proxy
function playVoiceAudio(text) {
  const clean = text.replace(/[*#_`~]/g, '').trim();
  if (!clean) return;

  statusLabel.innerText = "SPEAKING...";

  // Use SpeechSynthesis directly with an explicit pitch/rate to guarantee a male tone
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    
    // Choose voice
    const voices = window.speechSynthesis.getVoices();
    const male = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('male') || 
       v.name.toLowerCase().includes('david') || 
       v.name.toLowerCase().includes('george') ||
       v.name.toLowerCase().includes('en-us-x-sfg#male'))
    );
    if (male) u.voice = male;
    
    u.pitch = 0.85; // Deep male pitch
    u.rate = 1.0;
    u.lang = 'en-US';

    u.onend = () => { statusLabel.innerText = "READY, MONDE"; };
    u.onerror = (e) => { statusLabel.innerText = "TTS ERR: " + e.error; };

    window.speechSynthesis.speak(u);
  } else {
    statusLabel.innerText = "READY, MONDE";
  }
}

// Test Voice Button
if (btnTestVoice) {
  btnTestVoice.onclick = () => {
    primeAudio();
    playVoiceAudio("Hello Monde! Your AI assistant voice is working.");
  };
}

// Text Input Handling
function submitTextMessage() {
  if (!textInput) return;
  const msg = textInput.value.trim();
  if (!msg) return;

  primeAudio(); // Unlock audio on tap

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
  primeAudio();

  if (!rec) return;
  player.pause();

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

// --- DUAL MODE QUERY: FAST GENERATION WITH RELIABLE SPEECH ---
async function handleQuery(cmd) {
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your API key.');
    return;
  }

  if (statusLabel) statusLabel.innerText = "THINKING...";

  const now = new Date();
  const liveDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Add conversation context
  const recentHistory = STATE.history.slice(-6);
  let conversationContext = "";
  if (recentHistory.length > 0) {
    conversationContext = "Previous conversation:\n" + recentHistory.map(h => `${h.sender}: ${h.text}`).join("\n") + "\n\n";
  }

  const promptWithContext = `${conversationContext}Monde: ${cmd}`;

  try {
    // Call Gemini 2.5 Flash with multimodal audio config
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${STATE.apiKey}`;
    
    const chosenVoice = STATE.voice || "Puck";

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptWithContext }] }],
        systemInstruction: {
          parts: [{
            text: `You are Monde AI, personal companion for Monde Dubasi.
Today's date is ${liveDate}.
Stay in dialogue with Monde using the previous conversation context.
Answer in 1 to 2 natural, concise sentences in fluent English. No bullet points or markdown.`
          }]
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
      })
    });

    const d = await res.json();
    
    if (d.candidates && d.candidates[0].content && d.candidates[0].content.parts) {
      let replyText = "";
      let audioBase64 = null;
      let audioMime = "audio/wav";

      for (const part of d.candidates[0].content.parts) {
        if (part.text) replyText += part.text;
        if (part.inlineData) {
          audioBase64 = part.inlineData.data;
          audioMime = part.inlineData.mimeType || "audio/wav";
        }
      }

      if (replyText) {
        STATE.history.push({ sender: 'Monde', text: cmd });
        STATE.history.push({ sender: 'MONDE AI', text: replyText });
        if (STATE.history.length > 16) STATE.history = STATE.history.slice(-16);
        localStorage.setItem('MONDE_CHAT_LOG', JSON.stringify(STATE.history));

        appendMsg('MONDE AI', replyText);
      }

      // 1. If Gemini returned inline base64 audio, play it immediately (the 21:23 working method)
      if (audioBase64) {
        playBase64(audioBase64, audioMime);
      } else if (replyText) {
        // 2. Otherwise speak via the local synthesis engine
        playVoiceAudio(replyText);
      } else {
        statusLabel.innerText = "READY, MONDE";
      }

    } else if (d.error) {
      appendMsg('MONDE AI', 'API Error: ' + d.error.message);
      statusLabel.innerText = "READY, MONDE";
    }
  } catch (e) {
    appendMsg('MONDE AI', 'Network error.');
    statusLabel.innerText = "READY, MONDE";
  }
}
