/* Brick Escape — level solver.
 * A "placement" is a drag that ends somewhere on the board; exits are free (taken greedily as soon
 * as any block can reach a matching door). BFS over placements gives the minimum number of
 * placements; when the state cap is hit it falls back to a weighted best-first search (upper bound).
 *
 *   node tools/solve.js            -> verify every level in js/levels.js
 *   node tools/solve.js 12 15      -> only levels 12 and 15
 */
'use strict';
const path = require('path');
const Engine = require('../js/engine.js');

function typeIds(L) {
  const ids = new Map();
  return L.blocks.map(b => {
    if (!ids.has(b.sig)) ids.set(b.sig, ids.size);
    return ids.get(b.sig);
  });
}

function stateKey(L, tids, S) {
  const parts = [];
  for (let i = 0; i < S.st.length; i++) {
    if (S.st[i] === 1) parts.push(tids[i] * 64 + S.ci[i] + '@' + S.x[i] + ',' + S.y[i]);
  }
  parts.sort();
  return (S.moves % L.period) + '|' + S.qi.join(',') + '|' + parts.join(';');
}

// Take every exit that is available, one at a time, until none is.
function closure(L, S, acts) {
  for (;;) {
    const occ = Engine.occupancy(L, S);
    let took = false;
    for (let i = 0; i < S.st.length && !took; i++) {
      if (!Engine.canMove(L, S, i)) continue;
      const r = Engine.reachable(L, S, occ, i);
      for (let k = 0; k < r.length; k += 2) {
        if (Engine.findExit(L, S, occ, i, r[k], r[k + 1]) >= 0) {
          S.x[i] = r[k]; S.y[i] = r[k + 1];
          acts.push({ t: 'exit', i, x: r[k], y: r[k + 1] });
          Engine.applyExit(L, S, i);
          took = true;
          break;
        }
      }
    }
    if (!took) return;
  }
}

function* placements(L, S) {
  const occ = Engine.occupancy(L, S);
  for (let i = 0; i < S.st.length; i++) {
    if (!Engine.canMove(L, S, i)) continue;
    const r = Engine.reachable(L, S, occ, i);
    for (let k = 2; k < r.length; k += 2) yield [i, r[k], r[k + 1]]; // r[0..1] is the start
  }
}

function collect(node) {
  const out = [];
  for (let n = node; n; n = n.parent) out.unshift(...n.acts);
  return out;
}

function summary(L, node, exact, explored) {
  const actions = collect(node);
  const moves = actions.filter(a => a.t === 'move').length;
  return { ok: true, exact, placements: moves, actions: actions.length, explored, path: actions };
}

class Heap {
  constructor() { this.a = []; }
  push(p, v) {
    const a = this.a; a.push([p, v]);
    let i = a.length - 1;
    while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; }
  }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top[1];
  }
  get size() { return this.a.length; }
}

function solve(def, opts) {
  opts = Object.assign({ bfsCap: 250000, bestCap: 1500000 }, opts);
  const L = Engine.parse(def);
  const tids = typeIds(L);
  const S0 = Engine.clone(L.init);
  const a0 = [];
  closure(L, S0, a0);
  const root = { S: S0, parent: null, acts: a0, g: 0 };
  if (Engine.isWon(L, S0)) return summary(L, root, true, 1);

  // 1) BFS by number of placements (exact)
  const seen = new Set([stateKey(L, tids, S0)]);
  let layer = [root];
  while (layer.length && seen.size < opts.bfsCap) {
    const next = [];
    for (const node of layer) {
      for (const [i, x, y] of placements(L, node.S)) {
        const T = Engine.clone(node.S);
        const acts = [{ t: 'move', i, x, y }];
        Engine.applyMove(L, T, i, x, y);
        closure(L, T, acts);
        const k = stateKey(L, tids, T);
        if (seen.has(k)) continue;
        seen.add(k);
        const nn = { S: T, parent: node, acts, g: node.g + 1 };
        if (Engine.isWon(L, T)) return summary(L, nn, true, seen.size);
        next.push(nn);
      }
      node.S = null;
    }
    layer = next;
    if (!layer.length) return { ok: false, exact: true, explored: seen.size };
  }

  // 2) weighted best-first (finds *a* solution on big boards)
  const seen2 = new Set([stateKey(L, tids, S0)]);
  const heap = new Heap();
  const root2 = { S: Engine.clone(S0), parent: null, acts: a0, g: 0 };
  heap.push(Engine.remaining(L, S0) * 6, root2);
  while (heap.size && seen2.size < opts.bestCap) {
    const node = heap.pop();
    for (const [i, x, y] of placements(L, node.S)) {
      const T = Engine.clone(node.S);
      const acts = [{ t: 'move', i, x, y }];
      Engine.applyMove(L, T, i, x, y);
      closure(L, T, acts);
      const k = stateKey(L, tids, T);
      if (seen2.has(k)) continue;
      seen2.add(k);
      const nn = { S: T, parent: node, acts, g: node.g + 1 };
      if (Engine.isWon(L, T)) return summary(L, nn, false, seen2.size);
      heap.push(Engine.remaining(L, T) * 6 + nn.g, nn);
    }
  }
  return { ok: false, exact: false, explored: seen2.size };
}

// Replay a solution with the real rules, checking every step is legal.
function verify(def, actions) {
  const L = Engine.parse(def);
  const S = Engine.clone(L.init);
  for (const a of actions) {
    const occ = Engine.occupancy(L, S);
    const r = Engine.reachable(L, S, occ, a.i);
    let ok = false;
    for (let k = 0; k < r.length; k += 2) if (r[k] === a.x && r[k + 1] === a.y) ok = true;
    if (!ok) return 'unreachable ' + JSON.stringify(a);
    if (a.t === 'exit') {
      if (Engine.findExit(L, S, occ, a.i, a.x, a.y) < 0) return 'no exit ' + JSON.stringify(a);
      S.x[a.i] = a.x; S.y[a.i] = a.y;
      Engine.applyExit(L, S, a.i);
    } else {
      Engine.applyMove(L, S, a.i, a.x, a.y);
    }
  }
  return Engine.isWon(L, S) ? null : 'not won';
}

// Static sanity checks for a level definition.
function lint(def) {
  const errs = [];
  const L = Engine.parse(def);
  L.doors.forEach((d, di) => {
    const lo = d.mv ? d.mv[0] : d.p0, hi = (d.mv ? d.mv[1] : d.p0) + d.len - 1;
    const [ox, oy] = Engine.DIRS[d.side];
    for (let p = lo; p <= hi; p++) {
      const x = (d.side === 'L' || d.side === 'R') ? d.fx : p;
      const y = (d.side === 'L' || d.side === 'R') ? p : d.fx;
      if (!Engine.isFloor(L, x, y)) errs.push('door ' + di + ' cell not floor ' + x + ',' + y);
      if (Engine.isFloor(L, x + ox, y + oy)) errs.push('door ' + di + ' not on an edge at ' + x + ',' + y);
    }
  });
  const doorColors = new Set();
  L.doors.forEach(d => d.colors.forEach(c => doorColors.add(c)));
  L.blocks.forEach((b, i) => b.colors.forEach(c => { if (!doorColors.has(c)) errs.push('block ' + i + ' color ' + c + ' has no door'); }));
  L.gens.forEach((g, gi) => {
    if (L.def.map[g.y][g.x] !== '@') errs.push('gen ' + gi + ' not on @');
    if (!Engine.isFloor(L, g.ox, g.oy)) errs.push('gen ' + gi + ' output not floor');
  });
  return errs;
}

module.exports = { solve, verify, lint, closure };

if (require.main === module) {
  const LEVELS = require(path.join(__dirname, '..', 'js', 'levels.js'));
  const args = process.argv.slice(2);
  const writeJson = args.includes('--json'); // also dump solutions to tools/solutions.json (for autoplay)
  const pick = args.filter(a => a !== '--json').map(Number);
  const solutions = {};
  let bad = 0;
  LEVELS.forEach((def, idx) => {
    const n = idx + 1;
    if (pick.length && !pick.includes(n)) return;
    const t0 = Date.now();
    const errs = lint(def);
    const res = solve(def);
    const v = res.ok ? verify(def, res.path) : 'unsolved';
    const L = Engine.parse(def);
    const blocks = L.blocks.length;
    const ms = Date.now() - t0;
    if (errs.length || v) bad++;
    if (res.ok) solutions[idx] = res.path;
    console.log(
      String(n).padStart(2), (def.name || '').padEnd(10),
      (L.W + 'x' + L.H).padEnd(5),
      'blocks', String(blocks).padStart(2),
      res.ok ? ('place ' + (res.exact ? '' : '<=') + res.placements).padEnd(10) : 'UNSOLVED  ',
      'acts', String(res.actions || 0).padStart(3),
      'time', String(def.t).padStart(3) + 's',
      'states', String(res.explored).padStart(7),
      ms + 'ms',
      errs.length ? 'LINT: ' + errs.join('; ') : '',
      v ? 'VERIFY: ' + v : ''
    );
  });
  if (writeJson) require('fs').writeFileSync(path.join(__dirname, 'solutions.json'), JSON.stringify(solutions));
  process.exitCode = bad ? 1 : 0;
}
