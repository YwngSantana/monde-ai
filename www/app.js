const STATE = {
  apiKey: localStorage.getItem('MONDE_KEY') || '',
  isListening: false,
  isProcessing: false,
  memories: JSON.parse(localStorage.getItem('MONDE_MEM') || '[]')
};
const orb = document.getElementById('orb-core');
const statusLabel = document.getElementById('status-label');
const chat = document.getElementById('chat-stream');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec;

if (SpeechRecognition) {
  rec = new SpeechRecognition();
  rec.continuous = true;
  rec.lang = 'en-US';
  rec.onresult = (e) => {
    const text = e.results[e.resultIndex][0].transcript.trim().toLowerCase();
    if (text.includes('monde')) {
      const q = text.replace(/hey monde|monde/gi, '').trim();
      if (q) handleQuery(q);
      else speak("Yes Monde, I am here.");
    }
  };
  rec.onerror = () => { try { rec.start(); } catch(e){} };
  rec.onend = () => { try { rec.start(); } catch(e){} };
  try { rec.start(); } catch(e){}
}

function handleQuery(cmd) {
  if (cmd.startsWith('open ')) {
    const app = cmd.replace('open ', '').trim();
    if (app === 'whatsapp') window.location.href = 'whatsapp://';
    else if (app === 'youtube') window.location.href = 'https://youtube.com';
    else window.location.href = `https://www.google.com/search?q=${app}`;
    return;
  }
  if (cmd.includes('alarm')) {
    window.location.href = 'intent:#Intent;action=android.intent.action.SET_ALARM;end';
    speak("Opening alarm clock.");
    return;
  }
  askAI(cmd);
}

async function askAI(prompt) {
  appendMsg('Monde', prompt);
  if (!STATE.apiKey) {
    appendMsg('MONDE AI', 'Please tap Settings and enter your free Gemini API key.');
    return;
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${STATE.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: `You are MONDE AI, personal assistant to Monde Dubasi. Answer concisely. User says: ${prompt}` }] }] })
    });
    const d = await res.json();
    const reply = d.candidates[0].content.parts[0].text;
    appendMsg('MONDE AI', reply);
    speak(reply);
  } catch(e) {
    appendMsg('MONDE AI', 'Error contacting AI. Check network or key.');
  }
}

function speak(t) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  window.speechSynthesis.speak(u);
}

function appendMsg(sender, text) {
  const d = document.createElement('div');
  d.className = sender === 'Monde' ? 'p-2 bg-cyan-950/60 rounded-xl self-end' : 'p-2 bg-[#0C101D] rounded-xl self-start';
  d.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

document.getElementById('btn-mic-toggle').onclick = () => { if (rec) rec.start(); };
document.getElementById('btn-settings').onclick = () => document.getElementById('modal-settings').classList.remove('hidden');
document.getElementById('btn-close-settings').onclick = () => document.getElementById('modal-settings').classList.add('hidden');
document.getElementById('btn-save-settings').onclick = () => {
  STATE.apiKey = document.getElementById('input-api-key').value.trim();
  localStorage.setItem('MONDE_KEY', STATE.apiKey);
  document.getElementById('modal-settings').classList.add('hidden');
};
