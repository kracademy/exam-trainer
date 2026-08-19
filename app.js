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
    settings: { lang: 'both' }, // both | en | es
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
      s.settings = Object.assign({ lang: 'both' }, s.settings);
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
  main.querySelector('[data-act="back"]').addEventListener('click', () => go('home'));
  const res = main.querySelector('[data-act="resume"]');
  if (res) res.addEventListener('click', () => go('quiz', { key: mod }));
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
