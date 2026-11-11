(function(root){
  'use strict';
  const E=root.PuzzleEngine;
  const lerp=(a,b,t)=>a+(b-a)*t;
  const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  class BoardView{
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.zoom=false;this.camera=null;this.layout=null;this.reduced=root.matchMedia('(prefers-reduced-motion: reduce)').matches;}
    resize(){const box=this.canvas.getBoundingClientRect(),d=Math.min(root.devicePixelRatio||1,2);this.width=box.width;this.height=box.height;this.dpr=d;if(this.canvas.width!==Math.round(box.width*d)||this.canvas.height!==Math.round(box.height*d)){this.canvas.width=Math.round(box.width*d);this.canvas.height=Math.round(box.height*d);} }
    round(x,y,w,h,r,fill,stroke){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,Math.max(0,r));if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
    oval(x,y,rx,ry,fill){const c=this.ctx;c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
    path(points,fill,stroke){const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
    background(){const c=this.ctx,w=this.width,h=this.height;c.clearRect(0,0,w,h);const g=c.createRadialGradient(w*.48,h*.4,10,w*.5,h*.5,Math.max(w,h)*.8);g.addColorStop(0,'#3c5945');g.addColorStop(.65,'#263f32');g.addColorStop(1,'#1b342c');c.fillStyle=g;c.fillRect(0,0,w,h);
      // Quiet pool, pebbles and foliage surround the miniature puzzle diorama.
      c.save();c.globalAlpha=.32;for(let i=0;i<7;i++){c.strokeStyle='#719b7460';c.lineWidth=1;c.beginPath();c.ellipse(w*.88,h*.8,25+i*15,8+i*6,-.35,0,Math.PI*2);c.stroke();}c.restore();
      for(let i=0;i<32;i++){const x=noise(i,4)*w,y=noise(i,6)*h;if(x>w*.14&&x<w*.86&&y>h*.16&&y<h*.84)continue;const r=2+noise(i,7)*5;this.oval(x,y,r,r*.55,i%3?'#8a9f7230':'#c4c59628');}
      [[-10,h*.26,1],[w+8,h*.65,-1],[w*.13,h+12,1],[w*.85,-17,-1]].forEach(([x,y,side])=>{c.save();c.translate(x,y);c.rotate(side*.4);for(let i=0;i<7;i++){const a=-1.2+i*.4;c.save();c.rotate(a);this.oval(24,0,26,7,i%2?'#57724a70':'#6e81514d');c.restore();}c.restore();});
      for(let i=0;i<13;i++){const x=noise(i,22)*w,y=noise(i,33)*h;this.oval(x,y,1,1,'#f5df9b46');}
    }
    draw(s,previous=null,progress=1,event='walk'){
      this.resize();if(!this.width||!this.height)return;
      const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);this.background();
      const rows=s.level.rows,cols=rows[0].length,h=rows.length;
      const tile=Math.min((this.width-30)/cols,(this.height-90)/h,48)*(this.zoom?1.8:1);
      const p=s.players[s.active],oldp=previous?.players[s.active];
      const px=oldp?lerp(oldp.x,p.x,progress):p.x,py=oldp?lerp(oldp.y,p.y,progress):p.y;
      let ox=(this.width-cols*tile)/2,oy=(this.height-h*tile)/2+4;
      if(this.zoom){ox=Math.min(16,Math.max(this.width-cols*tile-16,this.width/2-(px+.5)*tile));oy=Math.min(55,Math.max(this.height-h*tile-35,this.height/2-(py+.5)*tile));}
      this.layout={tile,ox,oy,cols,rows:h};
      c.save();c.translate(ox,oy);c.scale(tile,tile);c.lineWidth=.035;
      this.round(-.13,.12,cols+.26,h+.3,.34,'#122b2277');
      this.round(-.1,-.07,cols+.2,h+.24,.25,'#566a48');
      this.round(-.1,-.15,cols+.2,h+.16,.25,'#74856a');
      for(let y=0;y<h;y++)for(let x=0;x<cols;x++)this.floor(s,x,y);
      this.exit(s.level.exit);
      for(let y=0;y<h;y++)for(let x=0;x<cols;x++)if(rows[y][x]==='#')this.wall(x,y,rows);
      s.blocks.forEach((b,i)=>{const old=previous?.blocks[i];if(b.sunk&&(!old||old.sunk||progress===1))return;const x=old?lerp(old.x,b.x,progress):b.x,y=old?lerp(old.y,b.y,progress):b.y;this.block({...b,x,y},b.sunk?1-progress:1);});
      s.rotors.forEach((r,i)=>{const old=previous?.rotors[i];let offset=0;if(old&&progress<1&&event==='rotate'){const d=(r.arms[0]-old.arms[0]+4)%4;offset=(d===3?-1:d)*(1-progress)*(-Math.PI/2);}this.rotor(r,offset);});
      s.players.forEach((p,i)=>{const old=previous?.players[i];if(p.out&&(!old||old.out||progress===1))return;const x=old?lerp(old.x,p.x,progress):p.x,y=old?lerp(old.y,p.y,progress):p.y;const hop=old&&(old.x!==p.x||old.y!==p.y)?Math.sin(progress*Math.PI)*.09:0;this.person(x,y,i,i===s.active,p.out?1-progress:1,hop);});
      c.restore();
    }
    floor(s,x,y){const c=this.ctx,t=E.tile(s,x,y),n=noise(x,y);if(t==='#'){this.round(x+.02,y+.02,.96,.96,.035,'#233c2f');return;}if(t==='~'){
        this.round(x+.015,y+.015,.97,.97,.025,'#102922');c.fillStyle='#18382e';c.fillRect(x+.04,y+.12,.91,.85);c.fillStyle='#0e251e';c.fillRect(x+.06,y+.17,.87,.75);c.fillStyle='#668368';c.fillRect(x+.02,y+.01,.96,.035);
        if(n>.5){c.strokeStyle='#3b66534d';c.lineWidth=.025;c.beginPath();c.moveTo(x+.15,y+.7);c.lineTo(x+.65,y+.67);c.stroke();}return;
      }
      const shade=Math.round(141+n*14);this.round(x+.012,y+.012,.976,.976,.035,`rgb(${shade},${shade+7},${shade-13})`);
      c.fillStyle='#e7e4be24';c.fillRect(x+.05,y+.03,.9,.025);c.fillStyle='#455f4a2b';c.fillRect(x+.04,y+.93,.92,.04);
      if(n>.76){c.strokeStyle='#66795844';c.lineWidth=.025;c.beginPath();c.moveTo(x+.6,y+.05);c.lineTo(x+.58,y+.2);c.lineTo(x+.7,y+.29);c.stroke();}
      if(n<.3){this.oval(x+.2,y+.72,.025,.015,'#42563a33');this.oval(x+.77,y+.35,.016,.016,'#e6e7c53d');}
      if(s.filled.includes(`${x},${y}`)){this.round(x+.1,y+.11,.8,.77,.04,'#adab86');c.strokeStyle='#e1d7a52b';c.lineWidth=.025;c.strokeRect(x+.16,y+.16,.68,.64);}
    }
    wall(x,y,rows){const c=this.ctx,n=noise(x,y),lower=rows[y+1]?.[x]!=='#';c.save();c.translate(x,y);this.round(.025,lower?.1:.015,.95,lower?.89:.97,.055,'#2b4334');
      const g=c.createLinearGradient(0,0,.7,.8);g.addColorStop(0,n>.5?'#668060':'#5c7658');g.addColorStop(1,'#465f45');this.round(.018,-.095,.964,.94,.06,g);c.fillStyle='#bdd1a22e';c.fillRect(.08,-.07,.82,.035);c.fillStyle='#233c2b73';c.fillRect(.065,.8,.87,.05);
      if(n>.68){this.oval(.2,.1,.11,.065,'#7e965c66');this.oval(.33,.08,.09,.055,'#829c5f55');}if(lower){c.fillStyle='#172e2560';c.fillRect(.07,.94,.85,.06);}c.restore();
    }
    block(b,alpha){const c=this.ctx;c.save();c.globalAlpha=alpha;const {x,y,w,h}=b;this.round(x+.07,y+.1,w-.08,h-.04,.09,'#27392a70');this.round(x+.045,y+.02,w-.09,h-.07,.075,'#82775a');const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#ded5b3');g.addColorStop(.5,'#bfb590');g.addColorStop(1,'#a39771');this.round(x+.045,y-.09,w-.09,h-.13,.075,g);c.strokeStyle='#f8edca77';c.lineWidth=.025;c.strokeRect(x+.13,y+.005,w-.26,h-.31);c.strokeStyle='#8b805960';for(let i=1;i<w;i++){c.beginPath();c.moveTo(x+i,y+.02);c.lineTo(x+i,y+h-.23);c.stroke();}for(let j=1;j<h;j++){c.beginPath();c.moveTo(x+.12,y+j-.09);c.lineTo(x+w-.12,y+j-.09);c.stroke();}
      const cx=x+w/2,cy=y+h/2-.13;c.strokeStyle='#83764c88';c.lineWidth=.035;this.path([[cx-.13,cy],[cx,cy-.13],[cx+.13,cy],[cx,cy+.13]],null,'#8a7f5755');c.restore();
    }
    rotor(r,offset){const c=this.ctx,x=r.x+.5,y=r.y+.5;c.save();c.translate(x,y);this.oval(.03,.1,.34,.29,'#122b2370');c.rotate(offset);
      r.arms.forEach(a=>{c.save();c.rotate(a*Math.PI/2);this.round(-.235,-1.38,.47,1.45,.09,'#2e6855');const g=c.createLinearGradient(-.2,-1,.2,-.3);g.addColorStop(0,'#add6ac');g.addColorStop(.45,'#7cbb96');g.addColorStop(1,'#4f9374');this.round(-.225,-1.42,.45,1.42,.07,g);c.strokeStyle='#d4e6b6aa';c.lineWidth=.025;c.beginPath();c.moveTo(-.15,-1.31);c.lineTo(-.15,-.15);c.stroke();this.round(-.17,-1.22,.34,.13,.02,'#bdaa6f');this.oval(0,-1.15,.035,.035,'#74643f');c.restore();});
      this.oval(0,-.045,.305,.305,'#b79b5b');this.oval(0,-.08,.25,.25,'#e4c681');this.oval(0,-.1,.16,.16,'#897444');this.oval(-.02,-.125,.105,.105,'#c5ad70');c.strokeStyle='#ecd89a';c.lineWidth=.025;c.beginPath();c.moveTo(-.06,-.15);c.lineTo(.04,-.07);c.stroke();c.restore();
    }
    exit(e){const c=this.ctx,x=e.x,y=e.y;c.save();this.oval(x+.5,y+.5,.65,.63,'#f0d58d20');this.round(x+.05,y+.03,.9,.92,.08,'#514a30');for(let i=0;i<4;i++){const yy=y+.1+i*.19;this.round(x+.12,yy,.76,.18,.025,i%2?'#d9c38d':'#e8d59c');c.fillStyle='#927f4b';c.fillRect(x+.12,yy+.14,.76,.04);}c.strokeStyle='#fff0b8';c.lineWidth=.06;c.beginPath();c.moveTo(x+.3,y+.48);c.lineTo(x+.5,y+.3);c.lineTo(x+.7,y+.48);c.stroke();this.oval(x+.82,y+.1,.045,.045,'#fff6cb');c.restore();}
    person(x,y,index,active,alpha,hop){const c=this.ctx,colors=[['#ffe1a0','#e6ae63'],['#bbd995','#85a960'],['#dfb5d6','#b384b1'],['#f3c18b','#d09258']][index%4];c.save();c.globalAlpha=alpha;this.oval(x+.52,y+.8,.33,.14,'#263c2970');if(active){c.strokeStyle='#ffe9a8';c.lineWidth=.035;c.beginPath();c.ellipse(x+.5,y+.82,.4,.2,0,0,Math.PI*2);c.stroke();}c.translate(x+.5,y+.48-hop);this.oval(-.14,.28,.085,.06,'#795735');this.oval(.16,.28,.085,.06,'#795735');this.oval(-.3,.07,.07,.11,colors[1]);this.oval(.3,.07,.07,.11,colors[1]);const g=c.createRadialGradient(-.1,-.17,.02,0,0,.45);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);this.oval(0,-.03,.31,.34,g);this.oval(-.08,-.19,.12,.06,'#fff5d830');this.oval(-.105,-.035,.032,.048,'#423f2c');this.oval(.105,-.035,.032,.048,'#423f2c');this.oval(-.15,.075,.053,.03,'#d68c6670');this.oval(.15,.075,.053,.03,'#d68c6670');c.strokeStyle='#5c4b35';c.lineWidth=.022;c.beginPath();c.arc(0,.05,.055,.2,Math.PI-.2);c.stroke();c.save();c.rotate(-.45);this.oval(.05,-.35,.06,.14,'#6a9e5e');c.restore();c.save();c.rotate(.5);this.oval(-.02,-.34,.05,.11,'#9fc079');c.restore();if(active)this.path([[-.065,-.61],[.065,-.61],[0,-.51]],'#ffe3a2');c.restore();}
    cellAt(clientX,clientY){if(!this.layout)return null;const r=this.canvas.getBoundingClientRect(),{tile,ox,oy}=this.layout;const x=Math.floor((clientX-r.left-ox)/tile),y=Math.floor((clientY-r.top-oy)/tile);return{x,y};}
  }
  root.PuzzleBoardView=BoardView;
})(globalThis);
