/* Brick Escape — core rules.
 * Pure logic, no DOM: shared by the game (browser) and the solver / level tools (node).
 *
 * Level definition (see levels.js):
 *   map   : rows of chars. '.' floor, '#' wall, ' ' void, '@' generator, letters = blocks
 *           (4-connected cells with the same letter form one block).
 *   key   : { letter: "<colors> [flags...]" }
 *           colors = one or more color codes, outer layer first (e.g. "r", "rb" = red shell, blue core)
 *           flags  = h | v (slide axis), i<n> (ice: thaws after n clears), L<n> (locked by key n),
 *                    K<n> (carries key n), S (split: every cell is its own 1x1 block)
 *   doors : [{ s:'U'|'D'|'L'|'R', p, l, c, at:[x,y], ivy, mv:[a,b] }]
 *           p = row (L/R) or column (U/D) of the first door cell on the outer edge,
 *           at = explicit first floor cell for doors on inner walls, l = length (default 1),
 *           c = color code(s) — several codes make the door cycle color after every action,
 *           ivy = clears needed before the door opens, mv = ping-pong range of p (moves 1 per action).
 *   gens  : [{ x, y, d:'U'|'D'|'L'|'R', q:'rrgb' }] generator on an '@' cell, pushes 1x1 blocks out.
 */
(function (root) {
  'use strict';

  const CODES = { r: 'red', o: 'orange', y: 'yellow', l: 'lime', g: 'green', c: 'cyan', b: 'blue', p: 'purple', k: 'pink', w: 'white', n: 'black' };
  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

  function parse(def) {
    const map = def.map;
    const H = map.length;
    const W = Math.max.apply(null, map.map(r => r.length));
    const floor = new Uint8Array(W * H);
    const ch = (x, y) => (map[y][x] === undefined ? ' ' : map[y][x]);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = ch(x, y);
        floor[y * W + x] = (c === '#' || c === ' ' || c === '@') ? 0 : 1;
      }
    }

    const blocks = [];
    const seen = new Uint8Array(W * H);
    const keySpec = def.key || {};

    function addBlock(cells, spec, extra) {
      let minX = Infinity, minY = Infinity;
      for (const [x, y] of cells) { minX = Math.min(minX, x); minY = Math.min(minY, y); }
      const rel = cells.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      const b = Object.assign({
        cells: rel,
        x0: minX, y0: minY,
        colors: spec.colors,
        dir: spec.dir || null,
        ice: spec.ice || 0,
        lock: spec.lock || 0,
        key: spec.key || 0,
        gen: -1,
      }, extra || {});
      b.w = Math.max.apply(null, rel.map(c => c[0])) + 1;
      b.h = Math.max.apply(null, rel.map(c => c[1])) + 1;
      b.sig = JSON.stringify([rel, b.colors, b.dir, b.ice, b.lock, b.key]);
      blocks.push(b);
      return b;
    }

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = ch(x, y);
        if (!/[A-Za-z]/.test(c) || seen[y * W + x]) continue;
        if (!keySpec[c]) throw new Error('No key spec for block letter "' + c + '"');
        const spec = parseSpec(keySpec[c]);
        // flood fill same letter
        const cells = [];
        const stack = [[x, y]];
        seen[y * W + x] = 1;
        while (stack.length) {
          const [cx, cy] = stack.pop();
          cells.push([cx, cy]);
          for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + d[0], ny = cy + d[1];
            if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || ch(nx, ny) !== c) continue;
            seen[ny * W + nx] = 1;
            stack.push([nx, ny]);
          }
        }
        if (spec.split) cells.forEach(cell => addBlock([cell], spec));
        else addBlock(cells, spec);
      }
    }

    const doors = (def.doors || []).map(d => {
      const len = d.l || 1;
      let fx, p0;
      if (d.at) {
        fx = (d.s === 'L' || d.s === 'R') ? d.at[0] : d.at[1];
        p0 = (d.s === 'L' || d.s === 'R') ? d.at[1] : d.at[0];
      } else {
        fx = d.s === 'R' ? W - 1 : d.s === 'D' ? H - 1 : 0;
        p0 = d.p || 0;
      }
      return {
        side: d.s, fx, p0, len,
        colors: d.c.split('').map(k => CODES[k]),
        ivy: d.ivy || 0,
        mv: d.mv || null,
      };
    });

    const gens = (def.gens || []).map((g, gi) => {
      const [dx, dy] = DIRS[g.d];
      const gen = { x: g.x, y: g.y, d: g.d, ox: g.x + dx, oy: g.y + dy, q: g.q.split('').map(k => CODES[k]), first: blocks.length };
      // pre-create every block the generator will ever push out (pending until spawned)
      gen.q.forEach(color => addBlock([[gen.ox, gen.oy]], { colors: [color] }, { gen: gi }));
      return gen;
    });

    let period = 1;
    for (const d of doors) {
      if (d.mv) period = lcm(period, Math.max(1, 2 * (d.mv[1] - d.mv[0])));
      if (d.colors.length > 1) period = lcm(period, d.colors.length);
    }

    const L = { W, H, floor, blocks, doors, gens, period, def };
    L.init = initialState(L);
    return L;
  }

  function parseSpec(str) {
    const tok = str.trim().split(/\s+/);
    const spec = { colors: tok[0].split('').map(k => { if (!CODES[k]) throw new Error('Bad color ' + k); return CODES[k]; }) };
    for (const t of tok.slice(1)) {
      if (t === 'h' || t === 'v') spec.dir = t;
      else if (t[0] === 'i') spec.ice = +t.slice(1);
      else if (t[0] === 'L') spec.lock = +t.slice(1);
      else if (t[0] === 'K') spec.key = +t.slice(1);
      else if (t === 'S') spec.split = true;
      else throw new Error('Bad flag ' + t);
    }
    return spec;
  }

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }

  /* ---------- state ---------- */
  // st: 0 pending (generator queue), 1 on board, 2 cleared
  function initialState(L) {
    const n = L.blocks.length;
    const S = {
      x: new Int16Array(n), y: new Int16Array(n), ci: new Int8Array(n), st: new Uint8Array(n),
      fr: new Uint8Array(n), // freed by the hammer booster: ignores ice and lock
      qi: L.gens.map(() => 0), moves: 0, clears: 0,
    };
    L.blocks.forEach((b, i) => {
      S.x[i] = b.x0; S.y[i] = b.y0;
      S.st[i] = b.gen >= 0 ? 0 : 1;
    });
    spawn(L, S);
    return S;
  }

  function clone(S) {
    return {
      x: S.x.slice(), y: S.y.slice(), ci: S.ci.slice(), st: S.st.slice(), fr: S.fr.slice(),
      qi: S.qi.slice(), moves: S.moves, clears: S.clears,
    };
  }

  function occupancy(L, S) {
    const occ = new Int16Array(L.W * L.H);
    L.blocks.forEach((b, i) => {
      if (S.st[i] !== 1) return;
      for (const [dx, dy] of b.cells) occ[(S.y[i] + dy) * L.W + S.x[i] + dx] = i + 1;
    });
    return occ;
  }

  function isFloor(L, x, y) {
    return x >= 0 && y >= 0 && x < L.W && y < L.H && L.floor[y * L.W + x] === 1;
  }

  function canPlace(L, occ, i, x, y) {
    const b = L.blocks[i];
    for (const [dx, dy] of b.cells) {
      const cx = x + dx, cy = y + dy;
      if (!isFloor(L, cx, cy)) return false;
      const o = occ[cy * L.W + cx];
      if (o !== 0 && o !== i + 1) return false;
    }
    return true;
  }

  function iceLeft(L, S, i) { return S.fr[i] ? 0 : Math.max(0, L.blocks[i].ice - S.clears); }

  function isLocked(L, S, i) {
    const id = L.blocks[i].lock;
    if (!id || S.fr[i]) return false;
    return L.blocks.some((b, j) => b.key === id && S.st[j] !== 2);
  }

  function canMove(L, S, i) {
    return S.st[i] === 1 && iceLeft(L, S, i) === 0 && !isLocked(L, S, i);
  }

  function color(L, S, i) { return L.blocks[i].colors[S.ci[i]]; }

  function pingpong(p0, a, b, n) {
    const span = b - a;
    if (span <= 0) return a;
    const period = 2 * span;
    const t = ((p0 - a) + n) % period;
    return a + (t <= span ? t : period - t);
  }

  // Door geometry at a given move count: first floor cell (x,y), outward direction, color, open?
  function doorAt(L, S, di) {
    const d = L.doors[di];
    const p = d.mv ? pingpong(d.p0, d.mv[0], d.mv[1], S.moves) : d.p0;
    const vertical = d.side === 'L' || d.side === 'R';
    return {
      side: d.side,
      x: vertical ? d.fx : p,
      y: vertical ? p : d.fx,
      len: d.len,
      color: d.colors[S.moves % d.colors.length],
      open: d.ivy - S.clears <= 0,
      ivyLeft: Math.max(0, d.ivy - S.clears),
    };
  }

  /* Can block i, standing at (x,y), leave through a door right now? Returns door index or -1.
   * Rules: colors match, door open, block touches the door, every block cell lies inside the door span
   * and has a clear straight path to it (so the whole block can slide out). */
  function findExit(L, S, occ, i, x, y) {
    if (!canMove(L, S, i)) return -1;
    const b = L.blocks[i];
    const col = b.colors[S.ci[i]];
    for (let di = 0; di < L.doors.length; di++) {
      const d = doorAt(L, S, di);
      if (!d.open || d.color !== col) continue;
      if (exitsThrough(L, occ, i, b, x, y, d)) return di;
    }
    return -1;
  }

  function exitsThrough(L, occ, i, b, x, y, d) {
    const W = L.W;
    let touch = false;
    for (const [dx, dy] of b.cells) {
      const cx = x + dx, cy = y + dy;
      if (d.side === 'R' || d.side === 'L') {
        if (cy < d.y || cy >= d.y + d.len) return false;
        if (cx === d.x) touch = true;
        const from = d.side === 'R' ? cx + 1 : d.x;
        const to = d.side === 'R' ? d.x : cx - 1;
        for (let xx = from; xx <= to; xx++) {
          if (!isFloor(L, xx, cy)) return false;
          const o = occ[cy * W + xx];
          if (o !== 0 && o !== i + 1) return false;
        }
      } else {
        if (cx < d.x || cx >= d.x + d.len) return false;
        if (cy === d.y) touch = true;
        const from = d.side === 'D' ? cy + 1 : d.y;
        const to = d.side === 'D' ? d.y : cy - 1;
        for (let yy = from; yy <= to; yy++) {
          if (!isFloor(L, cx, yy)) return false;
          const o = occ[yy * W + cx];
          if (o !== 0 && o !== i + 1) return false;
        }
      }
    }
    return touch;
  }

  // All integer positions block i can be dragged to (BFS through free space), start included.
  function reachable(L, S, occ, i) {
    const b = L.blocks[i];
    const out = [];
    if (!canMove(L, S, i)) return out;
    const W = L.W, H = L.H;
    const seen = new Uint8Array((W + 1) * (H + 1));
    const sx = S.x[i], sy = S.y[i];
    const queue = [sx, sy];
    seen[sy * (W + 1) + sx] = 1;
    const steps = b.dir === 'h' ? [[1, 0], [-1, 0]] : b.dir === 'v' ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let q = 0; q < queue.length; q += 2) {
      const x = queue[q], y = queue[q + 1];
      out.push(x, y);
      for (const [dx, dy] of steps) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx > W - b.w || ny > H - b.h) continue;
        const k = ny * (W + 1) + nx;
        if (seen[k]) continue;
        seen[k] = 1;
        if (canPlace(L, occ, i, nx, ny)) queue.push(nx, ny);
      }
    }
    return out; // flat [x0,y0,x1,y1,...]
  }

  /* ---------- actions (mutate S) ---------- */
  function spawn(L, S) {
    const spawned = [];
    if (!L.gens.length) return spawned;
    const occ = occupancy(L, S);
    L.gens.forEach((g, gi) => {
      if (S.qi[gi] >= g.q.length) return;
      if (!isFloor(L, g.ox, g.oy) || occ[g.oy * L.W + g.ox]) return;
      const bi = g.first + S.qi[gi];
      S.qi[gi]++;
      S.st[bi] = 1; S.x[bi] = g.ox; S.y[bi] = g.oy;
      occ[g.oy * L.W + g.ox] = bi + 1;
      spawned.push(bi);
    });
    return spawned;
  }

  function applyMove(L, S, i, x, y) {
    S.x[i] = x; S.y[i] = y;
    S.moves++;
    return spawn(L, S);
  }

  // Block i leaves (or sheds its outer layer) at its current position.
  function applyExit(L, S, i) {
    const b = L.blocks[i];
    const peeled = S.ci[i] < b.colors.length - 1;
    const wasLocked = L.blocks.map((_, j) => isLocked(L, S, j));
    const wasIced = L.blocks.map((_, j) => S.st[j] === 1 && iceLeft(L, S, j) > 0);
    if (peeled) S.ci[i]++;
    else S.st[i] = 2;
    S.clears++;
    S.moves++;
    const spawned = spawn(L, S);
    const unlocked = [], thawed = [];
    L.blocks.forEach((_, j) => {
      if (wasLocked[j] && !isLocked(L, S, j)) unlocked.push(j);
      if (wasIced[j] && iceLeft(L, S, j) === 0) thawed.push(j);
    });
    return { peeled, spawned, unlocked, thawed };
  }

  // Booster: take blocks off the board entirely (all layers). Counts one clear each, not a move.
  function removeBlocks(L, S, list) {
    const wasLocked = L.blocks.map((_, j) => isLocked(L, S, j));
    const wasIced = L.blocks.map((_, j) => S.st[j] === 1 && iceLeft(L, S, j) > 0);
    for (const i of list) { if (S.st[i] === 1) { S.st[i] = 2; S.clears++; } }
    const spawned = spawn(L, S);
    const unlocked = [], thawed = [];
    L.blocks.forEach((_, j) => {
      if (S.st[j] !== 1) return;
      if (wasLocked[j] && !isLocked(L, S, j)) unlocked.push(j);
      if (wasIced[j] && iceLeft(L, S, j) === 0) thawed.push(j);
    });
    return { spawned, unlocked, thawed };
  }

  function remaining(L, S) {
    let n = 0;
    L.blocks.forEach((b, i) => { if (S.st[i] !== 2) n += b.colors.length - S.ci[i]; });
    return n;
  }

  function isWon(L, S) {
    for (let i = 0; i < S.st.length; i++) if (S.st[i] !== 2) return false;
    return true;
  }

  const Engine = {
    CODES, DIRS, parse, clone, occupancy, isFloor, canPlace, canMove, iceLeft, isLocked, color,
    doorAt, findExit, reachable, spawn, applyMove, applyExit, removeBlocks, remaining, isWon, pingpong,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(this);
