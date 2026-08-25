/* Kracademy Exam Trainer — preguntas tipo test WKF (Kata / Kumite) */
'use strict';

const STORE_KEY = 'ket-state-v1';

const MODULES = {
  kata: { label: 'Kata' },
  kumite: { label: 'Kumite' },
};

const QBY = {}; // id -> question
QUESTIONS.forEach(q => { QBY[q.id] = q; });
const BANK = {
  kata: QUESTIONS.filter(q => q.m === 'kata'),
  kumite: QUESTIONS.filter(q => q.m === 'kumite'),
};

/* ---------- estado ---------- */

function defaultState() {
  return {
    settings: { lang: 'both', voice: 'es' }, // lang: both|en|es · voice (modo coche): en|es
    review: [],                 // ids marcadas para repaso
    attempts: [],               // historial de intentos terminados
    current: {},                // intento en curso por clave (kata/kumite/review)
    qstats: {},                 // id -> [aciertos, fallos]
  };
}

let S = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = Object.assign(defaultState(), JSON.parse(raw));
      s.settings = Object.assign({ lang: 'both', voice: 'es' }, s.settings);
      return s;
    }
  } catch (e) { /* estado corrupto: empezar de cero */ }
  return defaultState();
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(S));
}

/* ---------- util ---------- */

const $ = sel => document.querySelector(sel);
const main = $('#main');

function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let toastTimer = null;
function toast(msg) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function qText(q) {
  const lang = S.settings.lang;
  let out = '';
  if (lang !== 'es') out += `<p class="q-text">${esc(q.en)}</p>`;
  if (lang !== 'en' && q.es) out += `<p class="q-text${lang === 'both' ? ' es-sub' : ''}">${esc(q.es)}</p>`;
  return out || `<p class="q-text">${esc(q.en)}</p>`;
}

function shortText(q) {
  const lang = S.settings.lang;
  const t = (lang === 'es' && q.es) ? q.es : q.en;
  return t.length > 140 ? t.slice(0, 140).trimEnd() + '…' : t;
}

const STAR = '<svg viewBox="0 0 24 24"><path d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1Z"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

/* ---------- navegación ---------- */

let view = { screen: 'home' };

function go(screen, params) {
  if (view.screen === 'car' && screen !== 'car' && car) carCleanup();
  view = Object.assign({ screen }, params || {});
  render();
  window.scrollTo(0, 0);
}

document.querySelectorAll('#tabbar .tab').forEach(btn => {
  btn.addEventListener('click', () => go(btn.dataset.tab));
});

function setTab(name) {
  document.querySelectorAll('#tabbar .tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
}

function render() {
  main.innerHTML = '';
  const tabFor = { home: 'home', start: 'home', quiz: 'home', result: 'home', review: 'review', stats: 'stats', settings: 'settings' };
  setTab(tabFor[view.screen] || 'home');
  ({
    home: renderHome,
    start: renderStart,
    quiz: renderQuiz,
    car: renderCar,
    result: renderResult,
    review: renderReview,
    stats: renderStats,
    settings: renderSettings,
  }[view.screen] || renderHome)();
}

/* ---------- inicio ---------- */

function accuracy(mod) {
  let ok = 0, ko = 0;
  for (const q of BANK[mod]) {
    const st = S.qstats[q.id];
    if (st) { ok += st[0]; ko += st[1]; }
  }
  const total = ok + ko;
  return total ? Math.round((ok / total) * 100) : null;
}

/* Karatekas de línea del Referee Trainer: shiko-dachi (kata) y kizami-tsuki (kumite) */
const MOD_ICONS = {
  kata: '<svg viewBox="0 0 24 24"><circle cx="12" cy="4.3" r="2.1"/><path d="M12 6.4v6"/><path d="M12 8.3 5.8 8.9M12 8.3l6.2.6"/><circle cx="4.7" cy="9" r="1.05" fill="currentColor" stroke="none"/><circle cx="19.3" cy="9" r="1.05" fill="currentColor" stroke="none"/><path d="M12 12.4 5.3 15.4l-.2 4.1M3.2 19.8H7"/><path d="M12 12.4l6.7 3 .2 4.1M17 19.8h3.8"/></svg>',
  kumite: '<svg viewBox="0 0 24 24"><circle cx="6.6" cy="6.8" r="1.8"/><path d="M6.1 8.9 4.9 13.4"/><path d="M6.3 9.4l8.6-2.2"/><path d="M6.3 9.9 4 11.8"/><path d="M4.9 13.4l3.9 2.8-.3 4.2"/><path d="M4.9 13.4l-2.9 6"/><circle cx="19.1" cy="5.7" r="1.8"/><path d="M18.5 7.6l-1.1 5.5"/><path d="M18.2 8.3l-2.9 2.2"/><path d="M17.4 13.1l-1.7 6.3"/><path d="M17.4 13.1l3.9 5.6"/></svg>',
};

function renderHome() {
  let html = `<div class="screen-fill home">
    <div class="home-head">
      <h1>Exam Trainer</h1>
      <p class="subtitle">Preguntas oficiales WKF · Julio 2026</p>
    </div>`;

  for (const mod of ['kata', 'kumite']) {
    const bank = BANK[mod];
    const acc = accuracy(mod);
    const cur = S.current[mod];
    const nRev = S.review.filter(id => QBY[id] && QBY[id].m === mod).length;
    html += `<button class="module-hero" data-mod="${mod}">
      <span class="mod-icon">${MOD_ICONS[mod]}</span>
      <span class="mod-name">${MODULES[mod].label.toUpperCase()}</span>
      <span class="mod-sub">${bank.length} preguntas</span>
      <span class="module-stats">
        ${cur ? `<span class="chip progress">En curso · ${cur.answers.length}/${cur.qids.length}</span>` : ''}
        ${acc !== null ? `<span class="chip ${acc >= 80 ? 'good' : ''}">${acc}% acierto</span>` : ''}
        ${nRev ? `<span class="chip">${nRev} en repaso</span>` : ''}
      </span>
    </button>`;
  }

  const nRevTotal = S.review.length;
  if (nRevTotal) {
    html += `<button class="btn" data-act="go-review">Repaso · ${nRevTotal} pregunta${nRevTotal === 1 ? '' : 's'}</button>`;
  }
  html += '</div>';
  main.appendChild(h(html));

  main.querySelectorAll('.module-hero').forEach(el => {
    el.addEventListener('click', () => go('start', { mod: el.dataset.mod }));
  });
  const rv = main.querySelector('[data-act="go-review"]');
  if (rv) rv.addEventListener('click', () => go('review'));
}

/* ---------- empezar intento ---------- */

function renderStart() {
  const mod = view.mod;
  const bank = BANK[mod];
  const cur = S.current[mod];
  const lens = [25, 50, 100, bank.length].filter((v, i, a) => v <= bank.length && a.indexOf(v) === i);

  let html = `<div class="screen-fill">
    <h1>${MODULES[mod].label}</h1>
    <p class="subtitle">${bank.length} preguntas · verdadero o falso</p>`;

  if (cur) {
    html += `<div class="card">
      <div style="font-weight:700;margin-bottom:4px">Intento en curso</div>
      <div style="color:var(--muted);font-size:0.9rem;margin-bottom:14px">
        ${cur.answers.length} de ${cur.qids.length} respondidas ·
        <span style="color:var(--green-dark);font-weight:700">${cur.answers.filter(a => a.ok).length} bien</span> ·
        <span style="color:var(--red-dark);font-weight:700">${cur.answers.filter(a => !a.ok).length} mal</span>
      </div>
      <button class="btn btn-primary" data-act="resume">Continuar intento</button>
      <button class="btn" data-act="resume-car">${CAR_ICON} Continuar en modo coche</button>
      <button class="btn btn-ghost" data-act="discard">Descartar y empezar de nuevo</button>
    </div>`;
  }

  html += `<h2>Nuevo intento</h2>
    <div class="len-grid">
      ${lens.map(n => `<button class="len-opt${n === lens[0] ? ' sel' : ''}" data-len="${n}">
        <span class="n">${n}</span><span class="l">${n === bank.length ? 'todas' : 'preguntas'}</span>
      </button>`).join('')}
    </div>
    <div style="flex:1"></div>
    <button class="btn btn-primary" data-act="begin">Comenzar</button>
    <button class="btn" data-act="begin-car">${CAR_ICON} Modo coche (voz)</button>
    <button class="btn btn-ghost" data-act="back">‹ Inicio</button>
  </div>`;

  main.appendChild(h(html));

  let selLen = lens[0];
  main.querySelectorAll('.len-opt').forEach(el => {
    el.addEventListener('click', () => {
      selLen = Number(el.dataset.len);
      main.querySelectorAll('.len-opt').forEach(o => o.classList.toggle('sel', o === el));
    });
  });
  main.querySelector('[data-act="begin"]').addEventListener('click', () => {
    if (S.current[mod] && !confirm('Tienes un intento en curso. ¿Descartarlo y empezar uno nuevo?')) return;
    startAttempt(mod, shuffle(bank.map(q => q.id)).slice(0, selLen));
  });
  main.querySelector('[data-act="begin-car"]').addEventListener('click', () => {
    if (!S.current[mod]) {
      S.current[mod] = { key: mod, label: MODULES[mod].label, qids: shuffle(bank.map(q => q.id)).slice(0, selLen), answers: [], started: Date.now() };
      save();
    }
    startCar(mod);
  });
  main.querySelector('[data-act="back"]').addEventListener('click', () => go('home'));
  const res = main.querySelector('[data-act="resume"]');
  if (res) res.addEventListener('click', () => go('quiz', { key: mod }));
  const resCar = main.querySelector('[data-act="resume-car"]');
  if (resCar) resCar.addEventListener('click', () => startCar(mod));
  const dis = main.querySelector('[data-act="discard"]');
  if (dis) dis.addEventListener('click', () => {
    if (!confirm('¿Descartar el intento en curso? No contará en las estadísticas.')) return;
    delete S.current[mod];
    save();
    render();
  });
}

function startAttempt(key, qids, label) {
  S.current[key] = {
    key,
    label: label || MODULES[key].label,
    qids,
    answers: [], // {id, sel, ok}
    started: Date.now(),
  };
  save();
  go('quiz', { key });
}

/* ---------- quiz ---------- */

function renderQuiz() {
  const at = S.current[view.key];
  if (!at) { go('home'); return; }
  if (at.answers.length >= at.qids.length) { finishAttempt(view.key); return; }

  const idx = at.answers.length; // primera sin responder
  // ¿reveal pendiente? (respondida pero aún sin pasar a la siguiente)
  const revealed = view.revealIdx === idx - 1 && idx > 0;
  const qIdx = revealed ? idx - 1 : idx;
  const q = QBY[at.qids[qIdx]];
  const ans = revealed ? at.answers[qIdx] : null;
  const nOk = at.answers.filter(a => a.ok).length;
  const nKo = at.answers.length - nOk;
  const isLast = qIdx === at.qids.length - 1;
  const inReview = S.review.includes(q.id);

  let answersHtml = '';
  for (const val of [true, false]) {
    const letter = val ? 'A' : 'B';
    const label = val ? 'TRUE' : 'FALSE';
    let cls = 'answer', mark = '';
    if (ans) {
      if (val === q.a) { cls += ' good'; mark = '<span class="mark">✓</span>'; }
      else if (val === ans.sel) { cls += ' bad'; mark = '<span class="mark">✕</span>'; }
      else cls += ' dim';
    }
    answersHtml += `<button class="${cls}" data-val="${val}" ${ans ? 'disabled' : ''}>
      <span class="badge">${letter}</span>${label}${mark}</button>`;
  }

  let html = `<div class="screen-fill">
    <div class="quiz-top">
      <span class="quiz-meta">${esc(at.label)} · ${qIdx + 1} de ${at.qids.length}</span>
      <span class="quiz-score"><span class="ok">✓ ${nOk}</span><span class="ko">✕ ${nKo}</span></span>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${(at.answers.length / at.qids.length) * 100}%"></div></div>
    <div class="q-block">${qText(q)}</div>
    ${answersHtml}`;

  if (ans) {
    html += `<div class="verdict ${ans.ok ? 'ok' : 'ko'}">${ans.ok ? 'Correcto' : 'Incorrecto'}</div>
      <button class="review-toggle${inReview ? ' on' : ''}" data-act="toggle-review">
        ${STAR}<span>${inReview ? 'En repaso — tocar para quitar' : 'Añadir a repaso'}</span>
      </button>
      <button class="btn btn-dark" data-act="next">${isLast ? 'Ver resultado' : 'Siguiente pregunta'}</button>`;
  }
  html += '</div>';
  main.appendChild(h(html));

  if (!ans) {
    main.querySelectorAll('.answer').forEach(el => {
      el.addEventListener('click', () => {
        const sel = el.dataset.val === 'true';
        const ok = sel === q.a;
        at.answers.push({ id: q.id, sel, ok });
        const st = S.qstats[q.id] || [0, 0];
        st[ok ? 0 : 1]++;
        S.qstats[q.id] = st;
        save();
        view.revealIdx = qIdx;
        render();
      });
    });
  } else {
    main.querySelector('[data-act="toggle-review"]').addEventListener('click', () => {
      toggleReview(q.id);
      render();
    });
    main.querySelector('[data-act="next"]').addEventListener('click', () => {
      delete view.revealIdx;
      if (at.answers.length >= at.qids.length) finishAttempt(view.key);
      else render();
      window.scrollTo(0, 0);
    });
  }
}

function toggleReview(id) {
  const i = S.review.indexOf(id);
  if (i >= 0) S.review.splice(i, 1);
  else S.review.push(id);
  save();
}

function finishAttempt(key) {
  const at = S.current[key];
  if (!at) { go('home'); return; }
  const nOk = at.answers.filter(a => a.ok).length;
  const rec = {
    key,
    label: at.label,
    ts: Date.now(),
    total: at.qids.length,
    ok: nOk,
    failed: at.answers.filter(a => !a.ok).map(a => a.id),
  };
  S.attempts.unshift(rec);
  if (S.attempts.length > 100) S.attempts.length = 100;
  delete S.current[key];
  save();
  go('result', { rec });
}

/* ---------- modo coche (voz) ---------- */

const CAR_ICON = '<svg class="inline-ico" viewBox="0 0 24 24"><path d="M5 12 6.5 7.2A1.8 1.8 0 0 1 8.2 6h7.6a1.8 1.8 0 0 1 1.7 1.2L19 12"/><path d="M4.5 12h15a1.5 1.5 0 0 1 1.5 1.5V17h-2.5M3 17V13.5A1.5 1.5 0 0 1 4.5 12M8.5 17h7"/><circle cx="6.7" cy="17" r="1.8"/><circle cx="17.3" cy="17" r="1.8"/></svg>';

const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition || null;

let car = null; // sesión de voz activa

function startCar(key) {
  if (!('speechSynthesis' in window)) { toast('Este navegador no puede leer en voz alta'); return; }
  car = { key, phase: 'speaking', timers: [], rec: null, lastQid: null, podcast: !SRClass, pIdx: null };
  if (car.podcast) {
    const at = S.current[key];
    car.pIdx = at ? at.answers.length : 0;
  }
  requestWake();
  go('car', { key });
  carNext();
}

async function requestWake() {
  try {
    if (car && navigator.wakeLock) car.wake = await navigator.wakeLock.request('screen');
  } catch (e) { /* sin wake lock: la pantalla puede apagarse */ }
}
document.addEventListener('visibilitychange', () => {
  if (car && document.visibilityState === 'visible') requestWake();
});

function carTimer(fn, ms) {
  if (!car) return;
  car.timers.push(setTimeout(() => { if (car) fn(); }, ms));
}

function speak(text, cb) {
  const lang = S.settings.voice;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'en' ? 'en-GB' : 'es-ES';
  u.rate = 1.05;
  let done = false;
  const fin = () => { if (!done) { done = true; if (cb) cb(); } };
  u.onend = fin;
  u.onerror = fin;
  speechSynthesis.speak(u);
  // iOS a veces se traga onend: temporizador de seguridad proporcional al texto
  if (cb) carTimer(fin, Math.max(4000, text.length * 110) + 1500);
}

function carIdx() {
  const at = S.current[car.key];
  if (!at) return null;
  const idx = car.podcast ? car.pIdx : at.answers.length;
  return idx < at.qids.length ? idx : null;
}

function carNext() {
  if (!car) return;
  const at = S.current[car.key];
  const idx = at ? carIdx() : null;
  if (idx === null) { carFinish(); return; }
  car.q = QBY[at.qids[idx]];
  car.phase = 'speaking';
  renderIfCar();
  speechSynthesis.cancel();
  const q = car.q;
  const text = S.settings.voice === 'en' ? q.en : (q.es || q.en);
  speak(text, () => {
    if (!car) return;
    if (car.podcast) {
      car.phase = 'wait';
      renderIfCar();
      carTimer(() => carRevealPodcast(), 4000);
    } else {
      carListen();
    }
  });
}

function carRevealPodcast() {
  if (!car) return;
  const q = car.q;
  car.phase = q.a ? 'ok' : 'ko'; // solo para el color del estado
  renderIfCar();
  const lang = S.settings.voice;
  speak(q.a ? (lang === 'en' ? 'True' : 'Verdadero') : (lang === 'en' ? 'False' : 'Falso'), () => {
    if (!car) return;
    car.pIdx++;
    carTimer(() => carNext(), 900);
  });
}

function parseVoice(t) {
  t = ' ' + t.toLowerCase() + ' ';
  if (/verdadero|verdad|cierto| true | tru | sí | si /.test(t)) return { type: 'answer', val: true };
  if (/falso| false | fols |mentira/.test(t)) return { type: 'answer', val: false };
  if (/repaso|marcar|márcala/.test(t)) return { type: 'review' };
  if (/repetir|repite|otra vez/.test(t)) return { type: 'repeat' };
  if (/salir|terminar|acabar/.test(t)) return { type: 'exit' };
  return null;
}

function carListen() {
  if (!car) return;
  car.phase = 'listening';
  renderIfCar();
  let rec;
  try { rec = new SRClass(); } catch (e) { carToPodcast(); return; }
  car.rec = rec;
  rec.lang = 'es-ES';
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  let handled = false;
  rec.onresult = (e) => {
    if (handled || !car) return;
    let txt = '';
    for (const res of e.results) txt += ' ' + res[0].transcript;
    const cmd = parseVoice(txt);
    if (cmd) {
      handled = true;
      try { rec.abort(); } catch (err) {}
      carCommand(cmd);
    }
  };
  rec.onerror = (e) => {
    if (handled || !car) return;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
      handled = true;
      carToPodcast();
    }
    // 'no-speech' y demás: onend relanza la escucha
  };
  rec.onend = () => {
    if (!car || handled || car.phase !== 'listening') return;
    carTimer(() => { if (car && car.phase === 'listening') carListen(); }, 300);
  };
  try { rec.start(); } catch (e) { carToPodcast(); }
}

function carToPodcast() {
  if (!car) return;
  toast('Micrófono no disponible: modo escucha');
  car.podcast = true;
  const at = S.current[car.key];
  car.pIdx = at ? at.answers.length : 0;
  car.phase = 'wait';
  renderIfCar();
  carTimer(() => carRevealPodcast(), 2500);
}

function carCommand(cmd) {
  if (!car) return;
  if (cmd.type === 'exit') { carExitSpoken(); return; }
  if (cmd.type === 'repeat') { carNext(); return; }
  if (cmd.type === 'review') {
    const target = car.lastQid || (car.q && car.q.id);
    if (target && !S.review.includes(target)) { S.review.push(target); save(); }
    renderIfCar();
    speak(S.settings.voice === 'en' ? 'Added to review' : 'Añadida a repaso', () => { if (car) carListen(); });
    return;
  }
  if (cmd.type === 'answer') carAnswer(cmd.val);
}

function carAnswer(sel) {
  if (!car) return;
  const at = S.current[car.key];
  const idx = at ? carIdx() : null;
  if (idx === null) { carFinish(); return; }
  const q = QBY[at.qids[idx]];
  const ok = sel === q.a;
  at.answers.push({ id: q.id, sel, ok });
  const st = S.qstats[q.id] || [0, 0];
  st[ok ? 0 : 1]++;
  S.qstats[q.id] = st;
  save();
  car.lastQid = q.id;
  car.phase = ok ? 'ok' : 'ko';
  renderIfCar();
  const lang = S.settings.voice;
  const valTxt = v => (lang === 'en' ? (v ? 'true' : 'false') : (v ? 'verdadero' : 'falso'));
  const fb = ok
    ? (lang === 'en' ? 'Correct' : 'Correcto')
    : (lang === 'en' ? `Wrong. It was ${valTxt(q.a)}` : `Incorrecto. Era ${valTxt(q.a)}`);
  speak(fb, () => { if (car) carTimer(() => carNext(), 400); });
}

function carExitSpoken() {
  const lang = S.settings.voice;
  const key = car.key;
  const at = S.current[key];
  let msg = lang === 'en' ? 'Okay, stopping.' : 'Vale, lo dejamos aquí.';
  if (at && at.answers.length) {
    const nOk = at.answers.filter(a => a.ok).length;
    msg += lang === 'en' ? ` ${nOk} of ${at.answers.length} correct so far.` : ` Llevas ${nOk} de ${at.answers.length} bien.`;
  }
  if (car.rec) { try { car.rec.onend = null; car.rec.abort(); } catch (e) {} }
  car.rec = null;
  speak(msg, null);
  carTimer(() => carExit(), 4000);
  car.phase = 'bye';
  renderIfCar();
}

function carFinish() {
  if (!car) return;
  const key = car.key;
  const at = S.current[key];
  const lang = S.settings.voice;
  const podcast = car.podcast;
  carCleanup();
  if (at && !podcast) {
    const nOk = at.answers.filter(a => a.ok).length;
    speak(lang === 'en' ? `Finished. ${nOk} out of ${at.qids.length} correct.` : `Terminado. ${nOk} de ${at.qids.length} correctas.`, null);
    finishAttempt(key);
  } else {
    if (podcast) speak(lang === 'en' ? 'End of questions.' : 'Fin de las preguntas.', null);
    go('start', { mod: key === 'review' ? 'kata' : key });
  }
}

function carExit() {
  const key = car ? car.key : null;
  carCleanup();
  if (key === 'review') go('review');
  else if (key) go('start', { mod: key });
  else go('home');
}

function carCleanup() {
  if (!car) return;
  car.timers.forEach(clearTimeout);
  if (car.rec) { try { car.rec.onend = null; car.rec.onresult = null; car.rec.abort(); } catch (e) {} }
  try { speechSynthesis.cancel(); } catch (e) {}
  if (car.wake) { try { car.wake.release(); } catch (e) {} }
  car = null;
}

function renderIfCar() {
  if (view.screen === 'car') render();
}

const CAR_STATUS = {
  speaking: { cls: 'speaking', label: 'Leyendo la pregunta…', ico: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z"/><path d="M16 9a4.2 4.2 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/></svg>' },
  listening: { cls: 'listening', label: '¿Verdadero o falso?', ico: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v3"/></svg>' },
  wait: { cls: 'speaking', label: 'Piensa la respuesta…', ico: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>' },
  ok: { cls: 'ok', label: 'Correcto', ico: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' },
  ko: { cls: 'ko', label: 'Incorrecto', ico: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>' },
  bye: { cls: 'speaking', label: 'Hasta luego', ico: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z"/><path d="M16 9a4.2 4.2 0 0 1 0 6"/></svg>' },
};

function renderCar() {
  if (!car) { go('home'); return; }
  const at = S.current[car.key];
  const idx = at ? (car.podcast ? car.pIdx : at.answers.length) : 0;
  const total = at ? at.qids.length : 0;
  const nOk = at ? at.answers.filter(a => a.ok).length : 0;
  const nKo = at ? at.answers.length - nOk : 0;
  const q = car.q;
  const st = CAR_STATUS[car.phase === 'ko' && car.podcast ? 'ko' : car.phase] || CAR_STATUS.speaking;
  const stLabel = car.podcast && (car.phase === 'ok' || car.phase === 'ko') ? (q && q.a ? 'Verdadero' : 'Falso') : st.label;
  const lang = S.settings.voice;

  const html = `<div class="screen-fill car">
    <div class="quiz-top">
      <span class="quiz-meta">${at ? esc(at.label) : ''} · ${Math.min(idx + 1, total)} de ${total}</span>
      ${car.podcast ? '<span class="chip">modo escucha</span>' : `<span class="quiz-score"><span class="ok">✓ ${nOk}</span><span class="ko">✕ ${nKo}</span></span>`}
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${total ? (idx / total) * 100 : 0}%"></div></div>

    <div class="car-status ${st.cls}">
      <div class="car-circle">${st.ico}</div>
      <div class="car-label">${stLabel}</div>
    </div>

    <div class="car-q">${q ? esc(lang === 'en' ? q.en : (q.es || q.en)) : ''}</div>

    <div class="seg car-lang">
      <button data-voice="es" class="${lang === 'es' ? 'sel' : ''}">Voz: Español</button>
      <button data-voice="en" class="${lang === 'en' ? 'sel' : ''}">Voice: English</button>
    </div>

    ${car.podcast ? '' : `<p class="car-hint">Di <b>«verdadero»</b> o <b>«falso»</b> · «repaso» marca la última respondida · «repetir» · «salir»</p>
    <div class="row car-btns">
      <button class="btn car-true" data-val="true">TRUE</button>
      <button class="btn car-false" data-val="false">FALSE</button>
    </div>`}
    <button class="btn btn-ghost" data-act="exit">Salir del modo coche</button>
  </div>`;
  main.appendChild(h(html));

  main.querySelectorAll('[data-voice]').forEach(el => {
    el.addEventListener('click', () => {
      S.settings.voice = el.dataset.voice;
      save();
      render();
    });
  });
  main.querySelectorAll('.car-btns .btn').forEach(el => {
    el.addEventListener('click', () => {
      if (!car || (car.phase !== 'listening' && car.phase !== 'speaking')) return;
      if (car.rec) { try { car.rec.onend = null; car.rec.abort(); } catch (e) {} }
      speechSynthesis.cancel();
      carAnswer(el.dataset.val === 'true');
    });
  });
  main.querySelector('[data-act="exit"]').addEventListener('click', () => carExit());
}

/* ---------- resultado ---------- */

function renderResult() {
  const rec = view.rec;
  if (!rec) { go('home'); return; }
  const pct = Math.round((rec.ok / rec.total) * 100);
  const nKo = rec.total - rec.ok;
  const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--orange)' : 'var(--red)';
  const C = 2 * Math.PI * 62;

  let html = `<div class="screen-fill">
    <div class="result-hero">
      <div class="result-ring">
        <svg viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="62" fill="none" stroke="var(--card)" stroke-width="11"/>
          <circle cx="70" cy="70" r="62" fill="none" stroke="${color}" stroke-width="11"
            stroke-linecap="round" stroke-dasharray="${(pct / 100) * C} ${C}"/>
        </svg>
        <div class="pct">${pct}%<small>${esc(rec.label)}</small></div>
      </div>
      <div class="result-counts">
        <span class="rc ok">✓ ${rec.ok} bien</span>
        <span class="rc ko">✕ ${nKo} mal</span>
      </div>
    </div>`;

  if (rec.failed.length) {
    html += `<h2>Falladas (${rec.failed.length})</h2><div class="card">`;
    for (const id of rec.failed) {
      const q = QBY[id];
      if (!q) continue;
      const on = S.review.includes(id);
      html += `<div class="fail-item"><div class="fail-row">
        <button class="star-btn${on ? ' on' : ''}" data-id="${id}" aria-label="repaso">${STAR}</button>
        <div>
          <div class="fail-q">${esc(shortText(q))}</div>
          <div class="fail-a">Correcta: ${q.a ? 'TRUE' : 'FALSE'}</div>
        </div>
      </div></div>`;
    }
    html += `</div>
      <button class="btn" data-act="retry-failed">Repetir las falladas (${rec.failed.length})</button>`;
  }

  html += `<div style="flex:1"></div>
    <button class="btn btn-primary" data-act="home">Volver al inicio</button>
  </div>`;
  main.appendChild(h(html));

  main.querySelectorAll('.star-btn').forEach(el => {
    el.addEventListener('click', () => {
      toggleReview(el.dataset.id);
      el.classList.toggle('on');
    });
  });
  const rf = main.querySelector('[data-act="retry-failed"]');
  if (rf) rf.addEventListener('click', () => {
    const key = rec.key === 'review' ? 'review' : rec.key;
    if (S.current[key] && !confirm('Tienes un intento en curso de este tipo. ¿Descartarlo?')) return;
    startAttempt(key, shuffle(rec.failed.slice()), rec.label);
  });
  main.querySelector('[data-act="home"]').addEventListener('click', () => go('home'));
}

/* ---------- repaso ---------- */

function renderReview() {
  const filter = view.filter || 'all';
  const ids = S.review.filter(id => QBY[id] && (filter === 'all' || QBY[id].m === filter));
  const counts = {
    all: S.review.filter(id => QBY[id]).length,
    kata: S.review.filter(id => QBY[id] && QBY[id].m === 'kata').length,
    kumite: S.review.filter(id => QBY[id] && QBY[id].m === 'kumite').length,
  };
  const cur = S.current.review;

  let html = `<div class="screen-fill">
    <h1>Repaso</h1>
    <p class="subtitle">Preguntas que has marcado como complicadas</p>
    <div class="seg">
      <button data-f="all" class="${filter === 'all' ? 'sel' : ''}">Todas (${counts.all})</button>
      <button data-f="kata" class="${filter === 'kata' ? 'sel' : ''}">Kata (${counts.kata})</button>
      <button data-f="kumite" class="${filter === 'kumite' ? 'sel' : ''}">Kumite (${counts.kumite})</button>
    </div>`;

  if (cur) {
    html += `<div class="card">
      <div style="font-weight:700;margin-bottom:10px">Práctica de repaso en curso · ${cur.answers.length}/${cur.qids.length}</div>
      <button class="btn btn-primary" data-act="resume-review">Continuar</button>
    </div>`;
  }

  if (!ids.length) {
    html += `<div class="empty">Nada por aquí todavía.<br>Cuando respondas una pregunta podrás añadirla a repaso.</div>`;
  } else {
    html += '<div class="card">';
    for (const id of ids) {
      const q = QBY[id];
      html += `<div class="rev-item">
        <span class="rev-mod ${q.m}">${q.m.toUpperCase()}</span>
        <div class="rev-q">${esc(shortText(q))}</div>
        <button class="rev-del" data-id="${id}" aria-label="quitar">${CROSS}</button>
      </div>`;
    }
    html += '</div>';
  }

  html += `<div style="flex:1"></div>`;
  if (ids.length) {
    html += `<button class="btn btn-primary" data-act="practice">Practicar ${filter === 'all' ? 'todas' : MODULES[filter].label} (${ids.length})</button>`;
  }
  html += '</div>';
  main.appendChild(h(html));

  main.querySelectorAll('.seg button').forEach(el => {
    el.addEventListener('click', () => { view.filter = el.dataset.f; render(); });
  });
  main.querySelectorAll('.rev-del').forEach(el => {
    el.addEventListener('click', () => { toggleReview(el.dataset.id); render(); });
  });
  const pr = main.querySelector('[data-act="practice"]');
  if (pr) pr.addEventListener('click', () => {
    if (S.current.review && !confirm('Tienes una práctica de repaso en curso. ¿Descartarla?')) return;
    startAttempt('review', shuffle(ids.slice()), 'Repaso');
  });
  const rr = main.querySelector('[data-act="resume-review"]');
  if (rr) rr.addEventListener('click', () => go('quiz', { key: 'review' }));
}

/* ---------- stats ---------- */

function renderStats() {
  let html = `<div class="screen-fill">
    <h1>Stats</h1>
    <p class="subtitle">Tu progreso hacia el examen</p>
    <div class="stat-grid">`;

  for (const mod of ['kata', 'kumite']) {
    const acc = accuracy(mod);
    const seen = BANK[mod].filter(q => S.qstats[q.id]).length;
    html += `<div class="stat-tile">
      <div class="t">${MODULES[mod].label}</div>
      <div class="v${acc === null ? ' na' : ''}">${acc === null ? '—' : acc + '%'}</div>
      <div class="s">${seen}/${BANK[mod].length} preguntas vistas</div>
    </div>`;
  }
  html += '</div>';

  if (S.attempts.length) {
    html += `<h2>Intentos (${S.attempts.length})</h2><div class="card">`;
    for (const a of S.attempts.slice(0, 30)) {
      const pct = Math.round((a.ok / a.total) * 100);
      const cls = pct >= 80 ? 'g' : pct >= 60 ? 'o' : 'r';
      const d = new Date(a.ts);
      const date = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' · ' +
        d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      html += `<div class="hist-item">
        <div class="hist-info">
          <div class="hist-title">${esc(a.label)} · ${a.ok}/${a.total}</div>
          <div class="hist-sub">${date}</div>
        </div>
        <div class="hist-score ${cls}">${pct}%</div>
      </div>`;
    }
    html += '</div>';
  } else {
    html += '<div class="empty">Aún no has terminado ningún intento.</div>';
  }
  html += '</div>';
  main.appendChild(h(html));
}

/* ---------- ajustes ---------- */

function renderSettings() {
  const lang = S.settings.lang;
  let html = `<div class="screen-fill">
    <h1>Ajustes</h1>
    <p class="subtitle">Exam Trainer</p>

    <div class="set-label">IDIOMA DE LAS PREGUNTAS</div>
    <div class="seg">
      <button data-lang="both" class="${lang === 'both' ? 'sel' : ''}">Bilingüe</button>
      <button data-lang="en" class="${lang === 'en' ? 'sel' : ''}">English</button>
      <button data-lang="es" class="${lang === 'es' ? 'sel' : ''}">Español</button>
    </div>

    <div class="set-label">VOZ DEL MODO COCHE</div>
    <div class="seg">
      <button data-voice="es" class="${S.settings.voice === 'es' ? 'sel' : ''}">Español</button>
      <button data-voice="en" class="${S.settings.voice === 'en' ? 'sel' : ''}">English</button>
    </div>
    <p class="note">El modo coche lee las preguntas en voz alta y escucha tu respuesta («verdadero» / «falso»).
    Leer funciona sin conexión; escuchar necesita internet (datos móviles).</p>

    <div class="set-label">COPIA DE SEGURIDAD</div>
    <button class="btn" data-act="export">Copiar copia de seguridad</button>
    <button class="btn" data-act="import">Importar copia de seguridad</button>
    <div id="import-zone" style="display:none;margin-top:10px">
      <textarea class="backup" placeholder="Pega aquí la copia de seguridad…"></textarea>
      <button class="btn btn-primary" data-act="do-import" style="margin-top:10px">Restaurar</button>
    </div>
    <p class="note">Guarda tus intentos, estadísticas y lista de repaso. iOS puede borrar los datos de las
    web apps que no se usan durante mucho tiempo: exporta una copia de vez en cuando.</p>

    <div class="set-label">DATOS</div>
    <button class="btn btn-danger" data-act="wipe">Borrar todos los datos</button>

    <div style="flex:1"></div>
    <p class="note" style="text-align:center">Kracademy Exam Trainer · ${QUESTIONS.length} preguntas · WKF Jul 2026</p>
  </div>`;
  main.appendChild(h(html));

  main.querySelectorAll('[data-lang]').forEach(el => {
    el.addEventListener('click', () => {
      S.settings.lang = el.dataset.lang;
      save();
      render();
    });
  });

  main.querySelectorAll('[data-voice]').forEach(el => {
    el.addEventListener('click', () => {
      S.settings.voice = el.dataset.voice;
      save();
      render();
    });
  });

  main.querySelector('[data-act="export"]').addEventListener('click', async () => {
    const data = JSON.stringify(S);
    try {
      await navigator.clipboard.writeText(data);
      toast('Copia de seguridad copiada al portapapeles');
    } catch (e) {
      const zone = $('#import-zone');
      zone.style.display = 'block';
      zone.querySelector('textarea').value = data;
      toast('Copia mostrada abajo: selecciónala y cópiala');
    }
  });

  main.querySelector('[data-act="import"]').addEventListener('click', () => {
    const zone = $('#import-zone');
    zone.style.display = zone.style.display === 'none' ? 'block' : 'none';
  });

  main.querySelector('[data-act="do-import"]').addEventListener('click', () => {
    const txt = $('#import-zone textarea').value.trim();
    if (!txt) return;
    try {
      const parsed = JSON.parse(txt);
      if (!parsed || typeof parsed !== 'object' || !parsed.settings) throw new Error('formato');
      S = Object.assign(defaultState(), parsed);
      save();
      toast('Copia restaurada');
      go('home');
    } catch (e) {
      toast('No se pudo leer la copia de seguridad');
    }
  });

  main.querySelector('[data-act="wipe"]').addEventListener('click', () => {
    if (!confirm('¿Borrar TODOS los datos (intentos, estadísticas y repaso)?')) return;
    S = defaultState();
    save();
    toast('Datos borrados');
    go('home');
  });
}

/* ---------- arranque ---------- */

render();
