/* Brick Escape — game UI: screens, canvas rendering, drag physics, boosters, progression. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const EPS = 1e-4;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isInt = v => Math.abs(v - Math.round(v)) < EPS;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIn = t => t * t;

  /* ---------- data ---------- */
  const PAL = {
    red: ['#f04a3e', '#ff8d7f', '#b3241d', '紅'],
    orange: ['#ff8f1f', '#ffc06b', '#c45f00', '橙'],
    yellow: ['#ffd41f', '#fff08a', '#c99a00', '黃'],
    lime: ['#9be22e', '#d0f77f', '#5e9c10', '淺綠'],
    green: ['#22b24c', '#72e08f', '#0f7a31', '綠'],
    cyan: ['#2fc6f2', '#97e8ff', '#0e88b3', '青'],
    blue: ['#3461f0', '#86a2ff', '#1d3bb2', '藍'],
    purple: ['#9c4dff', '#cda2ff', '#6a23cb', '紫'],
    pink: ['#ff50b0', '#ff9fd6', '#c41f7d', '粉紅'],
    white: ['#eef1f7', '#ffffff', '#a3abbd', '白'],
    black: ['#3c404e', '#737a8c', '#16181f', '黑'],
  };
  // six worlds of five levels; `demo` is the TIPS mini board shown on the chapter card
  const CHAPTERS = [
    { start: 0, name: '新手村', sub: '拖曳・門寬・形狀', demo: 'block', c: ['#3fdc86', '#13945a'] },
    { start: 5, name: '單行道', sub: '方向方塊・石頭', demo: 'dir', c: ['#ffb347', '#dc5f18'] },
    { start: 10, name: '冰封寶庫', sub: '冰塊・鑰匙鎖', demo: 'ice', c: ['#5fd6ff', '#2a6fdc'] },
    { start: 15, name: '積木工廠', sub: '雙層外殼・製造機', demo: 'gen', c: ['#b07bff', '#6532d4'] },
    { start: 20, name: '迷宮花園', sub: '移動門・藤蔓', demo: 'ivy', c: ['#ff7cbc', '#cf347e'] },
    { start: 25, name: '彩虹終點', sub: '變色門・終極挑戰', demo: 'rainbow', c: ['#ff6a5c', '#e89a00'] },
  ];
  const BOOSTERS = {
    freeze: { name: '凍結時間', price: 150, desc: '時間暫停 15 秒' },
    hammer: { name: '鐵鎚', price: 200, desc: '敲碎冰塊或鎖頭，也能打掉 1～2 格的小方塊' },
    rocket: { name: '火箭', price: 300, desc: '炸掉任意一個方塊' },
    ufo: { name: '飛碟', price: 600, desc: '吸走場上所有同顏色的方塊' },
  };
  const TIPS = {
    drag: { title: '怎麼玩', text: '用手指<b>拖曳方塊</b>，送到<b>相同顏色的門</b>就會滑出去！<br>把所有方塊送走就過關，注意時間限制。',
      demo: { map: ['....', 'AA..'], key: { A: 'r' }, doors: [{ s: 'R', p: 1, c: 'r' }] } },
    block: { title: '讓個路', text: '方塊之間會互相阻擋。<br>先把<b>擋路的方塊移開</b>，再送其他方塊出門。',
      demo: { map: ['AAB.', '..B.'], key: { A: 'r', B: 'y' }, doors: [{ s: 'R', p: 0, c: 'r' }, { s: 'D', p: 2, c: 'y' }] } },
    width: { title: '門的大小', text: '方塊必須<b>完全對齊</b>門口，<br>而且寬度<b>不能超過門的寬度</b>才出得去。',
      demo: { map: ['AA..', 'AA..', '....'], key: { A: 'b' }, doors: [{ s: 'R', p: 0, l: 2, c: 'b' }, { s: 'R', p: 2, l: 1, c: 'b' }] } },
    shapes: { title: '奇形怪狀', text: 'L 形、T 形方塊佔的空間更多，<br>轉彎前要<b>先騰出位置</b>！',
      demo: { map: ['A.BB', 'AAB.'], key: { A: 'g', B: 'k' }, doors: [{ s: 'U', p: 0, l: 2, c: 'g' }, { s: 'R', p: 0, l: 2, c: 'k' }] } },
    dir: { title: '單向方塊', text: '有箭頭的方塊只能沿著箭頭方向移動：<br><b>↔ 只能左右</b>、<b>↕ 只能上下</b>。',
      demo: { map: ['AA.B', '...B'], key: { A: 'o h', B: 'c v' }, doors: [{ s: 'R', p: 0, c: 'o' }, { s: 'D', p: 3, c: 'c' }] } },
    walls: { title: '石頭路障', text: '紫色石柱是<b>固定障礙物</b>，<br>方塊必須繞過去。',
      demo: { map: ['A.#.', '....'], key: { A: 'p' }, doors: [{ s: 'R', p: 1, c: 'p' }] } },
    ice: { title: '冰凍方塊', text: '冰塊上的數字是<b>還要送走幾個方塊</b>才會融化。<br>融化之前完全不能移動！',
      demo: { map: ['AA.B'], key: { A: 'b i3', B: 'r' }, doors: [{ s: 'R', p: 0, c: 'r' }, { s: 'L', p: 0, c: 'b' }] } },
    lock: { title: '鑰匙與鎖', text: '上鎖的方塊不能移動。<br>把<b>帶著鑰匙的方塊</b>送出門，鎖就會打開！',
      demo: { map: ['AA.B'], key: { A: 'g L1', B: 'y K1' }, doors: [{ s: 'R', p: 0, c: 'y' }, { s: 'L', p: 0, c: 'g' }] } },
    rainbow: { title: '彩虹抽屜', text: '黑白小方塊只能從<b>上方黑門</b>、<b>下方白門</b>離開。<br>清出通道後，彩色長條才能抵達右邊的門。',
      demo: { map: ['AANW', 'BBWN'], key: { A: 'r', B: 'o', N: 'n S', W: 'w S' }, doors: [{ s: 'U', p: 2, c: 'n' }, { s: 'D', p: 2, c: 'w' }, { s: 'R', p: 0, c: 'o' }, { s: 'R', p: 1, c: 'r' }] } },
    layer: { title: '雙層外殼', text: '雙層方塊要先通過<b>外殼顏色</b>的門把殼剝掉，<br>露出裡面的顏色後再送出去。',
      demo: { map: ['AA..'], key: { A: 'yb' }, doors: [{ s: 'R', p: 0, c: 'y' }, { s: 'L', p: 0, c: 'b' }] } },
    gen: { title: '方塊製造機', text: '製造機前方空出來時，會<b>推出新的方塊</b>。<br>上面的數字是剩下的數量。',
      demo: { map: ['@...'], key: {}, doors: [{ s: 'R', p: 0, c: 'r' }], gens: [{ x: 0, y: 0, d: 'R', q: 'rrg' }] } },
    move: { title: '移動的門', text: '每走一步，<b>門就沿著軌道移動一格</b>。<br>看準時機再把方塊送過去！',
      demo: { map: ['A...', '....', '....'], key: { A: 'c' }, doors: [{ s: 'R', p: 0, c: 'c', mv: [0, 2] }] } },
    ivy: { title: '藤蔓封門', text: '被藤蔓纏住的門暫時不能用，<br>送走<b>數字那麼多個方塊</b>後藤蔓就會消失。',
      demo: { map: ['A..B'], key: { A: 'g', B: 'r' }, doors: [{ s: 'R', p: 0, c: 'g', ivy: 2 }, { s: 'L', p: 0, c: 'r' }] } },
    cycle: { title: '變色門', text: '變色門<b>每走一步就換顏色</b>，<br>旁邊的小圓點是接下來的顏色順序。',
      demo: { map: ['AA..'], key: { A: 'k' }, doors: [{ s: 'R', p: 0, c: 'kbg' }] } },
  };

  /* ---------- save ---------- */
  const SAVE_KEY = 'brickEscape.v1';
  const defaults = () => ({ unlocked: 1, stars: [], coins: 300, inv: { freeze: 2, hammer: 1, rocket: 1, ufo: 1 }, music: true, sfx: true, tips: {} });
  const save = (() => {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (d && typeof d === 'object') return Object.assign(defaults(), d, { inv: Object.assign(defaults().inv, d.inv) });
    } catch (e) { /* storage unavailable */ }
    return defaults();
  })();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }

  /* ---------- UI helpers ---------- */
  function show(id) { $$('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }

  let toastTimer = 0;
  function toast(msg, ms) {
    const t = $('#toast');
    t.innerHTML = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 1800);
  }

  function updateCoins() { $$('.coin-val').forEach(e => { e.textContent = save.coins; }); }

  let modalOpen = false;
  function modal(opt) {
    modalOpen = true;
    const m = $('#modal');
    const ttl = $('#modal-title');
    ttl.textContent = opt.title;
    ttl.className = 'card-ribbon' + (opt.ribbon ? ' ' + opt.ribbon : '');
    $('#modal-body').innerHTML = opt.body || '';
    const act = $('#modal-actions');
    act.innerHTML = '';
    (opt.actions || []).forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn btn-mid ' + (a.cls || 'btn-purple');
      b.innerHTML = a.label;
      b.addEventListener('click', () => { Sound.play('button'); if (!a.keep) closeModal(); a.fn && a.fn(); });
      act.appendChild(b);
    });
    m.classList.remove('hidden');
    if (opt.onOpen) opt.onOpen($('#modal-body'));
  }
  function closeModal() { modalOpen = false; $('#modal').classList.add('hidden'); }

  /* ---------- rendering primitives ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Union outline of a polyomino: per-cell rects, rounded only on outer convex corners.
  function brickPath(cells, cs, gap, r, ox, oy) {
    const set = new Set(cells.map(c => c[0] + ',' + c[1]));
    const has = (x, y) => set.has(x + ',' + y);
    const p = new Path2D();
    for (const [cx, cy] of cells) {
      const nL = has(cx - 1, cy), nR = has(cx + 1, cy), nU = has(cx, cy - 1), nD = has(cx, cy + 1);
      const x0 = ox + cx * cs + (nL ? 0 : gap), x1 = ox + (cx + 1) * cs - (nR ? 0 : gap);
      const y0 = oy + cy * cs + (nU ? 0 : gap), y1 = oy + (cy + 1) * cs - (nD ? 0 : gap);
      const tl = !nL && !nU ? r : 0, tr = !nR && !nU ? r : 0, br = !nR && !nD ? r : 0, bl = !nL && !nD ? r : 0;
      p.moveTo(x0 + tl, y0);
      p.lineTo(x1 - tr, y0); if (tr) p.arcTo(x1, y0, x1, y0 + tr, tr);
      p.lineTo(x1, y1 - br); if (br) p.arcTo(x1, y1, x1 - br, y1, br);
      p.lineTo(x0 + bl, y1); if (bl) p.arcTo(x0, y1, x0, y1 - bl, bl);
      p.lineTo(x0, y0 + tl); if (tl) p.arcTo(x0, y0, x0 + tl, y0, tl);
      p.closePath();
    }
    return p;
  }

  function stud(ctx, x, y, r, col) {
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.arc(x, y + r * 0.32, r, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, col[1]); g.addColorStop(0.55, col[0]); g.addColorStop(1, col[2]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.beginPath(); ctx.arc(x, y, r * 0.78, Math.PI * 1.05, Math.PI * 1.65); ctx.stroke();
  }

  function studs(ctx, x, y, size, col) {
    if (size >= 34) {
      const r = size * 0.13;
      for (const [fx, fy] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) stud(ctx, x + size * fx, y + size * fy, r, col);
    } else {
      stud(ctx, x + size / 2, y + size / 2, size * 0.22, col);
    }
  }

  const spriteCache = new Map();
  function brickSprite(b, ci, cs) {
    const key = b.sig + '|' + ci + '|' + cs;
    let s = spriteCache.get(key);
    if (s) return s;
    const pad = Math.ceil(cs * 0.1), depth = Math.max(2, Math.round(cs * 0.09));
    const c = document.createElement('canvas');
    c.width = b.w * cs + pad * 2;
    c.height = b.h * cs + pad * 2 + depth;
    const ctx = c.getContext('2d');
    const outer = PAL[b.colors[ci]];
    const inner = ci < b.colors.length - 1 ? PAL[b.colors[ci + 1]] : null;
    const gap = Math.max(1, cs * 0.045), r = cs * 0.2;
    // side
    ctx.fillStyle = outer[2];
    ctx.fill(brickPath(b.cells, cs, gap, r, pad, pad + depth));
    // body
    const body = brickPath(b.cells, cs, gap, r, pad, pad);
    const g = ctx.createLinearGradient(0, pad, 0, pad + b.h * cs);
    g.addColorStop(0, outer[1]); g.addColorStop(0.18, outer[0]); g.addColorStop(1, outer[0]);
    ctx.fillStyle = g;
    ctx.fill(body);
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    ctx.lineWidth = Math.max(1, cs * 0.02);
    ctx.stroke(body);
    for (const [cx, cy] of b.cells) {
      const x = pad + cx * cs, y = pad + cy * cs;
      if (inner) {
        // shell with a window showing the inner color
        const ins = cs * 0.2, w = cs - ins * 2;
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        roundRect(ctx, x + ins, y + ins + cs * 0.03, w, w, cs * 0.12); ctx.fill();
        const gi = ctx.createLinearGradient(0, y + ins, 0, y + ins + w);
        gi.addColorStop(0, inner[1]); gi.addColorStop(0.3, inner[0]); gi.addColorStop(1, inner[2]);
        ctx.fillStyle = gi;
        roundRect(ctx, x + ins, y + ins, w, w, cs * 0.12); ctx.fill();
        stud(ctx, x + cs / 2, y + cs / 2, w * 0.24, inner);
      } else {
        studs(ctx, x, y, cs, outer);
      }
    }
    s = { c, pad, depth };
    spriteCache.set(key, s);
    return s;
  }

  function makeView(L, cw, ch, dpr, maxCell) {
    const margin = 4 * dpr;
    const cs = Math.max(8, Math.floor(Math.min((cw - margin * 2) / (L.W + 0.9), (ch - margin * 2) / (L.H + 0.9), maxCell * dpr)));
    const ft = Math.round(cs * 0.42);
    return { cs, ft, dpr, ox: Math.round((cw - L.W * cs) / 2), oy: Math.round((ch - L.H * cs) / 2) };
  }

  function drawStatic(ctx, L, v) {
    const { cs, ft, ox, oy } = v;
    const W = L.W * cs, H = L.H * cs;
    // frame
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = cs * 0.5; ctx.shadowOffsetY = cs * 0.12;
    roundRect(ctx, ox - ft, oy - ft, W + ft * 2, H + ft * 2, ft * 1.1);
    const fg = ctx.createLinearGradient(0, oy - ft, 0, oy + H + ft);
    fg.addColorStop(0, '#7d64f2'); fg.addColorStop(1, '#4a32bd');
    ctx.fillStyle = fg; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#2b1a7e'; ctx.lineWidth = Math.max(2, cs * 0.04);
    roundRect(ctx, ox - ft, oy - ft, W + ft * 2, H + ft * 2, ft * 1.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = Math.max(1, cs * 0.025);
    roundRect(ctx, ox - ft * 0.82, oy - ft * 0.82, W + ft * 1.64, H + ft * 1.64, ft * 0.9); ctx.stroke();
    // floor
    roundRect(ctx, ox - 2, oy - 2, W + 4, H + 4, cs * 0.14);
    ctx.fillStyle = '#1c1250'; ctx.fill();
    for (let y = 0; y < L.H; y++) {
      for (let x = 0; x < L.W; x++) {
        const px = ox + x * cs, py = oy + y * cs;
        if (Engine.isFloor(L, x, y)) {
          ctx.fillStyle = (x + y) % 2 ? '#271a68' : '#2a1d6f';
          roundRect(ctx, px + cs * 0.04, py + cs * 0.04, cs * 0.92, cs * 0.92, cs * 0.1); ctx.fill();
        } else if (L.def.map[y][x] !== '@') {
          // stone pillar
          ctx.fillStyle = '#2d1d78';
          roundRect(ctx, px + cs * 0.03, py + cs * 0.1, cs * 0.94, cs * 0.92, cs * 0.18); ctx.fill();
          const sg = ctx.createLinearGradient(0, py, 0, py + cs);
          sg.addColorStop(0, '#8c76f5'); sg.addColorStop(1, '#5a42cc');
          ctx.fillStyle = sg;
          roundRect(ctx, px + cs * 0.03, py + cs * 0.03, cs * 0.94, cs * 0.88, cs * 0.18); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = Math.max(1, cs * 0.03);
          ctx.beginPath(); ctx.moveTo(px + cs * 0.2, py + cs * 0.12); ctx.lineTo(px + cs * 0.8, py + cs * 0.12); ctx.stroke();
          ctx.fillStyle = 'rgba(30,15,90,.35)';
          ctx.beginPath(); ctx.arc(px + cs * 0.35, py + cs * 0.5, cs * 0.08, 0, 7); ctx.arc(px + cs * 0.65, py + cs * 0.62, cs * 0.06, 0, 7); ctx.fill();
        }
      }
    }
  }

  function doorRect(v, d) {
    const { cs, ft, ox, oy } = v;
    const inset = cs * 0.07, th = ft * 0.72, off = ft * 0.14;
    switch (d.side) {
      case 'R': return [ox + (d.x + 1) * cs + off, oy + d.y * cs + inset, th, d.len * cs - inset * 2];
      case 'L': return [ox + d.x * cs - off - th, oy + d.y * cs + inset, th, d.len * cs - inset * 2];
      case 'U': return [ox + d.x * cs + inset, oy + d.y * cs - off - th, d.len * cs - inset * 2, th];
      default: return [ox + d.x * cs + inset, oy + (d.y + 1) * cs + off, d.len * cs - inset * 2, th];
    }
  }

  function chevron(ctx, cx, cy, size, side) {
    const a = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 }[side];
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-size * 0.45, -size * 0.6);
    ctx.lineTo(size * 0.55, 0);
    ctx.lineTo(-size * 0.45, size * 0.6);
    ctx.closePath();
    ctx.restore();
  }

  function drawDoors(ctx, L, S, v, now) {
    const { cs } = v;
    L.doors.forEach((def, di) => {
      const d = Engine.doorAt(L, S, di);
      const col = PAL[d.color];
      // rail for moving doors
      if (def.mv) {
        const lo = Object.assign({}, d), hi = Object.assign({}, d);
        if (d.side === 'L' || d.side === 'R') { lo.y = def.mv[0]; hi.y = def.mv[1]; } else { lo.x = def.mv[0]; hi.x = def.mv[1]; }
        const a = doorRect(v, lo), b = doorRect(v, hi);
        const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]);
        const x1 = Math.max(a[0] + a[2], b[0] + b[2]), y1 = Math.max(a[1] + a[3], b[1] + b[3]);
        ctx.fillStyle = 'rgba(20,8,60,.55)';
        roundRect(ctx, x0, y0, x1 - x0, y1 - y0, cs * 0.12); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([cs * 0.08, cs * 0.08]); ctx.lineWidth = Math.max(1, cs * 0.03);
        roundRect(ctx, x0, y0, x1 - x0, y1 - y0, cs * 0.12); ctx.stroke(); ctx.setLineDash([]);
      }
      const [x, y, w, h] = doorRect(v, d);
      const anim = doorAnims.get(di);
      let ax = x, ay = y;
      if (anim) {
        const t = clamp((now - anim.t0) / 180, 0, 1);
        if (t >= 1) doorAnims.delete(di);
        else { ax = anim.x + (x - anim.x) * easeOut(t); ay = anim.y + (y - anim.y) * easeOut(t); }
      }
      const g = (d.side === 'L' || d.side === 'R') ? ctx.createLinearGradient(ax, 0, ax + w, 0) : ctx.createLinearGradient(0, ay, 0, ay + h);
      g.addColorStop(0, col[1]); g.addColorStop(0.5, col[0]); g.addColorStop(1, col[2]);
      ctx.fillStyle = g;
      roundRect(ctx, ax, ay, w, h, cs * 0.12); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = Math.max(1, cs * 0.03);
      roundRect(ctx, ax, ay, w, h, cs * 0.12); ctx.stroke();
      // chevrons, one per cell
      ctx.fillStyle = d.color === 'white' ? '#5b6175' : 'rgba(255,255,255,.92)';
      for (let k = 0; k < d.len; k++) {
        const cx = (d.side === 'L' || d.side === 'R') ? ax + w / 2 : ax + (k + 0.5) * cs - cs * 0.07;
        const cy = (d.side === 'L' || d.side === 'R') ? ay + (k + 0.5) * cs - cs * 0.07 : ay + h / 2;
        chevron(ctx, cx, cy, Math.min(w, h) * 0.42, d.side);
        ctx.fill();
      }
      // cycling door: color sequence dots
      if (def.colors.length > 1) {
        const n = def.colors.length;
        const cur = S.moves % n;
        for (let k = 0; k < n; k++) {
          const c = PAL[def.colors[(cur + k) % n]];
          const rr = k === 0 ? cs * 0.1 : cs * 0.07;
          let px, py;
          const step = cs * 0.26;
          if (d.side === 'L' || d.side === 'R') { px = d.side === 'R' ? ax + w + cs * 0.17 : ax - cs * 0.17; py = ay + h / 2 + (k - (n - 1) / 2) * step; } else { py = d.side === 'D' ? ay + h + cs * 0.17 : ay - cs * 0.17; px = ax + w / 2 + (k - (n - 1) / 2) * step; }
          ctx.fillStyle = c[0]; ctx.strokeStyle = k === 0 ? '#fff' : 'rgba(0,0,0,.5)'; ctx.lineWidth = Math.max(1, cs * 0.025);
          ctx.beginPath(); ctx.arc(px, py, rr, 0, 7); ctx.fill(); ctx.stroke();
        }
      }
      // ivy
      if (!d.open) {
        ctx.save();
        roundRect(ctx, ax - cs * 0.04, ay - cs * 0.04, w + cs * 0.08, h + cs * 0.08, cs * 0.14); ctx.clip();
        ctx.fillStyle = 'rgba(20,70,20,.7)'; ctx.fillRect(ax - cs, ay - cs, w + cs * 2, h + cs * 2);
        const long = Math.max(w, h), along = w > h;
        for (let k = 0; k < long / (cs * 0.16); k++) {
          const t = k * cs * 0.16 + cs * 0.08;
          const sway = Math.sin(now / 600 + k) * cs * 0.02;
          const lx = along ? ax + t : ax + w / 2 + (k % 2 ? 1 : -1) * w * 0.22 + sway;
          const ly = along ? ay + h / 2 + (k % 2 ? 1 : -1) * h * 0.22 + sway : ay + t;
          ctx.fillStyle = k % 3 ? '#3fae3a' : '#62d24f';
          ctx.beginPath(); ctx.ellipse(lx, ly, cs * 0.11, cs * 0.065, k * 0.9, 0, 7); ctx.fill();
        }
        ctx.restore();
        const bx = x + w / 2, by = y + h / 2;
        ctx.fillStyle = '#1f6d1c'; ctx.strokeStyle = '#bff59a'; ctx.lineWidth = Math.max(1.5, cs * 0.04);
        ctx.beginPath(); ctx.arc(bx, by, cs * 0.2, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(cs * 0.26)}px 'Baloo 2', sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(d.ivyLeft), bx, by + cs * 0.02);
      }
    });
  }

  function drawGens(ctx, L, S, v) {
    const { cs, ox, oy } = v;
    L.gens.forEach((g, gi) => {
      const x = ox + g.x * cs, y = oy + g.y * cs;
      const left = g.q.length - S.qi[gi];
      ctx.fillStyle = '#20264a';
      roundRect(ctx, x + cs * 0.04, y + cs * 0.1, cs * 0.92, cs * 0.9, cs * 0.18); ctx.fill();
      const mg = ctx.createLinearGradient(0, y, 0, y + cs);
      mg.addColorStop(0, left ? '#b6c0e6' : '#7a7f96'); mg.addColorStop(1, left ? '#6a74a6' : '#4a4e60');
      ctx.fillStyle = mg;
      roundRect(ctx, x + cs * 0.04, y + cs * 0.04, cs * 0.92, cs * 0.86, cs * 0.18); ctx.fill();
      // window with next color
      ctx.fillStyle = '#1a1d33';
      roundRect(ctx, x + cs * 0.22, y + cs * 0.2, cs * 0.56, cs * 0.5, cs * 0.1); ctx.fill();
      if (left) {
        const c = PAL[g.q[S.qi[gi]]];
        ctx.fillStyle = c[0];
        roundRect(ctx, x + cs * 0.28, y + cs * 0.26, cs * 0.44, cs * 0.38, cs * 0.08); ctx.fill();
        stud(ctx, x + cs * 0.5, y + cs * 0.45, cs * 0.1, c);
      }
      // output arrow
      ctx.fillStyle = left ? '#ffd23a' : '#666';
      const [dx, dy] = Engine.DIRS[g.d];
      chevron(ctx, x + cs * 0.5 + dx * cs * 0.4, y + cs * 0.47 + dy * cs * 0.4, cs * 0.16, g.d);
      ctx.fill();
      // count badge
      const bx = x + cs * 0.84, by = y + cs * 0.14;
      ctx.fillStyle = left ? '#ff3d57' : '#555'; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, cs * 0.035);
      ctx.beginPath(); ctx.arc(bx, by, cs * 0.17, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(cs * 0.22)}px 'Baloo 2', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(left), bx, by + cs * 0.015);
    });
  }

  // Draw block i with its top-left cell at board coords (bx,by) (floats allowed).
  function drawBlock(ctx, L, S, v, i, bx, by, o) {
    o = o || {};
    const b = L.blocks[i];
    const { cs, ox, oy } = v;
    const spr = brickSprite(b, S.ci[i], cs);
    const px = ox + bx * cs, py = oy + by * cs;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    const sc = o.scale || 1;
    if (sc !== 1 || o.rot) {
      const cx = px + b.w * cs / 2, cy = py + b.h * cs / 2;
      ctx.translate(cx, cy); if (o.rot) ctx.rotate(o.rot); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    }
    if (o.lift) {
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fill(brickPath(b.cells, cs, cs * 0.05, cs * 0.2, px + cs * 0.06, py + cs * 0.16));
    }
    ctx.drawImage(spr.c, px - spr.pad, py - spr.pad - (o.lift ? cs * 0.06 : 0));
    const liftY = o.lift ? -cs * 0.06 : 0;
    // overlays
    const ice = Engine.iceLeft(L, S, i);
    const locked = Engine.isLocked(L, S, i);
    if (b.dir && !ice && !locked) drawArrows(ctx, b, px, py + liftY, cs);
    if (b.key) drawIcon(ctx, ICONS.key, b, px, py + liftY, cs, 0.78);
    if (locked) {
      ctx.fillStyle = 'rgba(10,5,30,.38)';
      ctx.fill(brickPath(b.cells, cs, cs * 0.045, cs * 0.2, px, py));
      drawIcon(ctx, ICONS.lock, b, px, py, cs, 0.72);
    }
    if (ice) drawIce(ctx, b, px, py, cs, ice);
    ctx.restore();
  }

  function centerCell(b) {
    // the cell closest to the bounding-box center
    const cx = (b.w - 1) / 2, cy = (b.h - 1) / 2;
    let best = b.cells[0], bd = Infinity;
    for (const c of b.cells) { const d = (c[0] - cx) ** 2 + (c[1] - cy) ** 2; if (d < bd) { bd = d; best = c; } }
    return best;
  }

  function drawIcon(ctx, img, b, px, py, cs, size) {
    if (!img.complete || !img.naturalWidth) return;
    const [cx, cy] = centerCell(b);
    const s = cs * size;
    ctx.drawImage(img, px + (cx + 0.5) * cs - s / 2, py + (cy + 0.5) * cs - s / 2, s, s);
  }

  function drawArrows(ctx, b, px, py, cs) {
    const [cx, cy] = centerCell(b);
    const mx = px + (cx + 0.5) * cs, my = py + (cy + 0.5) * cs;
    const hor = b.dir === 'h';
    const len = cs * 0.36, hw = cs * 0.13;
    ctx.save();
    ctx.translate(mx, my); if (!hor) ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-len - hw, 0); ctx.lineTo(-len + hw * 0.4, -hw * 1.3); ctx.lineTo(-len + hw * 0.4, -hw * 0.45);
    ctx.lineTo(len - hw * 0.4, -hw * 0.45); ctx.lineTo(len - hw * 0.4, -hw * 1.3); ctx.lineTo(len + hw, 0);
    ctx.lineTo(len - hw * 0.4, hw * 1.3); ctx.lineTo(len - hw * 0.4, hw * 0.45); ctx.lineTo(-len + hw * 0.4, hw * 0.45);
    ctx.lineTo(-len + hw * 0.4, hw * 1.3); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = Math.max(1, cs * 0.03);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawIce(ctx, b, px, py, cs, n) {
    const path = brickPath(b.cells, cs, cs * 0.03, cs * 0.2, px, py);
    const g = ctx.createLinearGradient(px, py, px + b.w * cs, py + b.h * cs);
    g.addColorStop(0, 'rgba(235,250,255,.82)'); g.addColorStop(0.5, 'rgba(170,225,255,.62)'); g.addColorStop(1, 'rgba(210,240,255,.8)');
    ctx.fillStyle = g; ctx.fill(path);
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = Math.max(1.5, cs * 0.05); ctx.stroke(path);
    ctx.save(); ctx.clip(path);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(1, cs * 0.025);
    for (const [cx, cy] of b.cells) {
      const x = px + cx * cs, y = py + cy * cs;
      ctx.beginPath(); ctx.moveTo(x + cs * 0.15, y + cs * 0.3); ctx.lineTo(x + cs * 0.35, y + cs * 0.15);
      ctx.moveTo(x + cs * 0.6, y + cs * 0.85); ctx.lineTo(x + cs * 0.85, y + cs * 0.6); ctx.stroke();
    }
    ctx.restore();
    const [cx, cy] = centerCell(b);
    const tx = px + (cx + 0.5) * cs, ty = py + (cy + 0.5) * cs;
    ctx.font = `800 ${Math.round(cs * 0.56)}px 'Baloo 2', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, cs * 0.08); ctx.strokeStyle = '#1b6fb3'; ctx.fillStyle = '#fff';
    ctx.strokeText(String(n), tx, ty + cs * 0.04); ctx.fillText(String(n), tx, ty + cs * 0.04);
  }

  const ICONS = {};
  ['key', 'lock', 'star', 'coin', 'rocket', 'hammer', 'ufo', 'freeze'].forEach(n => { ICONS[n] = new Image(); ICONS[n].src = 'assets/img/ic_' + n + '.png'; });

  // Small static illustration of a mini level (used by tips).
  function renderDemo(def, cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const c = document.createElement('canvas');
    c.width = cssW * dpr; c.height = cssH * dpr;
    c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
    const L = Engine.parse(def), S = Engine.clone(L.init);
    const v = makeView(L, c.width, c.height, dpr, 60);
    const ctx = c.getContext('2d');
    drawStatic(ctx, L, v);
    drawDoors(ctx, L, S, v, 0);
    drawGens(ctx, L, S, v);
    L.blocks.forEach((b, i) => { if (S.st[i] === 1) drawBlock(ctx, L, S, v, i, S.x[i], S.y[i]); });
    return c;
  }

  /* ---------- game state ---------- */
  const canvas = $('#board');
  const ctx = canvas.getContext('2d');
  let G = null;            // current level session
  let view = null;
  let staticLayer = null;
  let drag = null;         // { i, fx, fy, gx, gy, sx, sy, moved }
  let snaps = new Map();   // i -> { fx, fy, tx, ty, t0 }
  let exiting = [];        // blocks sliding out through doors
  let particles = [];
  let pops = new Map();    // i -> t0 (spawn pop-in)
  let shakes = new Map();  // i -> t0
  const doorAnims = new Map();

  function layout() {
    if (!G) return;
    const r = $('#board-wrap').getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    view = makeView(G.L, canvas.width, canvas.height, dpr, 76);
    staticLayer = document.createElement('canvas');
    staticLayer.width = canvas.width; staticLayer.height = canvas.height;
    drawStatic(staticLayer.getContext('2d'), G.L, view);
    if (G.handOn) placeHand();
  }

  function startLevel(idx) {
    if (modalOpen) closeModal();
    const def = LEVELS[idx];
    const L = Engine.parse(def);
    G = {
      idx, def, L, S: Engine.clone(L.init), occ: null,
      timeLeft: def.t, total: def.t, frozenFor: 0,
      playing: false, over: false, targeting: null, lastSec: Math.ceil(def.t), handOn: false, usedContinue: false,
    };
    G.occ = Engine.occupancy(L, G.S);
    drag = null; snaps = new Map(); exiting = []; particles = []; pops = new Map(); shakes = new Map(); doorAnims.clear();
    show('scr-game');
    $('#hud-level').textContent = idx + 1;
    $('#hud-hard').classList.toggle('hidden', !def.hard);
    setTargeting(null);
    updateCoins(); updateBoosters(); updateTimer();
    layout(); // the screen is display:flex now, so its size is already measurable
    if (def.tip && !save.tips[def.tip]) showTip(def.tip, begin);
    else begin();
  }

  function begin() {
    G.playing = true;
    if (G.idx === 0) { G.handOn = true; placeHand(); }
  }

  function showTip(key, then) {
    const tip = TIPS[key];
    modal({
      title: tip.title, ribbon: 'blue',
      body: '<div class="tip-art"></div><p>' + tip.text + '</p>',
      onOpen: body => { if (tip.demo) body.querySelector('.tip-art').appendChild(renderDemo(tip.demo, 220, 130)); },
      actions: [{ label: '知道了！', cls: 'btn-green', fn: () => { save.tips[key] = 1; persist(); then && then(); } }],
    });
  }

  function placeHand() {
    const hand = $('#hand');
    if (!G || !G.handOn || !view) { hand.classList.add('hidden'); return; }
    // point at the first block, swipe toward its door
    const L = G.L, S = G.S;
    const i = L.blocks.findIndex((b, k) => S.st[k] === 1);
    if (i < 0) { hand.classList.add('hidden'); return; }
    const b = L.blocks[i];
    const d = Engine.doorAt(L, S, L.doors.findIndex(dd => dd.colors[0] === b.colors[0]));
    const toX = d.side === 'R' ? L.W - b.w : d.side === 'L' ? 0 : S.x[i];
    const p = (x, y) => [(view.ox + (x + b.w / 2) * view.cs) / view.dpr, (view.oy + (y + b.h / 2) * view.cs) / view.dpr];
    const [x0, y0] = p(S.x[i], S.y[i]), [x1, y1] = p(toX + (d.side === 'R' ? 0.4 : -0.4), S.y[i]);
    hand.classList.remove('hidden');
    hand.getAnimations().forEach(a => a.cancel());
    hand.animate([
      { left: x0 + 'px', top: y0 + 'px', opacity: 0 },
      { left: x0 + 'px', top: y0 + 'px', opacity: 1, offset: 0.15 },
      { left: x1 + 'px', top: y1 + 'px', opacity: 1, offset: 0.75 },
      { left: x1 + 'px', top: y1 + 'px', opacity: 0 },
    ], { duration: 1800, iterations: Infinity, easing: 'ease-in-out' });
  }
  function hideHand() { if (G) G.handOn = false; $('#hand').classList.add('hidden'); }

  /* ---------- timer ---------- */
  function fmt(t) {
    t = Math.max(0, Math.ceil(t));
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }
  function updateTimer() {
    if (!G) return;
    $('#hud-time').textContent = fmt(G.timeLeft);
    const el = $('#hud-timer');
    el.classList.toggle('frozen', G.frozenFor > 0);
    el.classList.toggle('low', G.frozenFor <= 0 && G.timeLeft <= 10 && !G.over);
  }

  function tickTimer(dt) {
    if (!G || !G.playing || G.over || modalOpen || document.hidden) return;
    if (G.frozenFor > 0) { G.frozenFor = Math.max(0, G.frozenFor - dt); updateTimer(); return; }
    G.timeLeft -= dt;
    const sec = Math.ceil(G.timeLeft);
    if (sec !== G.lastSec) {
      G.lastSec = sec;
      if (sec <= 10 && sec > 0) Sound.play('tick', { rate: sec <= 5 ? 1.15 : 1 });
    }
    if (G.timeLeft <= 0) { G.timeLeft = 0; updateTimer(); fail(); return; }
    updateTimer();
  }

  /* ---------- input ---------- */
  function boardPoint(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * view.dpr, y = (e.clientY - r.top) * view.dpr;
    return [(x - view.ox) / view.cs, (y - view.oy) / view.cs];
  }

  function blockAt(cx, cy) {
    const x = Math.floor(cx), y = Math.floor(cy);
    if (x < 0 || y < 0 || x >= G.L.W || y >= G.L.H) return -1;
    return G.occ[y * G.L.W + x] - 1;
  }

  canvas.addEventListener('pointerdown', e => {
    if (!G || !G.playing || G.over || modalOpen || !view) return;
    e.preventDefault();
    const [cx, cy] = boardPoint(e);
    const i = blockAt(cx, cy);
    if (G.targeting) {
      if (i >= 0) useTargetBooster(G.targeting, i);
      return;
    }
    if (i < 0) return;
    snaps.delete(i); // grabbing again mid snap-back: just finish the snap
    const L = G.L, S = G.S;
    if (!Engine.canMove(L, S, i)) {
      shakes.set(i, performance.now());
      Sound.play('bump');
      if (Engine.iceLeft(L, S, i)) toast('冰凍中！再送走 <b>' + Engine.iceLeft(L, S, i) + '</b> 個方塊才會融化');
      else if (Engine.isLocked(L, S, i)) toast('上鎖了！先把帶 <b>鑰匙</b> 的方塊送出去');
      return;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already-released pointer */ }
    drag = { i, fx: S.x[i], fy: S.y[i], gx: cx - S.x[i], gy: cy - S.y[i], sx: S.x[i], sy: S.y[i], moved: false, pid: e.pointerId };
    Sound.play('pick');
  });

  canvas.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.pid) return;
    const [cx, cy] = boardPoint(e);
    dragTo(cx - drag.gx, cy - drag.gy);
  });

  const endPointer = e => {
    if (!drag || e.pointerId !== drag.pid) return;
    releaseDrag();
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  function canPlaceFloat(i, px, py) {
    const L = G.L, b = L.blocks[i], occ = G.occ;
    for (const [cx, cy] of b.cells) {
      const x0 = Math.floor(px + cx + EPS), x1 = Math.ceil(px + cx + 1 - EPS) - 1;
      const y0 = Math.floor(py + cy + EPS), y1 = Math.ceil(py + cy + 1 - EPS) - 1;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!Engine.isFloor(L, x, y)) return false;
          const o = occ[y * L.W + x];
          if (o && o !== i + 1) return false;
        }
      }
    }
    return true;
  }

  // Move one axis toward delta, never skipping over a grid line; false if blocked.
  function tryStep(axis, delta) {
    if (Math.abs(delta) < EPS) return false;
    const cur = axis === 'x' ? drag.fx : drag.fy;
    let next = cur + Math.sign(delta) * Math.min(Math.abs(delta), 0.2);
    const up = Math.ceil(cur - EPS), dn = Math.floor(cur + EPS);
    if (delta > 0 && up > cur + EPS && next > up) next = up;
    if (delta < 0 && dn < cur - EPS && next < dn) next = dn;
    const nx = axis === 'x' ? next : drag.fx, ny = axis === 'y' ? next : drag.fy;
    if (!canPlaceFloat(drag.i, nx, ny)) return false;
    if (axis === 'x') drag.fx = isInt(next) ? Math.round(next) : next; else drag.fy = isInt(next) ? Math.round(next) : next;
    return true;
  }

  function dragTo(tx, ty) {
    const L = G.L, b = L.blocks[drag.i];
    tx = clamp(tx, -0.6, L.W - b.w + 0.6);
    ty = clamp(ty, -0.6, L.H - b.h + 0.6);
    for (let guard = 0; guard < 300 && drag; guard++) {
      let dx = tx - drag.fx, dy = ty - drag.fy;
      if (b.dir === 'h') dy = 0;
      if (b.dir === 'v') dx = 0;
      if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) break;
      const ax = isInt(drag.fx), ay = isInt(drag.fy);
      let moved = false;
      if (ax && ay) {
        const order = Math.abs(dx) >= Math.abs(dy) ? ['x', 'y'] : ['y', 'x'];
        for (const axis of order) { if (tryStep(axis, axis === 'x' ? dx : dy)) { moved = true; break; } }
      } else if (!ay) {
        // mid-cell vertically: finish the cell first if the finger wants to go sideways
        const goal = Math.abs(dx) > Math.abs(dy) + 0.15 ? Math.round(drag.fy) : ty;
        moved = tryStep('y', goal - drag.fy) || tryStep('y', Math.round(drag.fy) - drag.fy);
      } else {
        const goal = Math.abs(dy) > Math.abs(dx) + 0.15 ? Math.round(drag.fx) : tx;
        moved = tryStep('x', goal - drag.fx) || tryStep('x', Math.round(drag.fx) - drag.fx);
      }
      if (!moved) break;
      if (drag.fx !== drag.sx || drag.fy !== drag.sy) drag.moved = true;
      if (isInt(drag.fx) && isInt(drag.fy) && tryDragExit()) return;
    }
    if (drag && isInt(drag.fx) && isInt(drag.fy) && (Math.abs(tx - drag.fx) > 0.3 || Math.abs(ty - drag.fy) > 0.3)) tryDragExit();
  }
  function tryDragExit() {
    const i = drag.i, x = Math.round(drag.fx), y = Math.round(drag.fy);
    const di = Engine.findExit(G.L, G.S, G.occ, i, x, y);
    if (di < 0) return false;
    drag = null;
    doExit(i, x, y, di);
    return true;
  }

  function releaseDrag() {
    const d = drag;
    drag = null;
    const L = G.L, S = G.S, i = d.i;
    const rx = Math.round(d.fx), ry = Math.round(d.fy);
    if (!d.moved && rx === d.sx && ry === d.sy) {
      // tap: leave if already standing at a matching door
      const di = Engine.findExit(L, S, G.occ, i, rx, ry);
      if (di >= 0) doExit(i, rx, ry, di);
      return;
    }
    snaps.set(i, { fx: d.fx, fy: d.fy, tx: rx, ty: ry, t0: performance.now() });
    if (rx === d.sx && ry === d.sy) return;
    const before = L.doors.map((_, di) => doorRectNow(di));
    const spawned = Engine.applyMove(L, S, i, rx, ry);
    G.occ = Engine.occupancy(L, S);
    Sound.play('snap');
    afterAction({ spawned, unlocked: [], thawed: [] }, before);
  }

  function doorRectNow(di) { const d = Engine.doorAt(G.L, G.S, di); const r = doorRect(view, d); return { x: r[0], y: r[1] }; }

  function doExit(i, x, y, di) {
    const L = G.L, S = G.S;
    const b = L.blocks[i];
    const d = Engine.doorAt(L, S, di);
    const col = Engine.color(L, S, i);
    const before = L.doors.map((_, k) => doorRectNow(k));
    S.x[i] = x; S.y[i] = y;
    const res = Engine.applyExit(L, S, i);
    G.occ = Engine.occupancy(L, S);
    if (res.peeled) {
      Sound.play('peel');
      burst(x + b.w / 2, y + b.h / 2, PAL[col], 26, 1.2);
      pops.set(i, performance.now());
    } else {
      Sound.play('exit', { rate: 0.95 + Math.random() * 0.12 });
      exiting.push({ i, x, y, side: d.side, ci: S.ci[i], t0: performance.now(), dur: 260, col, burst: false });
    }
    hideHand();
    afterAction(res, before);
  }

  function afterAction(res, doorsBefore) {
    const now = performance.now();
    // animate doors that moved
    if (doorsBefore) {
      G.L.doors.forEach((def, di) => {
        if (!def.mv) return;
        const after = doorRectNow(di);
        if (after.x !== doorsBefore[di].x || after.y !== doorsBefore[di].y) doorAnims.set(di, { x: doorsBefore[di].x, y: doorsBefore[di].y, t0: now });
      });
    }
    (res.spawned || []).forEach(j => { pops.set(j, now); });
    if (res.spawned && res.spawned.length) setTimeout(() => Sound.play('spawn'), 120);
    (res.unlocked || []).forEach(j => {
      const b = G.L.blocks[j];
      burst(G.S.x[j] + b.w / 2, G.S.y[j] + b.h / 2, ['#ffd23a', '#fff3a0', '#c99a00'], 22, 1);
    });
    if (res.unlocked && res.unlocked.length) setTimeout(() => Sound.play('unlock'), 150);
    (res.thawed || []).forEach(j => {
      const b = G.L.blocks[j];
      burst(G.S.x[j] + b.w / 2, G.S.y[j] + b.h / 2, ['#e8f8ff', '#ffffff', '#8fd3ff'], 24, 1.1);
    });
    if (res.thawed && res.thawed.length) setTimeout(() => Sound.play('ice'), 100);
    if (Engine.isWon(G.L, G.S)) { G.over = true; setTimeout(win, 650); }
  }

  /* ---------- boosters ---------- */
  function updateBoosters() {
    $$('.booster').forEach(btn => {
      const k = btn.dataset.b;
      const badge = btn.querySelector('.b-badge');
      const n = save.inv[k] || 0;
      if (n > 0) { badge.className = 'b-badge'; badge.textContent = n; } else { badge.className = 'b-badge price'; badge.innerHTML = '<img src="assets/img/ic_coin.png" alt="">' + BOOSTERS[k].price; }
      btn.classList.toggle('active', !!G && G.targeting === k);
    });
  }

  function haveBooster(k) {
    if ((save.inv[k] || 0) > 0) return true;
    if (save.coins >= BOOSTERS[k].price) return true;
    toast('金幣不足！過關可以賺取金幣');
    Sound.play('bump');
    return false;
  }
  function consumeBooster(k) {
    if ((save.inv[k] || 0) > 0) save.inv[k]--;
    else { save.coins -= BOOSTERS[k].price; updateCoins(); }
    persist(); updateBoosters();
  }

  function setTargeting(k) {
    if (G) G.targeting = k;
    const hint = $('#target-hint');
    if (k) {
      hint.textContent = { hammer: '點一個冰凍／上鎖的方塊或小方塊', rocket: '點一個方塊把它炸掉', ufo: '點一個方塊，吸走所有同色方塊' }[k];
      hint.classList.remove('hidden');
    } else hint.classList.add('hidden');
    updateBoosters();
  }

  $$('.booster').forEach(btn => btn.addEventListener('click', () => {
    if (!G || !G.playing || G.over || modalOpen) return;
    const k = btn.dataset.b;
    Sound.play('button');
    if (G.targeting === k) { setTargeting(null); return; }
    if (!haveBooster(k)) return;
    if (k === 'freeze') {
      consumeBooster('freeze');
      G.frozenFor += 15;
      Sound.play('freeze');
      flyIcon('freeze', btn, $('#hud-timer'));
      toast('時間凍結 15 秒！');
      updateTimer();
      return;
    }
    setTargeting(k);
  }));

  function useTargetBooster(k, i) {
    const L = G.L, S = G.S, b = L.blocks[i];
    const btn = $('.booster[data-b="' + k + '"]');
    const center = blockScreenCenter(i);
    if (k === 'hammer') {
      const frozen = Engine.iceLeft(L, S, i) > 0, locked = Engine.isLocked(L, S, i);
      if (!frozen && !locked && b.cells.length > 2) { toast('這個方塊太大了！試試火箭'); Sound.play('bump'); return; }
      consumeBooster('hammer'); setTargeting(null);
      flyIcon('hammer', btn, center, () => {
        if (frozen || locked) {
          S.fr[i] = 1;
          Sound.play('hammer');
          setTimeout(() => Sound.play(frozen ? 'ice' : 'unlock'), 140);
          shakes.set(i, performance.now());
          burst(S.x[i] + b.w / 2, S.y[i] + b.h / 2, frozen ? ['#e8f8ff', '#fff', '#8fd3ff'] : ['#ffd23a', '#fff3a0', '#c99a00'], 24, 1.1);
        } else removeWithFx([i], 'hammer');
      });
      return;
    }
    if (k === 'rocket') {
      consumeBooster('rocket'); setTargeting(null);
      setTimeout(() => Sound.play('blast'), 260); // the boom peaks ~0.26 s in: land it on impact
      flyIcon('rocket', btn, center, () => removeWithFx([i], null));
      return;
    }
    if (k === 'ufo') {
      const col = Engine.color(L, S, i);
      const list = L.blocks.map((_, j) => j).filter(j => S.st[j] === 1 && Engine.color(L, S, j) === col);
      consumeBooster('ufo'); setTargeting(null);
      flyIcon('ufo', btn, center, () => removeWithFx(list, 'exit'));
    }
  }

  function removeWithFx(list, sound) {
    const L = G.L, S = G.S;
    list.forEach(j => {
      const b = L.blocks[j];
      burst(S.x[j] + b.w / 2, S.y[j] + b.h / 2, PAL[Engine.color(L, S, j)], 30, 1.4);
      exiting.push({ i: j, x: S.x[j], y: S.y[j], side: null, ci: S.ci[j], t0: performance.now(), dur: 320, col: Engine.color(L, S, j), burst: true });
    });
    if (sound) Sound.play(sound);
    const res = Engine.removeBlocks(L, S, list);
    G.occ = Engine.occupancy(L, S);
    hideHand();
    afterAction(res, null);
  }

  function blockScreenCenter(i) {
    const b = G.L.blocks[i];
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (view.ox + (G.S.x[i] + b.w / 2) * view.cs) / view.dpr, y: r.top + (view.oy + (G.S.y[i] + b.h / 2) * view.cs) / view.dpr };
  }

  function flyIcon(name, fromEl, to, done) {
    const fr = fromEl.getBoundingClientRect();
    const target = to instanceof Element ? (() => { const r = to.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })() : to;
    const img = document.createElement('img');
    img.src = 'assets/img/ic_' + name + '.png';
    $('#fly-layer').appendChild(img);
    const a = img.animate([
      { transform: `translate(${fr.left + fr.width / 2 - 32}px, ${fr.top + fr.height / 2 - 32}px) scale(.8) rotate(0deg)` },
      { transform: `translate(${(fr.left + target.x) / 2 - 32}px, ${Math.min(fr.top, target.y) - 80}px) scale(1.3) rotate(${name === 'hammer' ? -40 : 0}deg)`, offset: 0.55 },
      { transform: `translate(${target.x - 32}px, ${target.y - 32}px) scale(1) rotate(${name === 'hammer' ? 30 : 0}deg)` },
    ], { duration: 520, easing: 'ease-in-out' });
    // animations stall in background tabs; never let the booster effect depend on it
    let fired = false;
    const finish = () => { if (fired) return; fired = true; img.remove(); if (done) done(); };
    a.onfinish = finish;
    setTimeout(finish, 560);
  }

  /* ---------- particles ---------- */
  function burst(bx, by, col, n, power) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = (0.04 + Math.random() * 0.09) * power;
      particles.push({
        x: bx, y: by, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.04, g: 0.0035,
        size: 0.08 + Math.random() * 0.14, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        life: 1, decay: 0.012 + Math.random() * 0.02, col: col[Math.floor(Math.random() * 3)], kind: Math.random() < 0.25 ? 'spark' : 'cube',
      });
    }
  }
  function doorBurst(e) {
    const b = G.L.blocks[e.i];
    const col = PAL[e.col];
    const [dx, dy] = Engine.DIRS[e.side];
    const L = G.L;
    let x, y;
    if (e.side === 'R') { x = L.W + 0.3; y = e.y + b.h / 2; } else if (e.side === 'L') { x = -0.3; y = e.y + b.h / 2; } else if (e.side === 'U') { x = e.x + b.w / 2; y = -0.3; } else { x = e.x + b.w / 2; y = L.H + 0.3; }
    for (let k = 0; k < 26; k++) {
      const spread = (Math.random() - 0.5) * (e.side === 'L' || e.side === 'R' ? b.h : b.w);
      particles.push({
        x: x + (dy ? spread : 0), y: y + (dx ? spread : 0),
        vx: dx * (0.03 + Math.random() * 0.08) + (Math.random() - 0.5) * 0.06,
        vy: dy * (0.03 + Math.random() * 0.08) + (Math.random() - 0.5) * 0.06 - 0.02, g: 0.003,
        size: 0.07 + Math.random() * 0.13, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        life: 1, decay: 0.015 + Math.random() * 0.02, col: k % 3 === 0 ? '#ffffff' : col[k % 2], kind: k % 4 === 0 ? 'spark' : 'cube',
      });
    }
  }
  function confetti() {
    const cols = Object.values(PAL).map(p => p[0]);
    for (let k = 0; k < 140; k++) {
      particles.push({
        x: Math.random() * G.L.W, y: -1 - Math.random() * 3, vx: (Math.random() - 0.5) * 0.05, vy: 0.02 + Math.random() * 0.05, g: 0.0012,
        size: 0.12 + Math.random() * 0.12, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        life: 1, decay: 0.004 + Math.random() * 0.004, col: cols[k % cols.length], kind: 'paper',
      });
    }
  }

  /* ---------- main loop ---------- */
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    tickTimer(dt);
    if (G && view && $('#scr-game').classList.contains('active')) draw(now);
    requestAnimationFrame(frame);
  }

  function draw(now) {
    const L = G.L, S = G.S, v = view;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(staticLayer, 0, 0);
    drawDoors(ctx, L, S, v, now);
    drawGens(ctx, L, S, v);

    // exiting blocks (clipped to the board + door mouth)
    exiting = exiting.filter(e => {
      const t = (now - e.t0) / e.dur;
      if (t >= 1) return false;
      const b = L.blocks[e.i];
      const ghost = { ci: Int8Array.of(e.ci) };
      ctx.save();
      if (e.side) {
        const [dx, dy] = Engine.DIRS[e.side];
        const dist = (dx ? b.w : b.h) + 0.6;
        const k = easeIn(t) * dist;
        roundRect(ctx, v.ox - v.ft * 0.15, v.oy - v.ft * 0.15, L.W * v.cs + v.ft * 0.3, L.H * v.cs + v.ft * 0.3, v.cs * 0.1);
        ctx.clip();
        if (!e.burst && t > 0.35) { e.burst = true; doorBurst(e); }
        drawGhost(ctx, L, v, e.i, ghost, e.x + dx * k, e.y + dy * k, { scale: 1 - t * 0.15 });
      } else {
        drawGhost(ctx, L, v, e.i, ghost, e.x, e.y - t * 0.4, { scale: 1 + t * 0.3, alpha: 1 - t });
      }
      ctx.restore();
      return true;
    });

    // resting blocks
    for (let i = 0; i < L.blocks.length; i++) {
      if (S.st[i] !== 1 || (drag && drag.i === i)) continue;
      let x = S.x[i], y = S.y[i];
      const sn = snaps.get(i);
      if (sn) {
        const t = clamp((now - sn.t0) / 90, 0, 1);
        x = sn.fx + (sn.tx - sn.fx) * easeOut(t); y = sn.fy + (sn.ty - sn.fy) * easeOut(t);
        if (t >= 1) snaps.delete(i);
      }
      const o = {};
      const pt = pops.get(i);
      if (pt !== undefined) {
        const t = clamp((now - pt) / 320, 0, 1);
        o.scale = t < 1 ? 0.4 + 0.6 * easeOut(t) + Math.sin(t * Math.PI) * 0.12 : 1;
        if (t >= 1) pops.delete(i);
      }
      const st = shakes.get(i);
      if (st !== undefined) {
        const t = (now - st) / 300;
        if (t >= 1) shakes.delete(i); else x += Math.sin(t * 30) * 0.08 * (1 - t);
      }
      if (G.targeting) o.alpha = 0.95;
      drawBlock(ctx, L, S, v, i, x, y, o);
      if (G.targeting) {
        const b = L.blocks[i];
        ctx.save();
        ctx.strokeStyle = 'rgba(255,210,58,' + (0.5 + 0.4 * Math.sin(now / 160)) + ')';
        ctx.lineWidth = Math.max(2, v.cs * 0.06);
        ctx.stroke(brickPath(b.cells, v.cs, v.cs * 0.03, v.cs * 0.2, v.ox + x * v.cs, v.oy + y * v.cs));
        ctx.restore();
      }
    }
    if (drag) drawBlock(ctx, L, S, v, drag.i, drag.fx, drag.fy, { lift: true, scale: 1.04 });

    // particles
    particles = particles.filter(p => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
      if (p.life <= 0 || p.y > L.H + 6) return false;
      const px = v.ox + p.x * v.cs, py = v.oy + p.y * v.cs, s = p.size * v.cs;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 1.5);
      ctx.translate(px, py); ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      if (p.kind === 'spark') {
        ctx.beginPath();
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); ctx.lineTo(Math.cos(a + Math.PI / 4) * s * 0.3, Math.sin(a + Math.PI / 4) * s * 0.3); }
        ctx.closePath(); ctx.fill();
      } else if (p.kind === 'paper') {
        ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      } else {
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-s / 2, -s / 2, s, s * 0.3);
      }
      ctx.restore();
      return true;
    });
  }

  // Draw a block that is no longer on the board (uses a stand-in color index).
  function drawGhost(c, L, v, i, ghost, x, y, o) {
    const b = L.blocks[i];
    const spr = brickSprite(b, ghost.ci[0], v.cs);
    const px = v.ox + x * v.cs, py = v.oy + y * v.cs;
    c.save();
    if (o.alpha !== undefined) c.globalAlpha = Math.max(0, o.alpha);
    const cx = px + b.w * v.cs / 2, cy = py + b.h * v.cs / 2;
    c.translate(cx, cy); c.scale(o.scale || 1, o.scale || 1); c.translate(-cx, -cy);
    c.drawImage(spr.c, px - spr.pad, py - spr.pad);
    c.restore();
  }

  /* ---------- win / fail ---------- */
  function starsFor() {
    const f = G.timeLeft / G.total;
    return G.usedContinue ? 1 : f >= 0.45 ? 3 : f >= 0.2 ? 2 : 1;
  }

  function win() {
    if (!G) return;
    G.playing = false;
    hideHand();
    const stars = starsFor();
    const reward = 20 + stars * 10 + (G.def.hard ? 30 : 0);
    const idx = G.idx;
    save.stars[idx] = Math.max(save.stars[idx] || 0, stars);
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, idx + 2));
    save.coins += reward;
    persist();
    confetti();
    Sound.play('win');
    Sound.duck(3.5);
    const last = idx === LEVELS.length - 1;
    setTimeout(() => modal({
      title: last ? '全部通關！' : '過關！',
      body: `<div class="win-stars"><img src="assets/img/ic_star.png" alt=""><img src="assets/img/ic_star.png" alt=""><img src="assets/img/ic_star.png" alt=""></div>
             <p>剩餘時間 <b>${fmt(G.timeLeft)}</b></p>
             <div class="reward"><img src="assets/img/ic_coin.png" alt="">+<span id="reward-n">0</span></div>
             ${last ? '<p>恭喜你完成全部 30 關，你是真正的積木大師！</p>' : ''}`,
      onOpen: body => {
        const imgs = body.querySelectorAll('.win-stars img');
        for (let k = 0; k < stars; k++) setTimeout(() => { imgs[k].classList.add('on'); Sound.play('star', { rate: 1 + k * 0.12 }); }, 350 + k * 320);
        const el = body.querySelector('#reward-n');
        const t0 = performance.now() + 350 + stars * 320;
        const count = () => {
          const t = clamp((performance.now() - t0) / 600, 0, 1);
          el.textContent = Math.round(reward * t);
          if (t < 1) requestAnimationFrame(count); else { Sound.play('coin'); updateCoins(); }
        };
        setTimeout(count, 350 + stars * 320);
      },
      actions: last
        ? [{ label: '選單', fn: openLevels }, { label: '重玩', cls: 'btn-purple', fn: () => startLevel(idx) }]
        : [{ label: '選單', fn: openLevels }, { label: '重玩', fn: () => startLevel(idx) }, { label: '下一關 ›', cls: 'btn-green', fn: () => startLevel(idx + 1) }],
    }), 700);
  }

  function fail() {
    G.over = true;
    G.playing = false;
    drag = null;
    Sound.play('lose');
    Sound.duck(3);
    const cost = 120;
    modal({
      title: '時間到！', ribbon: 'red',
      body: `<img class="big-icon" src="assets/img/ic_freeze.png" alt=""><p>還剩 <b>${Engine.remaining(G.L, G.S)}</b> 個方塊沒送走</p>`,
      actions: [
        { label: '選單', fn: openLevels },
        { label: '重來', fn: () => startLevel(G.idx) },
        { label: `+30 秒 <img src="assets/img/ic_coin.png" style="width:18px;vertical-align:-3px" alt="">${cost}`, cls: 'btn-green', keep: true, fn: () => {
          if (save.coins < cost) { toast('金幣不足！'); Sound.play('bump'); return; }
          save.coins -= cost; persist(); updateCoins();
          closeModal();
          G.timeLeft = 30; G.lastSec = 30; G.over = false; G.playing = true; G.usedContinue = true;
          Sound.play('coin');
          updateTimer();
        } },
      ],
    });
  }

  /* ---------- screens ---------- */
  let menuChapter = -1; // -1: chapter overview, otherwise the open chapter
  const chapterOf = idx => CHAPTERS.reduce((a, ch, k) => (idx >= ch.start ? k : a), 0);
  const chapterRange = k => [CHAPTERS[k].start, Math.min(LEVELS.length, k + 1 < CHAPTERS.length ? CHAPTERS[k + 1].start : LEVELS.length)];
  const nextLevel = () => LEVELS.findIndex((_, k) => !save.stars[k]); // first level not cleared yet
  const starImgs = n => [0, 1, 2].map(k => `<img src="assets/img/ic_star.png" class="${k < n ? '' : 'off'}" alt="">`).join('');

  function leaveGame() { G = null; drag = null; hideHand(); }

  // "選單" from inside a level goes back to that level's chapter.
  function openLevels() {
    if (G) openChapter(chapterOf(G.idx)); else openChapters();
  }

  function openChapters() {
    leaveGame();
    menuChapter = -1;
    $('#levels-title').textContent = '選擇關卡';
    const list = $('#level-list');
    list.innerHTML = '';
    list.className = 'level-list chapters';
    const next = nextLevel();
    CHAPTERS.forEach((ch, k) => {
      const [a, b] = chapterRange(k);
      if (a >= b) return;
      let stars = 0, cleared = 0;
      for (let i = a; i < b; i++) { stars += save.stars[i] || 0; if (save.stars[i]) cleared++; }
      const card = document.createElement('button');
      card.className = 'chap-card' + (next >= a && next < b ? ' current' : '') + (cleared === b - a ? ' done' : '');
      card.style.setProperty('--c1', ch.c[0]);
      card.style.setProperty('--c2', ch.c[1]);
      card.innerHTML = `<div class="chap-head"><span class="chap-no">${k + 1}</span><span class="chap-name"><b>${ch.name}</b><small>${ch.sub}</small></span></div>
        <div class="chap-art"></div>
        <div class="chap-foot"><span>第 ${a + 1}–${b} 關</span><span class="chap-stars"><img src="assets/img/ic_star.png" alt="">${stars}/${(b - a) * 3}</span></div>`;
      card.querySelector('.chap-art').appendChild(renderDemo(TIPS[ch.demo].demo, 128, 64));
      card.addEventListener('click', () => { Sound.play('button'); openChapter(k); });
      list.appendChild(card);
    });
    updateCoins();
    show('scr-levels');
  }

  function openChapter(k) {
    leaveGame();
    menuChapter = k;
    const ch = CHAPTERS[k];
    const [a, b] = chapterRange(k);
    $('#levels-title').textContent = ch.name;
    const list = $('#level-list');
    list.innerHTML = '';
    list.className = 'level-list stages';
    list.style.setProperty('--c1', ch.c[0]);
    list.style.setProperty('--c2', ch.c[1]);
    let stars = 0;
    for (let i = a; i < b; i++) stars += save.stars[i] || 0;
    const banner = document.createElement('div');
    banner.className = 'stage-banner';
    banner.innerHTML = `<span>第 ${k + 1} 大關・${ch.sub}</span><span class="chap-stars"><img src="assets/img/ic_star.png" alt="">${stars}/${(b - a) * 3}</span>`;
    list.appendChild(banner);
    const next = nextLevel();
    for (let i = a; i < b; i++) {
      const lv = LEVELS[i], s = save.stars[i] || 0;
      const row = document.createElement('button');
      row.className = 'stage' + (lv.hard ? ' hard' : '') + (i === next ? ' current' : '') + (s ? ' cleared' : '');
      const what = lv.tip ? '新機制：' + TIPS[lv.tip].title : lv.hard ? '高難度挑戰' : '綜合練習';
      row.innerHTML = `<span class="stage-no">${i - a + 1}</span>
        <span class="stage-info"><b>${lv.name}</b><small>${what}・限時 ${fmt(lv.t)}</small></span>
        <span class="stage-stars">${starImgs(s)}</span>`;
      row.addEventListener('click', () => { Sound.play('button'); startLevel(i); });
      list.appendChild(row);
    }
    updateCoins();
    show('scr-levels');
  }

  function openTitle() {
    G = null;
    const cleared = save.stars.filter(Boolean).length;
    const total = save.stars.reduce((a, s) => a + (s || 0), 0);
    $('#title-progress').innerHTML = cleared ? `已過關 ${cleared} / ${LEVELS.length}・⭐ ${total} / ${LEVELS.length * 3}` : '30 個關卡等你挑戰！';
    show('scr-title');
  }

  function syncToggles() {
    $$('.toggle').forEach(b => b.classList.toggle('off', !save[b.dataset.toggle]));
    Sound.setMusic(save.music);
    Sound.setSfx(save.sfx);
  }

  function pause() {
    if (!G || G.over || modalOpen) return;
    drag = null;
    modal({
      title: '暫停', ribbon: 'blue',
      body: `<p>第 ${G.idx + 1} 關「${G.def.name}」</p>
             <div class="setting-row">
               <button class="btn btn-round toggle${save.music ? '' : ' off'}" data-set="music"><span class="ico">♫</span><span class="lbl">音樂</span></button>
               <button class="btn btn-round toggle${save.sfx ? '' : ' off'}" data-set="sfx"><span class="ico">🔊</span><span class="lbl">音效</span></button>
             </div>`,
      onOpen: body => body.querySelectorAll('[data-set]').forEach(btn => btn.addEventListener('click', () => {
        const k = btn.dataset.set;
        save[k] = !save[k]; persist(); syncToggles();
        btn.classList.toggle('off', !save[k]);
        Sound.play('button');
      })),
      actions: [
        { label: '選單', fn: openLevels },
        { label: '重來', fn: () => startLevel(G.idx) },
        { label: '繼續', cls: 'btn-green', fn: () => {} },
      ],
    });
  }

  function howTo() {
    modal({
      title: '玩法說明', ribbon: 'blue',
      body: `<div class="tip-art"></div>
        <p style="text-align:left">・拖曳方塊到<b>同色的門</b>，方塊就會滑出去。<br>
        ・方塊必須對齊門口，且<b>不能比門寬</b>。<br>
        ・在時間內送走所有方塊即可過關，剩越多時間星星越多。<br>
        ・道具：<b>凍結</b>暫停時間、<b>鐵鎚</b>敲碎冰鎖、<b>火箭</b>炸掉方塊、<b>飛碟</b>吸走同色方塊。</p>`,
      onOpen: body => body.querySelector('.tip-art').appendChild(renderDemo(TIPS.block.demo, 200, 120)),
      actions: [{ label: '開始吧！', cls: 'btn-green', fn: () => {} }],
    });
  }

  /* ---------- wiring ---------- */
  $('#btn-start').addEventListener('click', () => {
    Sound.unlock();
    Sound.play('button');
    Sound.startMusic();
    openLevels();
  });
  $('#btn-howto').addEventListener('click', () => { Sound.unlock(); Sound.play('button'); howTo(); });
  $$('#scr-title .toggle').forEach(b => b.addEventListener('click', () => {
    Sound.unlock();
    const k = b.dataset.toggle;
    save[k] = !save[k]; persist(); syncToggles();
    Sound.play('button');
  }));
  $('#btn-levels-back').addEventListener('click', () => {
    Sound.play('button');
    if (menuChapter >= 0) openChapters(); else openTitle();
  });
  $('#btn-pause').addEventListener('click', () => { Sound.play('button'); pause(); });
  $('#btn-restart').addEventListener('click', () => {
    if (!G || modalOpen) return;
    Sound.play('button');
    modal({
      title: '重新開始？', ribbon: 'red',
      body: '<p>目前的進度會重來喔！</p>',
      actions: [{ label: '取消', fn: () => {} }, { label: '重新開始', cls: 'btn-green', fn: () => startLevel(G.idx) }],
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (G && G.targeting) setTargeting(null); else if (!modalOpen) pause(); }
  });
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
  window.addEventListener('resize', () => { if (G) layout(); });

  syncToggles();
  updateCoins();
  openTitle();
  requestAnimationFrame(frame);

  // debug hooks (used by automated checks)
  window.__brick = { startLevel, get G() { return G; }, get view() { return view; }, save, openLevels };
})();
