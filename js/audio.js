/* Brick Escape — audio (ElevenLabs-generated music + sound effects).
 * Web Audio when served over http(s); falls back to <audio> elements when opened from file://. */
const Sound = (() => {
  'use strict';
  const SFX = {
    pick: 0.55, snap: 0.5, exit: 0.75, bump: 0.6, win: 0.8, lose: 0.75, button: 0.5, ice: 0.7,
    unlock: 0.75, coin: 0.6, rocket: 0.8, tick: 0.55, freeze: 0.7, star: 0.7, peel: 0.7, spawn: 0.55,
    hammer: 0.85, blast: 0.85,
  };
  const MUSIC_VOL = 0.32;
  let ctx = null, sfxGain = null, musicGain = null;
  const buffers = {}, norms = {};
  let musicBuf = null, musicSrc = null, loopEnd = 0;
  let html = false, musicEl = null;
  const pools = {};
  let musicOn = true, sfxOn = true, wantMusic = false, started = false;

  function path(name) { return 'assets/sfx/' + name + '.mp3'; }

  function unlock() {
    if (started) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    started = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && location.protocol !== 'file:') {
      ctx = new AC();
      sfxGain = ctx.createGain(); sfxGain.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = MUSIC_VOL; musicGain.connect(ctx.destination);
      Object.keys(SFX).forEach(n => load(n).then(b => { buffers[n] = b; norms[n] = normGain(b); }).catch(() => {}));
      load('bgm').then(b => {
        musicBuf = b;
        loopEnd = trailingSilence(b);
        if (wantMusic) startMusic();
      }).catch(() => switchToHtml());
    } else {
      switchToHtml();
    }
  }

  function load(name) {
    return fetch(path(name)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(a => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)));
  }

  // Generated SFX vary a lot in level: scale each one so its peak sits near full scale.
  function normGain(b) {
    let peak = 0;
    for (let c = 0; c < b.numberOfChannels; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
    }
    return peak > 0.01 ? Math.min(6, 0.95 / peak) : 1;
  }

  // Music files often end with a fade + silence; loop before it.
  function trailingSilence(b) {
    const d = b.getChannelData(0);
    let i = d.length - 1;
    while (i > 0 && Math.abs(d[i]) < 0.02) i--;
    return Math.max(1, (i + 1) / b.sampleRate);
  }

  function switchToHtml() {
    html = true;
    musicEl = new Audio(path('bgm'));
    musicEl.loop = true;
    musicEl.volume = MUSIC_VOL;
    if (wantMusic) startMusic();
  }

  function play(name, opts) {
    if (!sfxOn || !started) return;
    const vol = (SFX[name] || 0.6) * ((opts && opts.vol) || 1);
    const rate = (opts && opts.rate) || 1;
    if (html) {
      const pool = pools[name] || (pools[name] = []);
      let a = pool.find(el => el.paused || el.ended);
      if (!a) { if (pool.length > 5) return; a = new Audio(path(name)); pool.push(a); }
      a.volume = Math.min(1, vol); a.playbackRate = rate; a.currentTime = 0;
      a.play().catch(() => {});
      return;
    }
    const b = buffers[name];
    if (!ctx || !b) return;
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = vol * (norms[name] || 1);
    src.connect(g); g.connect(sfxGain);
    src.start();
  }

  function startMusic() {
    wantMusic = true;
    if (!musicOn || !started) return;
    if (html) { if (musicEl && musicEl.paused) musicEl.play().catch(() => {}); return; }
    if (!ctx || !musicBuf || musicSrc) return;
    musicSrc = ctx.createBufferSource();
    musicSrc.buffer = musicBuf;
    musicSrc.loop = true;
    musicSrc.loopStart = 0;
    musicSrc.loopEnd = loopEnd;
    musicSrc.connect(musicGain);
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(0, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(MUSIC_VOL, ctx.currentTime + 1.2);
    musicSrc.start();
  }

  function stopMusic() {
    if (html) { if (musicEl) musicEl.pause(); return; }
    if (musicSrc) { try { musicSrc.stop(); } catch (e) { /* already stopped */ } musicSrc.disconnect(); musicSrc = null; }
  }

  // Briefly lower the music under jingles.
  function duck(seconds) {
    if (html) {
      if (!musicEl) return;
      musicEl.volume = MUSIC_VOL * 0.25;
      setTimeout(() => { musicEl.volume = MUSIC_VOL; }, seconds * 1000);
      return;
    }
    if (!ctx) return;
    const t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t);
    musicGain.gain.setValueAtTime(musicGain.gain.value, t);
    musicGain.gain.linearRampToValueAtTime(MUSIC_VOL * 0.2, t + 0.15);
    musicGain.gain.setValueAtTime(MUSIC_VOL * 0.2, t + seconds);
    musicGain.gain.linearRampToValueAtTime(MUSIC_VOL, t + seconds + 1);
  }

  function setMusic(on) { musicOn = on; if (on) { if (wantMusic) startMusic(); } else stopMusic(); }
  function setSfx(on) { sfxOn = on; }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) { if (musicEl) { if (document.hidden) musicEl.pause(); else if (musicOn && wantMusic) musicEl.play().catch(() => {}); } return; }
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  function debug() {
    return {
      started, html, musicOn, sfxOn, wantMusic,
      ctx: ctx ? ctx.state : null,
      buffers: Object.keys(buffers).length,
      music: html ? (musicEl && !musicEl.paused) : !!musicSrc,
      musicLoaded: html ? !!musicEl : !!musicBuf,
    };
  }

  return { unlock, play, startMusic, stopMusic, duck, setMusic, setSfx, debug };
})();
