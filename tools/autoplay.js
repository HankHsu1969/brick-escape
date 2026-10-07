/* Dev-only browser harness: replays solver solutions (tools/solutions.json, made by
 * `node tools/solve.js --json`) through synthetic pointer drags, to prove the real drag
 * physics can perform every move. Load in the page console:
 *   eval(await (await fetch('tools/autoplay.js')).text()); await __autoplay(12)
 */
window.__autoplay = async function (idx, opts) {
  opts = opts || {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const B = window.__brick;
  const sols = await (await fetch('tools/solutions.json?' + Date.now())).json();
  const path = sols[idx];
  if (!path) return 'no solution for level index ' + idx;
  ['drag', 'block', 'width', 'shapes', 'dir', 'walls', 'ice', 'lock', 'rainbow', 'layer', 'gen', 'move', 'ivy', 'cycle'].forEach(k => { B.save.tips[k] = 1; });
  B.startLevel(idx);
  await sleep(500);
  const G = B.G, L = G.L, S = G.S;
  const cv = document.querySelector('#board');
  const toClient = (x, y) => {
    const v = B.view, r = cv.getBoundingClientRect();
    return [r.left + (v.ox + x * v.cs) / v.dpr, r.top + (v.oy + y * v.cs) / v.dpr];
  };
  const fire = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, {
    clientX: x, clientY: y, pointerId: 7, bubbles: true, pointerType: 'mouse', isPrimary: true, buttons: type === 'pointerup' ? 0 : 1,
  }));
  const dt = opts.step || 24;
  for (let k = 0; k < path.length; k++) {
    const a = path[k], i = a.i, b = L.blocks[i];
    const occ = Engine.occupancy(L, S);
    const key = (x, y) => x + ',' + y;
    const start = [S.x[i], S.y[i]];
    const prev = new Map([[key(start[0], start[1]), null]]);
    const q = [start];
    const steps = b.dir === 'h' ? [[1, 0], [-1, 0]] : b.dir === 'v' ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === a.x && y === a.y) break;
      for (const [dx, dy] of steps) {
        const nx = x + dx, ny = y + dy;
        if (prev.has(key(nx, ny)) || !Engine.canPlace(L, occ, i, nx, ny)) continue;
        prev.set(key(nx, ny), [x, y]);
        q.push([nx, ny]);
      }
    }
    if (!prev.has(key(a.x, a.y))) return { fail: 'action ' + k + ' unreachable', a };
    const route = [];
    for (let cur = [a.x, a.y]; cur; cur = prev.get(key(cur[0], cur[1]))) route.unshift(cur);
    const gx = b.cells[0][0] + 0.5, gy = b.cells[0][1] + 0.5;
    const st0 = S.st[i], ci0 = S.ci[i];
    let [px, py] = toClient(start[0] + gx, start[1] + gy);
    fire('pointerdown', px, py);
    await sleep(dt);
    for (let r = 1; r < route.length && S.st[i] === st0 && S.ci[i] === ci0; r++) {
      for (let s = 1; s <= 4; s++) {
        const t = s / 4;
        const x = route[r - 1][0] + (route[r][0] - route[r - 1][0]) * t, y = route[r - 1][1] + (route[r][1] - route[r - 1][1]) * t;
        [px, py] = toClient(x + gx, y + gy);
        fire('pointermove', px, py);
        await sleep(dt / 4);
      }
    }
    fire('pointerup', px, py);
    await sleep(a.t === 'exit' ? 320 : 120);
    if (a.t === 'move' && (S.x[i] !== a.x || S.y[i] !== a.y || S.st[i] !== 1)) {
      return { fail: 'action ' + k + ' move ended at ' + S.x[i] + ',' + S.y[i] + ' st ' + S.st[i], a };
    }
    if (a.t === 'exit' && S.st[i] === st0 && S.ci[i] === ci0) return { fail: 'action ' + k + ' did not exit', a, at: [S.x[i], S.y[i]] };
  }
  await sleep(1600);
  return { level: idx + 1, actions: path.length, won: Engine.isWon(L, S), modal: document.querySelector('#modal-title').textContent, timeLeft: Math.round(G.timeLeft) };
};
