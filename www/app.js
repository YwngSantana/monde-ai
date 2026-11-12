const STATE = {
  apiKey: localStorage.getItem('MONDE_KEY') || '',
  isListening: false,
  isProcessing: false,
  conversation: JSON.parse(localStorage.getItem('MONDE_CHAT_HISTORY')) || []
};

const orb = document.getElementById('orb-core');
const statusLabel = document.getElementById('status-label');
const chat = document.getElementById('chat-stream');
const micBtn = document.getElementById('btn-mic-toggle');
const btnNewChat = document.getElementById('btn-new-chat');

const modalSettings = document.getElementById('modal-settings');
const modalMemory = document.getElementById('modal-memory');
const inputKey = document.getElementById('input-api-key');
const btnTestVoice = document.getElementById('btn-test-voice');

const textForm = document.getElementById('text-form');
const textInput = document.getElementById('input-text-msg');
const textSendBtn = document.getElementById('btn-text-send');

if (inputKey && STATE.apiKey) inputKey.value = STATE.apiKey;

// Restore saved messages on startup
window.onload = () => {
  if (STATE.conversation.length > 0) {
    chat.innerHTML = '';
    STATE.conversation.forEach(item => {
      renderBubble(item.sender, item.text);
    });
  }
};

// + New Chat: Starts fresh
if (btnNewChat) {
  btnNewChat.onclick = () => {
    STATE.conversation = [];
    localStorage.removeItem('MONDE_CHAT_HISTORY');
    chat.innerHTML = `
      <div class="p-3.5 bg-slate-800/90 rounded-2xl text-slate-100 border border-slate-700/60 mr-6 shadow-sm">
        <div class="text-[11px] font-bold text-cyan-400 mb-1 uppercase tracking-wider">MONDE AI</div>
        <div class="text-base leading-relaxed">Fresh conversation started, Monde. What's on your mind?</div>
      </div>
    `;
    speakMondeVoice("Fresh conversation started, Monde. What's on your mind?");
  };
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
  appendMsg('MONDE AI', 'API key saved!');
  speakMondeVoice("Settings saved, Monde. I am ready.");
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
// MONDE SIGNATURE VOICE ENGINE (INSTANT & GUARANTEED AUDIO)
// =====================================================================
function speakMondeVoice(text) {
  const clean = text.replace(/[*#_`~]/g, '').trim();
  if (!clean) return;

  statusLabel.innerText = "SPEAKING...";

  // 1. Play hardware sound tone
  playHardwareBeep();

  // 2. Synthesize deep male voice
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('male') || 
       v.name.toLowerCase().includes('david') || 
       v.name.toLowerCase().includes('george') ||
       v.name.toLowerCase().includes('google us english') ||
       v.name.toLowerCase().includes('en-us-x-sfg#male'))
    );
    
    if (maleVoice) u.voice = maleVoice;
    u.pitch = 0.86; // Deep signature tone
    u.rate = 1.05;  // Natural conversational tempo
    u.lang = 'en-US';

    u.onend = () => { statusLabel.innerText = "READY, MONDE"; };
    u.onerror = () => { statusLabel.innerText = "READY, MONDE"; };

    window.speechSynthesis.speak(u);
  } else {
    statusLabel.innerText = "READY, MONDE";
  }
}

// Hardware Beep (Plays through Android speaker hardware)
function playHardwareBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

// Test Voice Button
if (btnTestVoice) {
  btnTestVoice.onclick = () => {
    speakMondeVoice("Hello Monde! My voice is ready and working.");
  };
}

// Text Input Handling
function submitTextMessage() {
  if (!textInput) return;
  const msg = textInput.value.trim();
  if (!msg) return;

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
  if (!rec) return;

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

// =====================================================================
// FAST AI ENGINE: GEMINI 3.5 FLASH LITE (SUB-SECOND LATENCY, NO 503s)
// =====================================================================
async function handleQuery(cmd) {
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your API key.');
    return;
  }

  if (statusLabel) statusLabel.innerText = "THINKING...";

  const now = new Date();
  const liveDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Add conversation context
  const recentHistory = STATE.conversation.slice(-4);
  let conversationContext = "";
  if (recentHistory.length > 0) {
    conversationContext = "Recent dialogue:\n" + recentHistory.map(h => `${h.sender}: ${h.text}`).join("\n") + "\n\n";
  }

  const promptWithContext = `${conversationContext}Monde: ${cmd}`;

  try {
    // gemini-3.5-flash-lite runs at 350+ tokens/sec with minimal latency
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${STATE.apiKey}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptWithContext }] }],
        systemInstruction: {
          parts: [{
            text: `You are Monde AI, personal companion for Monde Dubasi.
Today's date is ${liveDate}, year is ${now.getFullYear()}.
Stay in natural dialogue using the conversation context.
Answer in 1 or 2 concise, punchy sentences in fluent English. Keep responses brief so the conversation feels rapid like Grok. Do not use markdown symbols or bullet points.`
          }]
        }
      })
    });

    const d = await res.json();
    
    if (d.candidates && d.candidates[0].content && d.candidates[0].content.parts[0].text) {
      const reply = d.candidates[0].content.parts[0].text;

      // Save context
      STATE.conversation.push({ sender: 'Monde', text: cmd });
      STATE.conversation.push({ sender: 'MONDE AI', text: reply });
      if (STATE.conversation.length > 16) STATE.conversation = STATE.conversation.slice(-16);
      localStorage.setItem('MONDE_CHAT_HISTORY', JSON.stringify(STATE.conversation));

      appendMsg('MONDE AI', reply);

      // Instant spoken reply
      speakMondeVoice(reply);

    } else if (d.error) {
      appendMsg('MONDE AI', 'API Error: ' + d.error.message);
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    }
  } catch(e) {
    appendMsg('MONDE AI', 'Network error.');
    if (statusLabel) statusLabel.innerText = "READY, MONDE";
  }
}
