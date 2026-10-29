const STATE = {
  apiKey: localStorage.getItem('MONDE_KEY') || '',
  voice: localStorage.getItem('MONDE_VOICE') || 'Puck',
  isListening: false,
  isProcessing: false,
  // Context history memory
  history: JSON.parse(localStorage.getItem('MONDE_CHAT_HISTORY')) || [],
  memories: JSON.parse(localStorage.getItem('MONDE_MEMORIES')) || []
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
      const sender = item.role === 'user' ? 'Monde' : 'MONDE AI';
      const text = item.parts[0].text;
      renderBubble(sender, text);
    });
  }
};

// + New Chat Handler: Starts a fresh conversation topic
if (btnNewChat) {
  btnNewChat.onclick = () => {
    STATE.history = [];
    localStorage.removeItem('MONDE_CHAT_HISTORY');
    chat.innerHTML = `
      <div class="p-3.5 bg-slate-800/90 rounded-2xl text-slate-100 border border-slate-700/60 mr-6 shadow-sm">
        <div class="text-[11px] font-bold text-cyan-400 mb-1 uppercase tracking-wider">MONDE AI</div>
        <div class="text-base leading-relaxed">Fresh conversation started, Monde. What's on your mind?</div>
      </div>
    `;
    handleQuery("Say hello to Monde and let him know you are ready for a new topic.");
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

// Render Chat Bubble
function renderBubble(sender, text) {
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

function appendMsg(sender, text) {
  renderBubble(sender, text);
}

// Hardware Speaker Test Chime
function playSpeakerChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

// --- THE WORKING 21:23 BASE64 AUDIO ENGINE ---
let currentAudio = null;

function playBase64Audio(base64Data, mimeType = 'audio/wav') {
  try {
    if (currentAudio) {
      try { currentAudio.pause(); } catch(e){}
      currentAudio = null;
    }

    if (statusLabel) statusLabel.innerText = "Speaking...";

    const audioUrl = `data:${mimeType};base64,${base64Data}`;
    currentAudio = new Audio(audioUrl);

    currentAudio.onended = () => {
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    };

    currentAudio.play().catch(e => {
      console.log("Audio play notice:", e);
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    });

  } catch(err) {
    console.log("Audio error:", err);
  }
}

// Test Voice Button
if (btnTestVoice) {
  btnTestVoice.onclick = () => {
    playSpeakerChime();
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

// --- DUAL-MODALITY QUERY: SENDS CHAT HISTORY & RECEIVES AUDIO DIRECTLY ---
async function handleQuery(cmd) {
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your API key.');
    return;
  }

  if (statusLabel) statusLabel.innerText = "THINKING...";

  const now = new Date();
  const liveDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const chosenVoice = STATE.voice || "Puck";

  const systemPrompt = `You are Monde AI, a personal companion created for Monde Dubasi. 
Today's actual real-time date is ${liveDate}, and the current year is ${now.getFullYear()}.
You are having an active, natural dialogue with Monde. 
Pay close attention to what was said previously in this conversation and build upon it smoothly.
Always speak in concise, natural, fluent English (1 to 2 sentences max). Do not use bullet points or markdown symbols because your response is spoken aloud.`;

  // 1. Add user message to conversation history
  STATE.history.push({
    role: "user",
    parts: [{ text: cmd }]
  });

  // Keep last 14 turns so context stays smooth
  if (STATE.history.length > 14) {
    STATE.history = STATE.history.slice(-14);
  }

  const requestBody = {
    contents: STATE.history, // Full conversation stream
    systemInstruction: {
      parts: [{ text: systemPrompt }]
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${STATE.apiKey}`;
    
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

      if (replyText) {
        // 2. Add AI reply to history so it remembers for the next turn
        STATE.history.push({
          role: "model",
          parts: [{ text: replyText }]
        });
        localStorage.setItem('MONDE_CHAT_HISTORY', JSON.stringify(STATE.history));
        appendMsg('MONDE AI', replyText);
      }
      
      // 3. Play the voice directly from Google's response
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
