(function(root){
  'use strict';
  const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
  const copy=s=>({ ...s,players:s.players.map(p=>({...p})),blocks:s.blocks.map(b=>({...b})),rotors:s.rotors.map(r=>({...r,arms:[...r.arms]})),filled:[...s.filled] });
  function create(level){
    return {level,players:level.players.map(p=>({...p,out:false})),blocks:level.blocks.map(b=>({...b,sunk:false})),rotors:level.rotors.map(r=>({...r,arms:[...r.arms]})),filled:[],active:0,moves:0,pushes:0,won:false};
  }
  const key=(x,y)=>`${x},${y}`;
  function tile(s,x,y){const t=s.level.rows[y]?.[x];return t==='~'&&s.filled.includes(key(x,y))?'.':t||'#';}
  function blockCells(b){const result=[];for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)result.push([b.x+x,b.y+y]);return result;}
  function rotorCells(r){return [[r.x,r.y],...r.arms.map(a=>[r.x+DIRS[a][0],r.y+DIRS[a][1]])];}
  const same=(p,x,y)=>p.x===x&&p.y===y;
  function itemAt(s,x,y,ignoreBlock=-1,ignoreRotor=-1){
    const b=s.blocks.findIndex((b,i)=>i!==ignoreBlock&&!b.sunk&&x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h);
    if(b>=0)return {kind:'block',index:b};
    const r=s.rotors.findIndex((r,i)=>i!==ignoreRotor&&rotorCells(r).some(p=>p[0]===x&&p[1]===y));
    if(r>=0)return {kind:'rotor',index:r};
    return null;
  }
  function otherPlayer(s,x,y){return s.players.some((p,i)=>i!==s.active&&!p.out&&same(p,x,y));}
  function free(s,x,y,ib=-1,ir=-1,allowHole=false,allowExit=true){return tile(s,x,y)!=='#'&&(allowHole||tile(s,x,y)!=='~')&&!itemAt(s,x,y,ib,ir)&&!otherPlayer(s,x,y)&&(allowExit||!same(s.level.exit,x,y));}
  function switchPlayer(s,index){
    if(s.won)return s;
    if(index===undefined){for(let n=1;n<=s.players.length;n++){const i=(s.active+n)%s.players.length;if(!s.players[i].out){if(i===s.active)return s;return {...s,active:i};}}return s;}
    if(!Number.isInteger(index)||!s.players[index]||s.players[index].out||index===s.active)return s;
    return {...s,active:index};
  }
  function move(state,direction){
    if(!Number.isInteger(direction)||direction<0||direction>3||state.won)return {state,event:'blocked'};
    const s=copy(state),p=s.players[s.active],[dx,dy]=DIRS[direction];
    let x=p.x+dx,y=p.y+dy,event='walk';
    if(tile(s,x,y)!=='.'||otherPlayer(s,x,y))return {state,event:'blocked'};
    const hit=itemAt(s,x,y);
    if(hit?.kind==='block'){
      const b=s.blocks[hit.index],next={...b,x:b.x+dx,y:b.y+dy};
      if(!blockCells(next).every(([cx,cy])=>free(s,cx,cy,hit.index,-1,true,false)))return {state,event:'blocked'};
      b.x+=dx;b.y+=dy;s.pushes++;event='push';
      if(blockCells(b).every(([cx,cy])=>tile(s,cx,cy)==='~')){b.sunk=true;s.filled.push(...blockCells(b).map(([cx,cy])=>key(cx,cy)));event='sink';}
    } else if(hit?.kind==='rotor'){
      const r=s.rotors[hit.index],rx=x-r.x,ry=y-r.y;
      const cross=rx*dy-ry*dx;
      if(cross===0)return {state,event:'blocked'};
      const sign=Math.sign(cross),nextArms=r.arms.map(a=>(a+sign+4)%4);
      // The newly opened sector needs floor clearance. Between existing arms,
      // only movable obstacles block the rotor, as in the reference rules.
      for(const a of r.arms){
        const na=(a+sign+4)%4,[ax,ay]=DIRS[a],[bx,by]=DIRS[na];
        const cx=r.x+ax+bx,cy=r.y+ay+by;
        if(r.arms.includes(na)){
          if(itemAt(s,cx,cy,-1,hit.index)||otherPlayer(s,cx,cy))return {state,event:'blocked'};
        }else if(!free(s,cx,cy,-1,hit.index,true,false)||!free(s,r.x+bx,r.y+by,-1,hit.index,true,false))return {state,event:'blocked'};
      }
      r.arms=nextArms;
      if(rotorCells(r).some(c=>c[0]===x&&c[1]===y)){x+=dx;y+=dy;}
      if(!free(s,x,y))return {state,event:'blocked'};
      s.pushes++;event='rotate';
    }
    p.x=x;p.y=y;s.moves++;
    if(same(s.level.exit,x,y)){
      p.out=true;event='exit';
      s.won=s.players.every(p=>p.out);
      if(s.won)event='win';else s.active=s.players.findIndex(p=>!p.out);
    }
    return {state:s,event};
  }
  function walkPath(s,x,y){
    if(!Number.isInteger(x)||!Number.isInteger(y)||s.won||!free(s,x,y))return null;
    const p=s.players[s.active],start=key(p.x,p.y),queue=[[p.x,p.y,[]]],seen=new Set([start]);
    for(let i=0;i<queue.length;i++){
      const [cx,cy,path]=queue[i];if(cx===x&&cy===y)return path;
      if(path.length&&!same(p,cx,cy)&&same(s.level.exit,cx,cy))continue;
      for(let d=0;d<4;d++){const [dx,dy]=DIRS[d],nx=cx+dx,ny=cy+dy,k=key(nx,ny);if(!seen.has(k)&&free(s,nx,ny)){seen.add(k);queue.push([nx,ny,[...path,d]]);}}
    }
    return null;
  }
  const api={DIRS,create,move,switchPlayer,tile,blockCells,rotorCells,itemAt,walkPath};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PuzzleEngine=api;
})(globalThis);
