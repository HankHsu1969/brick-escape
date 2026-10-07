/* Hand-designed levels (tutorial and the "rainbow drawer" signature levels). */
'use strict';

// Checkerboard of 1x1 white/black pieces: N = black, W = white.
function checker(w, h, x0, firstBlack) {
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => ((x + y + x0) % 2 === 0) === firstBlack ? 'N' : 'W').join(''));
}

const rainbowMini = (() => {
  const bars = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'];
  const chk = checker(4, 5, 0, true);
  return {
    map: bars.map((b, y) => b + chk[y]),
    key: { A: 'r', B: 'o', C: 'y', D: 'g', E: 'b', W: 'w S', N: 'n S' },
    doors: [
      { s: 'U', p: 3, c: 'n' }, { s: 'D', p: 3, c: 'w' },
      { s: 'R', p: 0, c: 'o' }, { s: 'R', p: 1, c: 'r' }, { s: 'R', p: 2, c: 'y' }, { s: 'R', p: 3, c: 'b' }, { s: 'R', p: 4, c: 'g' },
    ],
  };
})();

const rainbowBoss = (() => {
  const letters = 'ABCDEFGHI';
  const colors = 'kroylgcbp'; // pink red orange yellow lime green cyan blue purple
  const chk = checker(4, 9, 0, false);
  const key = { W: 'w S', N: 'n S', K: 'n K1' };
  letters.split('').forEach((l, i) => { key[l] = colors[i]; });
  key.E += ' i12'; // lime bar frozen until 12 clears
  key.I += ' L1';  // purple bar locked; the key rides on a black piece deep in the checkerboard
  // right-hand doors: neighbours swapped in pairs, the last one stays
  const doorColors = 'rkyolgbcp';
  const map = letters.split('').map((l, y) => l.repeat(4) + chk[y]);
  map[6] = map[6].slice(0, 7) + 'K'; // (7,6) is a black piece
  return {
    map,
    key,
    doors: [{ s: 'U', p: 4, c: 'n' }, { s: 'D', p: 4, c: 'w' }]
      .concat(doorColors.split('').map((c, y) => ({ s: 'R', p: y, c }))),
  };
})();

module.exports = {
  tutorial: {
    map: ['....', 'AA..', '..BB', '....'],
    key: { A: 'r', B: 'b' },
    doors: [{ s: 'R', p: 1, c: 'r' }, { s: 'L', p: 2, c: 'b' }],
  },
  rainbowMini,
  rainbowBoss,
};
