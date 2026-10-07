/* Templates for tools/gen.js — one per generated level.
 * map: '.' floor, '#' wall, '@' generator. fill = target share of floor covered by blocks.
 * target = [min, max] placements (non-exit drags) the solver must need. */
'use strict';
const g = (w, h) => Array.from({ length: h }, () => '.'.repeat(w));

module.exports = {
  // 2 — move one block out of the way
  l02: { map: g(5, 5), pool: 'small', fill: 0.45, target: [1, 2],
    doors: [{ s: 'R', p: 1, l: 2, c: 'r' }, { s: 'L', p: 3, l: 2, c: 'b' }, { s: 'U', p: 2, l: 1, c: 'y' }] },
  // 3 — first real puzzle
  l03: { map: g(5, 6), pool: 'small', fill: 0.6, target: [2, 3],
    doors: [{ s: 'R', p: 1, l: 2, c: 'r' }, { s: 'L', p: 3, l: 1, c: 'b' }, { s: 'U', p: 1, l: 2, c: 'y' }, { s: 'D', p: 3, l: 1, c: 'g' }] },
  // 4 — door width matters
  l04: { map: g(6, 6), pool: 'basic', fill: 0.62, target: [3, 4],
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'L', p: 3, l: 1, c: 'b' }, { s: 'U', p: 2, l: 2, c: 'y' }, { s: 'D', p: 0, l: 3, c: 'g' }, { s: 'R', p: 4, l: 1, c: 'p' }] },
  // 5 — L / T shapes
  l05: { map: g(6, 7), pool: 'mid', fill: 0.62, target: [3, 5],
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'L', p: 2, l: 3, c: 'b' }, { s: 'U', p: 1, l: 3, c: 'y' }, { s: 'D', p: 2, l: 3, c: 'g' }, { s: 'R', p: 5, l: 2, c: 'k' }] },
  // 6
  l06: { map: g(6, 7), pool: 'mid', fill: 0.7, target: [4, 6],
    doors: [{ s: 'R', p: 1, l: 3, c: 'o' }, { s: 'L', p: 0, l: 2, c: 'c' }, { s: 'L', p: 4, l: 3, c: 'p' }, { s: 'U', p: 3, l: 3, c: 'y' }, { s: 'D', p: 0, l: 3, c: 'r' }, { s: 'D', p: 4, l: 2, c: 'g' }] },
  // 7 — directional blocks
  l07: { map: g(6, 6), pool: 'basic', fill: 0.62, target: [3, 5], mech: { dir: 3 }, bfsCap: 25000, bestCap: 30000,
    doors: [{ s: 'R', p: 0, l: 2, c: 'r' }, { s: 'R', p: 3, l: 3, c: 'b' }, { s: 'L', p: 1, l: 3, c: 'y' }, { s: 'U', p: 0, l: 3, c: 'g' }, { s: 'D', p: 3, l: 3, c: 'k' }] },
  // 8
  l08: { map: g(6, 8), pool: 'mid', fill: 0.66, target: [4, 7], mech: { dir: 4 }, bfsCap: 25000, bestCap: 30000,
    doors: [{ s: 'R', p: 0, l: 3, c: 'o' }, { s: 'R', p: 5, l: 3, c: 'c' }, { s: 'L', p: 2, l: 3, c: 'p' }, { s: 'U', p: 2, l: 3, c: 'y' }, { s: 'D', p: 0, l: 3, c: 'g' }, { s: 'D', p: 4, l: 2, c: 'r' }] },
  // 9 — walls / irregular board
  l09: { map: ['.......', '.......', '..#....', '.......', '....#..', '.......', '.#.....', '.......'], pool: 'basic', fill: 0.56, target: [3, 7], bfsCap: 15000, bestCap: 5000, seeds: 40,
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 5, l: 2, c: 'y' }, { s: 'L', p: 1, l: 3, c: 'b' }, { s: 'L', p: 5, l: 3, c: 'l' }, { s: 'U', p: 3, l: 3, c: 'k' }, { s: 'D', p: 1, l: 3, c: 'o' }] },
  // 10 — milestone
  l10: { map: ['##.....', '#......', '.......', '.......', '.......', '.......', '......#', '.....##'], pool: 'mid', fill: 0.68, target: [6, 9], mech: { dir: 3 }, bfsCap: 25000, bestCap: 30000, seeds: 30,
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 3, l: 3, c: 'c' }, { s: 'L', p: 2, l: 3, c: 'p' }, { s: 'L', p: 5, l: 3, c: 'y' }, { s: 'U', p: 2, l: 3, c: 'g' }, { s: 'D', p: 1, l: 3, c: 'o' }, { s: 'D', p: 0, l: 1, c: 'k', at: [0, 7] }] },
  // 11 — ice
  l11: { map: g(6, 7), pool: 'basic', fill: 0.62, target: [3, 6], mech: { ice: [2, 2, 2] },
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 4, l: 3, c: 'b' }, { s: 'L', p: 2, l: 3, c: 'y' }, { s: 'U', p: 2, l: 3, c: 'g' }, { s: 'D', p: 1, l: 3, c: 'k' }] },
  // 12 — ice + directional
  l12: { map: g(6, 8), pool: 'mid', fill: 0.66, target: [4, 7], mech: { ice: [3, 2, 3], dir: 2 },
    doors: [{ s: 'R', p: 1, l: 3, c: 'o' }, { s: 'R', p: 5, l: 3, c: 'p' }, { s: 'L', p: 0, l: 3, c: 'c' }, { s: 'L', p: 4, l: 2, c: 'r' }, { s: 'U', p: 2, l: 3, c: 'y' }, { s: 'D', p: 1, l: 3, c: 'g' }] },
  // 13 — key & lock
  l13: { map: g(6, 7), pool: 'basic', fill: 0.62, target: [3, 6], mech: { lock: 1 },
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 4, l: 3, c: 'g' }, { s: 'L', p: 2, l: 3, c: 'b' }, { s: 'U', p: 1, l: 3, c: 'y' }, { s: 'D', p: 2, l: 3, c: 'p' }] },
  // 14 — key + ice
  l14: { map: ['.......', '.......', '...#...', '.......', '.......', '...#...', '.......', '.......'], pool: 'mid', fill: 0.64, target: [4, 8], mech: { lock: 1, ice: [2, 2, 2] }, bfsCap: 20000, bestCap: 20000, seeds: 60,
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 5, l: 3, c: 'b' }, { s: 'L', p: 1, l: 3, c: 'y' }, { s: 'L', p: 5, l: 2, c: 'k' }, { s: 'U', p: 2, l: 3, c: 'g' }, { s: 'D', p: 2, l: 3, c: 'o' }] },
  // 16 — layered
  l16: { map: g(6, 7), pool: 'basic', fill: 0.6, target: [3, 6], mech: { layer: 2 },
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 4, l: 3, c: 'b' }, { s: 'L', p: 2, l: 3, c: 'y' }, { s: 'U', p: 2, l: 3, c: 'g' }, { s: 'D', p: 1, l: 3, c: 'p' }] },
  // 17 — layered + walls
  l17: { map: ['.......', '.#.....', '.......', '...#...', '.......', '.....#.', '.......', '.......'], pool: 'mid', fill: 0.64, target: [5, 8], mech: { layer: 3, dir: 1 }, bfsCap: 25000, bestCap: 30000, seeds: 30,
    doors: [{ s: 'R', p: 0, l: 3, c: 'o' }, { s: 'R', p: 4, l: 3, c: 'c' }, { s: 'L', p: 1, l: 3, c: 'k' }, { s: 'L', p: 5, l: 3, c: 'l' }, { s: 'U', p: 2, l: 3, c: 'y' }, { s: 'D', p: 3, l: 3, c: 'p' }] },
  // 18 — generator
  l18: { map: ['......', '......', '......', '@.....', '......', '......', '......'], pool: 'basic', fill: 0.55, target: [3, 6],
    gens: [{ x: 0, y: 3, d: 'R', n: 4 }],
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 4, l: 3, c: 'b' }, { s: 'U', p: 1, l: 3, c: 'y' }, { s: 'D', p: 2, l: 3, c: 'g' }, { s: 'L', p: 0, l: 2, c: 'k' }] },
  // 19 — generators + layered
  l19: { map: ['...@...', '.......', '.......', '.......', '.......', '.......', '.......', '...@...'], pool: 'mid', fill: 0.58, target: [5, 8], mech: { layer: 2 }, bfsCap: 25000, bestCap: 30000, seeds: 30,
    gens: [{ x: 3, y: 0, d: 'D', n: 3 }, { x: 3, y: 7, d: 'U', n: 3 }],
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 4, l: 3, c: 'y' }, { s: 'L', p: 1, l: 3, c: 'b' }, { s: 'L', p: 5, l: 3, c: 'g' }, { s: 'U', p: 0, l: 2, c: 'o' }, { s: 'D', p: 5, l: 2, c: 'p' }] },
  // 20 — milestone
  l20: { map: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'], pool: 'big', fill: 0.68, target: [7, 11], mech: { dir: 2, ice: [2, 3, 3], lock: 1 }, bfsCap: 20000, bestCap: 40000, seeds: 28,
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 4, l: 3, c: 'c' }, { s: 'L', p: 1, l: 3, c: 'y' }, { s: 'L', p: 6, l: 3, c: 'p' }, { s: 'U', p: 2, l: 3, c: 'g' }, { s: 'D', p: 0, l: 3, c: 'o' }, { s: 'D', p: 4, l: 3, c: 'k' }] },
  // 21 — moving doors
  l21: { map: g(6, 7), pool: 'basic', fill: 0.6, target: [3, 6],
    doors: [{ s: 'R', p: 0, l: 2, c: 'r', mv: [0, 5] }, { s: 'L', p: 2, l: 3, c: 'b' }, { s: 'U', p: 0, l: 3, c: 'y', mv: [0, 3] }, { s: 'D', p: 2, l: 3, c: 'g' }, { s: 'R', p: 4, l: 3, c: 'k' }] },
  // 22 — moving + directional
  l22: { map: g(7, 8), pool: 'mid', fill: 0.64, target: [5, 8], mech: { dir: 3 }, bfsCap: 25000, bestCap: 40000, seeds: 30,
    doors: [{ s: 'R', p: 0, l: 3, c: 'o', mv: [0, 5] }, { s: 'L', p: 0, l: 3, c: 'c' }, { s: 'L', p: 5, l: 3, c: 'p' }, { s: 'U', p: 2, l: 3, c: 'y' }, { s: 'D', p: 0, l: 3, c: 'g', mv: [0, 4] }, { s: 'R', p: 5, l: 2, c: 'r' }] },
  // 23 — ivy doors
  l23: { map: g(6, 7), pool: 'basic', fill: 0.62, target: [3, 6],
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 4, l: 3, c: 'b', ivy: 2 }, { s: 'L', p: 2, l: 3, c: 'y' }, { s: 'U', p: 2, l: 3, c: 'g', ivy: 3 }, { s: 'D', p: 1, l: 3, c: 'k' }] },
  // 24 — ivy + key
  l24: { map: ['.......', '.......', '.......', '..#.#..', '.......', '.......', '.......', '.......'], pool: 'mid', fill: 0.6, target: [4, 8], mech: { lock: 1 }, bfsCap: 15000, bestCap: 10000, seeds: 60,
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 5, l: 3, c: 'c', ivy: 3 }, { s: 'L', p: 0, l: 3, c: 'o' }, { s: 'L', p: 5, l: 3, c: 'p', ivy: 4 }, { s: 'U', p: 2, l: 3, c: 'y' }, { s: 'D', p: 2, l: 3, c: 'g', ivy: 2 }] },
  // 25 — milestone mix
  l25: { map: ['#.......', '........', '........', '........', '........', '........', '........', '........', '.......#'], pool: 'big', fill: 0.66, target: [7, 11], mech: { dir: 2, layer: 2, ice: [2, 4, 2] }, bfsCap: 20000, bestCap: 40000, seeds: 28,
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 4, l: 3, c: 'b', mv: [3, 5] }, { s: 'L', p: 1, l: 3, c: 'y' }, { s: 'L', p: 5, l: 3, c: 'g', ivy: 3 }, { s: 'U', p: 3, l: 3, c: 'o' }, { s: 'D', p: 1, l: 3, c: 'p' }, { s: 'D', p: 5, l: 2, c: 'k' }] },
  // 26 — color-cycling doors
  l26: { map: g(6, 7), pool: 'basic', fill: 0.6, target: [3, 6],
    doors: [{ s: 'R', p: 0, l: 3, c: 'rb' }, { s: 'R', p: 4, l: 3, c: 'g' }, { s: 'L', p: 2, l: 3, c: 'yk' }, { s: 'U', p: 2, l: 3, c: 'r' }, { s: 'D', p: 1, l: 3, c: 'bgy' }] },
  // 27 — cycle + generator
  l27: { map: ['.......', '.......', '.......', '.......', '......@', '.......', '.......', '.......'], pool: 'mid', fill: 0.7, target: [4, 8], bfsCap: 25000, bestCap: 40000, seeds: 60,
    gens: [{ x: 6, y: 4, d: 'L', n: 4 }],
    doors: [{ s: 'R', p: 1, l: 2, c: 'oc' }, { s: 'L', p: 1, l: 2, c: 'p' }, { s: 'L', p: 5, l: 2, c: 'yc' }, { s: 'U', p: 2, l: 2, c: 'o' }, { s: 'D', p: 1, l: 2, c: 'pyg' }, { s: 'R', p: 6, l: 2, c: 'g' }] },
  // 28 — everything
  l28: { map: ['.......', '.......', '.......', '...@...', '.......', '.......', '.......', '.......', '.......'], pool: 'big', fill: 0.62, target: [7, 11], mech: { dir: 2, ice: [1, 3], lock: 1, layer: 2 }, bfsCap: 20000, bestCap: 40000, seeds: 28,
    gens: [{ x: 3, y: 3, d: 'D', n: 3 }],
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 4, l: 3, c: 'cb', ivy: 2 }, { s: 'L', p: 1, l: 3, c: 'y' }, { s: 'L', p: 6, l: 3, c: 'k', mv: [5, 6] }, { s: 'U', p: 2, l: 3, c: 'g' }, { s: 'D', p: 0, l: 3, c: 'o' }, { s: 'D', p: 4, l: 3, c: 'p' }] },
  // 29 — hard
  l29: { map: ['........', '........', '........', '........', '........', '........', '........', '........', '........'], pool: 'big', fill: 0.72, target: [9, 16], mech: { dir: 3, ice: [2, 4, 3] }, bfsCap: 20000, bestCap: 50000, seeds: 28,
    doors: [{ s: 'R', p: 0, l: 3, c: 'r' }, { s: 'R', p: 5, l: 3, c: 'c' }, { s: 'L', p: 0, l: 3, c: 'y' }, { s: 'L', p: 4, l: 3, c: 'p' }, { s: 'U', p: 1, l: 3, c: 'g' }, { s: 'U', p: 5, l: 2, c: 'b' }, { s: 'D', p: 0, l: 3, c: 'o' }, { s: 'D', p: 4, l: 3, c: 'k' }] },
};
