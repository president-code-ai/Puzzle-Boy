'use strict';
// A one-off, dependency-free QR Model 2 version 4 / medium encoder.
// All output and verification data stay in this directory.
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const outputDirectory=path.resolve(__dirname,'..','assets');
fs.mkdirSync(outputDirectory,{recursive:true});
const assert=require('node:assert/strict');
const URL='https://president-code-ai.github.io/Puzzle-Boy/';
const size=33,border=4,scale=24,side=(size+border*2)*scale;
const payload=Buffer.from(URL,'utf8'),bits=[];
function append(value,count){for(let i=count-1;i>=0;i--)bits.push((value>>>i)&1);}
append(4,4);append(payload.length,8);for(const b of payload)append(b,8);
assert.ok(bits.length<=512);append(0,Math.min(4,512-bits.length));while(bits.length%8)bits.push(0);
const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((a,b)=>(a<<1)|b,0));
for(let p=0;data.length<64;p++)data.push(p%2?0x11:0xec);
function mul(a,b){let r=0;while(b){if(b&1)r^=a;b>>>=1;a<<=1;if(a&256)a^=0x11d;}return r;}
let generator=[1],power=1;
for(let degree=0;degree<18;degree++){
  const p=new Array(generator.length+1).fill(0);
  for(let j=0;j<generator.length;j++){p[j]^=generator[j];p[j+1]^=mul(generator[j],power);}
  generator=p;power=mul(power,2);
}
function parity(block){const rem=new Array(18).fill(0);for(const b of block){const factor=b^rem.shift();rem.push(0);for(let j=0;j<18;j++)rem[j]^=mul(generator[j+1],factor);}return rem;}
const blocks=[data.slice(0,32),data.slice(32)],checks=blocks.map(parity),codewords=[];
for(let i=0;i<32;i++)for(let b=0;b<2;b++)codewords.push(blocks[b][i]);
for(let i=0;i<18;i++)for(let b=0;b<2;b++)codewords.push(checks[b][i]);
assert.equal(codewords.length,100);
const base=Array.from({length:size},()=>Array(size).fill(false));
const functional=Array.from({length:size},()=>Array(size).fill(false));
function mark(x,y,dark){if(x<0||y<0||x>=size||y>=size)return;base[y][x]=!!dark;functional[y][x]=true;}
// Timing strips, finder patterns plus white separators, and alignment pattern.
for(let i=0;i<size;i++){mark(6,i,i%2===0);mark(i,6,i%2===0);}
for(const [cx,cy] of [[3,3],[size-4,3],[3,size-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
  const distance=Math.max(Math.abs(dx),Math.abs(dy));mark(cx+dx,cy+dy,distance!==2&&distance!==4);
}
for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)mark(26+dx,26+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
function formatWord(mask){let rem=mask<<10;for(let i=14;i>=10;i--)if((rem>>>i)&1)rem^=0x537<<(i-10);return ((mask<<10)|rem)^0x5412;}
function format(matrix,mask,reserve=false){
  const word=formatWord(mask),put=(x,y,i)=>{matrix[y][x]=!!((word>>>i)&1);if(reserve)functional[y][x]=true;};
  for(let i=0;i<6;i++)put(8,i,i);put(8,7,6);put(8,8,7);put(7,8,8);for(let i=9;i<15;i++)put(14-i,8,i);
  for(let i=0;i<8;i++)put(size-1-i,8,i);for(let i=8;i<15;i++)put(8,size-15+i,i);
  matrix[size-8][8]=true;if(reserve)functional[size-8][8]=true;
}
format(base,0,true);
// The same traversal yields both module placement and later independent extraction.
const cells=[];let upward=true;
for(let right=size-1;right>0;right-=2){if(right===6)right=5;for(let vertical=0;vertical<size;vertical++){
  const y=upward?size-1-vertical:vertical;for(let col=0;col<2;col++){const x=right-col;if(!functional[y][x])cells.push([x,y]);}
}upward=!upward;}
assert.equal(cells.length,807); // 800 data/parity bits and seven remainder modules.
cells.forEach(([x,y],i)=>{base[y][x]=i<800?!!((codewords[i>>>3]>>>(7-(i&7)))&1):false;});
const masks=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(y/2)+Math.floor(x/3))%2===0,(x,y)=>(x*y)%2+(x*y)%3===0,(x,y)=>((x*y)%2+(x*y)%3)%2===0,(x,y)=>((x+y)%2+(x*y)%3)%2===0];
function penalty(m){let score=0,dark=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  if(m[y][x])dark++;if(x+1<size&&y+1<size&&m[y][x]===m[y][x+1]&&m[y][x]===m[y+1][x]&&m[y][x]===m[y+1][x+1])score+=3;
}
for(let direction=0;direction<2;direction++)for(let a=0;a<size;a++){
  const row=Array.from({length:size},(_,b)=>direction?m[b][a]:m[a][b]);let run=1;
  for(let b=1;b<=size;b++){if(b<size&&row[b]===row[b-1])run++;else{if(run>=5)score+=run-2;run=1;}}
  const line=row.map(Number).join('');for(let b=0;b<=size-11;b++){const p=line.slice(b,b+11);if(p==='00001011101'||p==='10111010000')score+=40;}
}return score+Math.floor(Math.abs(100*dark/(size*size)-50)/5)*10;}
let matrix,mask,lowest=Infinity;
for(let k=0;k<8;k++){const m=base.map(row=>row.slice());for(const [x,y] of cells)if(masks[k](x,y))m[y][x]=!m[y][x];format(m,k);const cost=penalty(m);if(cost<lowest){lowest=cost;matrix=m;mask=k;}}
// SVG is script-free and contains a four-module white quiet zone.
const commands=[];for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(matrix[y][x])commands.push(`M${x+border},${y+border}h1v1h-1z`);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${size+border*2} ${size+border*2}" shape-rendering="crispEdges" role="img" aria-label="Puzzle-Boy QR code"><title>Puzzle-Boy</title><desc>${URL}</desc><rect width="100%" height="100%" fill="#fff"/><path d="${commands.join('')}" fill="#000"/></svg>\n`;
const raw=Buffer.alloc(side*(side*3+1),255);for(let y=0;y<side;y++){
  const offset=y*(side*3+1);raw[offset]=0;
  for(let x=0;x<side;x++){const mx=Math.floor(x/scale)-border,my=Math.floor(y/scale)-border;if(mx>=0&&my>=0&&mx<size&&my<size&&matrix[my][mx])raw.fill(0,offset+1+x*3,offset+1+x*3+3);}
}
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc(buffer){let c=0xffffffff;for(const b of buffer)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,value){const name=Buffer.from(type),header=Buffer.alloc(4),tail=Buffer.alloc(4);header.writeUInt32BE(value.length);tail.writeUInt32BE(crc(Buffer.concat([name,value])));return Buffer.concat([header,name,value,tail]);}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(side,0);ihdr.writeUInt32BE(side,4);ihdr[8]=8;ihdr[9]=2;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
const pngPath=path.join(outputDirectory,'Puzzle-Boy-QR.png'),svgPath=path.join(outputDirectory,'Puzzle-Boy-QR.svg');
for(const target of [pngPath,svgPath])assert.ok(!fs.existsSync(target),`Refusing to overwrite ${target}`);
fs.writeFileSync(pngPath,png);fs.writeFileSync(svgPath,svg);
// Re-read the PNG, check every chunk CRC, decompress its pixels, then decode
// the payload and check the Reed-Solomon syndromes of both extracted blocks.
const image=fs.readFileSync(pngPath),compressed=[];let position=8;
while(position<image.length){const length=image.readUInt32BE(position),type=image.toString('ascii',position+4,position+8),content=image.subarray(position+8,position+8+length);assert.equal(crc(image.subarray(position+4,position+8+length)),image.readUInt32BE(position+8+length));if(type==='IDAT')compressed.push(content);position+=length+12;}
const pixels=zlib.inflateSync(Buffer.concat(compressed));assert.equal(pixels.length,raw.length);
function pixelModule(x,y){const px=(x+border)*scale+scale/2,py=(y+border)*scale+scale/2;return pixels[py*(side*3+1)+1+px*3]===0;}
for(let y=-border;y<size+border;y++)for(let x=-border;x<size+border;x++)if(x<0||y<0||x>=size||y>=size)assert.equal(pixelModule(x,y),false);
let readFormat=0;for(let i=0;i<8;i++)if(pixelModule(size-1-i,8))readFormat|=1<<i;for(let i=8;i<15;i++)if(pixelModule(8,size-15+i))readFormat|=1<<i;
assert.equal(readFormat,formatWord(mask));assert.equal(((readFormat^0x5412)>>>13)&3,0);
const extracted=[];for(let i=0;i<800;i+=8){let b=0;for(let k=0;k<8;k++){const [x,y]=cells[i+k];b=(b<<1)|Number(pixelModule(x,y)!==masks[mask](x,y));}extracted.push(b);}
const extractedBlocks=[[],[]];for(let i=0;i<extracted.length;i++)extractedBlocks[i%2].push(extracted[i]);
for(const block of extractedBlocks)for(let i=0,a=1;i<18;i++,a=mul(a,2)){let syndrome=0;for(const b of block)syndrome=mul(syndrome,a)^b;assert.equal(syndrome,0,'Error correction syndrome must be zero');}
const recovered=Buffer.from([...extractedBlocks[0].slice(0,32),...extractedBlocks[1].slice(0,32)]);let bit=0;
function take(n){let v=0;for(let i=0;i<n;i++,bit++)v=(v<<1)|((recovered[bit>>>3]>>>(7-(bit&7)))&1);return v;}
assert.equal(take(4),4);const count=take(8),urlBytes=[];for(let i=0;i<count;i++)urlBytes.push(take(8));const decoded=Buffer.from(urlBytes).toString('utf8');assert.equal(decoded,URL);
const result={url:URL,png:path.basename(pngPath),svg:path.basename(svgPath),width:side,height:side,version:4,errorCorrection:'M',mask,quietZoneModules:4,decodedFromPng:decoded,pngCrc:'pass',reedSolomonSyndromes:'pass'};
fs.writeFileSync(path.join(outputDirectory,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
