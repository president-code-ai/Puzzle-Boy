'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('../engine'),levels=require('../levels'),solutions=require('./solutions.json'),signatures=require('./board-signatures.json');
const stringify=s=>JSON.stringify(s);
function canonical(l){return {rows:l.rows,players:l.players,exit:l.exit,blocks:l.blocks.map(b=>JSON.stringify(b)).sort(),rotors:l.rotors.map(r=>JSON.stringify({x:r.x,y:r.y,arms:r.arms.slice().sort()})).sort()};}
function check(s){
  const occupied=new Set();for(const b of s.blocks)if(!b.sunk)for(const [x,y]of E.blockCells(b)){assert.notEqual(E.tile(s,x,y),'#');const k=x+','+y;assert.ok(!occupied.has(k));occupied.add(k);}
  for(const r of s.rotors)for(const [x,y]of E.rotorCells(r)){assert.notEqual(E.tile(s,x,y),'#');const k=x+','+y;assert.ok(!occupied.has(k));occupied.add(k);}
  for(const p of s.players)if(!p.out){assert.equal(E.tile(s,p.x,p.y),'.');const k=p.x+','+p.y;assert.ok(!occupied.has(k));occupied.add(k);}
  if(!s.won)assert.ok(!s.players[s.active].out);
  assert.equal(s.won,s.players.every(p=>p.out));
}
test('30 original boards match independent published original-data signatures',()=>{
  assert.equal(levels.length,30);assert.equal(Object.keys(signatures).length,30);
  for(const l of levels){assert.equal(crypto.createHash('sha256').update(JSON.stringify(canonical(l))).digest('hex'),signatures[l.id],l.id);const s=E.create(l);check(s);assert.equal(l.rows.length,l.rows.filter(r=>r.length===l.rows[0].length).length);assert.ok(l.rows.every(r=>/^[#.~]+$/.test(r)));}
});
test('all 30 solutions replay legally, every actor exits, old states survive undo',()=>{
  assert.equal(Object.keys(solutions).length,30);
  for(const l of levels){let s=E.create(l);const initial=stringify(s),history=[];for(const a of solutions[l.id]){const before=stringify(s);history.push(s);const next=a>=4?E.switchPlayer(s,a-4):E.move(s,a).state;assert.notEqual(next,s,`${l.id} action ${a}`);assert.equal(stringify(s),before);s=next;check(s);}assert.ok(s.won,l.id);assert.equal(E.move(s,0).state,s);while(history.length){s=history.pop();check(s);}assert.equal(stringify(s),initial);}
});
test('fixed seed random actions preserve geometry and immutable rejection across every board',()=>{
  let seed=20261112;for(const l of levels){let s=E.create(l);for(let i=0;i<400;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const a=seed%5,before=stringify(s);const next=a===4?E.switchPlayer(s):E.move(s,a).state;assert.equal(stringify(s),before);s=next;check(s);if(s.won)s=E.create(l);}}
});
function board(overrides={}){return {id:'test',rows:['#######','#.....#','#.....#','#.....#','#.....#','#.....#','#######'],players:[{x:1,y:2}],exit:{x:5,y:5},blocks:[],rotors:[],...overrides};}
test('stone sinks only when entirely over holes; stacked stones and other actors block pushes',()=>{
 const l=board({rows:['#######','#.....#','#..~~.#','#.....#','#.....#','#.....#','#######'],blocks:[{x:2,y:2,w:2,h:1}]});let s=E.create(l),r=E.move(s,1);assert.equal(r.event,'sink');assert.ok(r.state.blocks[0].sunk);assert.equal(E.tile(r.state,3,2),'.');assert.equal(E.tile(s,3,2),'~');
 s=E.create(board({rows:['#######','#.....#','#...~.#','#.....#','#.....#','#.....#','#######'],blocks:[{x:2,y:2,w:2,h:1}]}));r=E.move(s,1);assert.equal(r.event,'push');assert.ok(!r.state.blocks[0].sunk);
 s=E.create(board({blocks:[{x:2,y:2,w:1,h:1},{x:3,y:2,w:1,h:1}]}));assert.equal(E.move(s,1).state,s);
 s=E.create(board({blocks:[{x:2,y:2,w:1,h:1}],players:[{x:1,y:2},{x:3,y:2}]}));assert.equal(E.move(s,1).state,s);
});
test('rotor pivot cannot be pushed, swept sector blocks, cross rotor pushes actor two cells',()=>{
 let s=E.create(board({players:[{x:2,y:2}],rotors:[{x:3,y:3,arms:[0]}]}));let r=E.move(s,1);assert.equal(r.event,'rotate');assert.deepEqual(r.state.rotors[0].arms,[1]);assert.deepEqual([r.state.players[0].x,r.state.players[0].y],[3,2]);
 s=E.create(board({players:[{x:2,y:3}],rotors:[{x:3,y:3,arms:[0]}]}));assert.equal(E.move(s,1).state,s);
 s=E.create(board({players:[{x:2,y:2}],rotors:[{x:3,y:3,arms:[0]}],blocks:[{x:4,y:2,w:1,h:1}]}));assert.equal(E.move(s,1).state,s);
 s=E.create(board({players:[{x:2,y:2}],rotors:[{x:3,y:3,arms:[0,1,2,3]}]}));r=E.move(s,1);assert.equal(r.event,'rotate');assert.equal(r.state.players[0].x,4);assert.equal(r.state.moves,1);
});
test('every available actor must escape; switch skips exited actors',()=>{
 let s=E.create(board({players:[{x:4,y:5},{x:1,y:1}]}));s=E.move(s,1).state;assert.ok(s.players[0].out);assert.ok(!s.won);assert.equal(s.active,1);assert.equal(E.switchPlayer(s),s);assert.equal(E.switchPlayer(s,0),s);assert.equal(E.switchPlayer(s,NaN),s);
});
test('floor tap path never pushes an object or traverses an exit',()=>{
 const s=E.create(board({exit:{x:3,y:2},blocks:[{x:2,y:2,w:1,h:1}]}));assert.equal(E.walkPath(s,2,2),null);assert.equal(E.walkPath(s,-1,1),null);assert.equal(E.walkPath(s,NaN,1),null);const p=E.walkPath(s,5,2);assert.ok(p);let next=s;for(const d of p){const r=E.move(next,d);assert.equal(r.event,'walk');next=r.state;}assert.deepEqual([next.players[0].x,next.players[0].y],[5,2]);
});
test('invalid movement values cannot change state',()=>{const s=E.create(levels[0]);for(const d of [-1,4,NaN,Infinity,1.5,'1',null,undefined])assert.equal(E.move(s,d).state,s);});
test('distribution has no external runtime references, storage or dynamic code execution',()=>{
 const root=path.resolve(__dirname,'..'),files=['index.html','style.css','levels.js','engine.js','render.js','audio.js','app.js'];
 for(const file of files){const text=fs.readFileSync(path.join(root,file),'utf8').replaceAll('http://www.w3.org/2000/svg','SVG_NAMESPACE');assert.doesNotMatch(text,/https?:\/\//,file);assert.doesNotMatch(text,/\b(?:fetch|XMLHttpRequest|WebSocket|eval|localStorage|sessionStorage|indexedDB)\s*[.(]/,file);assert.doesNotMatch(text,/\.innerHTML\s*=/,file);}
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);assert.match(html,/base-uri 'none'/);assert.equal((html.match(/<script defer src="[^/][^"]+"/g)||[]).length,5);
});
