'use strict';
// Read-only upstream acquisition. Never execute fetched code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..', '.research');
const revision = '730456d92254681e8683167716bd47b16019105c';
const repo = 'Press-Play-On-Tape/Kwirk';
async function main() {
  const response = await fetch(`https://api.github.com/repos/${repo}/git/trees/${revision}?recursive=1`);
  if (!response.ok) throw Error(`Tree HTTP ${response.status}`);
  const tree = await response.json();
  if (tree.sha !== revision || tree.truncated) throw Error('Unexpected tree');
  const files = tree.tree.filter(f => /^fxdata\/levels\/Level_\d\d\.txt$/.test(f.path) || ['LICENSE', 'src/entities/Level.h', 'src/entities/Level_Load.hpp', 'src/entities/Level_Rotate.hpp', 'src/entities/Level_Utils.hpp', 'src/utils/Constants.h', 'src/utils/Enums.h', 'distributable/puzzles/Kwirk_00.png', 'distributable/puzzles/Kwirk_29.png'].includes(f.path));
  fs.mkdirSync(root, { recursive: true });
  for (const file of files) {
    const r = await fetch(`https://raw.githubusercontent.com/${repo}/${revision}/${file.path}`);
    if (!r.ok) throw Error(`File HTTP ${r.status}: ${file.path}`);
    const data = Buffer.from(await r.arrayBuffer());
    const hash = crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
    if (hash !== file.sha) throw Error(`Git blob mismatch: ${file.path}`);
    const target = path.join(root, file.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target) && !fs.readFileSync(target).equals(data)) throw Error(`Refusing overwrite: ${file.path}`);
    fs.writeFileSync(target, data);
  }
  fs.writeFileSync(path.join(root, 'provenance.json'), JSON.stringify({ repo, revision, files }, null, 2));
  console.log(`Verified ${files.length} reference files at ${revision}`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
