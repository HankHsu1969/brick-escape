/* Package the game as one Artifact page: index.html with css/style.css and js/*.js inlined
 * (the Artifact CSP only loads scripts from a few CDNs), written to dist/index.html.
 * Images and audio stay as files published next to it under assets/.
 *   node tools/build-artifact.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('index.html');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const fonts = (head.match(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/g) || []).join('\n');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1].replace(/\s*<script src="js\/[^"]+"><\/script>/g, '');

// the page is served from the artifact root, so ../assets becomes assets
const css = read('css/style.css').replace(/url\(\.\.\/assets\//g, 'url(assets/');
const scripts = ['engine', 'levels', 'audio', 'game']
  .map(n => '<script>\n' + read('js/' + n + '.js').replace(/<\/script/gi, '<\\/script') + '\n</script>')
  .join('\n');

// the publish skeleton supplies doctype/head/body; the page starts with its own title and style
const out = [title, fonts, '<style>\n' + css + '\n</style>', body.trim(), scripts].join('\n') + '\n';
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), out);

const assets = [];
for (const dir of ['assets/img', 'assets/sfx']) {
  for (const f of fs.readdirSync(path.join(root, dir))) assets.push(dir + '/' + f);
}
fs.writeFileSync(path.join(root, 'dist', 'files.json'), JSON.stringify(assets, null, 1));
console.log('dist/index.html', (out.length / 1024).toFixed(0) + 'KB,', assets.length, 'asset files');
