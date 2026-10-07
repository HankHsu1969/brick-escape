/* Generate the best candidate for templates, in parallel worker processes.
 * Each template's winner is written to tools/gen_out/<name>.json (read by build-levels.js).
 *   node tools/genall.js [--seeds N] [--jobs N] [names...]      (default: every template without output)
 *   node tools/genall.js --force l06 l07                         (regenerate even if output exists)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');
const TEMPLATES = require('./templates.js');

const OUT = path.join(__dirname, 'gen_out');
fs.mkdirSync(OUT, { recursive: true });

if (process.env.GEN_WORKER) {
  const { run } = require('./gen.js');
  const name = process.env.GEN_WORKER;
  const seeds = +process.env.GEN_SEEDS;
  const t0 = Date.now();
  const res = run(name, TEMPLATES[name].seeds || seeds);
  const best = res[0];
  if (best) {
    fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify({ seed: best.seed, placements: best.pl, exact: best.exact, actions: best.acts, def: best.def }, null, 1));
  }
  console.log(name, best ? 'ok cands ' + res.length + ' place ' + (best.exact ? '' : '<=') + best.pl + ' acts ' + best.acts : 'NO CANDIDATE', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  process.exit(0);
}

const args = process.argv.slice(2);
let seeds = 40, jobs = 7, force = false;
const names = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--seeds') seeds = +args[++i];
  else if (args[i] === '--jobs') jobs = +args[++i];
  else if (args[i] === '--force') force = true;
  else names.push(args[i]);
}
const todo = (names.length ? names : Object.keys(TEMPLATES))
  .filter(n => force || names.length || !fs.existsSync(path.join(OUT, n + '.json')));

let running = 0;
function next() {
  while (running < jobs && todo.length) {
    const name = todo.shift();
    running++;
    const child = fork(__filename, [], { env: Object.assign({}, process.env, { GEN_WORKER: name, GEN_SEEDS: String(seeds) }) });
    child.on('exit', () => { running--; next(); });
  }
}
next();
