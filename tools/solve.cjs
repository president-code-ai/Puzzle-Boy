'use strict';
const E=require('../engine.js');
function signature(s){return JSON.stringify([s.active,s.players.map(p=>[p.x,p.y,p.out]),s.blocks.map(b=>[b.x,b.y,b.sunk]),s.rotors.map(r=>r.arms),s.filled.slice().sort()]);}
function solve(level,limit=150000){
  const first=E.create(level),queue=[{state:first,parent:-1,action:null}],seen=new Set([signature(first)]);
  for(let i=0;i<queue.length&&queue.length<limit;i++){
    const current=queue[i];
    if(current.state.won){const actions=[];for(let n=i;queue[n].parent>=0;n=queue[n].parent)actions.push(queue[n].action);return{actions:actions.reverse(),visited:seen.size};}
    for(let d=0;d<5;d++){const s=d===4?E.switchPlayer(current.state):E.move(current.state,d).state;if(s===current.state)continue;const k=signature(s);if(!seen.has(k)){seen.add(k);queue.push({state:s,parent:i,action:d});}}
  }
  return{actions:null,visited:seen.size};
}
module.exports={solve,signature};
if(require.main===module){const levels=require('../levels.js');for(const l of levels.slice(0,10)){const s=solve(l);console.log(l.id,JSON.stringify(s));}}
