/* sprites.js - Pixel art procedural desenhada em canvas (sem assets externos) */
(function () {
  'use strict';

  var TILE = 16; // resolução nativa de um tile

  function cv(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function ctxOf(c) {
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return x;
  }
  // Desenha "pixel" (retângulo) no grid nativo
  function p(x, rx, ry, rw, rh, color) {
    x.fillStyle = color;
    x.fillRect(rx, ry, rw, rh);
  }

  /* ---------- Paletas ---------- */
  var COL = {
    red: '#e23636', redD: '#9c1f1f',
    skin: '#ffc28a', skinD: '#d98a52',
    brown: '#7a4a22', brownD: '#522f12',
    blue: '#3556c8', blueD: '#22357f',
    yellow: '#ffd23f', dark: '#201509', white: '#ffffff',
    green: '#3fa34d', greenD: '#1f7a35', greenL: '#7bd35a',
    grass: '#46c24a', grassL: '#7be07b',
    dirt: '#c2691c', dirtD: '#8a3f0d',
    brick: '#c8500f', brickD: '#7a2e06',
    qb: '#f6a821', qbD: '#a85e08', qbL: '#ffd56b'
  };

  /* ---------- Herói (Mario-like) composto por retângulos ---------- */
  // opt: {tall, frame, shirt, overalls, hat, skin}
  function drawHero(x, opt) {
    var f = opt.frame || 'idle';
    var hat = opt.hat || COL.red;
    var shirt = opt.shirt || COL.red;
    var ov = opt.overalls || COL.blue;
    var sk = opt.skin || COL.skin;
    var bottomLegs;

    // Boné
    p(x, 4, 1, 7, 3, hat);
    p(x, 3, 4, 11, 1, hat);
    p(x, 10, 3, 4, 1, hat); // aba frontal
    // Rosto
    p(x, 4, 4, 8, 4, sk);
    // Cabelo / costeleta
    p(x, 4, 5, 1, 3, COL.brown);
    // Olho
    p(x, 9, 5, 1, 2, COL.dark);
    // Bigode
    p(x, 7, 7, 5, 1, COL.brown);
    // Orelha
    p(x, 5, 6, 1, 1, COL.skinD);

    if (opt.tall) {
      // Corpo grande (16x28)
      p(x, 4, 8, 8, 3, shirt);          // camisa
      p(x, 3, 11, 10, 8, ov);           // macacão
      p(x, 5, 8, 1, 3, ov);             // alça
      p(x, 9, 8, 1, 3, ov);             // alça
      p(x, 6, 13, 1, 1, COL.yellow);    // botão
      p(x, 9, 13, 1, 1, COL.yellow);    // botão
      p(x, 2, 11, 2, 5, sk);            // braço esq
      p(x, 12, 11, 2, 5, sk);           // braço dir
      if (f === 'jump') { p(x, 2, 9, 2, 3, sk); p(x, 12, 9, 2, 3, sk); }
      if (f === 'crouch') {
        p(x, 3, 16, 10, 4, ov);
        p(x, 3, 20, 5, 2, COL.brown); p(x, 9, 20, 5, 2, COL.brown);
        return;
      }
      bottomLegs = 19;
      p(x, 4, 19, 3, 4, ov); p(x, 9, 19, 3, 4, ov); // pernas
      if (f === 'walk1') { p(x, 3, 23, 4, 2, COL.brown); p(x, 10, 22, 4, 2, COL.brown); }
      else if (f === 'walk2') { p(x, 3, 22, 4, 2, COL.brown); p(x, 10, 23, 4, 2, COL.brown); }
      else if (f === 'jump') { p(x, 3, 22, 4, 2, COL.brown); p(x, 9, 23, 4, 2, COL.brown); }
      else { p(x, 4, 23, 3, 2, COL.brown); p(x, 9, 23, 3, 2, COL.brown); }
    } else {
      // Corpo pequeno (16x16)
      p(x, 4, 8, 8, 2, shirt);          // camisa
      p(x, 3, 10, 10, 3, ov);           // macacão
      p(x, 5, 8, 1, 2, ov);             // alça
      p(x, 9, 8, 1, 2, ov);             // alça
      p(x, 5, 10, 1, 1, COL.yellow);
      p(x, 10, 10, 1, 1, COL.yellow);
      p(x, 2, 10, 1, 2, sk); p(x, 13, 10, 1, 2, sk); // mãos
      if (f === 'jump') { p(x, 2, 8, 1, 2, sk); p(x, 13, 8, 1, 2, sk); }
      if (f === 'walk1') { p(x, 3, 13, 4, 2, COL.brown); p(x, 10, 12, 4, 2, COL.brown); }
      else if (f === 'walk2') { p(x, 3, 12, 4, 2, COL.brown); p(x, 10, 13, 4, 2, COL.brown); }
      else if (f === 'jump') { p(x, 2, 12, 4, 2, COL.brown); p(x, 10, 13, 4, 2, COL.brown); }
      else { p(x, 3, 13, 4, 2, COL.brown); p(x, 9, 13, 4, 2, COL.brown); }
    }
  }

  function heroSprite(opt) {
    var h = opt.tall ? 28 : 16;
    var c = cv(16, h);
    drawHero(ctxOf(c), opt);
    return c;
  }

  /* ---------- Goomba ---------- */
  function goomba(frame) {
    var c = cv(16, 16), x = ctxOf(c);
    // Corpo cogumelo
    p(x, 4, 2, 8, 2, COL.brown);
    p(x, 2, 4, 12, 6, COL.brown);
    p(x, 1, 6, 14, 4, COL.brown);
    // Parte de baixo clara
    p(x, 3, 10, 10, 2, '#e8c89a');
    // Olhos
    p(x, 3, 6, 4, 3, COL.white);
    p(x, 9, 6, 4, 3, COL.white);
    p(x, 5, 6, 2, 3, COL.dark); // pupila
    p(x, 9, 6, 2, 3, COL.dark);
    // Sobrancelhas bravas
    p(x, 3, 5, 4, 1, COL.dark);
    p(x, 9, 5, 4, 1, COL.dark);
    // Pés
    if (frame === 1) { p(x, 1, 12, 5, 3, COL.brownD); p(x, 11, 12, 4, 3, COL.brownD); }
    else { p(x, 2, 12, 4, 3, COL.brownD); p(x, 10, 12, 5, 3, COL.brownD); }
    return c;
  }
  function goombaFlat() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 1, 11, 14, 4, COL.brown);
    p(x, 2, 10, 12, 1, COL.brownD);
    p(x, 4, 12, 3, 2, COL.dark);
    p(x, 9, 12, 3, 2, COL.dark);
    return c;
  }

  /* ---------- Koopa (tartaruga) ---------- */
  function koopa(frame) {
    var c = cv(16, 18), x = ctxOf(c);
    // Cabeça
    p(x, 10, 1, 4, 4, COL.greenL);
    p(x, 11, 2, 4, 4, COL.green);
    p(x, 13, 2, 1, 2, COL.dark); // olho
    // Pescoço
    p(x, 9, 5, 4, 3, COL.greenL);
    // Casco
    p(x, 2, 5, 10, 8, COL.green);
    p(x, 3, 4, 8, 2, COL.greenD);
    p(x, 4, 7, 6, 4, COL.yellow); // barriga do casco
    p(x, 3, 6, 8, 1, COL.greenL);
    // Pés
    if (frame === 1) { p(x, 2, 13, 4, 3, COL.yellow); p(x, 9, 14, 4, 2, COL.yellow); }
    else { p(x, 2, 14, 4, 2, COL.yellow); p(x, 9, 13, 4, 3, COL.yellow); }
    return c;
  }
  function koopaShell() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 2, 5, 12, 9, COL.green);
    p(x, 3, 4, 10, 2, COL.greenD);
    p(x, 4, 7, 8, 5, COL.yellow);
    p(x, 3, 6, 10, 1, COL.greenL);
    p(x, 2, 13, 12, 1, COL.greenD);
    return c;
  }

  /* ---------- Moeda (animação de giro) ---------- */
  function coin(w) {
    var c = cv(16, 16), x = ctxOf(c);
    var cx = 8;
    p(x, cx - w, 1, w * 2, 14, COL.yellow);
    p(x, cx - w, 0, w * 2, 1, COL.qbD);
    p(x, cx - w, 15, w * 2, 1, COL.qbD);
    if (w >= 2) {
      p(x, cx - 1, 4, 2, 8, '#fff1a8'); // brilho central
      p(x, cx - (w), 3, 1, 10, COL.qbL);
    }
    return c;
  }

  /* ---------- Power-ups ---------- */
  function mushroom() {
    var c = cv(16, 16), x = ctxOf(c);
    // Cabeça vermelha
    p(x, 3, 2, 10, 6, COL.red);
    p(x, 2, 4, 12, 4, COL.red);
    p(x, 4, 1, 8, 1, COL.redD);
    // Pintas brancas
    p(x, 4, 3, 3, 3, COL.white);
    p(x, 9, 3, 3, 3, COL.white);
    p(x, 7, 5, 2, 2, COL.white);
    // Caule
    p(x, 4, 8, 8, 6, '#ffe9c8');
    // Olhos
    p(x, 5, 10, 2, 3, COL.dark);
    p(x, 9, 10, 2, 3, COL.dark);
    return c;
  }
  function fireFlower() {
    var c = cv(16, 16), x = ctxOf(c);
    // Pétalas
    p(x, 5, 1, 6, 2, '#ff7b29');
    p(x, 3, 2, 10, 4, '#ffa53f');
    p(x, 5, 3, 6, 2, '#ffe14a');
    p(x, 6, 3, 4, 2, COL.white);
    p(x, 7, 4, 2, 1, COL.dark);
    // Caule e folhas
    p(x, 7, 6, 2, 8, COL.green);
    p(x, 3, 9, 4, 2, COL.greenL);
    p(x, 9, 11, 4, 2, COL.greenL);
    return c;
  }
  function star() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 7, 1, 2, 14, COL.yellow);
    p(x, 2, 6, 12, 3, COL.yellow);
    p(x, 4, 4, 8, 8, COL.yellow);
    p(x, 3, 11, 3, 3, COL.yellow);
    p(x, 10, 11, 3, 3, COL.yellow);
    p(x, 5, 6, 2, 2, COL.dark);
    p(x, 9, 6, 2, 2, COL.dark);
    p(x, 5, 9, 6, 1, COL.qbD);
    return c;
  }

  /* ---------- Blocos (tiles 16x16) ---------- */
  function ground() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 0, 0, 16, 16, COL.dirt);
    // grama no topo
    p(x, 0, 0, 16, 5, COL.grass);
    p(x, 0, 0, 16, 2, COL.grassL);
    // textura de terra
    p(x, 1, 7, 3, 2, COL.dirtD);
    p(x, 8, 8, 3, 2, COL.dirtD);
    p(x, 5, 12, 3, 2, COL.dirtD);
    p(x, 12, 11, 2, 2, COL.dirtD);
    p(x, 0, 15, 16, 1, COL.dirtD);
    return c;
  }
  function brick() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 0, 0, 16, 16, COL.brick);
    p(x, 0, 0, 16, 1, '#e8742a');
    // argamassa
    p(x, 0, 7, 16, 1, COL.brickD);
    p(x, 0, 15, 16, 1, COL.brickD);
    p(x, 7, 0, 1, 7, COL.brickD);
    p(x, 3, 8, 1, 7, COL.brickD);
    p(x, 11, 8, 1, 7, COL.brickD);
    return c;
  }
  function qblock(bright) {
    var c = cv(16, 16), x = ctxOf(c);
    var base = bright ? COL.qbL : COL.qb;
    p(x, 0, 0, 16, 16, COL.qbD);
    p(x, 1, 1, 14, 14, base);
    p(x, 1, 1, 14, 2, COL.qbL);
    // rebites
    p(x, 1, 1, 2, 2, COL.dark); p(x, 13, 1, 2, 2, COL.dark);
    p(x, 1, 13, 2, 2, COL.dark); p(x, 13, 13, 2, 2, COL.dark);
    // ponto de interrogação
    p(x, 6, 4, 4, 1, COL.dark);
    p(x, 9, 4, 1, 3, COL.dark);
    p(x, 7, 6, 3, 1, COL.dark);
    p(x, 7, 7, 1, 2, COL.dark);
    p(x, 7, 10, 1, 2, COL.dark); // ponto
    return c;
  }
  function usedBlock() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 0, 0, 16, 16, COL.brownD);
    p(x, 1, 1, 14, 14, '#a86a2e');
    p(x, 1, 1, 14, 2, '#c98b46');
    p(x, 1, 1, 2, 2, COL.dark); p(x, 13, 1, 2, 2, COL.dark);
    p(x, 1, 13, 2, 2, COL.dark); p(x, 13, 13, 2, 2, COL.dark);
    return c;
  }
  function stone() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 0, 0, 16, 16, '#8a8a8a');
    p(x, 0, 0, 16, 2, '#b5b5b5');
    p(x, 0, 14, 16, 2, '#666');
    p(x, 4, 5, 3, 2, '#6f6f6f');
    p(x, 9, 9, 3, 2, '#6f6f6f');
    return c;
  }

  /* ---------- Cano (top 32x16, corpo 32x16) ---------- */
  function pipeTop() {
    var c = cv(32, 16), x = ctxOf(c);
    p(x, 0, 0, 32, 16, COL.green);
    p(x, 0, 0, 32, 4, COL.greenL);
    p(x, 0, 4, 32, 1, COL.greenD);
    p(x, 0, 0, 4, 16, COL.greenL);
    p(x, 28, 0, 4, 16, COL.greenD);
    p(x, 0, 15, 32, 1, COL.greenD);
    return c;
  }
  function pipeBody() {
    var c = cv(32, 16), x = ctxOf(c);
    p(x, 2, 0, 28, 16, COL.green);
    p(x, 2, 0, 4, 16, COL.greenL);
    p(x, 26, 0, 4, 16, COL.greenD);
    return c;
  }

  /* ---------- Bandeira / mastro ---------- */
  function flagPole() {
    var c = cv(8, 16), x = ctxOf(c);
    p(x, 3, 0, 2, 16, '#cfcfcf');
    p(x, 3, 0, 1, 16, '#ffffff');
    return c;
  }
  function flagTop() {
    var c = cv(16, 16), x = ctxOf(c);
    p(x, 3, 0, 2, 16, '#cfcfcf');
    p(x, 1, 0, 6, 2, '#2bb32b');
    // bandeira triangular
    p(x, 5, 2, 9, 2, COL.green);
    p(x, 5, 4, 7, 2, COL.green);
    p(x, 5, 6, 5, 2, COL.green);
    p(x, 5, 8, 3, 2, COL.green);
    return c;
  }

  /* ---------- Decoração de fundo ---------- */
  function cloud() {
    var c = cv(32, 16), x = ctxOf(c);
    p(x, 6, 6, 20, 8, COL.white);
    p(x, 10, 3, 12, 6, COL.white);
    p(x, 4, 9, 24, 5, COL.white);
    p(x, 6, 13, 20, 2, '#cfe0ff');
    return c;
  }
  function bush() {
    var c = cv(48, 16), x = ctxOf(c);
    p(x, 4, 8, 40, 8, COL.green);
    p(x, 8, 5, 12, 6, COL.greenL);
    p(x, 20, 3, 12, 8, COL.greenL);
    p(x, 30, 6, 12, 5, COL.green);
    p(x, 4, 14, 40, 2, COL.greenD);
    return c;
  }
  function hill() {
    var c = cv(64, 32), x = ctxOf(c);
    for (var i = 0; i < 32; i++) {
      var w = Math.round((i / 32) * 60);
      p(x, 32 - w, 32 - i, w * 2, 1, COL.greenD);
    }
    p(x, 14, 22, 4, 3, COL.green);
    p(x, 44, 20, 4, 3, COL.green);
    p(x, 28, 14, 4, 3, COL.green);
    return c;
  }
  function castle() {
    var c = cv(80, 80), x = ctxOf(c);
    var br = '#c0c0c0', brd = '#8a8a8a', dk = '#3a3a3a';
    p(x, 0, 30, 80, 50, br);
    // torres
    p(x, 0, 18, 16, 62, br); p(x, 64, 18, 16, 62, br);
    p(x, 32, 8, 16, 72, br);
    // ameias
    for (var i = 0; i < 80; i += 8) p(x, i, 14, 4, 4, br);
    // porta
    p(x, 32, 52, 16, 28, dk);
    p(x, 36, 56, 8, 20, '#111');
    // janelas
    p(x, 6, 40, 4, 6, dk); p(x, 70, 40, 4, 6, dk);
    p(x, 36, 24, 8, 8, dk);
    // sombras
    p(x, 0, 76, 80, 4, brd);
    return c;
  }

  /* ---------- Inicialização: pré-renderiza tudo ---------- */
  var Sprites = {
    TILE: TILE,
    img: {},
    heroSmall: {}, heroBig: {}, heroFire: {},
    init: function () {
      var frames = ['idle', 'walk1', 'walk2', 'jump'];
      var self = this;
      frames.concat(['crouch']).forEach(function (f) {
        self.heroSmall[f] = heroSprite({ tall: false, frame: f });
        self.heroBig[f] = heroSprite({ tall: true, frame: f });
        self.heroFire[f] = heroSprite({ tall: true, frame: f, shirt: COL.white, overalls: COL.red, hat: COL.white });
      });

      this.img.goomba = [goomba(0), goomba(1)];
      this.img.goombaFlat = goombaFlat();
      this.img.koopa = [koopa(0), koopa(1)];
      this.img.koopaShell = koopaShell();
      this.img.coin = [coin(7), coin(5), coin(2), coin(5)];
      this.img.mushroom = mushroom();
      this.img.fireFlower = fireFlower();
      this.img.star = star();

      this.img.ground = ground();
      this.img.brick = brick();
      this.img.qblock = [qblock(false), qblock(true)];
      this.img.used = usedBlock();
      this.img.stone = stone();

      this.img.pipeTop = pipeTop();
      this.img.pipeBody = pipeBody();

      this.img.flagPole = flagPole();
      this.img.flagTop = flagTop();

      this.img.cloud = cloud();
      this.img.bush = bush();
      this.img.hill = hill();
      this.img.castle = castle();
    }
  };

  window.Sprites = Sprites;
  window.COL = COL;
})();
