// കള്ളനും പോലീസും — game server
// All roles are shuffled and kept here. Each player only gets their own role.
const express = require('express');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.send('ok'));

const PLAYERS_NEEDED = 5;
const POLICE_TIME = 45; // seconds
const ROLES = {
  raja:    { key: 'raja',    en: 'Raja',    ml: 'രാജാവ്',  emoji: '👑', points: 1000 },
  rani:    { key: 'rani',    en: 'Rani',    ml: 'റാണി',    emoji: '👸', points: 800 },
  manthri: { key: 'manthri', en: 'Manthri', ml: 'മന്ത്രി',  emoji: '🧙', points: 700 },
  police:  { key: 'police',  en: 'Police',  ml: 'പോലീസ്',  emoji: '👮', points: 500 },
  kallan:  { key: 'kallan',  en: 'Kallan',  ml: 'കള്ളൻ',   emoji: '🥷', points: 0 },
};
const ROLE_KEYS = Object.keys(ROLES);

const rooms = new Map(); // code -> room

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 5; i++) code += chars[crypto.randomInt(chars.length)];
  } while (rooms.has(code));
  return code;
}

// Fisher–Yates with crypto randomness
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanName(n) {
  return String(n || '').replace(/[<>]/g, '').trim().slice(0, 16);
}

function findPlayer(room, id) {
  return room.players.find(p => p.id === id);
}
function idOfRole(room, role) {
  return Object.keys(room.roles).find(id => room.roles[id] === role);
}

// Public view of the room. Roles are hidden unless revealed by the game.
function publicState(room) {
  const visible = {};
  if (room.phase === 'raja' || room.phase === 'police') {
    visible[idOfRole(room, 'raja')] = 'raja';
  }
  if (room.phase === 'police') {
    visible[idOfRole(room, 'police')] = 'police';
  }
  if (room.phase === 'result' || room.phase === 'final') {
    Object.assign(visible, room.roles);
  }
  return {
    code: room.code,
    roomName: room.roomName,
    hostId: room.hostId,
    phase: room.phase,
    round: room.round,
    totalRounds: room.totalRounds,
    needed: PLAYERS_NEEDED,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      connected: p.connected,
      ready: room.ready.has(p.id),
      role: visible[p.id] || null,
    })),
    policeDeadline: room.phase === 'police' ? room.policeDeadline : null,
    lastResult: (room.phase === 'result' || room.phase === 'final') ? room.lastResult : null,
    history: room.history,
  };
}

function broadcast(room) {
  io.to(room.code).emit('state', publicState(room));
}

// Send each player ONLY their own role, to their own socket.
function sendPrivateRoles(room) {
  for (const p of room.players) {
    if (!p.socketId) continue;
    const role = room.roles[p.id];
    io.to(p.socketId).emit('your_role', role ? ROLES[role] : null);
  }
}

function assignRoles(room) {
  const shuffled = shuffle(ROLE_KEYS);
  room.roles = {};
  room.players.forEach((p, i) => { room.roles[p.id] = shuffled[i]; });
  room.ready = new Set();
  room.lastResult = null;
  room.round += 1;
  room.phase = 'reveal';
  sendPrivateRoles(room);
  broadcast(room);
}

function clearTimer(room) {
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
}

function finishRound(room, guessedId) {
  clearTimer(room);
  const policeId = idOfRole(room, 'police');
  const kallanId = idOfRole(room, 'kallan');
  const correct = guessedId === kallanId;
  const awarded = {};
  for (const p of room.players) {
    const role = room.roles[p.id];
    let pts = ROLES[role].points;
    if (role === 'police') pts = correct ? 500 : 0;
    if (role === 'kallan') pts = correct ? 0 : 500;
    awarded[p.id] = pts;
    p.score += pts;
  }
  room.lastResult = {
    correct,
    timedOut: guessedId == null,
    guessedId: guessedId || null,
    policeId,
    kallanId,
    awarded,
  };
  room.history.push({ round: room.round, awarded, correct });
  room.phase = room.round >= room.totalRounds ? 'final' : 'result';
  broadcast(room);
}

function newRoom(hostId, roomName, totalRounds) {
  const room = {
    code: makeCode(),
    roomName: cleanName(roomName),
    hostId,
    phase: 'lobby',
    round: 0,
    totalRounds: Math.min(Math.max(parseInt(totalRounds, 10) || 5, 1), 20),
    players: [],
    roles: {},
    ready: new Set(),
    lastResult: null,
    history: [],
    timer: null,
    policeDeadline: null,
    createdAt: Date.now(),
  };
  rooms.set(room.code, room);
  return room;
}

io.on('connection', socket => {
  let me = null; // { code, id }

  const err = msg => socket.emit('toast', { type: 'error', msg });
  const getRoom = () => (me ? rooms.get(me.code) : null);

  function attach(room, playerId, name, avatar) {
    let p = findPlayer(room, playerId);
    if (!p && !cleanName(name)) return err('Enter your name first.');
    if (p) {
      p.socketId = socket.id;
      p.connected = true;
      if (cleanName(name)) p.name = cleanName(name);
    } else {
      if (room.phase !== 'lobby') return err('Game already started. Ask the host for a new room.');
      if (room.players.length >= PLAYERS_NEEDED) return err('Room is full (5 players).');
      p = {
        id: playerId,
        name: cleanName(name),
        avatar: Number.isInteger(avatar) ? Math.abs(avatar) % 24 : crypto.randomInt(24),
        score: 0,
        socketId: socket.id,
        connected: true,
      };
      room.players.push(p);
    }
    me = { code: room.code, id: playerId };
    socket.join(room.code);
    socket.emit('joined', { code: room.code, playerId });
    // re-send private role on reconnect
    if (room.roles[playerId]) socket.emit('your_role', ROLES[room.roles[playerId]]);
    broadcast(room);

    // Auto-assign roles the moment the 5th player joins
    if (room.phase === 'lobby' && room.players.length === PLAYERS_NEEDED) {
      room.phase = 'assigning';
      broadcast(room);
      setTimeout(() => { if (rooms.has(room.code)) assignRoles(room); }, 2600);
    }
    return true;
  }

  socket.on('create_room', ({ playerId, name, avatar, roomName, rounds } = {}) => {
    if (!playerId || typeof playerId !== 'string') return err('Bad player id');
    if (!cleanName(name)) return err('Enter your name first.');
    const room = newRoom(playerId, roomName, rounds);
    attach(room, playerId, name, avatar);
  });

  socket.on('join_room', ({ code, playerId, name, avatar } = {}) => {
    const room = rooms.get(String(code || '').trim().toUpperCase());
    if (!room) return err('Room not found. Check the code.');
    if (!playerId || typeof playerId !== 'string') return err('Bad player id');
    attach(room, playerId, name, avatar);
  });

  socket.on('got_it', () => {
    const room = getRoom();
    if (!room || room.phase !== 'reveal') return;
    room.ready.add(me.id);
    broadcast(room);
  });

  socket.on('start_round', () => {
    const room = getRoom();
    if (!room || room.hostId !== me.id) return;
    if (room.phase !== 'reveal') return;
    if (room.ready.size < PLAYERS_NEEDED) return err('Wait — not everyone has seen their role.');
    room.phase = 'raja';
    broadcast(room);
  });

  // Raja calls the Police
  socket.on('raja_call', () => {
    const room = getRoom();
    if (!room || room.phase !== 'raja') return;
    if (room.roles[me.id] !== 'raja') return err('Only the Raja can call the Police.');
    room.phase = 'police';
    room.policeDeadline = Date.now() + POLICE_TIME * 1000;
    clearTimer(room);
    room.timer = setTimeout(() => {
      if (room.phase === 'police') finishRound(room, null);
    }, POLICE_TIME * 1000 + 500);
    broadcast(room);
  });

  socket.on('police_guess', ({ targetId } = {}) => {
    const room = getRoom();
    if (!room || room.phase !== 'police') return;
    if (room.roles[me.id] !== 'police') return err('Only the Police can guess.');
    const role = room.roles[targetId];
    if (!role || role === 'raja' || role === 'police') return err('Pick one of the suspects.');
    finishRound(room, targetId);
  });

  socket.on('next_round', () => {
    const room = getRoom();
    if (!room || room.hostId !== me.id || room.phase !== 'result') return;
    room.phase = 'assigning';
    broadcast(room);
    setTimeout(() => { if (rooms.has(room.code)) assignRoles(room); }, 2600);
  });

  socket.on('play_again', () => {
    const room = getRoom();
    if (!room || room.hostId !== me.id || room.phase !== 'final') return;
    room.players.forEach(p => { p.score = 0; });
    room.round = 0;
    room.history = [];
    room.roles = {};
    room.lastResult = null;
    if (room.players.length === PLAYERS_NEEDED) {
      room.phase = 'assigning';
      broadcast(room);
      setTimeout(() => { if (rooms.has(room.code)) assignRoles(room); }, 2600);
    } else {
      room.phase = 'lobby';
      broadcast(room);
    }
  });

  socket.on('leave_room', () => {
    const room = getRoom();
    if (!room) return;
    socket.leave(room.code);
    if (room.phase === 'lobby') {
      room.players = room.players.filter(p => p.id !== me.id);
    } else {
      const p = findPlayer(room, me.id);
      if (p) { p.connected = false; p.socketId = null; }
    }
    fixHost(room);
    me = null;
    if (room.players.length === 0) { clearTimer(room); rooms.delete(room.code); return; }
    broadcast(room);
  });

  socket.on('chat_emoji', ({ emoji } = {}) => {
    const room = getRoom();
    const allowed = ['😂', '😱', '🤔', '👏', '🔥', '😎', '🙏', '😡'];
    if (!room || !allowed.includes(emoji)) return;
    io.to(room.code).emit('emoji', { from: me.id, emoji });
  });

  socket.on('disconnect', () => {
    const room = getRoom();
    if (!room) return;
    const p = findPlayer(room, me.id);
    if (p && p.socketId === socket.id) {
      p.connected = false;
      p.socketId = null;
      if (room.phase === 'lobby') {
        // give them 20s to come back before freeing the seat
        setTimeout(() => {
          if (!p.connected && room.phase === 'lobby') {
            room.players = room.players.filter(x => x.id !== p.id);
            fixHost(room);
            if (room.players.length === 0) rooms.delete(room.code);
            else broadcast(room);
          }
        }, 20000);
      }
      fixHost(room);
      broadcast(room);
    }
  });
});

function fixHost(room) {
  const host = findPlayer(room, room.hostId);
  if (!host || !host.connected) {
    const next = room.players.find(p => p.connected);
    if (next) room.hostId = next.id;
  }
}

// Clean up old empty rooms every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const anyone = room.players.some(p => p.connected);
    if (!anyone && now - room.createdAt > 30 * 60 * 1000) {
      clearTimer(room);
      rooms.delete(code);
    }
  }
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`കള്ളനും പോലീസും running on http://localhost:${PORT}`));
