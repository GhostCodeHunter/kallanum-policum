// കള്ളനും പോലീസും — client
// The browser never gets other players' roles. It only shows what the server sends.
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const AVATARS = Array.from({ length: CHARS.count }, (_, i) => CHARS.avatar(i));
  document.querySelectorAll('[data-char]').forEach(el => el.innerHTML = CHARS.role(el.dataset.char));
  document.querySelectorAll('[data-chibi]').forEach(el => el.innerHTML = CHARS.chibi);
  const ROLE_INFO = {
    raja:{en:'Raja',ml:'രാജാവ്',emoji:CHARS.role('raja'),points:1000},
    rani:{en:'Rani',ml:'റാണി',emoji:CHARS.role('rani'),points:800},
    manthri:{en:'Manthri',ml:'മന്ത്രി',emoji:CHARS.role('manthri'),points:700},
    police:{en:'Police',ml:'പോലീസ്',emoji:CHARS.role('police'),points:500},
    kallan:{en:'Kallan',ml:'കള്ളൻ',emoji:CHARS.role('kallan'),points:0},
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

  // ---------- AUDIO ENGINE (Web Audio, all generated, no files) ----------
  let actx, master, sfxBus, musicBus;
  let soundOn = localStorage.getItem('kp_sound') !== 'off';
  function ac() {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain(); master.gain.value = soundOn ? 1 : 0; master.connect(actx.destination);
      sfxBus = actx.createGain(); sfxBus.gain.value = .9; sfxBus.connect(master);
      musicBus = actx.createGain(); musicBus.gain.value = .32; musicBus.connect(master);
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur=.12, type='triangle', vol=.08, when=0, bus) {
    try {
      const c = ac(), t = c.currentTime + when;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(bus || sfxBus); o.start(t); o.stop(t + dur + .02);
    } catch {}
  }
  const beep = (f, d, type, v) => tone(f, d, type, v);
  function noise(dur=.1, vol=.1, when=0, hp=1000, bus) {
    try {
      const c = ac(), t = c.currentTime + when;
      const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(f).connect(g).connect(bus || sfxBus); src.start(t);
    } catch {}
  }
  // chenda-style drum: pitched thump + skin slap
  function drum(when, low=true, vol=.5, bus) {
    try {
      const c = ac(), t = c.currentTime + when;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(low ? 150 : 320, t); o.frequency.exponentialRampToValueAtTime(low ? 55 : 160, t + .18);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + (low ? .35 : .15));
      o.connect(g).connect(bus || musicBus); o.start(t); o.stop(t + .4);
      noise(low ? .05 : .08, vol * (low ? .15 : .35), when, low ? 800 : 2500, bus || musicBus);
    } catch {}
  }
  const tune = notes => notes.forEach(([f,t,d]) => tone(f, d||.15, 'triangle', .1, t/1000));
  const sfx = {
    click: () => { tone(880,.05,'sine',.07); tone(1320,.04,'sine',.04,.03); },
    join: () => tune([[659,0],[988,90,.25]]),
    leave: () => tune([[523,0],[392,100,.2]]),
    shuffle: () => { for (let i = 0; i < 14; i++) noise(.05, .12, i*.13, 3000); },
    flip: () => { noise(.12,.15,0,1500); tone(300,.15,'sine',.1,.05); },
    reveal: () => tune([[523,0],[659,120],[784,240],[1047,360,.35]]),
    raja: () => { tune([[523,0,.2],[523,180,.1],[659,300,.2],[784,500,.5]]); drum(0); drum(.5); },
    sneaky: () => tune([[294,0,.25],[277,250,.25],[262,500,.25],[247,750,.5]]),
    win: () => tune([[523,0],[659,150],[784,300],[1047,450],[784,600],[1047,750,.5]]),
    lose: () => tune([[400,0,.25],[300,250,.25],[200,500,.6]]),
    siren: () => { for (let i = 0; i < 4; i++) { tone(880,.2,'sawtooth',.04,i*.44); tone(660,.2,'sawtooth',.04,i*.44+.22); } },
    tick: () => tone(1400,.03,'square',.03),
    coin: () => { tone(988,.08,'square',.05); tone(1319,.25,'square',.05,.08); },
    fanfare: () => {
      const n = [[523,0,.18],[523,.2,.1],[523,.32,.1],[698,.45,.5],[880,1,.18],[784,1.2,.18],[880,1.4,.7]];
      n.forEach(([f,t,d]) => { tone(f,d+.1,'sawtooth',.05,t); tone(f*2,d,'triangle',.04,t); });
      [0,.45,1,1.4].forEach(t => drum(t, true, .6, sfxBus));
    },
    boom: () => { noise(.6,.25,0,200); tone(80,.5,'sine',.3); },
  };

  // ---------- background music: Kerala-folk loop (Mohanam scale + chenda + drone) ----------
  const SCALE = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
  const MOODS = {
    calm:    { bpm: 84,  melody: true,  drums: 'soft', drone: true },
    tense:   { bpm: 132, melody: false, drums: 'fast', drone: true },
    party:   { bpm: 120, melody: true,  drums: 'party', drone: false },
  };
  let mood = null, step = 0, nextT = 0, schedTimer = null, droneNodes = [];
  // phrase picked from scale degrees (-1 = rest), loosely like a folk tune
  const PHRASES = [
    [0,-1,2,3,4,-1,3,2, 3,-1,2,0,1,-1,0,-1],
    [4,-1,5,4,3,-1,2,3, 4,-1,3,2,0,-1,-1,-1],
    [5,-1,4,3,4,-1,5,7, 6,-1,5,4,3,-1,2,-1],
    [2,3,4,-1,3,2,0,-1, 1,-1,2,1,0,-1,-1,-1],
  ];
  function flute(freq, t, dur) {
    const c = actx, o = c.createOscillator(), v = c.createOscillator(), vg = c.createGain(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    v.frequency.value = 5.5; vg.gain.value = freq * .012; v.connect(vg).connect(o.frequency); // vibrato
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .06);
    g.gain.setValueAtTime(.16, t + dur * .7); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(musicBus); o.start(t); v.start(t); o.stop(t + dur + .05); v.stop(t + dur + .05);
  }
  function startDrone() {
    stopDrone();
    [130.8, 196.0, 261.6].forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), lfo = actx.createOscillator(), lg = actx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.value = .05 - i * .012;
      lfo.frequency.value = .15 + i * .07; lg.gain.value = .02; lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(musicBus); o.start(); lfo.start();
      droneNodes.push(o, lfo);
    });
  }
  function stopDrone() { droneNodes.forEach(n => { try { n.stop(); } catch {} }); droneNodes = []; }
  function schedule() {
    const m = MOODS[mood]; if (!m || !actx) return;
    const s16 = 60 / m.bpm / 4;
    while (nextT < actx.currentTime + .25) {
      const when = nextT - actx.currentTime, i = step % 16;
      if (m.drums === 'soft') { if (i === 0 || i === 10) drum(when, true, .35); if (i === 4 || i === 12) drum(when, false, .18); if (i % 2 === 1) noise(.02,.03,when,6000,musicBus); }
      if (m.drums === 'fast') { if (i % 4 === 0) drum(when, true, .45); drum(when, false, i % 2 ? .1 : .2); }
      if (m.drums === 'party') { if (i % 4 === 0) drum(when, true, .5); if (i % 4 === 2) drum(when, false, .3); noise(.02,.04,when,7000,musicBus); }
      if (m.melody) {
        const ph = PHRASES[Math.floor(step / 16) % PHRASES.length], d = ph[i];
        if (d >= 0) flute(SCALE[d] * (mood === 'party' ? 2 : 1), nextT, s16 * 1.8);
      }
      if (mood === 'tense' && i === 0) tone(SCALE[0] / 2, s16 * 8, 'sawtooth', .03, when, musicBus);
      nextT += s16; step++;
    }
  }
  function setMood(m) {
    if (m === mood) return;
    mood = m;
    if (!actx) return; // starts after first tap
    step = 0; nextT = actx.currentTime + .05;
    MOODS[m] && MOODS[m].drone ? startDrone() : stopDrone();
    clearInterval(schedTimer); schedTimer = setInterval(schedule, 80);
  }
  // browsers block audio until a tap: start music on first interaction
  const unlock = () => { ac(); const m = mood || 'calm'; mood = null; setMood(m); removeEventListener('pointerdown', unlock); };
  addEventListener('pointerdown', unlock);
  setMood('calm');

  function setSound(on) {
    soundOn = on; localStorage.setItem('kp_sound', on ? 'on' : 'off');
    const b = document.getElementById('btn-sound');
    b.textContent = on ? '🔊' : '🔇'; b.classList.toggle('off', !on);
    if (actx) master.gain.setTargetAtTime(on ? 1 : 0, actx.currentTime, .05);
  }
  document.getElementById('btn-sound').onclick = e => { e.stopPropagation(); setSound(!soundOn); };
  setSound(soundOn);

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
    b.className = 'av' + (i === avatar ? ' sel' : ''); b.innerHTML = a; b.type = 'button';
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
    if (code) socket.emit('join_room', { code, playerId, name: localStorage.getItem('kp_name') || '', avatar });
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
    flipped = true; $('#flip').classList.add('open'); sfx.flip();
    setTimeout(() => (myRole.key === 'kallan' ? sfx.sneaky() : myRole.key === 'raja' ? sfx.raja() : sfx.reveal()), 400);
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
    const prevCount = state ? state.players.length : s.players.length;
    state = s;
    lastRound = s.round;
    if (s.players.length > prevCount) sfx.join(); else if (s.players.length < prevCount) sfx.leave();
    setMood(s.phase === 'police' ? 'tense' : s.phase === 'final' ? 'party' : 'calm');
    $$('.room-code-txt').forEach(el => el.textContent = s.code);
    renderStrip();
    $('#reactions').classList.remove('hidden');
    clearInterval(timerInt);

    switch (s.phase) {
      case 'lobby': renderLobby(); show('s-lobby'); break;
      case 'assigning': show('s-assign'); if (phaseChanged) sfx.shuffle(); break;
      case 'reveal': renderReveal(phaseChanged); show('s-reveal'); break;
      case 'raja': renderRaja(); show('s-raja'); if (phaseChanged) { confetti(50); sfx.raja(); } break;
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
        html += `<div class="seat empty"><div class="bubble">＋</div><div class="nm">Waiting…</div></div>`;
      }
    }
    seats.innerHTML = html;
    const left = state.needed - state.players.length;
    $('#lobby-sub').textContent = left > 0 ? `${left} more player${left>1?'s':''} needed${state.roomName ? ' · ' + state.roomName : ''}` : 'All here! Dealing chits…';
  }

  function renderReveal(fresh) {
    $('#reveal-round').textContent = roundTxt();
    if (myRole) {
      $('#my-emoji').innerHTML = ROLE_INFO[myRole.key].emoji;
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
      const tag = known ? ROLE_INFO[p.role].emoji + ' ' + ROLE_INFO[p.role].en : (can ? 'കള്ളൻ? ' + ROLE_INFO.kallan.emoji : (p.id===playerId ? 'You' : '?'));
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
      if (left <= 10 && left > 0) sfx.tick();
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
    const stage = $('#escape-stage');
    stage.classList.toggle('hidden', r.correct);
    if (fresh && !r.correct) { stage.classList.remove('play'); void stage.offsetWidth; stage.classList.add('play'); setTimeout(() => sfx.boom(), 2300); }
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
      if (myPts) { toast(`+${myPts} points!`, 'ok'); setTimeout(sfx.coin, 900); }
    }
  }

  function renderFinal(fresh) {
    const sorted = [...state.players].sort((a,b) => b.score - a.score);
    const top = sorted[0];
    const tied = sorted.filter(p => p.score === top.score);
    $('#winner').innerHTML = `<div class="rays"></div><div class="trophy-wrap"><span class="win-crown">👑</span><div class="trophy">${CHARS.trophy}</div><span class="spark s1">✨</span><span class="spark s2">⭐</span><span class="spark s3">✨</span><span class="spark s4">🌟</span></div>
      <div class="wn">${tied.map(p => esc(p.name)).join(' & ')}</div>
      <div class="sub">${tied.length>1?'Joint winners! · വിജയികൾ':'Winner! · വിജയി'} — ${top.score} pts</div>`;
    const ord = ['1st','2nd','3rd','4th','5th'];
    // show podium as 2nd,1st,3rd,4th,5th visually
    const vis = [sorted[1], sorted[0], sorted[2], sorted[3], sorted[4]].filter(Boolean);
    $('#podium').innerHTML = vis.map((p, i) => {
      const rank = sorted.indexOf(p);
      return `<div class="pod p${rank+1}" style="animation-delay:${[.3,.6,.15,0,0][i]}s">
        ${rank===0?'<div class="pod-crown">👑</div>':''}<div class="e">${av(p)}</div><div class="n">${esc(p.name)}</div><div class="s" data-to="${p.score}">0 pts</div><div class="rk">${ord[rank]}</div></div>`;
    }).join('');
    $('#btn-again').classList.toggle('hidden', !isHost());
    // count-up scores
    $$('.pod .s').forEach(el => {
      const to = +el.dataset.to, t0 = performance.now(), dur = 1400;
      const step = now => { const k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + ' pts'; if (k < 1) requestAnimationFrame(step); };
      setTimeout(() => requestAnimationFrame(step), 600);
    });
    $('#s-final').classList.toggle('i-won', tied.some(p => p.id === playerId));
    if (fresh) {
      setTimeout(() => { sfx.fanfare(); confetti(250); }, 400);
      fireworks(9);
      if (tied.some(p => p.id === playerId)) setTimeout(() => toast('🎉 നിങ്ങൾ ജയിച്ചു! You won! 🎉', 'ok'), 1200);
    }
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
  // fireworks: rockets burst into rings of sparks
  function fireworks(count = 6) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cols = ['#ffd866','#ff6b5e','#7df29a','#9b6bff','#5aa0ff','#ffffff','#f4b62a'];
    for (let k = 0; k < count; k++) setTimeout(() => {
      const x = innerWidth * (.15 + Math.random() * .7), y = innerHeight * (.12 + Math.random() * .35);
      const c = cols[k % cols.length], n = 46;
      sfx.boom();
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, sp = 4 + Math.random() * 3;
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 4, c, r: 0, vr: 0, life: 0, spark: true });
      }
      if (!raf) loop();
    }, 300 + k * 550);
  }
  function loop() {
    cx.clearRect(0,0,cv.width,cv.height);
    parts.forEach(p => {
      p.vy += p.spark ? .08 : .35; p.vx *= p.spark ? .97 : .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      if (p.spark) {
        cx.globalAlpha = Math.max(0, 1 - p.life / 70); cx.fillStyle = p.c;
        cx.beginPath(); cx.arc(p.x, p.y, 2.6, 0, 7); cx.fill(); cx.globalAlpha = 1;
        if (p.life > 70) p.life = 999;
        return;
      }
      cx.save(); cx.translate(p.x,p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); cx.restore();
    });
    parts = parts.filter(p => p.y < cv.height + 20 && p.life < 400);
    raf = parts.length ? requestAnimationFrame(loop) : (cx.clearRect(0,0,cv.width,cv.height), null);
  }
})();
