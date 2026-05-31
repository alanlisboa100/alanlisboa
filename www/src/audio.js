/* audio.js - Som e música gerados via Web Audio API (sem arquivos externos) */
(function () {
  'use strict';

  var Sfx = {
    ctx: null,
    master: null,
    musicGain: null,
    enabled: true,
    musicTimer: null,
    musicStep: 0,

    init: function () {
      if (this.ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.enabled = false; return; }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.master);
    },

    // Garante que o contexto rode (políticas de autoplay mobile exigem gesto)
    resume: function () {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    tone: function (freq, dur, type, vol, dest) {
      if (!this.enabled || !this.ctx) return;
      var t = this.ctx.currentTime;
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(dest || this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    },

    sweep: function (f1, f2, dur, type, vol) {
      if (!this.enabled || !this.ctx) return;
      var t = this.ctx.currentTime;
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    },

    noise: function (dur, vol) {
      if (!this.enabled || !this.ctx) return;
      var t = this.ctx.currentTime;
      var n = Math.floor(this.ctx.sampleRate * dur);
      var buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      var src = this.ctx.createBufferSource();
      src.buffer = buf;
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      var f = this.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 800;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t);
    },

    /* Efeitos do jogo */
    jump: function () { this.sweep(330, 720, 0.16, 'square', 0.25); },
    bigJump: function () { this.sweep(300, 880, 0.22, 'square', 0.28); },
    coin: function () { this.tone(988, 0.07, 'square', 0.3); var s = this; setTimeout(function () { s.tone(1319, 0.16, 'square', 0.3); }, 70); },
    stomp: function () { this.sweep(500, 120, 0.12, 'square', 0.3); this.noise(0.1, 0.15); },
    bump: function () { this.tone(160, 0.08, 'square', 0.25); },
    powerup: function () {
      var s = this; var notes = [392, 523, 659, 784, 1046];
      notes.forEach(function (f, i) { setTimeout(function () { s.tone(f, 0.1, 'square', 0.28); }, i * 70); });
    },
    powerdown: function () { this.sweep(440, 110, 0.4, 'sawtooth', 0.25); },
    kick: function () { this.sweep(700, 300, 0.1, 'square', 0.25); },
    die: function () {
      var s = this;
      this.stopMusic();
      var seq = [[392, 0], [370, 120], [0, 240], [330, 360], [392, 520], [523, 700]];
      seq.forEach(function (n) { setTimeout(function () { if (n[0]) s.tone(n[0], 0.2, 'square', 0.3); }, n[1]); });
    },
    flag: function () {
      var s = this;
      this.stopMusic();
      var notes = [392, 440, 494, 523, 587, 659, 698, 784, 880, 988, 1046];
      notes.forEach(function (f, i) { setTimeout(function () { s.tone(f, 0.12, 'square', 0.28); }, i * 80); });
    },
    win: function () {
      var s = this;
      var seq = [523, 659, 784, 1046, 784, 1046];
      seq.forEach(function (f, i) { setTimeout(function () { s.tone(f, 0.18, 'triangle', 0.3); }, i * 150); });
    },

    /* Música de fundo em loop (linha de baixo + melodia simples e alegre) */
    melody: [
      660, 660, 0, 660, 0, 523, 660, 0, 784, 0, 0, 0, 392, 0, 0, 0,
      523, 0, 0, 392, 0, 0, 330, 0, 0, 440, 0, 494, 0, 466, 440, 0
    ],
    bass: [
      131, 0, 196, 0, 165, 0, 196, 0, 131, 0, 196, 0, 165, 0, 196, 0,
      131, 0, 196, 0, 165, 0, 196, 0, 175, 0, 165, 0, 147, 0, 196, 0
    ],
    startMusic: function () {
      if (!this.enabled || !this.ctx || this.musicTimer) return;
      var s = this;
      this.musicStep = 0;
      var bpmStep = 150; // ms por passo
      this.musicTimer = setInterval(function () {
        var i = s.musicStep % s.melody.length;
        var m = s.melody[i];
        var b = s.bass[i];
        if (m) s.tone(m, 0.13, 'square', 0.16, s.musicGain);
        if (b) s.tone(b, 0.16, 'triangle', 0.22, s.musicGain);
        s.musicStep++;
      }, bpmStep);
    },
    stopMusic: function () {
      if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    },
    toggle: function () {
      this.enabled = !this.enabled;
      if (!this.enabled) this.stopMusic();
      return this.enabled;
    }
  };

  window.Sfx = Sfx;
})();
