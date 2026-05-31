/* headless-test.js - Executa o jogo num DOM/Canvas falso para validar runtime. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function noop() {}
function makeCtx() {
  return new Proxy({
    fillStyle: '', strokeStyle: '', font: '', textAlign: '', globalAlpha: 1, imageSmoothingEnabled: false,
    fillRect: noop, strokeRect: noop, clearRect: noop, drawImage: noop,
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop, setTransform: noop, transform: noop,
    beginPath: noop, closePath: noop, rect: noop, clip: noop, arc: noop, moveTo: noop, lineTo: noop,
    fill: noop, stroke: noop, fillText: noop, strokeText: noop,
    createLinearGradient: function () { return { addColorStop: noop }; },
    createRadialGradient: function () { return { addColorStop: noop }; },
    measureText: function () { return { width: 10 }; }
  }, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
}
function makeCanvas(w, h) {
  return { width: w || 0, height: h || 0, clientWidth: 900, clientHeight: 500, getContext: () => makeCtx(), style: {} };
}
function makeEl() {
  const cl = { _s: {}, add(c) { this._s[c] = 1; }, remove(c) { delete this._s[c]; }, contains(c) { return !!this._s[c]; }, toggle(c) { this._s[c] ? this.remove(c) : this.add(c); } };
  return { textContent: '', innerHTML: '', classList: cl, style: {}, addEventListener: noop, removeEventListener: noop };
}

const els = {};
const document = {
  readyState: 'complete',
  getElementById: (id) => (els[id] || (els[id] = id === 'game' ? makeCanvas() : makeEl())),
  querySelector: () => makeEl(),
  createElement: (t) => (t === 'canvas' ? makeCanvas() : makeEl()),
  addEventListener: noop, removeEventListener: noop, hidden: false
};

const sandbox = {
  console, Math, Date, JSON, parseInt, parseFloat, isNaN, Array, Object, String, Number,
  performance: { now: () => Date.now() },
  requestAnimationFrame: noop,
  setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 0; },
  clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  document
};
sandbox.window = sandbox;
sandbox.window.devicePixelRatio = 1;
sandbox.window.addEventListener = noop;
sandbox.window.AudioContext = undefined; // desativa áudio no teste
vm.createContext(sandbox);

const base = path.join(__dirname, '..', 'www', 'src');
['audio.js', 'input.js', 'sprites.js', 'entities.js', 'levels.js', 'game.js'].forEach((f) => {
  const code = fs.readFileSync(path.join(base, f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const Game = sandbox.window.Game;
const Input = sandbox.window.Input;
const Levels = sandbox.window.Levels;
let failures = 0;
function check(cond, msg) { if (!cond) { failures++; console.log('  FALHA: ' + msg); } }

/* 1) Construção de todas as fases */
console.log('1) Construindo fases...');
for (let i = 0; i < Levels.count; i++) {
  const L = Levels.load(i);
  check(L.cols > 0 && L.rows === 15, 'dimensões fase ' + i);
  check(L.flagCol > 0 && L.flagCol < L.cols, 'flag dentro do mapa fase ' + i);
  check(L.pixelWidth === L.cols * 16, 'pixelWidth fase ' + i);
  let coins = 0, enemies = 0;
  L.spawns.forEach((s) => { if (s.kind === 'coin') coins++; else enemies++; });
  console.log('   Fase ' + L.name + ': ' + L.cols + ' cols, ' + enemies + ' inimigos, ' + coins + ' moedas');
}

/* 2) Init + start */
console.log('2) Init e start...');
Game.init(document.getElementById('game'));
Game.start();
check(Game.state === 'playing', 'estado playing após start');
check(!!Game.player, 'player criado');
check(Game.entities.length > 0, 'entidades criadas');

/* 3) Loop longo com input simulado (anda para a direita e pula) */
console.log('3) Simulando jogabilidade (4000 frames)...');
let err = null, frames = 0;
for (let f = 0; f < 4000 && !err; f++) {
  Input.right = true; Input.left = false;
  Input.run = (f % 3 !== 0);
  // pula com frequência para vencer canos e buracos
  const wantJump = (f % 22 < 8);
  Input.jump = wantJump;
  try { Game.update(); frames++; Game.render(); } catch (e) { err = e; }
}
if (err) { failures++; console.log('  EXCEÇÃO no frame ~' + frames + ': ' + err.stack); }
else console.log('   OK - ' + frames + ' frames sem exceção. Estado=' + Game.state + ' vidas=' + Game.lives + ' pontos=' + Game.score);

/* 4) Testa power-ups via bloco e aplicação */
console.log('4) Testando power-ups e blocos...');
Game.start();
const p = Game.player;
// acha um bloco QPOW na fase atual
let found = null, L0 = Game.level;
for (let r = 0; r < L0.rows && !found; r++) for (let c = 0; c < L0.cols; c++) { if (L0.grid[r][c] === Levels.T.QPOW) { found = { c, r }; break; } }
check(!!found, 'achou bloco de power-up');
if (found) {
  try {
    Game.hitBlockFromBelow(found.c, found.r, p);
    check(L0.grid[found.r][found.c] === Levels.T.USED, 'bloco virou USED');
    const pu = Game.entities.filter((e) => e.type === 'powerup')[0];
    check(!!pu, 'power-up surgiu');
    if (pu) {
      pu.emerge = 0;
      pu.apply(p, Game);
      check(p.power >= 1, 'player cresceu/power-up aplicado (power=' + p.power + ')');
    }
  } catch (e) { failures++; console.log('  EXCEÇÃO power-up: ' + e.stack); }
}

/* 5) Testa sequência da bandeira -> avanço de fase -> vitória */
console.log('5) Testando bandeira e transição entre fases...');
try {
  Game.start();
  let safety = 0;
  while (Game.state !== 'win' && safety < 6) {
    Game.beginFlag();
    let g = 0;
    while (Game.state === 'clear' && g < 2000) { Game.player.power = 1; Game.update(); g++; }
    safety++;
  }
  check(Game.state === 'win', 'chegou à vitória após ' + safety + ' fases (estado=' + Game.state + ')');
} catch (e) { failures++; console.log('  EXCEÇÃO bandeira: ' + e.stack); }

/* 6) Testa morte/respawn/game over */
console.log('6) Testando morte e game over...');
try {
  Game.start();
  Game.lives = 0;
  Game.player.power = 0;
  Game.player.die(Game);
  let g = 0;
  while (Game.state === 'playing' && g < 400) { Game.update(); g++; }
  check(Game.state === 'gameover', 'game over após acabar vidas (estado=' + Game.state + ')');
} catch (e) { failures++; console.log('  EXCEÇÃO morte: ' + e.stack); }

console.log('\n=== RESULTADO: ' + (failures === 0 ? 'TODOS OS TESTES PASSARAM ✔' : failures + ' FALHA(S) ✘') + ' ===');
process.exit(failures === 0 ? 0 : 1);
