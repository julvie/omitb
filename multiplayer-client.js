const suspects = ['Bunny', 'Jan', 'Cinda', 'Teddy', 'Howard', 'Poppy', 'Donna', 'Loretta'];
const objects = ['Bassoon Reed', 'Poisoned Dip', 'Podcast Mic', 'Knit Needle', 'Stage Light', 'Key Fob', 'Matchbook', 'Broken Vase'];
const apartments = ['Penthouse A', 'Penthouse B', "Sting's Loft", 'Theater Room', 'Kitchen', 'Wine Cellar', 'Security Office', 'Rooftop'];
const motives = ['Revenge', 'Blackmail', 'Jealousy', 'Inheritance', 'Cover-up', 'Career Sabotage', 'Obsession', 'Debt'];

const ringTiles = [
  'Lobby','Podcast Studio','Penthouse A','Rooftop','Penthouse B','East Hall','Freight Lift','Theater Room','Catacombs','Laundry','Kitchen','Wine Cellar','Security Office','Storage','West Hall',"Sting's Loft",'Courtyard','Library','Doorman Desk','Boiler Room','Art Studio','Hidden Passage','Mail Room','Arcatacombs'
];

const state = {
  ws: null,
  roomId: null,
  playerId: null,
  started: false,
  winnerId: null,
  turnPlayerId: null,
  turnPlayerName: null,
  players: [],
  chosenCharacters: [],
  me: null,
  isRolling: false,
  myScores: {
    suspect: Object.fromEntries(suspects.map((x) => [x, 0])),
    object: Object.fromEntries(objects.map((x) => [x, 0])),
    apartment: Object.fromEntries(apartments.map((x) => [x, 0])),
    motive: Object.fromEntries(motives.map((x) => [x, 0])),
  },
};

const els = {
  nameInput: document.getElementById('nameInput'),
  joinBtn: document.getElementById('joinBtn'),
  roomInfo: document.getElementById('roomInfo'),
  shareLink: document.getElementById('shareLink'),
  characterPick: document.getElementById('characterPick'),
  notes: document.getElementById('notes'),
  board: document.getElementById('board'),
  playersList: document.getElementById('playersList'),
  status: document.getElementById('status'),
  rollBtn: document.getElementById('rollBtn'),
  accuseBtn: document.getElementById('accuseBtn'),
  diceText: document.getElementById('diceText'),
  evidence: document.getElementById('evidence'),
  accuseModal: document.getElementById('accuseModal'),
  suspectSel: document.getElementById('suspectSel'),
  objectSel: document.getElementById('objectSel'),
  apartmentSel: document.getElementById('apartmentSel'),
  motiveSel: document.getElementById('motiveSel'),
  submitAccuse: document.getElementById('submitAccuse'),
  cancelAccuse: document.getElementById('cancelAccuse'),
  dieView: document.getElementById('dieView'),
};

function logNote(text) {
  const item = document.createElement('li');
  item.className = 'current-note';
  item.textContent = text;
  els.notes.prepend(item);
}

function randomId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function setOptions(select, values) {
  select.innerHTML = '';
  values.forEach((v) => {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = v;
    select.appendChild(option);
  });
}

function getTokenSvg(characterId) {
  const map = {
    mabel: ['#d6c197', '#1f2530', '#6e2f44'],
    charles: ['#d7c59b', '#24303f', '#733037'],
    oliver: ['#d1bc8f', '#232933', '#7b3031'],
  };
  const [paper, line, accent] = map[characterId] || map.mabel;
  return `<svg viewBox="0 0 64 64" class="token-svg" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#c8ad68"/>
      <circle cx="32" cy="32" r="27.8" fill="${paper}" stroke="${line}" stroke-width="1.4"/>
      <circle cx="32" cy="32" r="24.6" fill="none" stroke="${line}" stroke-width="1.1" opacity="0.55"/>
      <path d="M19 31c0-10 6-16 13-16s13 6 13 16c-5-3-8-5-13-5s-8 2-13 5z" fill="#171a1f"/>
      <circle cx="32" cy="34" r="9.5" fill="#efc7b2"/>
      <path d="M23 49c2-7 5-10 9-10s7 3 9 10" fill="${accent}" opacity="0.9"/>
      <circle cx="29" cy="34" r="1.2" fill="#121417"/><circle cx="35" cy="34" r="1.2" fill="#121417"/>
      <path d="M29 39c2 1.2 4 1.2 6 0" stroke="#8d4255" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    </svg>`;
}

function createRingCoords(size) {
  const coords = [];
  for (let col = 0; col < size; col += 1) coords.push([0, col]);
  for (let row = 1; row < size; row += 1) coords.push([row, size - 1]);
  for (let col = size - 2; col >= 0; col -= 1) coords.push([size - 1, col]);
  for (let row = size - 2; row >= 1; row -= 1) coords.push([row, 0]);
  return coords;
}

const ringCoords = createRingCoords(7);

function getRingPosFromGrid(row, col) {
  return ringCoords.findIndex(([r, c]) => r === row && c === col);
}

function renderBoard() {
  els.board.innerHTML = '';

  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const ringPos = getRingPosFromGrid(row, col);
      if (ringPos === -1) {
        const inner = document.createElement('div');
        inner.className = 'inner-space';
        els.board.appendChild(inner);
        continue;
      }

      const tile = document.createElement('div');
      tile.className = 'tile';
      const title = document.createElement('strong');
      title.textContent = ringTiles[ringPos];
      const markers = document.createElement('div');
      markers.className = 'markers';

      state.players.forEach((p) => {
        if (p.position === ringPos && p.characterId) {
          const token = document.createElement('span');
          token.className = 'token-board';
          token.title = `${p.name} (${p.characterId})`;
          token.innerHTML = getTokenSvg(p.characterId);
          markers.appendChild(token);
        }
      });

      tile.appendChild(title);
      tile.appendChild(markers);
      els.board.appendChild(tile);
    }
  }
}

function renderPlayers() {
  els.playersList.innerHTML = '';
  state.players.forEach((p) => {
    const li = document.createElement('li');
    if (p.id === state.playerId) li.classList.add('active');
    const left = document.createElement('span');
    left.textContent = `${p.name} ${p.characterId ? `(${p.characterId})` : '(choosing...)'}`;
    const right = document.createElement('span');
    const turnTag = p.id === state.turnPlayerId ? ' • TURN' : '';
    const outTag = p.eliminated ? ' • OUT' : '';
    right.textContent = `${p.connected ? 'Online' : 'Offline'}${turnTag}${outTag}`;
    li.append(left, right);
    els.playersList.appendChild(li);
  });
}

function renderCharacters() {
  const pool = [
    { id: 'mabel', name: 'Mabel' },
    { id: 'charles', name: 'Charles' },
    { id: 'oliver', name: 'Oliver' },
  ];
  els.characterPick.innerHTML = '';

  pool.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'character-card';
    const taken = state.chosenCharacters.includes(c.id) && (!state.me || state.me.characterId !== c.id);
    btn.disabled = taken || state.started;
    btn.innerHTML = `<div class="character-card__header"><span class="token-mini">${getTokenSvg(c.id)}</span><div class="character-card__titles"><strong>${c.name}</strong><small>${taken ? 'Taken' : 'Available'}</small></div></div>`;
    btn.addEventListener('click', () => {
      send({ type: 'choose_character', characterId: c.id });
    });
    els.characterPick.appendChild(btn);
  });
}

function renderEvidence() {
  els.evidence.innerHTML = '';
  [['suspect', 'Suspects'], ['object', 'Objects'], ['apartment', 'Apartments'], ['motive', 'Motives']].forEach(([facet, label]) => {
    const entries = Object.entries(state.myScores[facet]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const max = Math.max(1, ...entries.map(([, score]) => Math.max(0, score)));

    const card = document.createElement('li');
    card.className = 'evidence-card';
    const title = document.createElement('div');
    title.className = 'evidence-card__title';
    title.textContent = label;
    card.appendChild(title);

    const rows = document.createElement('div');
    rows.className = 'evidence-card__rows';

    entries.forEach(([name, score]) => {
      const row = document.createElement('div');
      row.className = 'evidence-row';
      row.innerHTML = `<div class="evidence-row__head"><span>${name}</span><strong>${score}</strong></div>`;
      const track = document.createElement('div');
      track.className = 'evidence-row__track';
      const fill = document.createElement('div');
      fill.className = 'evidence-row__fill';
      fill.style.width = `${Math.max(0, Math.round((Math.max(0, score) / max) * 100))}%`;
      track.appendChild(fill);
      row.appendChild(track);
      rows.appendChild(row);
    });

    card.appendChild(rows);
    els.evidence.appendChild(card);
  });
}

function renderStatus() {
  if (!state.roomId) {
    els.status.textContent = 'Join a room to begin.';
  } else if (!state.started) {
    const chosen = state.players.filter((p) => p.characterId).length;
    els.status.textContent = `Lobby: ${chosen}/3 characters locked. Fastest players claim first.`;
  } else if (state.winnerId) {
    const winner = state.players.find((p) => p.id === state.winnerId);
    els.status.textContent = `Case closed. Winner: ${winner ? winner.name : 'Unknown'}.`;
  } else if (state.me && state.me.eliminated) {
    els.status.textContent = 'You are eliminated. Keep watching while others investigate.';
  } else {
    const mine = state.turnPlayerId === state.playerId;
    els.status.textContent = mine
      ? 'Your turn. Roll now.'
      : `Waiting for ${state.turnPlayerName || 'current player'} to roll.`;
  }

  els.rollBtn.disabled =
    !state.started ||
    !!state.winnerId ||
    state.isRolling ||
    !state.me ||
    !state.me.characterId ||
    !!state.me.eliminated ||
    state.turnPlayerId !== state.playerId;
  els.accuseBtn.disabled = !state.started || !!state.winnerId || !state.me || !state.me.characterId || !!state.me.eliminated;
}

function render() {
  state.me = state.players.find((p) => p.id === state.playerId) || null;
  renderStatus();
  renderPlayers();
  renderCharacters();
  renderBoard();
  renderEvidence();
}

function send(payload) {
  if (!state.ws || state.ws.readyState !== 1) return;
  state.ws.send(JSON.stringify(payload));
}

function connectAndJoin() {
  const params = new URLSearchParams(location.search);
  const roomFromUrl = params.get('room');
  const roomId = (roomFromUrl || randomId(6)).toUpperCase();
  const name = (els.nameInput.value || 'Player').trim().slice(0, 24) || 'Player';

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${location.host}`);
  state.ws = ws;

  ws.addEventListener('open', () => {
    send({ type: 'join', roomId, name });
  });

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'joined') {
      state.roomId = msg.roomId;
      state.playerId = msg.playerId;
      const link = `${location.origin}/?room=${msg.roomId}`;
      els.roomInfo.textContent = `Room: ${msg.roomId}`;
      els.shareLink.textContent = `Share this link with 2 more players: ${link}`;
      if (!new URLSearchParams(location.search).get('room')) {
        history.replaceState(null, '', `/?room=${msg.roomId}`);
      }
      logNote(`Joined room ${msg.roomId}.`);
      render();
      return;
    }

    if (msg.type === 'state') {
      state.roomId = msg.data.roomId;
      state.started = msg.data.started;
      state.winnerId = msg.data.winnerId;
      state.turnPlayerId = msg.data.turnPlayerId;
      state.turnPlayerName = msg.data.turnPlayerName;
      state.players = msg.data.players;
      state.chosenCharacters = msg.data.chosenCharacters;
      if (state.turnPlayerId !== state.playerId) {
        state.isRolling = false;
      }
      render();
      return;
    }

    if (msg.type === 'roll_result') {
      const result = Number(msg.dice);
      const cube = document.getElementById('dieCube');
      if (cube) cube.classList.remove('rolling');
      if (Number.isInteger(result) && result >= 1 && result <= 6) {
        setDieFace(result);
        els.diceText.textContent = `Moved ${result}`;
      } else {
        els.diceText.textContent = 'Moved';
      }
      state.isRolling = false;
      renderStatus();
      return;
    }

    if (msg.type === 'game_started') {
      logNote('Game started. All character picks are locked.');
      render();
      return;
    }

    if (msg.type === 'private_clue') {
      const clue = msg.data;
      state.myScores[clue.facet][clue.value] += clue.truthful ? 2 : 1;
      if (!clue.truthful) {
        logNote(`Uncertain clue: ${clue.text}`);
      } else {
        logNote(`Clue: ${clue.text}`);
      }
      if (clue.encounter) {
        logNote(`Resident encounter: ${clue.resident} shared private context.`);
      }
      renderEvidence();
      return;
    }

    if (msg.type === 'accuse_result') {
      logNote(msg.message);
      renderStatus();
      renderPlayers();
      return;
    }

    if (msg.type === 'player_eliminated') {
      const mine = msg.playerId === state.playerId;
      logNote(mine ? 'You have been eliminated from this case.' : `${msg.playerName} has been eliminated.`);
      return;
    }

    if (msg.type === 'game_over') {
      if (!msg.winnerId) {
        logNote(msg.reason || 'All investigators were eliminated. Case unsolved.');
      } else {
        const winnerIsMe = msg.winnerId === state.playerId;
        logNote(winnerIsMe ? 'You solved the case first. You win.' : `${msg.winnerName} solved the case first.`);
      }
      state.winnerId = msg.winnerId;
      render();
      return;
    }

    if (msg.type === 'error') {
      logNote(`Error: ${msg.message}`);
      state.isRolling = false;
      const cube = document.getElementById('dieCube');
      if (cube) cube.classList.remove('rolling');
      els.diceText.textContent = 'Ready';
      renderStatus();
    }
  });

  ws.addEventListener('close', () => {
    logNote('Disconnected from server. Reconnect to continue.');
  });
}

function setupDiceVisual() {
  const pips = {
    1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9],
  };
  const faces = [1,2,3,4,5,6].map((v) => {
    const spans = Array.from({ length: 9 }, (_, i) => `<span class="pip ${pips[v].includes(i + 1) ? 'on' : ''}"></span>`).join('');
    return `<div class="die-face face-${v}">${spans}</div>`;
  }).join('');
  els.dieView.innerHTML = `<div id="dieCube" class="die-cube">${faces}</div>`;
}

function setDieFace(value) {
  const cube = document.getElementById('dieCube');
  if (!cube) return;
  const map = {
    1: 'rotateX(0deg) rotateY(0deg)',
    2: 'rotateX(0deg) rotateY(-90deg)',
    3: 'rotateX(-90deg) rotateY(0deg)',
    4: 'rotateX(90deg) rotateY(0deg)',
    5: 'rotateX(0deg) rotateY(90deg)',
    6: 'rotateX(0deg) rotateY(180deg)',
  };
  cube.style.transform = map[value];
}

els.joinBtn.addEventListener('click', () => {
  if (state.ws && state.ws.readyState === 1) {
    logNote('Already connected.');
    return;
  }
  connectAndJoin();
});

els.rollBtn.addEventListener('click', () => {
  if (!state.ws || state.ws.readyState !== 1 || state.isRolling) return;
  state.isRolling = true;
  els.diceText.textContent = 'Rolling...';

  const cube = document.getElementById('dieCube');
  if (cube) {
    cube.classList.add('rolling');
    cube.style.transform = `rotateX(${1080 + Math.floor(Math.random() * 360)}deg) rotateY(${920 + Math.floor(Math.random() * 360)}deg)`;
  }

  setTimeout(() => {
    send({ type: 'roll_move' });
  }, 1000);
});

els.accuseBtn.addEventListener('click', () => {
  els.accuseModal.classList.remove('hidden');
});
els.cancelAccuse.addEventListener('click', () => {
  els.accuseModal.classList.add('hidden');
});
els.submitAccuse.addEventListener('click', () => {
  send({
    type: 'accuse',
    guess: {
      suspect: els.suspectSel.value,
      object: els.objectSel.value,
      apartment: els.apartmentSel.value,
      motive: els.motiveSel.value,
    },
  });
  els.accuseModal.classList.add('hidden');
});

setOptions(els.suspectSel, suspects);
setOptions(els.objectSel, objects);
setOptions(els.apartmentSel, apartments);
setOptions(els.motiveSel, motives);
setupDiceVisual();
render();

if (new URLSearchParams(location.search).get('room')) {
  connectAndJoin();
}
