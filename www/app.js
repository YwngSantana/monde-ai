const STATE = {
  apiKey: localStorage.getItem('MONDE_KEY') || '',
  voice: localStorage.getItem('MONDE_VOICE') || 'Puck',
  isListening: false,
  isProcessing: false,
  // Plain text conversation log
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
const selectVoice = document.getElementById('select-voice');
const btnTestVoice = document.getElementById('btn-test-voice');

const textForm = document.getElementById('text-form');
const textInput = document.getElementById('input-text-msg');
const textSendBtn = document.getElementById('btn-text-send');

if (inputKey && STATE.apiKey) inputKey.value = STATE.apiKey;
if (selectVoice && STATE.voice) selectVoice.value = STATE.voice;

// Restore saved messages on startup
window.onload = () => {
  if (STATE.conversation.length > 0) {
    chat.innerHTML = '';
    STATE.conversation.forEach(item => {
      renderBubble(item.sender, item.text);
    });
  }
};

// + New Chat: Clears history and starts fresh
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
    handleQuery("Greet Monde and let him know you are ready for a new conversation.");
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
  handleQuery("Say hello to Monde and confirm your voice is working.");
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

// Chat UI Bubbles
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

// --- THE EXACT BASE64 AUDIO ENGINE FROM 21:23 ---
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
      console.log("Audio play error:", e);
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    });

  } catch(err) {
    console.log("Audio decode error:", err);
    if (statusLabel) statusLabel.innerText = "READY, MONDE";
  }
}

// Test Voice Button
if (btnTestVoice) {
  btnTestVoice.onclick = () => {
    handleQuery("Introduce yourself in one sentence with your name Monde.");
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

// --- FAST AI QUERY: 21:23 DUAL-MODALITY (TEXT + VOICE) WITH MEMORY ---
async function handleQuery(cmd) {
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your API key.');
    return;
  }

  if (statusLabel) statusLabel.innerText = "THINKING...";

  const now = new Date();
  const liveDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const chosenVoice = STATE.voice || "Puck";

  // Build the conversation memory as text
  let conversationHistoryText = "";
  if (STATE.conversation.length > 0) {
    const recent = STATE.conversation.slice(-6);
    conversationHistoryText = "Here is what we have been talking about recently:\n" +
      recent.map(m => `${m.sender}: ${m.text}`).join("\n") +
      "\n\nNow continue the conversation naturally:\n";
  }

  const finalPrompt = `${conversationHistoryText}Monde: ${cmd}`;

  // This is the EXACT payload structure that worked at 21:23
  const requestBody = {
    contents: [{
      parts: [{ text: finalPrompt }]
    }],
    systemInstruction: {
      parts: [{
        text: `You are Monde AI, a personal companion created for Monde Dubasi.
Today's actual real-time date is ${liveDate}, and the current year is ${now.getFullYear()}.
You are actively chatting with Monde. Use the recent conversation to remember what was said and keep the dialogue flowing naturally.
Always answer in concise, natural, fluent English (1 to 2 sentences max). Do not use bullet points or markdown symbols because your response is spoken aloud.`
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

      if (replyText) {
        // Save to memory
        STATE.conversation.push({ sender: 'Monde', text: cmd });
        STATE.conversation.push({ sender: 'MONDE AI', text: replyText });
        if (STATE.conversation.length > 20) STATE.conversation = STATE.conversation.slice(-20);
        localStorage.setItem('MONDE_CHAT_HISTORY', JSON.stringify(STATE.conversation));

        appendMsg('MONDE AI', replyText);
      }
      
      // Play the voice out loud
      if (audioBase64) {
        playBase64Audio(audioBase64, audioMime);
      } else {
        if (statusLabel) statusLabel.innerText = "READY, MONDE";
      }

    } else if (d.error) {
      appendMsg('MONDE AI', 'Error: ' + d.error.message);
      if (statusLabel) statusLabel.innerText = "READY, MONDE";
    }
  } catch(e) {
    appendMsg('MONDE AI', 'Connection error: ' + e.message);
    if (statusLabel) statusLabel.innerText = "READY, MONDE";
  }
}
