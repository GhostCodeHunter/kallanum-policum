// കള്ളനും പോലീസും — client
// The browser never gets other players' roles. It only shows what the server sends.
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const AVATARS = ['🧑','👩','👦','👧','🧔','👨‍🦱','👩‍🦱','🧑‍🦰','👱','👳','🧕','🧒'];
  const ROLE_INFO = {
    raja:{en:'Raja',ml:'രാജാവ്',emoji:'👑',points:1000},
    rani:{en:'Rani',ml:'റാണി',emoji:'👸',points:800},
    manthri:{en:'Manthri',ml:'മന്ത്രി',emoji:'🧙',points:700},
    police:{en:'Police',ml:'പോലീസ്',emoji:'👮',points:500},
    kallan:{en:'Kallan',ml:'കള്ളൻ',emoji:'🥷',points:0},
  };

  // ---------- identity (kept in this browser so a refresh rejoins) ----------
  let playerId = localStorage.getItem('kp_id');
  if (!playerId) {
    playerId = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
    localStorage.setItem('kp_id', playerId);
  }
  let avatar = parseInt(localStorage.getItem('kp_av') || '0', 10) || 0;
  $('#in-name').value = localStorage.getItem('kp_name') || '';

  const socket = io();
  let state = null, myRole = null, flipped = false, lastPhase = null, lastRound = 0, timerInt = null, prevScores = {};

  // ---------- background: stars + fireflies ----------
  const stars = $('.stars');
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('i'); s.className = 'star';
    s.style.left = Math.random()*100+'%'; s.style.top = Math.random()*55+'%';
    s.style.animationDelay = Math.random()*3+'s';
    stars.appendChild(s);
  }
  const flies = $('.fireflies');
  for (let i = 0; i < 16; i++) {
    const f = document.createElement('i'); f.className = 'fly';
    f.style.left = Math.random()*100+'%'; f.style.top = 55+Math.random()*40+'%';
    f.style.animationDelay = Math.random()*9+'s'; f.style.animationDuration = 7+Math.random()*6+'s';
    flies.appendChild(f);
  }

  // ---------- tiny sound effects (Web Audio, no files) ----------
  let actx;
  function beep(freq=520, dur=.08, type='triangle', vol=.08) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dur);
      o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
    } catch {}
  }
  const tune = notes => notes.forEach(([f,t,d]) => setTimeout(() => beep(f, d||.15, 'triangle', .1), t));
  const sfx = {
    click: () => beep(660,.06),
    reveal: () => tune([[523,0],[659,120],[784,240],[1047,360,.3]]),
    win: () => tune([[523,0],[659,150],[784,300],[1047,450],[784,600],[1047,750,.4]]),
    lose: () => tune([[400,0,.2],[300,200,.2],[200,400,.4]]),
    siren: () => tune([[880,0,.2],[660,220,.2],[880,440,.2],[660,660,.2]]),
  };

  // ---------- button ripple + click sound ----------
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn,.suspect.can,.round-btn,.icon-btn');
    if (!b || b.disabled) return;
    sfx.click();
    if (!b.classList.contains('btn') && !b.classList.contains('suspect')) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
    const sp = document.createElement('span'); sp.className = 'ripple';
    sp.style.width = sp.style.height = d+'px';
    sp.style.left = (e.clientX - r.left - d/2)+'px'; sp.style.top = (e.clientY - r.top - d/2)+'px';
    b.appendChild(sp); setTimeout(() => sp.remove(), 650);
  });

  // ---------- screens ----------
  let current = 's-home';
  function show(id) {
    if (current === id) return;
    const prev = document.getElementById(current);
    prev.classList.remove('active');
    current = id;
    const next = document.getElementById(id);
    next.classList.remove('active'); void next.offsetWidth; next.classList.add('active');
    window.scrollTo({top:0, behavior:'smooth'});
  }
  $$('[data-go]').forEach(b => b.addEventListener('click', () => {
    const go = b.dataset.go;
    if ((go === 'create' || go === 'join') && !nameOk()) return;
    show('s-' + go);
    if (go === 'join') setTimeout(() => $('#in-code').focus(), 300);
  }));

  function toast(msg, type='') {
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2600);
  }

  function nameOk() {
    const n = $('#in-name').value.trim();
    if (!n) { toast('ആദ്യം പേര് എഴുതൂ · Enter your name first', 'error'); $('#in-name').focus(); return false; }
    localStorage.setItem('kp_name', n);
    return true;
  }

  // avatars
  AVATARS.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = 'av' + (i === avatar ? ' sel' : ''); b.textContent = a; b.type = 'button';
    b.setAttribute('aria-label', 'Avatar ' + (i+1));
    b.onclick = () => { avatar = i; localStorage.setItem('kp_av', i); $$('.av').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); };
    $('#avatars').appendChild(b);
  });

  // rounds stepper
  let rounds = 5;
  const setRounds = v => { rounds = Math.min(20, Math.max(1, v)); const el = $('#r-val'); el.textContent = rounds; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); };
  $('#r-minus').onclick = () => setRounds(rounds - 1);
  $('#r-plus').onclick = () => setRounds(rounds + 1);

  // create / join
  $('#btn-create').onclick = () => {
    if (!nameOk()) return show('s-home');
    socket.emit('create_room', { playerId, name: $('#in-name').value, avatar, roomName: $('#in-room').value, rounds });
  };
  const doJoin = () => {
    if (!nameOk()) return show('s-home');
    const code = $('#in-code').value.trim().toUpperCase();
    if (code.length < 4) return toast('Enter the room code', 'error');
    socket.emit('join_room', { code, playerId, name: $('#in-name').value, avatar });
  };
  $('#btn-join').onclick = doJoin;
  $('#in-code').addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });

  // Join from shared link ?room=XXXXX
  const urlCode = new URLSearchParams(location.search).get('room');
  if (urlCode) $('#in-code').value = urlCode.toUpperCase();

  // Rejoin after refresh
  const saved = sessionStorage.getItem('kp_room');
  socket.on('connect', () => {
    const code = (state && state.code) || saved;
    if (code) socket.emit('join_room', { code, playerId, name: localStorage.getItem('kp_name') || 'Player', avatar });
  });

  socket.on('joined', ({ code }) => {
    sessionStorage.setItem('kp_room', code);
    history.replaceState(null, '', '?room=' + code);
  });
  socket.on('toast', ({ type, msg }) => {
    toast(msg, type);
    if (/not found|already started|full/i.test(msg)) { sessionStorage.removeItem('kp_room'); }
  });
  socket.on('your_role', role => {
    myRole = role;
  });
  socket.on('emoji', ({ from, emoji }) => {
    const p = state && state.players.find(x => x.id === from);
    const el = document.createElement('div'); el.className = 'float-emoji';
    el.innerHTML = emoji + '<small></small>';
    el.querySelector('small').textContent = p ? p.name : '';
    el.style.left = (10 + Math.random()*80) + 'vw';
    document.body.appendChild(el); setTimeout(() => el.remove(), 2500);
  });

  // leave / copy / share
  $('#btn-leave').onclick = leave;
  $('#btn-home').onclick = leave;
  function leave() {
    socket.emit('leave_room');
    state = null; myRole = null;
    sessionStorage.removeItem('kp_room');
    history.replaceState(null, '', location.pathname);
    $('#scorestrip').classList.add('hidden'); $('#reactions').classList.add('hidden');
    show('s-home');
  }
  $('#btn-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(state.code); toast('Code copied! ✓', 'ok'); } catch { toast(state.code); }
  };
  $('#btn-share').onclick = async () => {
    const url = location.origin + '/?room=' + state.code;
    const text = `കള്ളനും പോലീസും കളിക്കാൻ വാ! 🥷👮 Room: ${state.code}`;
    if (navigator.share) { try { await navigator.share({ title: 'Kallanum Policum', text, url }); } catch {} }
    else { try { await navigator.clipboard.writeText(text + ' ' + url); toast('Invite link copied! ✓', 'ok'); } catch {} }
  };

  // reveal + actions
  $('#flip').onclick = () => {
    if (!myRole || flipped) return;
    flipped = true; $('#flip').classList.add('open'); sfx.reveal();
    $('#btn-gotit').disabled = false;
    if (myRole.key === 'raja') setTimeout(() => confetti(80), 600);
  };
  $('#btn-gotit').onclick = () => { socket.emit('got_it'); $('#btn-gotit').disabled = true; $('#btn-gotit').textContent = 'Ready ✓'; };
  $('#btn-start').onclick = () => socket.emit('start_round');
  $('#btn-call').onclick = () => socket.emit('raja_call');
  $('#btn-next').onclick = () => socket.emit('next_round');
  $('#btn-again').onclick = () => socket.emit('play_again');

  // reactions bar
  ['😂','😱','🤔','👏','🔥','😎','🙏','😡'].forEach(e => {
    const b = document.createElement('button'); b.textContent = e; b.type = 'button';
    b.onclick = () => socket.emit('chat_emoji', { emoji: e });
    $('#reactions').appendChild(b);
  });

  // ---------- render ----------
  const me = () => state && state.players.find(p => p.id === playerId);
  const isHost = () => state && state.hostId === playerId;
  const av = p => AVATARS[p.avatar] || '🧑';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roundTxt = () => `Round ${state.round} / ${state.totalRounds}`;

  socket.on('state', s => {
    const phaseChanged = !state || s.phase !== state.phase || s.round !== lastRound;
    if (s.phase === 'reveal' && phaseChanged) { flipped = false; $('#flip').classList.remove('open'); }
    state = s;
    lastRound = s.round;
    $$('.room-code-txt').forEach(el => el.textContent = s.code);
    renderStrip();
    $('#reactions').classList.remove('hidden');
    clearInterval(timerInt);

    switch (s.phase) {
      case 'lobby': renderLobby(); show('s-lobby'); break;
      case 'assigning': show('s-assign'); break;
      case 'reveal': renderReveal(phaseChanged); show('s-reveal'); break;
      case 'raja': renderRaja(); show('s-raja'); if (phaseChanged) confetti(50); break;
      case 'police': renderPolice(); show('s-police'); if (phaseChanged) sfx.siren(); break;
      case 'result': renderResult(phaseChanged); show('s-result'); break;
      case 'final': renderResult(false); renderFinal(phaseChanged); show('s-final'); break;
    }
    lastPhase = s.phase;
  });

  function renderStrip() {
    const strip = $('#scorestrip');
    if (!state || state.phase === 'lobby') { strip.classList.add('hidden'); return; }
    strip.classList.remove('hidden');
    const sorted = [...state.players].sort((a,b) => b.score - a.score);
    strip.innerHTML = sorted.map(p => {
      const up = prevScores[p.id] !== undefined && prevScores[p.id] !== p.score;
      return `<div class="ss ${up?'up':''}"><span class="e">${av(p)}</span>${esc(p.name)}${p.id===playerId?' (You)':''} <b>${p.score}</b></div>`;
    }).join('');
    state.players.forEach(p => prevScores[p.id] = p.score);
  }

  function renderLobby() {
    const seats = $('#seats'); const old = seats.querySelectorAll('.seat.filled').length;
    let html = '';
    for (let i = 0; i < state.needed; i++) {
      const p = state.players[i];
      if (p) {
        html += `<div class="seat filled ${p.id===playerId?'me':''} ${p.connected?'':'off'}" style="${i<old?'animation:none':''}">
          <div class="bubble" style="${i<old?'animation:none':''}">${av(p)}${p.id===state.hostId?'<span class="crownmark" title="Host">⭐</span>':''}</div>
          <div class="nm">${esc(p.name)}${p.id===playerId?' (You)':''}</div></div>`;
      } else {
        html += `<div class="seat empty"><div class="bubble">＋</div><div class="nm">Player ${i+1}</div></div>`;
      }
    }
    seats.innerHTML = html;
    const left = state.needed - state.players.length;
    $('#lobby-sub').textContent = left > 0 ? `${left} more player${left>1?'s':''} needed · ${state.roomName}` : 'All here! Dealing chits…';
  }

  function renderReveal(fresh) {
    $('#reveal-round').textContent = roundTxt();
    if (myRole) {
      $('#my-emoji').textContent = myRole.emoji;
      $('#my-role').textContent = myRole.en;
      $('#my-role-ml').textContent = myRole.ml;
      $('#my-pts').textContent = myRole.points + ' pts';
    }
    const mine = me();
    if (fresh) { $('#btn-gotit').textContent = 'Got it! ✓'; }
    $('#btn-gotit').disabled = !flipped || (mine && mine.ready);
    if (mine && mine.ready) $('#btn-gotit').textContent = 'Ready ✓';
    $('#ready-list').innerHTML = state.players.map(p =>
      `<div class="chip ${p.ready?'ok':''}"><span class="e">${av(p)}</span>${esc(p.name)} ${p.ready?'✓':'…'}</div>`).join('');
    const allReady = state.players.every(p => p.ready);
    $('#btn-start').classList.toggle('hidden', !isHost());
    $('#btn-start').disabled = !allReady;
    $('#btn-start').classList.toggle('pulse', allReady);
    const host = state.players.find(p => p.id === state.hostId);
    $('#reveal-wait').textContent = allReady
      ? (isHost() ? 'Everyone is ready. Start the round!' : `Waiting for ${host ? host.name : 'host'} to start…`)
      : 'Waiting for everyone to see their chit…';
  }

  function renderRaja() {
    $('#raja-round').textContent = roundTxt();
    const raja = state.players.find(p => p.role === 'raja');
    const iAmRaja = raja && raja.id === playerId;
    $('#raja-title').textContent = iAmRaja ? 'നിങ്ങളാണ് രാജാവ്! 👑' : `${raja ? raja.name : ''} ആണ് രാജാവ്!`;
    $('#raja-sub').textContent = iAmRaja ? 'You are the Raja. Call your Police!' : 'The Raja has revealed. The Raja will now call the Police…';
    $('#btn-call').classList.toggle('hidden', !iAmRaja);
    $('#raja-wait').textContent = iAmRaja ? '' : 'Waiting for the Raja…';
  }

  function renderPolice() {
    $('#police-round').innerHTML = '👑 ' + roundTxt();
    const police = state.players.find(p => p.role === 'police');
    const iAmPolice = police && police.id === playerId;
    $('#police-speech').textContent = iAmPolice
      ? 'നിങ്ങളാണ് പോലീസ്! കള്ളനെ കണ്ടുപിടിക്കൂ!'
      : `${police ? police.name : ''} is the Police. Thinking…`;
    $('#police-q').textContent = iAmPolice ? 'Tap the one you think is the Kallan · കള്ളൻ ആര്?' : 'Who is the Kallan? · കള്ളൻ ആര്?';
    $('#suspects').innerHTML = state.players.map(p => {
      const known = p.role === 'raja' || p.role === 'police';
      const can = iAmPolice && !known;
      const tag = known ? ROLE_INFO[p.role].emoji + ' ' + ROLE_INFO[p.role].en : (can ? 'കള്ളൻ? 🥷' : (p.id===playerId ? 'You' : '?'));
      return `<button class="suspect ${can?'can':'locked'} ${known?'known':''}" data-id="${p.id}" ${can?'':'disabled'}>
        <span class="e">${av(p)}</span>${esc(p.name)}${p.id===playerId?' (You)':''}<span class="tag">${tag}</span></button>`;
    }).join('');
    $$('.suspect.can').forEach(b => b.onclick = () => {
      b.classList.add('picked');
      $$('.suspect.can').forEach(x => { x.disabled = true; x.classList.remove('can'); });
      setTimeout(() => socket.emit('police_guess', { targetId: b.dataset.id }), 450);
    });
    // countdown
    const tick = () => {
      const left = Math.max(0, Math.round((state.policeDeadline - Date.now())/1000));
      const t = $('#timer'); t.textContent = `⏱ 00:${String(left).padStart(2,'0')}`;
      t.classList.toggle('low', left <= 10);
      if (left <= 5 && left > 0) beep(900,.05,'square',.04);
    };
    tick(); timerInt = setInterval(tick, 1000);
  }

  function renderResult(fresh) {
    const r = state.lastResult; if (!r) return;
    const police = state.players.find(p => p.id === r.policeId);
    const kallan = state.players.find(p => p.id === r.kallanId);
    const guessed = state.players.find(p => p.id === r.guessedId);
    let title, line;
    if (r.correct) { title = 'Correct! · പിടിച്ചു!'; line = `${esc(police.name)} caught the Kallan ${esc(kallan.name)}! 🚔`; }
    else if (r.timedOut) { title = 'Time up! · സമയം കഴിഞ്ഞു'; line = `${esc(kallan.name)} the Kallan escaped! 🏃‍♂️💨`; }
    else { title = 'Wrong! · തെറ്റി!'; line = `${esc(police.name)} picked ${esc(guessed.name)}. The real Kallan was ${esc(kallan.name)}! 🥷`; }
    $('#verdict').innerHTML = `<div class="mark ${r.correct?'ok':'no'}">${r.correct?'✓':'✗'}</div>
      <div><h3 class="${r.correct?'ok':'no'}">${title}</h3><p>${line}</p></div>`;
    const order = ['raja','rani','manthri','police','kallan'];
    const ps = [...state.players].sort((a,b) => order.indexOf(a.role) - order.indexOf(b.role));
    $('#reveal-all').innerHTML = ps.map((p,i) => {
      const ri = ROLE_INFO[p.role]; const pts = r.awarded[p.id];
      return `<div class="mini ${p.role}"><div class="mini-in" style="animation-delay:${.3+i*.15}s">
        <div class="e">${ri.emoji}</div><div class="n">${esc(p.name)}</div><div class="r">${ri.ml}</div>
        <div class="p ${pts?'':'zero'}">+${pts}</div></div></div>`;
    }).join('');
    $('#btn-next').classList.toggle('hidden', !(isHost() && state.phase === 'result'));
    const host = state.players.find(p => p.id === state.hostId);
    $('#result-wait').textContent = isHost() ? '' : `Waiting for ${host ? host.name : 'host'} to deal the next round…`;
    if (fresh) {
      const myPts = r.awarded[playerId];
      if (myRole && ((myRole.key === 'police' && r.correct) || (myRole.key === 'kallan' && !r.correct))) { sfx.win(); confetti(160); }
      else if (myRole && ((myRole.key === 'police' && !r.correct) || (myRole.key === 'kallan' && r.correct))) sfx.lose();
      else { sfx.reveal(); if (r.correct) confetti(60); }
      if (myPts) toast(`+${myPts} points!`, 'ok');
    }
  }

  function renderFinal(fresh) {
    const sorted = [...state.players].sort((a,b) => b.score - a.score);
    const top = sorted[0];
    const tied = sorted.filter(p => p.score === top.score);
    $('#winner').innerHTML = `<div class="trophy">🏆</div>
      <div class="wn">${tied.map(p => esc(p.name)).join(' & ')}</div>
      <div class="sub">${tied.length>1?'Joint winners! · വിജയികൾ':'Winner! · വിജയി'} — ${top.score} pts</div>`;
    const ord = ['1st','2nd','3rd','4th','5th'];
    // show podium as 2nd,1st,3rd,4th,5th visually
    const vis = [sorted[1], sorted[0], sorted[2], sorted[3], sorted[4]].filter(Boolean);
    $('#podium').innerHTML = vis.map((p, i) => {
      const rank = sorted.indexOf(p);
      return `<div class="pod p${rank+1}" style="animation-delay:${[.3,.6,.15,0,0][i]}s">
        <div class="e">${av(p)}</div><div class="n">${esc(p.name)}</div><div class="s">${p.score} pts</div><div class="rk">${ord[rank]}</div></div>`;
    }).join('');
    $('#btn-again').classList.toggle('hidden', !isHost());
    if (fresh) { setTimeout(() => { sfx.win(); confetti(250); }, 500); }
  }

  // ---------- confetti ----------
  const cv = $('#confetti'), cx = cv.getContext('2d'); let parts = [], raf;
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; }; resize(); addEventListener('resize', resize);
  function confetti(n=120) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cols = ['#f4b62a','#ffd866','#1f8a3c','#d8342b','#6c3bd6','#ffffff','#5aa0ff'];
    for (let i = 0; i < n; i++) parts.push({
      x: innerWidth/2 + (Math.random()-.5)*200, y: innerHeight*.35,
      vx: (Math.random()-.5)*14, vy: -Math.random()*14-4, s: 5+Math.random()*7,
      c: cols[i%cols.length], r: Math.random()*6, vr: (Math.random()-.5)*.3, life: 0,
    });
    if (!raf) loop();
  }
  function loop() {
    cx.clearRect(0,0,cv.width,cv.height);
    parts.forEach(p => {
      p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      cx.save(); cx.translate(p.x,p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); cx.restore();
    });
    parts = parts.filter(p => p.y < cv.height + 20 && p.life < 400);
    raf = parts.length ? requestAnimationFrame(loop) : (cx.clearRect(0,0,cv.width,cv.height), null);
  }
})();
