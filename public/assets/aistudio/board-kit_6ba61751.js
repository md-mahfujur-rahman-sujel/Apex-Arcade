/* board-kit.js — shared page shell, sound and helpers for the Apex Arcade board games.
   Board.shell({id,title,subtitle,rules,controls}) builds the page and returns {main}. Keep next to the game files. */
(function () {
  'use strict';
  const B = (window.Board = {});
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  B.ls = ls;
  B.rand = (n) => Math.floor(Math.random() * n);
  B.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  B.shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = B.rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- sound ---------- */
  let ctx = null, muted = ls.get('apex:mute') === '1';
  const tone = (f, d, type, v, delay, to) => {
    const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(v || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.02);
  };
  B.sfx = (n) => {
    if (muted) return;
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { return; }
    switch (n) {
      case 'click': tone(660, 0.05, 'triangle', 0.05); break;
      case 'move': tone(300, 0.08, 'sine', 0.09); tone(220, 0.08, 'sine', 0.05, 0.03); break;
      case 'capture': tone(200, 0.16, 'square', 0.07, 0, 60); tone(120, 0.12, 'sawtooth', 0.05, 0.02); break;
      case 'check': tone(880, 0.1, 'triangle', 0.08); tone(880, 0.1, 'triangle', 0.08, 0.14); break;
      case 'step': tone(520, 0.04, 'square', 0.03); break;
      case 'dice': for (let i = 0; i < 6; i++) tone(300 + B.rand(300), 0.04, 'square', 0.035, i * 0.05); break;
      case 'ladder': tone(300, 0.4, 'triangle', 0.08, 0, 900); break;
      case 'snake': tone(600, 0.5, 'sawtooth', 0.06, 0, 90); break;
      case 'error': tone(130, 0.15, 'square', 0.06); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, i * 0.12)); break;
      case 'lose': [400, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, i * 0.14)); break;
      default: tone(440, 0.06, 'sine', 0.05);
    }
  };
  B.muted = () => muted;

  /* ---------- computer pacing ---------- */
  const PACE = { slow: 1.8, normal: 1, fast: 0.45 };
  B.speed = () => (PACE[ls.get('apex:cpu')] ? ls.get('apex:cpu') : 'normal');
  B.pace = (ms) => Math.round(ms * PACE[B.speed()]);
  /* Run fn (the computer's search) and resolve with its result only after a visible "thinking" pause. */
  B.think = (fn, min) => new Promise((resolve) => {
    const t0 = Date.now(), bars = document.querySelectorAll('.bk-status');
    bars.forEach((b) => b.classList.add('think'));
    setTimeout(() => {
      let r; try { r = fn(); } catch (e) { console.error(e); }
      const wait = Math.max(0, B.pace(min == null ? 1000 : min) + B.rand(260) - (Date.now() - t0));
      setTimeout(() => { bars.forEach((b) => b.classList.remove('think')); resolve(r); }, wait);
    }, 40);
  });
  /* Glide a copy of the piece inside fromEl across one or more target elements (cb(i) fires after each stop). */
  B.glide = async (fromEl, to, ms, sel, cb) => {
    const pc = fromEl && fromEl.querySelector(sel || '.pc'), stops = [].concat(to).filter(Boolean);
    if (!pc || !stops.length) return;
    const a = pc.getBoundingClientRect(), cs = getComputedStyle(pc), d = B.pace(ms || 450), cl = pc.cloneNode(true);
    cl.style.cssText = `position:fixed;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;margin:0;z-index:60;pointer-events:none;font-size:${cs.fontSize};transition:transform ${d}ms cubic-bezier(.45,.05,.25,1);will-change:transform;`;
    document.body.appendChild(cl); pc.style.visibility = 'hidden'; void cl.offsetWidth;
    for (let i = 0; i < stops.length; i++) {
      const b = stops[i].getBoundingClientRect();
      cl.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px,${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(1.1)`;
      await B.sleep(d + 40); if (cb) cb(i);
    }
    cl.remove(); pc.style.visibility = '';
  };

  /* ---------- styles ---------- */
  const CSS = `
:root{--bg:#090a10;--panel:#151926;--line:rgba(255,255,255,.1);--text:#e6e9f5;--muted:#8b93b3;--cyan:#06b6d4;--emerald:#10b981;--amber:#f59e0b}
*{box-sizing:border-box}
body{margin:0;font:15px "Segoe UI",system-ui,-apple-system,Roboto,sans-serif;color:var(--text);min-height:100vh;background:radial-gradient(1000px 500px at 10% -10%,#16213f,transparent 60%),radial-gradient(800px 500px at 100% 0,#2a1646,transparent 55%),#090a10}
.bk-wrap{max-width:1100px;margin:0 auto;padding:18px 18px 50px}
.bk-top{display:flex;gap:8px;align-items:center;margin-bottom:4px}
.bk-back{color:var(--cyan);text-decoration:none;font-weight:600}
.bk-grow{flex:1}
.bk-title{margin:6px 0 2px;font-size:clamp(28px,5vw,42px);letter-spacing:-.02em}
.bk-sub{margin:0 0 14px;color:var(--muted)}
.bk-btn{appearance:none;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--text);border-radius:10px;padding:8px 14px;font-weight:600;font-size:14px;font-family:inherit;cursor:pointer}
.bk-btn:hover{border-color:rgba(255,255,255,.3)}
.bk-btn:disabled{opacity:.45;cursor:not-allowed}
.bk-primary{background:var(--cyan);border-color:var(--cyan);color:#04121a}
.bk-select{background:var(--panel);border:1px solid var(--line);color:var(--text);border-radius:9px;padding:7px 10px;font:inherit}
.bk-help{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-bottom:16px}
.bk-help summary{cursor:pointer;font-weight:700}
.bk-help p{margin:10px 0 0;color:#b6bdd8;line-height:1.55}
.bk-keys{list-style:none;padding:0;margin:10px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:7px 18px}
.bk-keys span{color:#b6bdd8}
kbd{font:600 12px ui-monospace,Consolas,monospace;background:#0b0d16;border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;padding:2px 7px;margin-right:8px}
.bk-status{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-weight:700;min-height:48px}
.bk-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.bk-row label{color:var(--muted);font-size:13px;display:flex;gap:6px;align-items:center}
.bk-dlg{border:1px solid var(--line);border-radius:16px;background:var(--panel);color:var(--text);padding:22px 24px;min-width:min(380px,90vw)}
.bk-dlg::backdrop{background:rgba(4,5,10,.8);backdrop-filter:blur(4px)}
.bk-dlg h2{margin:0 0 8px}
.bk-end{margin-top:16px;justify-content:flex-end}
.bk-spd{display:flex;gap:6px;align-items:center;color:var(--muted);font-size:13px;margin-right:8px}
.bk-status.think{animation:bkp 1.1s ease-in-out infinite}
@keyframes bkp{50%{border-color:var(--cyan);box-shadow:0 0 0 1px var(--cyan)}}
`;

  B.shell = function (o) {
    document.title = o.title + ' — Apex Arcade';
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    document.body.innerHTML = `
<div class="bk-wrap">
  <div class="bk-top"><a class="bk-back" href="#" onclick="if(window.parent!==window){window.parent.postMessage({type:'CLOSE_THEATER'},'*');return false;}">← Apex Arcade</a><span class="bk-grow"></span>${o.cpu ? '<label class="bk-spd">Computer speed <select class="bk-select" id="bk-spd"><option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option></select></label>' : ''}<button class="bk-btn" id="bk-mute"></button></div>
  <h1 class="bk-title">${o.title}</h1><p class="bk-sub">${o.subtitle || ''}</p>
  <details class="bk-help" id="bk-help"><summary>How to play &amp; controls</summary><p>${o.rules || ''}</p>
    <ul class="bk-keys">${(o.controls || []).map(([k, a]) => `<li><kbd>${k}</kbd><span>${a}</span></li>`).join('')}</ul></details>
  <div id="bk-main"></div>
</div>`;
    const help = document.getElementById('bk-help'), mute = document.getElementById('bk-mute');
    const seenKey = 'apex:help:' + o.id;
    if (!ls.get(seenKey)) { help.open = true; ls.set(seenKey, '1'); }
    const paint = () => { mute.textContent = muted ? '🔇 Sound off' : '🔊 Sound on'; };
    const toggleMute = () => { muted = !muted; ls.set('apex:mute', muted ? '1' : '0'); paint(); };
    mute.addEventListener('click', toggleMute); paint();
    const spd = document.getElementById('bk-spd');
    try {
      const q = new URLSearchParams(window.location.search).get('diff');
      if (q === 'easy') ls.set('apex:cpu', 'slow');
      else if (q === 'hard') ls.set('apex:cpu', 'fast');
      else if (q === 'normal') ls.set('apex:cpu', 'normal');
    } catch (e) {}
    if (spd) { spd.value = B.speed(); spd.onchange = () => { ls.set('apex:cpu', spd.value); spd.blur(); }; }
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'SET_DIFFICULTY') {
        const d = e.data.difficulty;
        const spdVal = d === 'easy' ? 'slow' : d === 'hard' ? 'fast' : 'normal';
        ls.set('apex:cpu', spdVal);
        if (spd) spd.value = spdVal;
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'm' || e.key === 'M') toggleMute();
      else if (e.key === 'h' || e.key === 'H') help.open = !help.open;
    });
    return { main: document.getElementById('bk-main') };
  };

  B.modal = (title, body, buttons) => {
    let d = document.getElementById('bk-dlg');
    if (!d) { d = document.createElement('dialog'); d.id = 'bk-dlg'; d.className = 'bk-dlg'; document.body.appendChild(d); }
    d.innerHTML = `<h2>${title}</h2><div>${body || ''}</div><div class="bk-row bk-end"></div>`;
    const row = d.querySelector('.bk-end');
    (buttons || [['OK']]).forEach(([label, fn]) => {
      const b = document.createElement('button'); b.className = 'bk-btn bk-primary'; b.textContent = label;
      b.onclick = () => { d.close(); if (fn) fn(); }; row.appendChild(b);
    });
    if (!d.open) d.showModal();
  };
})();
