(function(root){
  'use strict';
  // Original short effects, synthesized locally. No audio files or network.
  class Effects {
    constructor(){this.enabled=true;this.context=null;this.master=null;this.last=0;}
    unlock(){
      if(!this.enabled)return;
      try{
        const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return;
        if(!this.context){this.context=new Audio();this.master=this.context.createGain();this.master.gain.value=.24;this.master.connect(this.context.destination);}
        if(this.context.state==='suspended')this.context.resume().catch(()=>{});
      }catch{this.enabled=false;}
    }
    toggle(){this.enabled=!this.enabled;if(this.enabled)this.unlock();else if(this.master&&this.context)this.master.gain.cancelScheduledValues(this.context.currentTime);return this.enabled;}
    tone(frequency,start,duration,type='sine',volume=.18,end=frequency){
      const a=this.context;if(!a||a.state!=='running'||!this.enabled)return;
      const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+start;
      o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
      o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    play(event){
      if(!this.enabled||!this.context||this.context.state!=='running')return;
      const t=this.context.currentTime;if(t-this.last<.035&&event!=='win')return;this.last=t;
      switch(event){
        case 'walk':this.tone(240,0,.045,'sine',.1,170);break;
        case 'blocked':this.tone(110,0,.06,'triangle',.07,82);break;
        case 'push':this.tone(160,0,.11,'triangle',.2,65);this.tone(60,0,.12,'sine',.18);break;
        case 'rotate':this.tone(420,0,.14,'triangle',.12,720);this.tone(960,.08,.07,'sine',.12);break;
        case 'sink':this.tone(260,0,.24,'triangle',.2,45);this.tone(520,.13,.18,'sine',.12,1040);break;
        case 'undo':this.tone(650,0,.12,'sine',.14,330);break;
        case 'switch':this.tone(523,0,.065,'sine',.15);this.tone(784,.055,.1,'sine',.13);break;
        case 'exit':this.tone(659,0,.12);this.tone(988,.09,.2);break;
        case 'win':[523.25,659.25,783.99,1046.5].forEach((f,i)=>{this.tone(f,i*.11,.4,'sine',.19);this.tone(f/2,i*.11,.3,'triangle',.07);});break;
      }
    }
    muteNow(){if(this.context&&this.master)this.master.gain.setValueAtTime(0,this.context.currentTime);}
    restoreVolume(){if(this.context&&this.master)this.master.gain.setValueAtTime(this.enabled?.24:0,this.context.currentTime);}
  }
  root.PuzzleEffects=Effects;
})(globalThis);
