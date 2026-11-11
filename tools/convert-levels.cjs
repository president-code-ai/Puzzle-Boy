'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const widths = [1,1,1,1,1,1,2,2,2,3,4,5,3,3,1];
const heights = [1,2,3,4,5,6,1,2,3,1,1,1,2,3,11];
const levels = [];
for (let i=0;i<30;i++) {
  const file = `Level_${String(i).padStart(2,'0')}.txt`;
  const source = fs.readFileSync(path.join(root,'.research/fxdata/levels',file),'utf8');
  const clean = source.replace(/\/\/[^\n]*/g,'').split('{')[1].split('}')[0];
  const numbers = clean.match(/\d+/g).map(Number);
  const [width,height] = numbers;
  const players = [];
  for(let p=0;p<4;p++) if(numbers[2+p*3]) players.push({x:numbers[2+p*3],y:numbers[3+p*3]});
  const map = numbers.slice(18,18+width*height);
  if(map.length!==width*height) throw Error(`Invalid map ${file}`);
  const rows=Array.from({length:height},(_,y)=>map.slice(y*width,(y+1)*width).map(t=>t===0||t===10?'.':t===9||(t>=11&&t<=18)?'~':'#').join(''));
  const rotors=[],blocks=[];let exit;
  for(let j=18+width*height;numbers[j];j+=5) {
    const [type,x,y,direction]=numbers.slice(j,j+5);
    if(type<=5){const bases={1:[0],2:[0,1],3:[3,0,1],4:[0,1,2,3],5:[0,2]};rotors.push({x,y,arms:bases[type].map(a=>(a+direction/2)%4)});}
    else if(type===6) exit={x,y};
    else if(type<=21) blocks.push({x,y,w:widths[type-7],h:heights[type-7]});
    else throw Error(`Unknown item ${file}`);
  }
  if(!exit)throw Error(`Missing exit ${file}`);
  // Upstream Level_22 includes a stray 3x1 stone on the bottom solid wall.
  // The original 3-3 board / independent GameFAQs map has six stones.
  // Remove only that unreachable extra record, retaining the six playable ones.
  if(i===22){const n=blocks.findIndex(b=>b.x===11&&b.y===11&&b.w===3&&b.h===1);if(n<0)throw Error('Expected known Level_22 correction missing');blocks.splice(n,1);}
  // Only remove complete outer wall bands; retain one protective wall cell.
  const points=[];rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c!=='#')points.push({x,y});}));
  const x0=Math.max(0,Math.min(...points.map(p=>p.x))-1),y0=Math.max(0,Math.min(...points.map(p=>p.y))-1);
  const x1=Math.min(width-1,Math.max(...points.map(p=>p.x))+1),y1=Math.min(height-1,Math.max(...points.map(p=>p.y))+1);
  for(const p of [...players,...rotors,...blocks,exit]){p.x-=x0;p.y-=y0;}
  const id=`${1+Math.floor(i/10)}-${1+i%10}`;
  const corrections=JSON.parse(fs.readFileSync(path.join(root,'data/corrections.json'),'utf8'));
  levels.push({id,group:Math.floor(i/10),floor:1+i%10,rows:rows.slice(y0,y1+1).map(r=>r.slice(x0,x1+1)),players,exit,rotors,blocks,...corrections[id]});
}
const header='// Board data adapted from Press Play On Tape/Kwirk, BSD-3-Clause.\n// Copyright (c) 2019, Press Play On Tape. See THIRD_PARTY_NOTICES.txt.\n';
fs.writeFileSync(path.join(root,'levels.js'),header+`(function(root){'use strict';const levels=${JSON.stringify(levels,null,2)};if(typeof module==='object'&&module.exports)module.exports=levels;else root.PUZZLE_LEVELS=levels;})(globalThis);\n`);
fs.copyFileSync(path.join(root,'.research/LICENSE'),path.join(root,'THIRD_PARTY_NOTICES.txt'));
console.log(`Converted ${levels.length} boards; geometry retained, wall padding cropped.`);
