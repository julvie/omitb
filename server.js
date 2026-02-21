const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = __dirname;

const characters = [
  { id: 'mabel', name: 'Mabel' },
  { id: 'charles', name: 'Charles' },
  { id: 'oliver', name: 'Oliver' },
];

const suspects = ['Bunny', 'Jan', 'Cinda', 'Teddy', 'Howard', 'Poppy', 'Donna', 'Loretta'];
const objects = ['Bassoon Reed', 'Poisoned Dip', 'Podcast Mic', 'Knit Needle', 'Stage Light', 'Key Fob', 'Matchbook', 'Broken Vase'];
const apartments = ['Penthouse A', 'Penthouse B', "Sting's Loft", 'Theater Room', 'Kitchen', 'Wine Cellar', 'Security Office', 'Rooftop'];
const motives = ['Revenge', 'Blackmail', 'Jealousy', 'Inheritance', 'Cover-up', 'Career Sabotage', 'Obsession', 'Debt'];
const residents = ['Lester', 'Howard', 'Uma', 'Theo', 'Bunny', 'Cinda', 'Poppy', 'Jan'];
const residentIds = { Lester: 'lester', Howard: 'howard', Uma: 'uma', Theo: 'theo', Bunny: 'bunny', Cinda: 'cinda', Poppy: 'poppy', Jan: 'jan' };
const victims = ['Lester', 'Eva Kane', 'Nina Lin', 'Milo Graves', 'Vera Bell', "Theo's Agent"];
const ringLength = 24;

const rooms = new Map();
const sockets = new Map();

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomId(size = 8) {
  return crypto.randomBytes(size).toString('hex').slice(0, size);
}

function createSolution() {
  return {
    suspect: randomItem(suspects),
    object: randomItem(objects),
    apartment: randomItem(apartments),
    motive: randomItem(motives),
  };
}

function createStory(solution) {
  const victim = randomItem(victims);
  const openings = [
    `${victim} was found dead after a sudden blackout near ${solution.apartment}.`,
    `A body turned up just outside ${solution.apartment} minutes before midnight.`,
    `${victim} vanished during a co-op event and reappeared at ${solution.apartment}.`,
  ];
  const stakes = [
    'Residents are quietly deleting messages from the night of the murder.',
    'The board wants this case buried before sunrise.',
    'A rival podcast is feeding the building false timelines.',
  ];

  const beat1 = {
    title: 'Tape Restoration Complete',
    unlockAtClues: 2,
    revealText: `Recovered audio narrows the weapon to ${solution.object}. Someone planted earlier misinformation to push investigators off that track.`,
  };
  const beat2 = {
    title: 'Security Timeline Breakthrough',
    unlockAtClues: 4,
    revealText: `Rebuilt camera timing isolates activity around ${solution.apartment}. A corridor segment was intentionally delayed before upload.`,
  };
  const beat3 = {
    title: 'Financial Pressure Exposed',
    unlockAtClues: 6,
    revealText: `Hidden transfers and private messages line up with ${solution.motive}. This murder was planned, not impulsive.`,
  };

  return {
    title: `Case: The ${solution.apartment} Silence`,
    brief: `${randomItem(openings)} ${randomItem(stakes)}`,
    beats: [beat1, beat2, beat3],
  };
}

function makeRoom(roomId) {
  return {
    id: roomId,
    createdAt: Date.now(),
    started: false,
    winnerId: null,
    solution: null,
    story: null,
    players: new Map(), // playerId -> player
    chosenCharacters: new Set(),
    turnOrder: [],
    turnPlayerId: null,
  };
}

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, makeRoom(roomId));
  }
  return rooms.get(roomId);
}

function buildPublicState(room, viewerId) {
  const turnPlayer = room.players.get(room.turnPlayerId);
  const viewer = room.players.get(viewerId);
  return {
    roomId: room.id,
    started: room.started,
    winnerId: room.winnerId,
    me: viewerId,
    turnPlayerId: room.turnPlayerId,
    turnPlayerName: turnPlayer ? turnPlayer.name : null,
    caseStory: room.story ? { title: room.story.title, brief: room.story.brief } : null,
    revealedStory: viewer ? viewer.revealedStory : [],
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      characterId: p.characterId,
      position: p.position,
      connected: p.connected,
      hasAccused: p.hasAccused,
      eliminated: p.eliminated,
    })),
    chosenCharacters: Array.from(room.chosenCharacters),
    characterPool: characters,
  };
}

function nextTurnPlayer(room) {
  if (room.turnOrder.length === 0) return null;
  const currentIndex = Math.max(0, room.turnOrder.indexOf(room.turnPlayerId));
  for (let i = 1; i <= room.turnOrder.length; i += 1) {
    const candidateId = room.turnOrder[(currentIndex + i) % room.turnOrder.length];
    const candidate = room.players.get(candidateId);
    if (candidate && candidate.characterId && candidate.connected && !candidate.eliminated) return candidateId;
  }
  return null;
}

function send(ws, payload) {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload));
}

function broadcast(room, payload) {
  for (const player of room.players.values()) {
    if (!player.ws) continue;
    send(player.ws, payload);
  }
}

function broadcastState(room) {
  for (const player of room.players.values()) {
    if (!player.ws) continue;
    send(player.ws, { type: 'state', data: buildPublicState(room, player.id) });
  }
}

function maybeStart(room) {
  if (room.started) return;
  const fullyChosen = Array.from(room.players.values()).filter((p) => p.characterId).length === 3;
  if (!fullyChosen) return;
  room.started = true;
  room.solution = createSolution();
  room.story = createStory(room.solution);
  for (const player of room.players.values()) {
    player.cluesFound = 0;
    player.storyRevealIndex = 0;
    player.revealedStory = [];
  }
  room.turnOrder = Array.from(room.players.values()).map((p) => p.id);
  room.turnPlayerId = room.turnOrder[0] || null;
  broadcast(room, { type: 'game_started', caseStory: { title: room.story.title, brief: room.story.brief } });
  broadcastState(room);
}

function generatePrivateClue(room) {
  const facets = ['suspect', 'object', 'apartment', 'motive'];
  const facet = randomItem(facets);
  const truthful = Math.random() < 0.62;
  const value = truthful
    ? room.solution[facet]
    : randomItem({ suspect: suspects, object: objects, apartment: apartments, motive }[facet].filter((v) => v !== room.solution[facet]));

  const resident = randomItem(residents);
  const text = `${resident} says ${value} is connected to tonight's timeline.`;
  const encounter = Math.random() < 0.38;
  const residentQuotes = {
    Lester: `I logged someone near the scene, and ${value} keeps showing up in my notes.`,
    Howard: `Even Evelyn reacted when ${value} came up. That is not normal.`,
    Uma: `Don't ignore ${value}. People lie, paper trails don't.`,
    Theo: `I saw enough to know ${value} matters to what happened.`,
    Bunny: `Board records tied to ${value} were touched at the wrong hour.`,
    Cinda: `My source says ${value} is the thread nobody is pulling.`,
    Poppy: `I clipped drafts all night. ${value} appears in every real lead.`,
    Jan: `Listen carefully. ${value} fits the rhythm of the murder timeline.`,
  };
  const encounterData = encounter
    ? {
        residentId: residentIds[resident] || 'lester',
        residentName: resident,
        quote: residentQuotes[resident] || `${resident} says ${value} matters.`,
      }
    : null;

  return { facet, value, truthful, resident, text, encounter, encounterData };
}

function maybeRevealStory(room, player) {
  if (!room.story) return;
  while (player.storyRevealIndex < room.story.beats.length) {
    const nextBeat = room.story.beats[player.storyRevealIndex];
    if (player.cluesFound < nextBeat.unlockAtClues) break;
    const reveal = { title: nextBeat.title, text: nextBeat.revealText };
    player.storyRevealIndex += 1;
    player.revealedStory.push(reveal);
    send(player.ws, { type: 'story_reveal', data: reveal });
  }
}

function serveFile(req, res, targetPath) {
  const ext = path.extname(targetPath).toLowerCase();
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
  }[ext] || 'application/octet-stream';

  fs.readFile(targetPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': mime });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/') {
    return serveFile(req, res, path.join(ROOT, 'multiplayer.html'));
  }

  const normalized = path.normalize(url.pathname).replace(/^\/+/, '');
  const filePath = path.join(ROOT, normalized);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  return serveFile(req, res, filePath);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const wsId = randomId(10);
  sockets.set(wsId, { ws, roomId: null, playerId: null });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', message: 'Invalid message.' });
      return;
    }

    const meta = sockets.get(wsId);
    if (!meta) return;

    if (msg.type === 'join') {
      const roomId = String(msg.roomId || randomId(6)).toUpperCase();
      const name = String(msg.name || 'Player').trim().slice(0, 24) || 'Player';
      const room = getOrCreateRoom(roomId);

      if (room.players.size >= 3 && !Array.from(room.players.values()).some((p) => !p.connected)) {
        send(ws, { type: 'error', message: 'Room is full.' });
        return;
      }

      let player = Array.from(room.players.values()).find((p) => p.name === name && !p.connected);
      if (!player) {
        const playerId = randomId(8);
        player = {
          id: playerId,
          name,
          characterId: null,
          position: 0,
          connected: true,
          hasAccused: false,
          eliminated: false,
          cluesFound: 0,
          storyRevealIndex: 0,
          revealedStory: [],
          ws,
        };
        room.players.set(player.id, player);
      } else {
        player.connected = true;
        player.ws = ws;
        if (!Array.isArray(player.revealedStory)) player.revealedStory = [];
        if (!Number.isInteger(player.storyRevealIndex)) player.storyRevealIndex = player.revealedStory.length;
        if (!Number.isInteger(player.cluesFound)) player.cluesFound = 0;
      }

      meta.roomId = roomId;
      meta.playerId = player.id;

      send(ws, {
        type: 'joined',
        roomId,
        playerId: player.id,
        link: `http://${(ws._socket && ws._socket.localAddress) || 'localhost'}:${PORT}/?room=${roomId}`,
      });
      broadcastState(room);
      maybeStart(room);
      return;
    }

    if (!meta.roomId || !meta.playerId) {
      send(ws, { type: 'error', message: 'Join a room first.' });
      return;
    }

    const room = rooms.get(meta.roomId);
    if (!room) return;
    const player = room.players.get(meta.playerId);
    if (!player) return;

    if (msg.type === 'choose_character') {
      if (room.started) {
        send(ws, { type: 'error', message: 'Game already started.' });
        return;
      }
      const charId = String(msg.characterId || '');
      if (!characters.some((c) => c.id === charId)) {
        send(ws, { type: 'error', message: 'Unknown character.' });
        return;
      }
      if (room.chosenCharacters.has(charId) && player.characterId !== charId) {
        send(ws, { type: 'error', message: 'Character already taken.' });
        return;
      }

      if (player.characterId) room.chosenCharacters.delete(player.characterId);
      player.characterId = charId;
      room.chosenCharacters.add(charId);
      broadcastState(room);
      maybeStart(room);
      return;
    }

    if (msg.type === 'roll_move') {
      if (!room.started || room.winnerId) return;
      if (!player.characterId) return;
      if (player.eliminated) {
        send(ws, { type: 'error', message: 'You are eliminated and cannot take turns.' });
        return;
      }
      if (room.turnPlayerId !== player.id) {
        send(ws, { type: 'error', message: "Not your turn." });
        return;
      }

      const dice = Math.floor(Math.random() * 6) + 1;
      send(ws, { type: 'roll_result', dice });

      player.position = (player.position + dice) % ringLength;
      const clue = generatePrivateClue(room);
      send(ws, { type: 'private_clue', data: clue });
      player.cluesFound += 1;
      if (clue.encounter && clue.encounterData) {
        send(ws, { type: 'resident_encounter', data: clue.encounterData });
      }
      maybeRevealStory(room, player);
      room.turnPlayerId = nextTurnPlayer(room);
      broadcastState(room);
      return;
    }

    if (msg.type === 'accuse') {
      if (!room.started || room.winnerId) return;
      if (player.eliminated) {
        send(ws, { type: 'error', message: 'You are eliminated and cannot accuse.' });
        return;
      }
      const guess = msg.guess || {};
      const correct =
        guess.suspect === room.solution.suspect &&
        guess.object === room.solution.object &&
        guess.apartment === room.solution.apartment &&
        guess.motive === room.solution.motive;

      if (correct) {
        room.winnerId = player.id;
        broadcast(room, { type: 'game_over', winnerId: player.id, winnerName: player.name, winnerCharacter: player.characterId });
        broadcastState(room);
      } else {
        player.hasAccused = true;
        player.eliminated = true;
        send(ws, { type: 'accuse_result', ok: false, message: 'Incorrect accusation. Sudden death: you are eliminated.' });
        broadcast(room, { type: 'player_eliminated', playerId: player.id, playerName: player.name, characterId: player.characterId });
        if (room.turnPlayerId === player.id) {
          room.turnPlayerId = nextTurnPlayer(room);
        }
        const activePlayers = Array.from(room.players.values()).filter((p) => p.characterId && p.connected && !p.eliminated);
        if (activePlayers.length === 0) {
          room.winnerId = null;
          broadcast(room, { type: 'game_over', winnerId: null, reason: 'All investigators were eliminated. Case unsolved.' });
        }
        broadcastState(room);
      }
    }
  });

  ws.on('close', () => {
    const meta = sockets.get(wsId);
    if (!meta) return;
    sockets.delete(wsId);

    if (!meta.roomId || !meta.playerId) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const player = room.players.get(meta.playerId);
    if (!player) return;

    player.connected = false;
    player.ws = null;
    if (room.started && !room.winnerId && room.turnPlayerId === player.id) {
      room.turnPlayerId = nextTurnPlayer(room);
    }
    broadcastState(room);
  });
});

server.listen(PORT, () => {
  console.log(`Multiplayer server running at http://localhost:${PORT}`);
});
