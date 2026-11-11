(function(){
  'use strict';
  const E=globalThis.PuzzleEngine,levels=globalThis.PUZZLE_LEVELS,$=id=>document.getElementById(id);
  const view=new globalThis.PuzzleBoardView($('board')),audio=new globalThis.PuzzleEffects();
  const groups=['やさしい','ふつう','むずかしい'];
  let index=0,state=E.create(levels[0]),history=[],completed=new Set(),frame=0,routeTimer=0,toastTimer=0,holdTimer=0,goalTimer=0,heldPointer=null,heldButton=null,gesture=null,elapsed=0,clockStart=performance.now(),modalKind='',pendingWin=false,returnFocus=null;
  const tips=['扉の羽を横から押すと、くるりと回転。','石は押せるけれど、引けない。穴を埋めて道を作ろう。','回転する扉のまわりには、空間が必要。','石がすべて穴に重なると、沈んで道になる。','扉と石を組み合わせて、道を開こう。','仲間を切り替えて、全員を出口へ。'];
  function setText(id,text){$(id).textContent=String(text);}
  function announce(text){setText('announcement',text);}
  function toast(text){clearTimeout(toastTimer);setText('toast',text);$('toast').hidden=false;toastTimer=setTimeout(()=>{$('toast').hidden=true;},1700);announce(text);}
  function stopRoute(){clearTimeout(routeTimer);routeTimer=0;}
  function stopHold(){clearTimeout(holdTimer);if(heldButton)heldButton.classList.remove('is-held');heldPointer=null;heldButton=null;}
  function stopInput(){stopRoute();stopHold();gesture=null;}
  function remember(){history.push(state);if(history.length>10000)history.shift();}
  function nowTime(){return elapsed+(clockStart===null?0:performance.now()-clockStart);}
  function pauseClock(){if(clockStart!==null){elapsed+=performance.now()-clockStart;clockStart=null;}}
  function resumeClock(){if(clockStart===null&&!state.won&&!document.hidden&&!$('panel').open)clockStart=performance.now();}
  function timeLabel(ms){const seconds=Math.floor(ms/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
  function sync(){
    setText('level-number',String(state.level.group+1).padStart(2,'0'));setText('floor-number',String(state.level.floor).padStart(2,'0'));setText('difficulty',groups[state.level.group]);setText('moves',state.moves);setText('completed',completed.size);setText('timer',timeLabel(nowTime()));
    const remaining=state.players.filter(p=>!p.out).length;setText('mission',state.won?'みんな、出口に到着！':state.players.length>1?`全員を出口へ · あと${remaining}人`:'出口の階段をめざそう');
    $('switch').hidden=remaining<2;$('undo').disabled=history.length===0;$('reset').disabled=history.length===0;
    setText('tip',state.players.length>1?tips[5]:(tips[index]||'石と回転扉を動かして、出口への道を作ろう。'));
    const p=state.players[state.active];$('board').setAttribute('aria-label',`レベル${state.level.group+1}、${state.level.floor}面。${state.moves}歩。操作中の仲間${state.active+1}は左から${p.x+1}、上から${p.y+1}マス。方向キーで移動、Zで戻す、Cで切替。`);
  }
  function draw(previous=null,event='walk'){
    cancelAnimationFrame(frame);
    if((!previous||view.reduced)&&!view.hasGoalEffect()){view.draw(state);return;}
    const start=performance.now(),current=state;
    function tick(t){if(state!==current)return;const p=!previous||view.reduced?1:Math.min(1,(t-start)/150),ease=1-Math.pow(1-p,3);view.draw(current,previous,ease,event);if(p<1||view.hasGoalEffect(t))frame=requestAnimationFrame(tick);}
    frame=requestAnimationFrame(tick);
  }
  function cancelGoal(){clearTimeout(goalTimer);goalTimer=0;pendingWin=false;view.clearGoalEffect();$('goal-celebration').hidden=true;}
  function settleWin(){if(!pendingWin||!state.won||document.hidden||$('panel').open)return;cancelGoal();draw();showWin();}
  function finish(){completed.add(index);pauseClock();sync();stopInput();pendingWin=true;$('goal-celebration').hidden=false;announce('クリア！ みんな、出口に到着しました');const finished=state;goalTimer=setTimeout(()=>{goalTimer=0;if(state===finished)settleWin();},view.arrival?.duration||180);}
  function step(d){
    if($('panel').open||document.hidden||state.won)return false;
    audio.unlock();audio.restoreVolume();const before=state,result=E.move(state,d);
    audio.play(result.event);
    if(result.state===state)return false;
    remember();state=result.state;if(result.event==='exit'||result.event==='win')view.beginGoalEffect(state.level.exit,state.won);sync();draw(before,result.event);
    if(result.event==='exit')toast('ひとり到着！ 次の仲間を動かそう');
    if(state.won)finish();return true;
  }
  function undo(){if(!history.length)return;stopInput();cancelGoal();closePanel();state=history.pop();resumeClock();audio.unlock();audio.restoreVolume();audio.play('undo');sync();draw();announce('1手戻しました');}
  function load(next){if(!Number.isInteger(next)||next<0||next>=levels.length)return;stopInput();cancelGoal();closePanel();clearTimeout(toastTimer);$('toast').hidden=true;cancelAnimationFrame(frame);index=next;state=E.create(levels[index]);history=[];elapsed=0;clockStart=null;view.zoom=false;$('zoom').setAttribute('aria-pressed','false');$('zoom').setAttribute('aria-label','盤面を拡大する');resumeClock();sync();draw();announce(`レベル${state.level.group+1}、${state.level.floor}面を開始`);}
  function element(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
  function action(label,callback,primary=false){const b=element('button',label,`action${primary?' primary':''}`);b.addEventListener('click',callback);$('panel-actions').append(b);return b;}
  function openPanel(kind,kicker,title){stopInput();pauseClock();modalKind=kind;returnFocus=document.activeElement;setText('panel-kicker',kicker);setText('panel-title',title);$('panel-body').replaceChildren();$('panel-actions').replaceChildren();$('panel').showModal();}
  function closePanel(){if($('panel').open)$('panel').close();modalKind='';resumeClock();}
  function showWin(){
    openPanel('win','FLOOR COMPLETE',completed.size===30?'全30面、クリア！':'道が、つながった。');
    const body=$('panel-body');body.append(element('div','✧','clear-art'));
    const stats=element('div',undefined,'clear-stats');for(const [label,value]of [['STEPS',`${state.moves} 歩`],['TIME',timeLabel(nowTime())]]){const col=element('div');col.append(element('span',label,'eyebrow'),element('strong',value));stats.append(col);}body.append(stats,element('p',completed.size===30?'おみごと！ すべての階段に、みんなを連れていけました。':'あわてず、一歩ずつ。次の仕掛けが待っています。'));
    action('盤面に戻る',closePanel);action('面を選ぶ',()=>{closePanel();showStages();});if(index<levels.length-1)action('次の面へ →',()=>load(index+1),true);
  }
  function confirmLoad(next){
    if(!history.length||state.won){load(next);return;}
    closePanel();openPanel('reset','START OVER',next===index?'最初からやり直す？':'この面を離れる？');$('panel-body').append(element('p',next===index?'この面の操作を戻し、最初の配置から始めます。':'この面の途中経過は消えます。クリアした面の印は残ります。'));action('続ける',closePanel);action(next===index?'やり直す':'移動する',()=>load(next),true);
  }
  function showStages(){
    openPanel('stages','SELECT FLOOR','次は、どの階へ？');
    for(let g=0;g<3;g++){const h=element('h2',`LEVEL ${String(g+1).padStart(2,'0')}　${groups[g]}`),grid=element('div',undefined,'stage-group');for(let f=0;f<10;f++){const n=g*10+f,b=element('button',String(f+1).padStart(2,'0'),`${index===n?'current ':''}${completed.has(n)?'cleared':''}`);b.setAttribute('aria-label',`レベル${g+1} ${f+1}面${completed.has(n)?' クリア済み':''}`);if(index===n)b.setAttribute('aria-current','true');b.addEventListener('click',()=>confirmLoad(n));grid.append(b);}$('panel-body').append(h,grid);}
    $('panel-body').append(element('p','全30面を最初から選べます。記録はこのタブを閉じるまで有効です。'));action('戻る',closePanel);
  }
  function showHelp(){
    openPanel('help','HOW TO PLAY','道を作って、出口へ。');
    const items=[['↗','階段に着いたらクリア','仲間がいる面では、全員を階段まで連れていきます。'],['✣','扉は、横から押して回す','軸は動きません。回転する先に石や壁があると回せません。'],['▣','石を押して、穴を埋める','石は1個ずつ押せます。引いたり、石を回転させたりはできません。石の全体が穴に重なると沈み、道になります。'],['↶','何度でも、試せる','「1手戻す」で直前へ。「やり直す」で最初の配置へ戻れます。']];
    for(const [glyph,title,description]of items){const row=element('div',undefined,'help-item'),text=element('div');text.append(element('strong',title),element('p',description));row.append(element('span',glyph,'glyph'),text);$('panel-body').append(row);}
    $('panel-body').append(element('h2','操作'),element('p','十字キー・盤面のスワイプで移動。床をタップすると、仕掛けを押さずに歩きます。隣の石や扉をタップすると、その方向へ押します。拡大中は人物を追いかけて表示します。'),element('p','PC：方向キー / WASDで移動、Zで戻す、C / Spaceで仲間切替、Rでやり直し確認。音は最初の操作から鳴ります。'),element('p','時間制限はありません。説明・面選択を開いている間や、別タブを見ている間は時計が止まります。再読み込みすると記録は消えます。面選択から好きな面を再開できます。'));
    const details=element('details'),summary=element('summary','制作・再現について');details.append(summary,element('p','初代ゲームボーイ版「パズルボーイ」のひとりでパズル（3段階×10面）を参考にした非公式のブラウザ実装です。トライアル・通信対戦は収録していません。画像・効果音は新しく描画・合成しています。原作ROMは使用していません。'),element('p','盤面の元データ：Copyright (c) 2019, Press Play On Tape / BSD 3-Clause。原作との実機完全一致は未検証です。外部通信・広告・アクセス解析・永続保存はありません。'));
    const link=element('a','出典とライセンス','source-link');link.href='THIRD_PARTY_NOTICES.txt';link.target='_blank';link.rel='noopener noreferrer';details.append(link);$('panel-body').append(details);action('遊ぶ',closePanel,true);
  }
  function changePlayer(){stopInput();const next=E.switchPlayer(state);if(next===state)return;remember();state=next;audio.unlock();audio.restoreVolume();audio.play('switch');sync();draw();toast(`仲間 ${state.active+1} に切り替え`);}
  $('stages').addEventListener('click',showStages);$('help').addEventListener('click',showHelp);$('undo').addEventListener('click',undo);$('reset').addEventListener('click',()=>confirmLoad(index));$('switch').addEventListener('click',changePlayer);$('close-panel').addEventListener('click',closePanel);
  $('panel').addEventListener('cancel',e=>{e.preventDefault();closePanel();});$('panel').addEventListener('close',()=>{modalKind='';resumeClock();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});settleWin();});
  $('sound').addEventListener('click',()=>{const enabled=audio.toggle();audio.restoreVolume();setText('sound-label',enabled?'ON':'OFF');$('sound').setAttribute('aria-pressed',String(enabled));$('sound').setAttribute('aria-label',enabled?'効果音をオフにする':'効果音をオンにする');if(enabled)audio.play('switch');});
  $('zoom').addEventListener('click',()=>{stopInput();view.zoom=!view.zoom;$('zoom').setAttribute('aria-pressed',String(view.zoom));$('zoom').setAttribute('aria-label',view.zoom?'盤面全体を表示する':'盤面を拡大する');draw();if(view.zoom)toast('拡大表示 · 人物に合わせて移動します');});
  for(const b of document.querySelectorAll('[data-dir]')){
    b.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0||heldPointer!==null||$('panel').open)return;e.preventDefault();stopRoute();heldPointer=e.pointerId;heldButton=b;b.classList.add('is-held');b.setPointerCapture(e.pointerId);step(Number(b.dataset.dir));const id=e.pointerId;function repeat(){if(heldPointer!==id||$('panel').open)return;step(Number(b.dataset.dir));holdTimer=setTimeout(repeat,155);}holdTimer=setTimeout(repeat,320);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{if(e.pointerId===heldPointer)stopHold();});
    b.addEventListener('click',e=>{if(e.detail===0){stopInput();step(Number(b.dataset.dir));}});
  }
  const keys={ArrowUp:0,w:0,W:0,ArrowRight:1,d:1,D:1,ArrowDown:2,s:2,S:2,ArrowLeft:3,a:3,A:3};
  let lastKeyTime=0;
  document.addEventListener('keydown',e=>{
    if($('panel').open||e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
    if(e.target instanceof HTMLButtonElement&&(e.key===' '||e.key==='Enter'))return;
    if(e.key in keys){e.preventDefault();stopInput();const now=performance.now();if(!e.repeat||now-lastKeyTime>=135){step(keys[e.key]);lastKeyTime=now;}return;}
    if(e.repeat)return;
    if(e.key==='z'||e.key==='Z'){e.preventDefault();undo();}else if(e.key==='c'||e.key==='C'||e.key===' '){e.preventDefault();changePlayer();}else if(e.key==='r'||e.key==='R'){e.preventDefault();confirmLoad(index);}
  });
  const board=$('board');
  board.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0||heldPointer!==null||gesture||$('panel').open)return;stopRoute();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};board.setPointerCapture(e.pointerId);audio.unlock();});
  board.addEventListener('pointermove',e=>{if(!gesture||e.pointerId!==gesture.id)return;const dx=e.clientX-gesture.lastX,dy=e.clientY-gesture.lastY;if(Math.hypot(dx,dy)<25)return;gesture.moved=true;const direction=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0;step(direction);if(gesture){gesture.lastX=e.clientX;gesture.lastY=e.clientY;}});
  board.addEventListener('pointerup',e=>{
    if(!gesture||e.pointerId!==gesture.id)return;const was=gesture;gesture=null;if(was.moved||$('panel').open||heldPointer!==null)return;const cell=view.cellAt(e.clientX,e.clientY);if(!cell)return;
    const friend=state.players.findIndex(p=>!p.out&&p.x===cell.x&&p.y===cell.y);if(friend>=0&&friend!==state.active){const next=E.switchPlayer(state,friend);if(next!==state){remember();state=next;audio.play('switch');sync();draw();}return;}
    const p=state.players[state.active],dx=cell.x-p.x,dy=cell.y-p.y;if(Math.abs(dx)+Math.abs(dy)===1){step(dx===1?1:dx===-1?3:dy===1?2:0);return;}
    const route=E.walkPath(state,cell.x,cell.y);if(!route?.length){if(E.tile(state,cell.x,cell.y)==='~')toast('穴には入れません。石で道を作ろう');return;}
    function walk(){if(!route.length||$('panel').open)return;const d=route.shift();if(!step(d))return;if(route.length&&!state.won)routeTimer=setTimeout(walk,145);}walk();
  });
  for(const event of ['pointercancel','lostpointercapture'])board.addEventListener(event,e=>{if(gesture?.id===e.pointerId)gesture=null;});
  window.addEventListener('blur',()=>{stopInput();pauseClock();audio.muteNow();});window.addEventListener('focus',()=>{resumeClock();audio.restoreVolume();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopInput();pauseClock();audio.muteNow();}else{resumeClock();audio.restoreVolume();settleWin();}});
  new ResizeObserver(()=>draw()).observe(board);
  setInterval(()=>{if(!document.hidden)setText('timer',timeLabel(nowTime()));},500);
  sync();draw();
})();
