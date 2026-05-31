/* levels.js - Definição das fases via construtor de grid */
(function () {
  'use strict';

  // Códigos de tile (1 caractere cada)
  var T = {
    EMPTY: ' ', GROUND: 'G', BRICK: 'B',
    QCOIN: '?', QPOW: 'M', QSTAR: '*', USED: 'u',
    STONE: 'X',
    PIPE_TL: '[', PIPE_TR: ']', PIPE_BL: '{', PIPE_BR: '}',
    POLE: '|', POLETOP: 'T'
  };
  var SOLID = {
    'G': 1, 'B': 1, '?': 1, 'M': 1, '*': 1, 'u': 1, 'X': 1,
    '[': 1, ']': 1, '{': 1, '}': 1
  };

  var ROWS = 15;
  var FLOOR = 13; // linha de topo do chão (linhas 13 e 14 = chão sólido)

  function makeGrid(cols) {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) row.push(T.EMPTY);
      g.push(row);
    }
    return g;
  }

  // ---- API de construção ----
  function Builder(cols, opts) {
    this.cols = cols; this.rows = ROWS;
    this.grid = makeGrid(cols);
    this.spawns = [];
    this.decor = [];
    this.items = {};
    this.flagCol = cols - 12;
    this.castleCol = cols - 6;
    this.theme = (opts && opts.theme) || 'day';
    this.name = (opts && opts.name) || '1-1';
    this.time = (opts && opts.time) || 400;
    this.startX = 2 * 16;
    this.startY = (FLOOR - 1) * 16;
  }
  var B = Builder.prototype;
  B.set = function (c, r, t) { if (r >= 0 && r < ROWS && c >= 0 && c < this.cols) this.grid[r][c] = t; };
  B.floor = function (c0, c1) { for (var c = c0; c <= c1; c++) { this.set(c, FLOOR, T.GROUND); this.set(c, FLOOR + 1, T.GROUND); } };
  B.fillCol = function (c, r0, r1, t) { for (var r = r0; r <= r1; r++) this.set(c, r, t); };
  B.bricks = function (c0, c1, r) { for (var c = c0; c <= c1; c++) this.set(c, r, T.BRICK); };
  B.qcoin = function (c, r) { this.set(c, r, T.QCOIN); };
  B.qpow = function (c, r) { this.set(c, r, T.QPOW); };
  B.qstar = function (c, r) { this.set(c, r, T.QSTAR); };
  B.coinBrick = function (c, r) { this.set(c, r, T.BRICK); this.items[r * this.cols + c] = 'coin'; };
  B.coin = function (c, r) { this.spawns.push({ kind: 'coin', x: c * 16, y: r * 16 }); };
  B.coinRow = function (c0, c1, r) { for (var c = c0; c <= c1; c++) this.coin(c, r); };
  B.coinArc = function (c0, r, n) { for (var i = 0; i < n; i++) this.coin(c0 + i, r - Math.round(Math.sin((i / (n - 1)) * Math.PI) * 3)); };
  B.pipe = function (c, height) {
    var topRow = FLOOR - height;
    this.set(c, topRow, T.PIPE_TL); this.set(c + 1, topRow, T.PIPE_TR);
    for (var r = topRow + 1; r < FLOOR; r++) { this.set(c, r, T.PIPE_BL); this.set(c + 1, r, T.PIPE_BR); }
  };
  B.stairs = function (c0, size, dir) {
    // dir 1 = sobe para a direita, -1 = desce
    for (var i = 0; i < size; i++) {
      var h = i + 1;
      var c = dir > 0 ? c0 + i : c0 + (size - 1 - i);
      for (var r = FLOOR - h; r < FLOOR; r++) this.set(c, r, T.STONE);
    }
  };
  B.block = function (c0, c1, r0, r1, t) { for (var c = c0; c <= c1; c++) for (var r = r0; r <= r1; r++) this.set(c, r, t || T.STONE); };
  B.goomba = function (c, groundRow) { this.spawns.push({ kind: 'goomba', x: c * 16, y: (groundRow) * 16 - 14 }); };
  B.koopa = function (c, groundRow) { this.spawns.push({ kind: 'koopa', x: c * 16, y: (groundRow) * 16 - 22 }); };
  B.flag = function (c) {
    this.flagCol = c;
    this.set(c, 2, T.POLETOP);
    for (var r = 3; r < FLOOR; r++) this.set(c, r, T.POLE);
    this.set(c, FLOOR, T.STONE);
  };
  B.cloud = function (c, r) { this.decor.push({ kind: 'cloud', x: c * 16, y: r * 16 }); };
  B.hill = function (c, r) { this.decor.push({ kind: 'hill', x: c * 16, y: r * 16 }); };
  B.bush = function (c, r) { this.decor.push({ kind: 'bush', x: c * 16, y: r * 16 }); };
  B.finalize = function () {
    this.pixelWidth = this.cols * 16;
    this.pixelHeight = this.rows * 16;
    this.castleCol = this.flagCol + 6;
    return this;
  };

  function scatterDecor(b) {
    for (var i = 0; i < b.cols; i += 18) { b.cloud(i + 3, 2 + (i % 3)); b.cloud(i + 11, 3); }
    for (var h = 0; h < b.cols; h += 24) b.hill(h, FLOOR - 2);
    for (var s = 6; s < b.cols; s += 14) b.bush(s, FLOOR - 1);
  }

  /* ============== FASE 1-1 ============== */
  function level1() {
    var b = new Builder(214, { name: '1-1', time: 400, theme: 'day' });
    // chão com buracos
    b.floor(0, 68); b.floor(71, 86); b.floor(89, 152); b.floor(155, 213);
    scatterDecor(b);

    // Primeiros blocos
    b.qcoin(16, 9);
    b.bricks(20, 20, 9);
    b.qpow(21, 9);       // cogumelo / flor
    b.coinBrick(22, 9);
    b.qcoin(23, 9);
    b.bricks(24, 24, 9);
    b.qcoin(22, 5);      // bloco alto

    // Canos
    b.pipe(28, 2);
    b.pipe(38, 3);
    b.pipe(46, 4);
    b.pipe(57, 4);

    // Inimigos iniciais
    b.goomba(24, FLOOR); b.goomba(40, FLOOR); b.goomba(51, FLOOR); b.goomba(52, FLOOR);
    b.koopa(63, FLOOR);

    // Após o primeiro buraco
    b.coinArc(72, FLOOR - 2, 6);
    b.qstar(78, 9);      // estrela!
    b.goomba(78, FLOOR); b.goomba(80, FLOOR);

    // Bloco flutuante com moedas
    b.bricks(91, 92, 9);
    b.qcoin(93, 9);
    b.bricks(94, 95, 9);
    b.coinRow(91, 95, 5);
    b.goomba(100, FLOOR); b.goomba(101, FLOOR);
    b.koopa(110, FLOOR);

    // Plataforma elevada de tijolos
    b.bricks(118, 124, 9);
    b.qpow(121, 9);
    b.coinRow(118, 124, 7);
    b.goomba(120, 9); b.goomba(123, 9);

    // Canos finais (sem inimigo espremido entre eles)
    b.pipe(130, 2); b.pipe(138, 3);
    b.goomba(147, FLOOR); b.goomba(149, FLOOR);

    // Escadaria-pirâmide antes da bandeira (sobe e desce conectadas)
    b.stairs(170, 4, 1);
    b.stairs(174, 4, -1);
    b.bricks(188, 191, 9);
    b.coinRow(188, 191, 7);

    // Bandeira e castelo
    b.flag(200);

    return b.finalize();
  }

  /* ============== FASE 1-2 ============== */
  function level2() {
    var b = new Builder(220, { name: '1-2', time: 400, theme: 'day' });
    b.floor(0, 40); b.floor(44, 92); b.floor(96, 150); b.floor(154, 219);
    scatterDecor(b);

    // Cogumelo logo no início
    b.qpow(8, 9);
    b.bricks(12, 16, 9);
    b.coinRow(12, 16, 7);
    b.goomba(20, FLOOR); b.koopa(25, FLOOR);

    // Aproximação livre até o cano, depois um buraco
    b.pipe(33, 3);
    // Buraco - precisa pular (cols 41-43)
    b.qcoin(46, 9); b.qcoin(48, 9); b.qcoin(50, 9);
    b.koopa(52, FLOOR);
    b.goomba(56, FLOOR); b.goomba(57, FLOOR);

    // Plataformas escalonadas
    b.block(60, 62, 10, 10, T.STONE);
    b.block(66, 68, 8, 8, T.STONE);
    b.coinRow(66, 68, 6);
    b.block(72, 74, 6, 6, T.STONE);
    b.qstar(73, 4);
    b.koopa(80, FLOOR); b.goomba(84, FLOOR); b.goomba(85, FLOOR);

    // Sequência de tijolos com surpresa
    b.bricks(100, 100, 9);
    b.qpow(101, 9);
    b.bricks(102, 104, 9);
    b.coinBrick(103, 5);
    b.goomba(110, FLOOR); b.koopa(115, FLOOR); b.goomba(120, FLOOR);

    // Canos (sem inimigos espremidos entre eles)
    b.pipe(124, 3); b.pipe(132, 4); b.pipe(140, 2);

    // Plataforma flutuante longa com moedas
    b.bricks(158, 168, 8);
    b.coinRow(158, 168, 6);
    b.goomba(160, 8); b.goomba(165, 8);

    // Escada-pirâmide final (conectada)
    b.stairs(176, 4, 1);
    b.stairs(180, 4, -1);
    b.koopa(195, FLOOR);

    b.flag(206);
    return b.finalize();
  }

  /* ============== FASE 1-3 (mais difícil) ============== */
  function level3() {
    var b = new Builder(230, { name: '1-3', time: 350, theme: 'dusk' });
    b.floor(0, 24); b.floor(28, 40); b.floor(44, 60); b.floor(64, 110);
    b.floor(114, 160); b.floor(164, 229);
    scatterDecor(b);

    b.qpow(6, 9);
    b.koopa(14, FLOOR); b.goomba(18, FLOOR); b.goomba(19, FLOOR);

    // Plataformas isoladas (saltos precisos)
    b.block(30, 31, 10, 10, T.STONE);
    b.coin(30, 8); b.coin(31, 8);
    b.block(36, 38, 8, 8, T.STONE);
    b.qcoin(37, 6);

    b.koopa(50, FLOOR); b.goomba(54, FLOOR);
    b.qstar(56, 9);

    // Corredor com tijolos e inimigos
    b.bricks(66, 78, 9);
    b.coinRow(66, 78, 7);
    b.qpow(70, 9); b.coinBrick(74, 9);
    b.goomba(68, 9); b.goomba(72, 9); b.koopa(76, 9);
    b.goomba(85, FLOOR); b.goomba(86, FLOOR); b.koopa(95, FLOOR);

    // Canos altos seguidos (sem inimigo espremido entre eles)
    b.pipe(100, 4); b.pipe(106, 4);

    // Pirâmide com topo maciço (conectada, transponível)
    b.stairs(118, 4, 1);                 // sobe 118-121 até h4 (topo na row 9)
    b.block(122, 128, 9, 12, T.STONE);   // topo maciço no mesmo nível
    b.coinRow(122, 128, 7);
    b.goomba(124, 9); b.koopa(127, 9);   // sobre o topo
    b.stairs(129, 4, -1);                // desce 129-132

    b.goomba(142, FLOOR); b.goomba(143, FLOOR); b.koopa(150, FLOOR); b.goomba(156, FLOOR);

    // Trecho final exigente
    b.pipe(168, 3); b.pipe(176, 4);
    b.bricks(184, 190, 9);
    b.qpow(187, 9);
    b.coinRow(184, 190, 7);
    b.koopa(186, 9);
    b.stairs(199, 5, 1);

    b.flag(216);
    return b.finalize();
  }

  var BUILDERS = [level1, level2, level3];

  window.Levels = {
    T: T, SOLID: SOLID, ROWS: ROWS, FLOOR: FLOOR,
    count: BUILDERS.length,
    load: function (i) { return BUILDERS[((i % BUILDERS.length) + BUILDERS.length) % BUILDERS.length](); }
  };
})();
