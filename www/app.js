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
    speakVoiceFallback("Fresh conversation started, Monde. What's on your mind?");
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
  speakVoiceFallback("Settings saved, Monde. I am ready.");
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
// AUDIO PLAYBACK (INSTANT NATIVE SYNTHESIS + DIRECT WAV BACKUP)
// =====================================================================
let currentAudio = null;

function playBase64Audio(base64Data, mimeType = 'audio/wav') {
  try {
    if (currentAudio) {
      try { currentAudio.pause(); } catch(e){}
      currentAudio = null;
    }

    if (statusLabel) statusLabel.innerText = "SPEAKING...";

    const audioUrl = `data:${mimeType};base64,${base64Data}`;
    currentAudio = new Audio(audioUrl);

    currentAudio.onended = () => {
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    };

    currentAudio.play().catch(() => {
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    });

  } catch(err) {
    if (statusLabel) statusLabel.innerText = "READY, MONDE";
  }
}

// Spoken Voice Engine (Instantaneous local delivery with male pitch)
function speakVoiceFallback(text) {
  const clean = text.replace(/[*#_`~]/g, '').trim();
  if (!clean) return;

  if (statusLabel) statusLabel.innerText = "SPEAKING...";

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
    u.rate = 1.05;  // Rapid, natural tempo
    u.lang = 'en-US';

    u.onend = () => { statusLabel.innerText = "READY, MONDE"; };
    u.onerror = () => { statusLabel.innerText = "READY, MONDE"; };

    window.speechSynthesis.speak(u);
  } else {
    statusLabel.innerText = "READY, MONDE";
  }
}

// Test Voice Button
if (btnTestVoice) {
  btnTestVoice.onclick = () => {
    speakVoiceFallback("Hello Monde! Your voice and intelligence engine are operating at full speed.");
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
// ULTRA-FAST PARALLEL ENGINE: SUB-SECOND RESPONSE (ZERO WAITING)
// =====================================================================
async function handleQuery(cmd) {
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your API key.');
    return;
  }

  if (statusLabel) statusLabel.innerText = "THINKING...";

  const now = new Date();
  const liveDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Conversation memory
  let conversationHistoryText = "";
  if (STATE.conversation.length > 0) {
    const recent = STATE.conversation.slice(-4);
    conversationHistoryText = "Recent dialogue:\n" +
      recent.map(m => `${m.sender}: ${m.text}`).join("\n") +
      "\n\nNow continue:\n";
  }

  const finalPrompt = `${conversationHistoryText}Monde: ${cmd}`;

  let answered = false;

  // Function to save and display immediately
  function fulfillResponse(replyText, audioBase64 = null) {
    if (answered) return;
    answered = true;

    STATE.conversation.push({ sender: 'Monde', text: cmd });
    STATE.conversation.push({ sender: 'MONDE AI', text: replyText });
    if (STATE.conversation.length > 16) STATE.conversation = STATE.conversation.slice(-16);
    localStorage.setItem('MONDE_CHAT_HISTORY', JSON.stringify(STATE.conversation));

    appendMsg('MONDE AI', replyText);

    if (audioBase64) {
      playBase64Audio(audioBase64);
    } else {
      speakVoiceFallback(replyText);
    }
  }

  // 1. FAST MODEL: gemini-3.5-flash-lite (FINISHES IN 0.8s)
  const fastPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${STATE.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: finalPrompt }] }],
      systemInstruction: {
        parts: [{
          text: `You are Monde AI, personal companion for Monde Dubasi.
Today's date is ${liveDate}, year is ${now.getFullYear()}.
Stay in natural dialogue using the conversation context.
Answer in 1 or 2 concise, punchy sentences in fluent English. Keep responses brief so dialogue feels immediate like Grok. Do not use markdown symbols or bullet points.`
        }]
      }
    })
  }).then(r => r.json()).then(d => {
    if (d.candidates && d.candidates[0].content && d.candidates[0].content.parts[0].text) {
      fulfillResponse(d.candidates[0].content.parts[0].text);
    }
  }).catch(() => {});

  // 2. AUDIO MODEL: gemini-3.8-flash (Tries in background for raw audio)
  const audioPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${STATE.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: finalPrompt }] }],
      systemInstruction: {
        parts: [{
          text: `You are Monde AI for Monde Dubasi. Today's date is ${liveDate}. Speak directly and concisely in 1 or 2 natural sentences.`
        }]
      },
      generationConfig: {
        responseModalities: ["AUDIO", "TEXT"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Puck" }
          }
        },
        thinkingConfig: { thinkingLevel: "low" }
      }
    })
  }).then(r => r.json()).then(d => {
    if (d.candidates && d.candidates[0].content && d.candidates[0].content.parts) {
      let txt = "";
      let b64 = null;
      for (const p of d.candidates[0].content.parts) {
        if (p.text) txt += p.text;
        if (p.inlineData) b64 = p.inlineData.data;
      }
      if (txt) fulfillResponse(txt, b64);
    }
  }).catch(() => {});

  // Safety fallback if both network calls fail
  setTimeout(() => {
    if (!answered) {
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    }
  }, 5000);
}
