/* Brick Escape — level candidate generator.
 * Fills a hand-made template (board, doors, generators, mechanics) with random polyomino blocks,
 * solves every candidate and prints the best ones as level definitions ready for js/levels.js.
 *
 *   node tools/gen.js <templateName> [seeds]
 */
'use strict';
const Engine = require('../js/engine.js');
const { solve, lint } = require('./solve.js');
const TEMPLATES = require('./templates.js');

const SHAPES = {
  o: [[0, 0]],
  i2: [[0, 0], [1, 0]], i2v: [[0, 0], [0, 1]],
  i3: [[0, 0], [1, 0], [2, 0]], i3v: [[0, 0], [0, 1], [0, 2]],
  i4: [[0, 0], [1, 0], [2, 0], [3, 0]], i4v: [[0, 0], [0, 1], [0, 2], [0, 3]],
  sq: [[0, 0], [1, 0], [0, 1], [1, 1]],
  r32: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], r23: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
  v1: [[0, 0], [0, 1], [1, 1]], v2: [[1, 0], [0, 1], [1, 1]], v3: [[0, 0], [1, 0], [0, 1]], v4: [[0, 0], [1, 0], [1, 1]],
  L1: [[0, 0], [0, 1], [0, 2], [1, 2]], L2: [[0, 0], [1, 0], [2, 0], [0, 1]], L3: [[0, 0], [1, 0], [1, 1], [1, 2]], L4: [[2, 0], [0, 1], [1, 1], [2, 1]],
  J1: [[1, 0], [1, 1], [0, 2], [1, 2]], J2: [[0, 0], [0, 1], [1, 1], [2, 1]], J3: [[0, 0], [1, 0], [0, 1], [0, 2]], J4: [[0, 0], [1, 0], [2, 0], [2, 1]],
  T1: [[0, 0], [1, 0], [2, 0], [1, 1]], T2: [[1, 0], [0, 1], [1, 1], [1, 2]], T3: [[1, 0], [0, 1], [1, 1], [2, 1]], T4: [[0, 0], [0, 1], [1, 1], [0, 2]],
  S1: [[1, 0], [2, 0], [0, 1], [1, 1]], S2: [[0, 0], [0, 1], [1, 1], [1, 2]], Z1: [[0, 0], [1, 0], [1, 1], [2, 1]], Z2: [[1, 0], [0, 1], [1, 1], [0, 2]],
  P1: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]], U1: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
};
const POOLS = {
  small: ['o', 'i2', 'i2v', 'o', 'i2', 'i2v', 'v1', 'v2', 'v3', 'v4'],
  basic: ['o', 'i2', 'i2v', 'i3', 'i3v', 'sq', 'v1', 'v2', 'v3', 'v4', 'i2', 'i2v'],
  mid: ['i2', 'i2v', 'i3', 'i3v', 'sq', 'v1', 'v2', 'v3', 'v4', 'L1', 'L2', 'L3', 'L4', 'J1', 'J2', 'J3', 'J4', 'T1', 'T2', 'T3', 'T4', 'o'],
  big: ['i3', 'i3v', 'sq', 'L1', 'L2', 'L3', 'L4', 'J1', 'J2', 'J3', 'J4', 'T1', 'T2', 'T3', 'T4', 'S1', 'S2', 'Z1', 'Z2', 'P1', 'i2', 'i2v', 'r32', 'r23'],
  bars: ['i2', 'i2v', 'i3', 'i3v', 'i4', 'i4v', 'i2', 'i2v'],
};
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const COLOR_OF = Object.fromEntries(Object.entries(Engine.CODES).map(([k, v]) => [v, k]));

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];

function build(tpl, seed) {
  const r = rng(seed * 2654435761 + 7);
  const rows = tpl.map.map(row => row.split(''));
  const H = rows.length, W = rows[0].length;
  const isFree = (x, y) => x >= 0 && y >= 0 && x < W && y < H && rows[y][x] === '.';
  // keep generator outputs free
  const reserved = new Set((tpl.gens || []).map(g => {
    const [dx, dy] = Engine.DIRS[g.d]; return (g.x + dx) + ',' + (g.y + dy);
  }));
  const doors = tpl.doors.map(d => ({ ...d, len: d.l || 1, colors: d.c.split('') }));
  const accepts = (shape) => {
    const w = Math.max(...shape.map(c => c[0])) + 1, h = Math.max(...shape.map(c => c[1])) + 1;
    const ok = new Set();
    for (const d of doors) {
      const fits = (d.s === 'L' || d.s === 'R') ? h <= d.len : w <= d.len;
      if (fits) d.colors.forEach(c => ok.add(c));
    }
    return [...ok];
  };
  const floorCells = rows.flat().filter(c => c === '.').length;
  const blocks = [];
  let filled = 0, tries = 0;
  const pool = POOLS[tpl.pool] || tpl.pool;
  const colorCount = {};
  while (filled < floorCells * tpl.fill && tries < 3000 && blocks.length < LETTERS.length) {
    tries++;
    const name = pick(r, pool);
    const shape = SHAPES[name];
    const cols = accepts(shape);
    if (!cols.length) continue;
    const x0 = Math.floor(r() * W), y0 = Math.floor(r() * H);
    if (!shape.every(([dx, dy]) => isFree(x0 + dx, y0 + dy) && !reserved.has((x0 + dx) + ',' + (y0 + dy)))) continue;
    // prefer under-used colors so every door gets traffic
    cols.sort((a, b) => (colorCount[a] || 0) - (colorCount[b] || 0) + (r() - 0.5));
    const col = cols[0];
    colorCount[col] = (colorCount[col] || 0) + 1;
    const letter = LETTERS[blocks.length];
    shape.forEach(([dx, dy]) => { rows[y0 + dy][x0 + dx] = letter; });
    const w = Math.max(...shape.map(c => c[0])) + 1, h = Math.max(...shape.map(c => c[1])) + 1;
    blocks.push({ letter, name, shape, spec: [col], flags: [], x0, y0, w, h });
    filled += shape.length;
  }
  if (!blocks.length) return null;

  const m = tpl.mech || {};
  const pickBlocks = (n, filter) => {
    const cand = blocks.filter(b => !b.used && (!filter || filter(b)));
    const out = [];
    while (out.length < n && cand.length) out.push(cand.splice(Math.floor(r() * cand.length), 1)[0]);
    out.forEach(b => { b.used = true; });
    return out;
  };
  if (m.dir) {
    // arrows go on elongated blocks, along their long axis, and only when a door of a usable
    // color lines up with that axis (recolouring the block to that door's color if needed)
    const doorsFor = (b, dir) => doors.filter(d => !d.at && !d.mv && (dir === 'h'
      ? (d.s === 'L' || d.s === 'R') && b.y0 >= (d.p || 0) && b.y0 + b.h <= (d.p || 0) + d.len
      : (d.s === 'U' || d.s === 'D') && b.x0 >= (d.p || 0) && b.x0 + b.w <= (d.p || 0) + d.len));
    pickBlocks(m.dir, b => b.w !== b.h && doorsFor(b, b.w > b.h ? 'h' : 'v').length > 0).forEach(b => {
      const dir = b.w > b.h ? 'h' : 'v';
      const cols = [...new Set(doorsFor(b, dir).flatMap(d => d.colors))];
      if (!cols.includes(b.spec[0])) b.spec[0] = pick(r, cols);
      b.flags.push(dir);
    });
  }
  if (m.ice) pickBlocks(m.ice[0]).forEach(b => b.flags.push('i' + (m.ice[1] + Math.floor(r() * (m.ice[2] || 1)))));
  if (m.lock) {
    const locks = pickBlocks(m.lock);
    locks.forEach(b => b.flags.push('L1'));
    pickBlocks(1).forEach(b => b.flags.push('K1'));
  }
  if (m.layer) pickBlocks(m.layer).forEach(b => {
    const outer = accepts(b.shape).filter(c => c !== b.spec[0]);
    if (outer.length) b.spec.unshift(pick(r, outer));
  });

  const key = {};
  blocks.forEach(b => { key[b.letter] = [b.spec.join('')].concat(b.flags).join(' '); });
  const gens = (tpl.gens || []).map(g => {
    let q = g.q || '';
    if (!q) {
      const cols = accepts(SHAPES.o);
      for (let k = 0; k < g.n; k++) q += pick(r, cols);
    }
    return { x: g.x, y: g.y, d: g.d, q };
  });
  return {
    map: rows.map(row => row.join('')),
    key,
    doors: tpl.doors.map(d => { const o = { ...d }; return o; }),
    ...(gens.length ? { gens } : {}),
  };
}

function run(name, seeds) {
  const tpl = TEMPLATES[name];
  if (!tpl) throw new Error('No template ' + name);
  const results = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const def = build(tpl, seed + (tpl.seedBase || 0));
    if (!def) continue;
    if (lint(def).length) continue;
    const res = solve(def, { bfsCap: tpl.bfsCap || 40000, bestCap: tpl.bestCap || 0 });
    if (!res.ok) continue;
    const pl = res.placements;
    if (pl < tpl.target[0] || pl > tpl.target[1]) continue;
    results.push({ seed: seed + (tpl.seedBase || 0), pl, exact: res.exact, acts: res.actions, explored: res.explored, def });
    // good enough: an exact solution at the top of the target range
    if (res.exact && pl >= tpl.target[1]) break;
  }
  results.sort((a, b) => (b.exact - a.exact) || (b.pl - a.pl) || (b.explored - a.explored));
  return results;
}

module.exports = { build, run, SHAPES };

if (require.main === module) {
  const name = process.argv[2];
  const seeds = +(process.argv[3] || 60);
  const res = run(name, seeds);
  console.log(name, 'candidates in range:', res.length);
  res.slice(0, +(process.argv[4] || 3)).forEach(c => {
    console.log('// seed', c.seed, 'placements', (c.exact ? '' : '<=') + c.pl, 'actions', c.acts, 'explored', c.explored);
    console.log(JSON.stringify({ map: c.def.map, key: c.def.key, doors: c.def.doors, gens: c.def.gens }));
  });
}
