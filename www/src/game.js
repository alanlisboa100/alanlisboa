/* game.js - Núcleo: loop, câmera, colisões, blocos, HUD e estados */
(function () {
  'use strict';

  var VIEW_W = 432, VIEW_H = 240; // 27x15 tiles
  var TILE = 16;
  var E = window.Entities;

  var Game = {
    canvas: null, ctx: null,
    state: 'menu', // menu | playing | paused | clear | gameover | win
    levelIndex: 0,
    lives: 3, score: 0, coins: 0,
    level: null, player: null, entities: [],
    camera: { x: 0, y: 0 },
    bumps: [],
    time: 400, timeAcc: 0,
    flashTimer: 0,
    clearTimer: 0,
    deathTimer: 0,
    anim: 0,
    dom: {},

    init: function (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      window.Sprites.init();
      window.Input.init();
      window.Sfx.init();

      var self = this;
      window.Input.onPause = function () { self.togglePause(); };

      this.dom = {
        world: document.getElementById('hud-world'),
        coins: document.getElementById('hud-coins'),
        score: document.getElementById('hud-score'),
        lives: document.getElementById('hud-lives'),
        time: document.getElementById('hud-time'),
        overlay: document.getElementById('overlay'),
        msg: document.getElementById('overlay-msg'),
        startBtn: document.getElementById('start-btn'),
        title: document.querySelector('.title')
      };

      this.resize();
      window.addEventListener('resize', function () { self.resize(); });
      window.addEventListener('orientationchange', function () { setTimeout(function () { self.resize(); }, 200); });
    },

    resize: function () {
      var dpr = window.devicePixelRatio || 1;
      var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.ctx.imageSmoothingEnabled = false;
    },

    /* ---------- Fluxo de jogo ---------- */
    start: function () {
      window.Sfx.resume();
      this.lives = 3; this.score = 0; this.coins = 0; this.levelIndex = 0;
      this.loadLevel(0);
      this.hideOverlay();
      window.Sfx.startMusic();
    },

    loadLevel: function (i) {
      this.levelIndex = i;
      this.level = window.Levels.load(i);
      this.player = new E.Player(this.level.startX, this.level.startY);
      this.entities = [];
      this.bumps = [];
      this.camera.x = 0;
      this.time = this.level.time;
      this.timeAcc = 0;
      this.clearTimer = 0;
      this.deathTimer = 0;
      this.clearMode = null;
      this.boss = null; this.princess = null; this.bossDefeated = false;
      // cria entidades a partir do mapa
      var s = this.level.spawns, k;
      for (k = 0; k < s.length; k++) {
        var d = s[k];
        if (d.kind === 'goomba') this.entities.push(new E.Goomba(d.x, d.y));
        else if (d.kind === 'koopa') this.entities.push(new E.Koopa(d.x, d.y));
        else if (d.kind === 'coin') this.entities.push(new E.Coin(d.x, d.y));
        else if (d.kind === 'boss') { this.boss = new E.Boss(d.x, d.y, d.hp); this.entities.push(this.boss); }
        else if (d.kind === 'princess') { this.princess = new E.Princess(d.x, d.y); this.entities.push(this.princess); }
      }
      this.state = 'playing';
      this.updateHUD();
    },

    nextLevel: function () {
      var n = this.levelIndex + 1;
      if (n >= window.Levels.count) { this.win(); return; }
      this.loadLevel(n);
      window.Sfx.startMusic();
    },

    onPlayerDeath: function () { this.deathTimer = 1; window.Sfx.stopMusic(); },

    respawnOrGameOver: function () {
      this.lives--;
      if (this.lives < 0) { this.gameOver(); }
      else { this.loadLevel(this.levelIndex); window.Sfx.startMusic(); }
    },

    gameOver: function () {
      this.state = 'gameover';
      window.Sfx.stopMusic();
      this.showOverlay('GAME OVER', 'Você ficou sem vidas! Pontos: ' + this.score, 'TENTAR DE NOVO');
    },

    win: function () {
      this.state = 'win';
      window.Sfx.stopMusic(); window.Sfx.win();
      this.showOverlay('VOCÊ VENCEU!', 'Você derrotou o chefe e salvou a princesa! Pontuação: ' + this.score, 'JOGAR DE NOVO');
    },

    togglePause: function () {
      if (this.state === 'playing') { this.state = 'paused'; window.Sfx.stopMusic(); this.showOverlay('PAUSA', 'Toque para continuar.', 'CONTINUAR'); }
      else if (this.state === 'paused') { this.hideOverlay(); this.state = 'playing'; window.Sfx.startMusic(); }
    },

    /* ---------- Overlay / HUD ---------- */
    showOverlay: function (title, msg, btn) {
      if (this.dom.title) this.dom.title.innerHTML = title;
      if (this.dom.msg) this.dom.msg.textContent = msg;
      if (this.dom.startBtn) this.dom.startBtn.textContent = btn || 'JOGAR';
      this.dom.overlay.classList.remove('hidden');
    },
    hideOverlay: function () { this.dom.overlay.classList.add('hidden'); },
    updateHUD: function () {
      var d = this.dom;
      if (!d.world) return;
      d.world.textContent = this.level ? this.level.name : '1-1';
      d.coins.textContent = 'x' + ('0' + this.coins).slice(-2);
      d.score.textContent = ('00000' + this.score).slice(-6);
      d.lives.textContent = 'x' + Math.max(0, this.lives);
      d.time.textContent = Math.max(0, Math.ceil(this.time));
    },

    /* ---------- Métodos usados pelas entidades ---------- */
    isSolid: function (col, row, e) {
      if (col < 0) return true;
      if (col >= this.level.cols || row < 0 || row >= this.level.rows) return false;
      var t = this.level.grid[row][col];
      return !!window.Levels.SOLID[t];
    },

    edgeAhead: function (e) {
      var dir = e.vx > 0 ? 1 : -1;
      var aheadCol = Math.floor((dir > 0 ? e.x + e.w + 1 : e.x - 1) / TILE);
      var belowRow = Math.floor((e.y + e.h + 1) / TILE);
      return !this.isSolid(aheadCol, belowRow, e);
    },

    spawn: function (ent) { this.entities.push(ent); },

    addScore: function (pts, x, y) {
      this.score += pts;
      this.entities.push(new E.ScorePop((x || 0) + 6, (y || 0), '' + pts));
      this.updateHUD();
    },

    collectCoin: function (x, y) {
      this.coins++;
      this.score += 200;
      window.Sfx.coin();
      if (this.coins >= 100) { this.coins -= 100; this.lives++; window.Sfx.powerup(); }
      this.updateHUD();
    },

    flash: function () { this.flashTimer = 8; },

    bumpBlock: function (col, row) { this.bumps.push({ col: col, row: row, t: 8 }); },
    getBump: function (col, row) {
      for (var i = 0; i < this.bumps.length; i++) {
        var b = this.bumps[i];
        if (b.col === col && b.row === row) return Math.sin((b.t / 8) * Math.PI) * 5;
      }
      return 0;
    },

    hitBlockFromBelow: function (col, row, player) {
      var T = window.Levels.T;
      var t = this.level.grid[row][col];
      var key = row * this.level.cols + col;
      this.bumpBlock(col, row);

      if (t === T.QCOIN) {
        this.level.grid[row][col] = T.USED;
        this.collectCoin(col * TILE, (row - 1) * TILE);
      } else if (t === T.QPOW) {
        this.level.grid[row][col] = T.USED;
        var kind = player.power === 0 ? 'mushroom' : 'fireFlower';
        this.spawn(new E.PowerUp(col * TILE, (row - 1) * TILE, kind));
        window.Sfx.powerup();
      } else if (t === T.QSTAR) {
        this.level.grid[row][col] = T.USED;
        this.spawn(new E.PowerUp(col * TILE, (row - 1) * TILE, 'star'));
        window.Sfx.powerup();
      } else if (t === T.BRICK) {
        if (this.level.items[key] === 'coin') {
          this.collectCoin(col * TILE, (row - 1) * TILE);
          this.level.items[key] = null;
          this.level.grid[row][col] = T.USED;
        } else if (player.power >= 1) {
          this.level.grid[row][col] = T.EMPTY;
          window.Sfx.bump();
          this.spawn(new E.Particle(col * TILE + 8, row * TILE + 8, '#c8500f', 6));
          this.score += 50; this.updateHUD();
        } else {
          window.Sfx.bump();
        }
      } else {
        window.Sfx.bump();
      }
    },

    /* ---------- Atualização principal ---------- */
    update: function () {
      this.anim++;
      window.Input.update();

      if (this.state !== 'playing' && this.state !== 'clear') return;

      // tempo de bumps
      for (var i = this.bumps.length - 1; i >= 0; i--) { if (--this.bumps[i].t <= 0) this.bumps.splice(i, 1); }
      if (this.flashTimer > 0) this.flashTimer--;

      if (this.state === 'clear') { this.updateClear(); this.updateHUD(); return; }

      // tempo
      this.timeAcc++;
      if (this.timeAcc >= 24) { this.timeAcc = 0; this.time--; if (this.time <= 0 && !this.player.dying) { this.time = 0; this.player.die(this); } }

      // player
      this.player.update(this);

      // entidades
      var arr = this.entities;
      for (i = 0; i < arr.length; i++) if (arr[i].update) arr[i].update(this);

      // colisões player x entidades
      if (!this.player.dying && !this.player.finished) this.handleCollisions();

      // remove entidades mortas
      for (i = arr.length - 1; i >= 0; i--) if (arr[i].remove) arr.splice(i, 1);

      // chefe derrotado?
      if (this.level.hasBoss && this.boss && this.boss.remove && !this.bossDefeated) {
        this.bossDefeated = true;
        // limpa projéteis do chefe que ficaram no ar
        for (i = arr.length - 1; i >= 0; i--) if (arr[i].type === 'hazard') arr.splice(i, 1);
        if (this.level.hasPrincess) { window.Sfx.win(); } // a princesa agora pode ser resgatada
        else { this.beginBossClear(); }
      }

      // chegou na bandeira?
      if (!this.player.finished && !this.player.dying && this.player.x + this.player.w >= this.level.flagCol * TILE) {
        this.beginFlag();
      }

      // morte concluída
      if (this.deathTimer > 0) {
        this.deathTimer++;
        if (this.deathTimer > 130 || this.player.y > this.level.pixelHeight + 80) {
          this.deathTimer = 0;
          this.respawnOrGameOver();
        }
      }

      // câmera segue o player
      var target = this.player.x + this.player.w / 2 - VIEW_W * 0.42;
      this.camera.x += (target - this.camera.x) * 0.18;
      if (this.camera.x < 0) this.camera.x = 0;
      var maxX = this.level.pixelWidth - VIEW_W;
      if (this.camera.x > maxX) this.camera.x = maxX;

      this.updateHUD();
    },

    handleCollisions: function () {
      var p = this.player, arr = this.entities, i, e;
      for (i = 0; i < arr.length; i++) {
        e = arr[i];
        if (e.remove) continue;
        if (!overlap(p, e)) continue;

        if (e.type === 'coin') { e.collect(this); continue; }
        if (e.type === 'powerup') { if (e.emerge <= 0) e.apply(p, this); continue; }
        if (e.type === 'hazard') { p.hit(this); continue; }
        if (e.type === 'princess') { if (this.bossDefeated) this.rescuePrincess(); continue; }
        if (e.type !== 'enemy') continue;
        if (e.dead) continue;

        // estrela mata tudo (no chefe, causa dano)
        if (p.starTime > 0) {
          if (e.kind === 'boss') e.hurt(this);
          else if (e.die) e.die(this);
          else { e.dead = true; e.vy = -4; }
          window.Sfx.kick(); this.addScore(200, e.x, e.y);
          continue;
        }

        // chefe: pisar causa dano; encostar de lado machuca (com graça pós-dano)
        if (e.kind === 'boss') {
          var stB = p.vy > 0 && (p.y + p.h - p.vy) <= e.y + e.h * 0.5;
          if (stB) { e.stompedBy(p, this); p.stomp(); }
          else if (e.invuln <= 0) p.hit(this);
          continue;
        }

        // goomba achatado é inofensivo
        if (e.flat) continue;

        // chutar casco parado
        if (e.kind === 'koopa' && e.shell && !e.sliding) {
          if (p.vy > 0 && (p.y + p.h - p.vy) <= e.y + e.h * 0.5) { e.stompedBy(p, this); p.stomp(); }
          else e.kickShell(p, this);
          continue;
        }

        // pisar (stomp): caindo e, no quadro anterior, os pés estavam acima do
        // meio do inimigo. Usa a meia-altura (robusto p/ quedas rápidas e inimigos altos).
        var stomping = p.vy > 0 && (p.y + p.h - p.vy) <= e.y + e.h * 0.5;
        if (stomping) {
          e.stompedBy(p, this);
          p.stomp();
        } else {
          // casco recém-chutado não machuca quem o chutou
          if (e.kind === 'koopa' && e.sliding && e.justKicked > 0) continue;
          p.hit(this);
        }
      }
    },

    beginFlag: function () {
      this.state = 'clear';
      this.clearMode = 'flag';
      this.player.finished = true;
      this.player.vx = 0; this.player.vy = 2;
      this.player.x = this.level.flagCol * TILE - this.player.w + 2;
      this.player.frame = 'idle';
      this.clearTimer = 0;
      window.Sfx.flag();
    },

    beginBossClear: function () {
      this.state = 'clear';
      this.clearMode = 'boss';
      this.player.finished = true;
      this.player.vx = 0;
      this.clearTimer = 0;
      window.Sfx.flag();
    },

    rescuePrincess: function () {
      if (this.state === 'clear' || this.state === 'win') return;
      this.state = 'clear';
      this.clearMode = 'princess';
      this.player.finished = true;
      this.player.vx = 0;
      this.clearTimer = 0;
      window.Sfx.win();
    },

    updateClear: function () {
      this.clearTimer++;
      var p = this.player, floorY = window.Levels.FLOOR * TILE - p.h;

      if (this.clearMode === 'boss') {
        if (this.time > 0 && this.clearTimer > 60) {
          var decB = Math.min(this.time, 6);
          this.time -= decB; this.score += decB * 50;
        } else if (this.clearTimer > 80 && this.time <= 0) {
          this.nextLevel();
        }
        return;
      }
      if (this.clearMode === 'princess') {
        if (this.clearTimer > 160) this.win();
        return;
      }

      // ---- bandeira ----
      if (this.clearTimer < 60) {
        if (p.y < floorY) { p.y += 3; if (p.y > floorY) p.y = floorY; }
      } else if (this.clearTimer < 140) {
        p.dir = 1; p.x += 1.1;
        p.anim += 0.2; p.frame = (Math.floor(p.anim) % 2 === 0) ? 'walk1' : 'walk2';
      } else if (this.time > 0) {
        var dec = Math.min(this.time, 6);
        this.time -= dec; this.score += dec * 50;
        window.Sfx.tone ? window.Sfx.tone(1200, 0.03, 'square', 0.2) : 0;
      } else {
        if (this.clearTimer > 160) this.nextLevel();
      }
    },

    /* ---------- Renderização ---------- */
    render: function () {
      var ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
      // letterbox
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cw, ch);
      var scale = Math.min(cw / VIEW_W, ch / VIEW_H);
      var ox = Math.floor((cw - VIEW_W * scale) / 2);
      var oy = Math.floor((ch - VIEW_H * scale) / 2);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      ctx.imageSmoothingEnabled = false;

      // recorte da área de jogo
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();

      if (!this.level) { ctx.restore(); return; }
      this.drawScene(ctx);

      ctx.restore();
    },

    drawScene: function (ctx) {
      var cam = this.camera, L = this.level, S = window.Sprites;

      // céu
      this.drawSky(ctx);

      // decoração (parallax)
      ctx.save();
      var d, dx;
      for (var i = 0; i < L.decor.length; i++) {
        d = L.decor[i];
        var par = d.kind === 'cloud' ? 0.45 : (d.kind === 'hill' ? 0.7 : 1);
        dx = d.x - cam.x * par;
        if (dx < -80 || dx > VIEW_W + 20) continue;
        if (d.kind === 'cloud') ctx.drawImage(S.img.cloud, dx, d.y);
        else if (d.kind === 'hill') ctx.drawImage(S.img.hill, dx, d.y - 32 + 16);
        else if (d.kind === 'bush') ctx.drawImage(S.img.bush, dx, d.y);
      }
      // castelo no fim
      var castleX = L.castleCol * TILE - cam.x;
      if (castleX < VIEW_W + 40 && castleX > -90) ctx.drawImage(S.img.castle, castleX, (window.Levels.FLOOR + 1) * TILE - 80);
      ctx.restore();

      // tiles visíveis
      var c0 = Math.max(0, Math.floor(cam.x / TILE));
      var c1 = Math.min(L.cols - 1, Math.ceil((cam.x + VIEW_W) / TILE));
      for (var c = c0; c <= c1; c++) {
        for (var r = 0; r < L.rows; r++) {
          var t = L.grid[r][c];
          if (t === ' ') continue;
          this.drawTile(ctx, t, c, r, cam);
        }
      }

      // entidades
      ctx.save();
      ctx.translate(-cam.x, -cam.y);
      var arr = this.entities;
      for (i = 0; i < arr.length; i++) if (arr[i].draw) arr[i].draw(ctx);
      // player
      if (!(this.state === 'gameover')) this.player.draw(ctx);
      ctx.restore();

      // flash de power-up
      if (this.flashTimer > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (this.flashTimer / 16) + ')';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }

      // barra de vida do chefe
      if (L.hasBoss && this.boss && !this.bossDefeated && !this.boss.defeated) {
        var n = this.boss.maxHp, bw = 10, total = n * bw;
        var bx = Math.round(VIEW_W / 2 - total / 2), by = 26;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(bx - 8, by - 14, total + 16, 24);
        ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
        ctx.fillText('CHEFE', VIEW_W / 2, by - 5);
        for (var hh = 0; hh < n; hh++) {
          ctx.fillStyle = hh < this.boss.hp ? '#e23636' : '#4a4a4a';
          ctx.fillRect(bx + hh * bw + 1, by, bw - 2, 6);
        }
        ctx.textAlign = 'left';
      }

      // mensagem ao resgatar / derrotar chefe
      if (this.state === 'clear' && this.clearMode === 'princess') {
        ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('OBRIGADA, HEROI!', VIEW_W / 2, 40);
        ctx.textAlign = 'left';
      }
    },

    drawSky: function (ctx) {
      var theme = this.level.theme;
      var g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      if (theme === 'dusk') { g.addColorStop(0, '#3a2a6b'); g.addColorStop(1, '#b65a8e'); }
      else if (theme === 'night') { g.addColorStop(0, '#070726'); g.addColorStop(1, '#1d1d5a'); }
      else if (theme === 'cave') { g.addColorStop(0, '#140f0a'); g.addColorStop(1, '#33251a'); }
      else if (theme === 'castle') { g.addColorStop(0, '#1a0d12'); g.addColorStop(1, '#3a1422'); }
      else { g.addColorStop(0, '#5c94fc'); g.addColorStop(1, '#9bd0ff'); }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      // lua à noite
      if (theme === 'night') {
        ctx.fillStyle = '#fdf6c8';
        ctx.beginPath(); ctx.arc(VIEW_W - 64, 46, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.8;
        ctx.fillRect(40, 30, 2, 2); ctx.fillRect(120, 50, 2, 2); ctx.fillRect(200, 24, 2, 2);
        ctx.fillRect(300, 60, 2, 2); ctx.fillRect(360, 36, 2, 2); ctx.globalAlpha = 1;
      }
    },

    drawTile: function (ctx, t, c, r, cam) {
      var S = window.Sprites.img, T = window.Levels.T;
      var x = Math.round(c * TILE - cam.x);
      var y = Math.round(r * TILE - cam.y) - this.getBump(c, r);
      switch (t) {
        case T.GROUND: ctx.drawImage(S.ground, x, y); break;
        case T.BRICK: ctx.drawImage(S.brick, x, y); break;
        case T.USED: ctx.drawImage(S.used, x, y); break;
        case T.STONE: ctx.drawImage(S.stone, x, y); break;
        case T.QCOIN:
        case T.QPOW:
        case T.QSTAR: ctx.drawImage(S.qblock[Math.floor(this.anim / 16) % 2], x, y); break;
        case T.PIPE_TL: ctx.drawImage(S.pipeTop, 0, 0, 16, 16, x, y, 16, 16); break;
        case T.PIPE_TR: ctx.drawImage(S.pipeTop, 16, 0, 16, 16, x, y, 16, 16); break;
        case T.PIPE_BL: ctx.drawImage(S.pipeBody, 0, 0, 16, 16, x, y, 16, 16); break;
        case T.PIPE_BR: ctx.drawImage(S.pipeBody, 16, 0, 16, 16, x, y, 16, 16); break;
        case T.POLE: ctx.drawImage(S.flagPole, x + 4, y); break;
        case T.POLETOP: ctx.drawImage(S.flagTop, x, y); break;
        default: break;
      }
    }
  };

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  window.Game = Game;
  window.VIEW = { W: VIEW_W, H: VIEW_H };
})();
