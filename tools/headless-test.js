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
  if (!L.hasBoss) check(L.flagCol > 0 && L.flagCol < L.cols, 'flag dentro do mapa fase ' + i);
  check(L.pixelWidth === L.cols * 16, 'pixelWidth fase ' + i);
  let coins = 0, enemies = 0, bosses = 0, princesses = 0;
  L.spawns.forEach((s) => {
    if (s.kind === 'coin') coins++;
    else if (s.kind === 'boss') bosses++;
    else if (s.kind === 'princess') princesses++;
    else enemies++;
  });
  console.log('   Fase ' + L.name + ': ' + L.cols + ' cols, ' + enemies + ' inimigos, ' + coins + ' moedas' +
    (bosses ? ', ' + bosses + ' CHEFE' : '') + (princesses ? ', PRINCESA' : ''));
}
check(Levels.count >= 10, 'pelo menos 10 fases (tem ' + Levels.count + ')');

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

/* 5) Testa avanço por TODAS as fases até a vitória (bandeira/chefe/princesa) */
console.log('5) Testando transição por todas as fases até a vitória...');
try {
  Game.start();
  let safety = 0;
  while (Game.state !== 'win' && safety < 24) {
    const L = Game.level;
    if (L.hasPrincess) { Game.bossDefeated = true; Game.rescuePrincess(); }
    else if (L.hasBoss) { Game.beginBossClear(); }
    else { Game.beginFlag(); }
    let g = 0;
    while (Game.state === 'clear' && g < 3000) { Game.player.power = 1; Game.update(); g++; }
    safety++;
  }
  check(Game.state === 'win', 'chegou à vitória após ' + safety + ' fases (estado=' + Game.state + ')');
} catch (e) { failures++; console.log('  EXCEÇÃO transição: ' + e.stack); }

/* 5b) Testa mecânica do CHEFE (stomp/dano reduz vida -> derrota -> clear) */
console.log('5b) Testando mecânica do chefe...');
try {
  let bossIdx = -1;
  for (let i = 0; i < Levels.count; i++) { const L = Levels.load(i); if (L.hasBoss && !L.hasPrincess) { bossIdx = i; break; } }
  check(bossIdx >= 0, 'existe fase de chefe');
  if (bossIdx >= 0) {
    // (a) exercita IA/fogo/desenho do chefe por 400 frames (tolerante a morte)
    Game.start(); Game.loadLevel(bossIdx); Game.lives = 99;
    check(!!Game.boss, 'chefe criado na fase ' + Game.level.name);
    let serr = null;
    for (let f = 0; f < 400 && !serr; f++) {
      if (Game.state !== 'playing') Game.loadLevel(bossIdx);
      Input.right = (f % 60 < 40); Input.left = !Input.right; Input.jump = (f % 40 < 10);
      try { Game.update(); Game.render(); } catch (e) { serr = e; }
    }
    if (serr) { failures++; console.log('  EXCEÇÃO simulando luta: ' + serr.stack); }

    // (b) verificação determinística: jogador invencível, derrota o chefe e confirma o clear
    Game.loadLevel(bossIdx);
    Game.lives = 99; Game.player.power = 2; Game.player.invuln = 1e9;
    let guard = 0;
    while (Game.boss && !Game.boss.defeated && guard < 60) { Game.boss.invuln = 0; Game.boss.hurt(Game); guard++; }
    check(Game.boss.defeated, 'chefe derrotado');
    let g = 0;
    while (Game.state !== 'clear' && g < 300) { Game.player.invuln = 1e9; Game.update(); g++; }
    check(Game.bossDefeated === true, 'bossDefeated marcado');
    check(Game.state === 'clear', 'fase entra em clear após derrotar o chefe (estado=' + Game.state + ')');
  }
} catch (e) { failures++; console.log('  EXCEÇÃO chefe: ' + e.stack); }

/* 5c) Testa resgate da PRINCESA -> vitória */
console.log('5c) Testando resgate da princesa...');
try {
  let princIdx = -1;
  for (let i = 0; i < Levels.count; i++) { const L = Levels.load(i); if (L.hasPrincess) { princIdx = i; break; } }
  check(princIdx >= 0, 'existe fase com princesa');
  if (princIdx >= 0) {
    Game.start(); Game.loadLevel(princIdx);
    Game.lives = 99; Game.player.power = 2; Game.player.invuln = 1e9;
    check(!!Game.princess, 'princesa criada');
    let dg = 0;
    while (Game.boss && !Game.boss.defeated && dg < 60) { Game.boss.invuln = 0; Game.boss.hurt(Game); dg++; }
    let g = 0; while (!Game.bossDefeated && g < 300) { Game.player.invuln = 1e9; Game.update(); g++; }
    check(Game.bossDefeated, 'chefe final derrotado');
    Game.rescuePrincess();
    let g2 = 0; while (Game.state === 'clear' && g2 < 1000) { Game.update(); Game.render(); g2++; }
    check(Game.state === 'win', 'vitória ao resgatar a princesa (estado=' + Game.state + ')');
  }
} catch (e) { failures++; console.log('  EXCEÇÃO princesa: ' + e.stack); }

/* 5d) Renderiza um quadro de cada fase (exercita todos os temas de fundo) */
console.log('5d) Renderizando todos os temas de fundo...');
try {
  Game.start();
  for (let i = 0; i < Levels.count; i++) {
    Game.loadLevel(i);
    for (let f = 0; f < 4; f++) { Game.update(); Game.render(); }
  }
  check(true, 'render de todos os temas sem exceção');
  console.log('   OK - ' + Levels.count + ' fases renderizadas (day/dusk/night/cave/castle)');
} catch (e) { failures++; console.log('  EXCEÇÃO render de tema: ' + e.stack); }

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
