"use strict";
/* ================= 3D renderer + minimap ================= */
const cv=$('#cv');
const R3={zoom:1,mark:{},chars:new Map(),ok:false,doors:[[],[],[]],fx:{}};
const KH={rack:1.95,san:1.95,tape:1.95,backup:1.95,switch:1.95,firewall:1.95,router:1.95,proxy:1.95,lb:1.95,ids:1.95,patch:1.6,ups:1.6,crac:1.95,gen:1.5,fuel:.9,ats:1.7,elec:1.8,trafo:1.4,batt:.95,suppression:1.5,leak:1.3,gas:1.4,facp:1.5,pa:1.6,nvr:1.5,access:.78,bms:.78,cctv:1.9,video:2.2,console:.78,desk:.78,mydesk:.78,siem:.78,pam:.78,edr:.78,kiosk:1.2,reader:1.3,parts:1.8,tools:1.6,shutter:2.2,crates:.9,pantry:.95,stairs:.1,vesda:1.2,kvm:1.1,bypass:1.6};
const MATS={};
function std(c,r=.75,m=.05,e){const k=c+r+m+(e||'');return MATS[k]||(MATS[k]=new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,emissive:e||'#000000'}))}
const basic=c=>MATS['b'+c]||(MATS['b'+c]=new THREE.MeshBasicMaterial({color:c}));
const TEX={};
function cnv(w,h,fn,key){if(key&&TEX[key])return TEX[key];const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.anisotropy=4;if(key)TEX[key]=t;return t}
function lighten(hex,a){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;r=Math.round(r+(255-r)*a);g=Math.round(g+(255-g)*a);b=Math.round(b+(255-b)*a);return`rgb(${r},${g},${b})`}
function textSprite(txt,o={}){const size=o.size||30,col=o.color||'#fff',bg=o.bg||'rgba(8,12,20,.75)',hh=o.h||.34;
  const c=document.createElement('canvas'),x=c.getContext('2d');x.font=`700 ${size}px system-ui,sans-serif`;const w=Math.ceil(x.measureText(txt).width)+24;c.width=w;c.height=size+16;
  x.font=`700 ${size}px system-ui,sans-serif`;x.fillStyle=bg;const r=10;x.beginPath();x.moveTo(r,0);x.arcTo(w,0,w,c.height,r);x.arcTo(w,c.height,0,c.height,r);x.arcTo(0,c.height,0,0,r);x.arcTo(0,0,w,0,r);x.fill();
  if(o.border){x.strokeStyle=o.border;x.lineWidth=3;x.stroke()}
  x.fillStyle=col;x.textBaseline='middle';x.fillText(txt,12,c.height/2+1);const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(hh*w/c.height,hh,1);s.renderOrder=20;return s}

/* ---------- procedural textures ---------- */
function rackFace(seed,hot){return cnv(64,128,(x,w,h)=>{x.fillStyle='#16191f';x.fillRect(0,0,w,h);x.fillStyle='#0d0f13';for(let yy=6;yy<h-6;yy+=4)for(let xx=6;xx<w-6;xx+=4)x.fillRect(xx,yy,2,2);
  x.strokeStyle='#4a525f';x.lineWidth=3;x.strokeRect(2,2,w-4,h-4);x.fillStyle='#8a929e';x.fillRect(w-9,h/2-10,3,20);
  const g=RNG(seed);for(let i=0;i<12;i++){const y=9+i*9.4;for(let k=0;k<3;k++){x.fillStyle=hot&&i<5?'#ff3030':g()<.72?'#3dff9a':'#0f4f33';x.fillRect(9+k*5,y,3,2)}if(g()<.35){x.fillStyle='#4fb0ff';x.fillRect(40,y,3,2)}}},'rack'+seed+hot)}
function netFace(){return cnv(128,128,(x,w,h)=>{x.fillStyle='#1a1d23';x.fillRect(0,0,w,h);for(let u=0;u<8;u++){const y=6+u*15;x.fillStyle=u%3===0?'#2b3340':'#22272f';x.fillRect(5,y,w-10,12);
  for(let p=0;p<12;p++){x.fillStyle='#0a0b0d';x.fillRect(10+p*8,y+3,6,5);x.fillStyle=Math.random()<.7?'#3dff9a':'#ffb020';x.fillRect(11+p*8,y+1,2,1.5)}x.fillStyle='#4fb0ff';x.fillRect(w-16,y+4,4,3)}},'net')}
function storFace(){return cnv(128,128,(x,w,h)=>{x.fillStyle='#1c1f26';x.fillRect(0,0,w,h);for(let r=0;r<6;r++)for(let c=0;c<6;c++){const X=6+c*20,Y=6+r*20;x.fillStyle='#2e3440';x.fillRect(X,Y,17,17);x.fillStyle=Math.random()<.85?'#3dff9a':'#ffb020';x.fillRect(X+2,Y+13,3,2);x.fillStyle='#4fb0ff';x.fillRect(X+7,Y+13,3,2)}},'stor')}
function panelFace(col,key){return cnv(128,128,(x,w,h)=>{x.fillStyle=col;x.fillRect(0,0,w,h);x.strokeStyle='rgba(0,0,0,.45)';x.lineWidth=3;x.strokeRect(4,4,w/2-6,h-8);x.strokeRect(w/2+2,4,w/2-6,h-8);
  x.fillStyle='#222';x.fillRect(w/2-10,h/2-8,4,16);x.fillRect(w/2+6,h/2-8,4,16);['#3dff6a','#ffcf33','#ff4040'].forEach((c,i)=>{x.fillStyle=c;x.beginPath();x.arc(20+i*14,22,4,0,7);x.fill()});
  x.fillStyle='#e8e8e8';x.fillRect(74,16,40,14);x.fillStyle='#111';x.fillRect(16,42,36,22);x.fillStyle='#53c7ff';x.fillRect(18,44,32,18)},'panel'+key)}
function upsFace(){return cnv(128,128,(x,w,h)=>{x.fillStyle='#d9dde3';x.fillRect(0,0,w,h);x.fillStyle='#1d2430';x.fillRect(30,14,68,30);x.fillStyle='#3dff9a';x.font='bold 11px monospace';x.fillText('ONLINE',38,28);x.fillText('LOAD 48%',38,40);
  x.fillStyle='#9aa2ad';for(let i=0;i<9;i++)x.fillRect(14,58+i*7,w-28,3)},'ups')}
function cracFace(){return cnv(64,128,(x,w,h)=>{x.fillStyle='#e6e8eb';x.fillRect(0,0,w,h);x.fillStyle='#8a939e';for(let i=0;i<22;i++)x.fillRect(6,24+i*4.5,w-12,2);x.fillStyle='#1d2430';x.fillRect(12,6,40,12);x.fillStyle='#53c7ff';x.fillRect(14,8,14,8)},'crac')}
function genFace(){return cnv(128,128,(x,w,h)=>{x.fillStyle='#d8b23a';x.fillRect(0,0,w,h);x.fillStyle='#4a4a4a';for(let i=0;i<14;i++)x.fillRect(10,10+i*8,60,4);x.fillStyle='#222';x.fillRect(82,14,36,40);x.fillStyle='#3dff9a';x.fillRect(86,18,10,6)},'gen')}
function battFace(){return cnv(128,32,(x,w,h)=>{x.fillStyle='#2b2b2b';x.fillRect(0,0,w,h);for(let i=0;i<8;i++){x.fillStyle='#3b3f46';x.fillRect(3+i*16,4,13,24);x.fillStyle='#c33';x.fillRect(5+i*16,6,3,3);x.fillStyle='#333';x.fillRect(10+i*16,6,3,3)}},'batt')}
function shutterFace(){return cnv(64,128,(x,w,h)=>{x.fillStyle='#8c949e';x.fillRect(0,0,w,h);x.fillStyle='#6c747e';for(let i=0;i<32;i++)x.fillRect(0,i*4,w,1.5);x.fillStyle='#e0b020';for(let i=0;i<8;i++){x.save();x.translate(i*8,h-10);x.rotate(.6);x.fillRect(0,0,4,14);x.restore()}},'shutter')}
function screenTex(kind){return cnv(512,96,(x,w,h)=>{x.fillStyle='#030810';x.fillRect(0,0,w,h);const n=kind==='video'?9:kind==='cctv'?8:3,cw=w/n;
  for(let i=0;i<n;i++){const X=i*cw+3;if(kind==='cctv'){x.fillStyle=['#34404c','#2b3640','#3c4650'][i%3];x.fillRect(X,4,cw-6,h-8);x.fillStyle='#55606c';x.fillRect(X+8,h-30,cw-30,14);x.fillStyle='#fff';x.font='10px monospace';x.fillText('CAM '+pad(i+1),X+4,14);continue}
   const base=kind==='siem'?['#2a103d','#3d1020','#1a1a3d']:kind==='edr'?['#3d1020','#102a3d','#2a103d']:kind==='pam'?['#0f3330','#102a3d','#0f3330']:['#0f2b55','#0f3d27','#3d2d0a'];x.fillStyle=base[i%3];x.fillRect(X,4,cw-6,h-8);
   x.strokeStyle=kind==='siem'||kind==='edr'?'#ff6b8a':'#6ad1ff';x.lineWidth=2;x.beginPath();for(let k=0;k<10;k++){const px=X+6+k*(cw-18)/9,py=h-12-Math.abs(Math.sin(i*3+k*1.3))*(h-30);k?x.lineTo(px,py):x.moveTo(px,py)}x.stroke();
   x.fillStyle='#ffffffcc';x.font='bold 11px system-ui';x.fillText(kind==='siem'?['ALERTS','EVENTS/s','TOP IPs'][i%3]:kind==='edr'?['DETECTIONS','HOSTS','ISOLATED'][i%3]:kind==='pam'?['SESSIONS','VAULT','REQUESTS'][i%3]:['POWER','COOLING','NETWORK','SECURITY','SLA','TICKETS','UPS','WAN','PUE'][i%9],X+6,18)}},'scr'+kind)}
function floorTex(f){const P=32;return cnv(COLS*P,ROWS*P,(x)=>{const g=RNG(77+f);
  for(let y=0;y<ROWS;y++)for(let X=0;X<COLS;X++){const v=GRID[f][y][X],z=ZONE[f][y][X];const room=z>=0?ROOMS[f][z]:null;const n=room?room.n:'';
    x.fillStyle=v===1?'#1a1f27':v===2?'#8a93a3':room?room.c:CORRIDOR;x.fillRect(X*P,y*P,P,P);
    if(n==='Server Hall'){x.fillStyle='#737a83';x.fillRect(X*P+1,y*P+1,P-2,P-2);if([16,19,22].includes(y)&&X>=4&&X<=33){x.fillStyle='#5c656e';for(let i=0;i<5;i++)for(let j=0;j<5;j++)x.fillRect(X*P+5+i*5,y*P+5+j*5,2,2)}}
    else if(n==='Main Lobby'){x.fillStyle=(X+y)%2?'#948b7b':'#877e6f';x.fillRect(X*P,y*P,P,P);x.strokeStyle='rgba(255,255,255,.12)';x.beginPath();x.moveTo(X*P+g()*P,y*P);x.lineTo(X*P+g()*P,y*P+P);x.stroke()}
    else if(/Office|Cabin|NOC|SOC/.test(n)){for(let i=0;i<14;i++){x.fillStyle=`rgba(${g()<.5?255:0},${g()<.5?255:0},255,.04)`;x.fillRect(X*P+g()*P,y*P+g()*P,3,3)}}
    else if(/Yard|Dock|Storage|Electrical/.test(n)){for(let i=0;i<8;i++){x.fillStyle='rgba(0,0,0,.08)';x.fillRect(X*P+g()*P,y*P+g()*P,2,2)}}
    else if(!room&&v===0){x.fillStyle='rgba(255,255,255,.05)';x.fillRect(X*P,y*P,P,1);x.fillRect(X*P,y*P,1,P)}}
  if(f===0){x.fillStyle='#e0b020';[[27,14,12,1],[27,23,12,1]].forEach(([a,b,c,d])=>x.fillRect(a*P,b*P+P/2-3,c*P,6));for(let i=0;i<6;i++){x.fillStyle=i%2?'#222':'#e0b020';x.fillRect((38)*P,(18+i*.33)*P,P,P*.33)}}
  x.textAlign='center';x.textBaseline='middle';x.font='800 24px system-ui,sans-serif';x.fillStyle='rgba(255,255,255,.28)';
  ROOMS[f].forEach(r=>{if(r===STAIRS)return;x.fillText(r.n.split(' —')[0].toUpperCase(),(r.x+r.w/2)*P,(r.y+r.h-1.5)*P)});
  if(f===1){x.fillStyle='rgba(60,140,255,.55)';x.font='700 14px system-ui';[16,19,22].forEach(y=>x.fillText('❄ COLD AISLE',19.5*P,y*P+P/2))}},'floor'+f)}
function groundTex(){return cnv(1024,1024,(x,w,h)=>{x.fillStyle='#2c4527';x.fillRect(0,0,w,h);const g=RNG(5);for(let i=0;i<5000;i++){x.fillStyle=`rgba(${g()<.5?80:20},${100+g()*60|0},${30+g()*30|0},.25)`;x.fillRect(g()*w,g()*h,3,3)}
  // roads (world coords: building 40x25 placed at 40..80 / 37.5..62.5 of a 120x100 plane) → scale 1024/120 & 1024/100
  const sx=w/120,sy=h/100;x.fillStyle='#2f3236';x.fillRect(0,(62.5+5)*sy,w,9*sy);x.fillRect((80+6)*sx,0,8*sx,h);
  x.fillStyle='#d8d8d8';for(let i=0;i<w;i+=40)x.fillRect(i,(62.5+9.3)*sy,22,3);for(let i=0;i<h;i+=40)x.fillRect((80+9.8)*sx,i,3,22);
  x.fillStyle='#4a4d52';x.fillRect(40*sx,62.5*sy,40*sx,5*sy);x.fillStyle='#d8d8d8';for(let i=0;i<10;i++)x.fillRect((44+i*3.5)*sx,63*sy,2,4*sy);
  x.fillStyle='#4a4d52';x.fillRect(80*sx,(37.5+17)*sy,6*sx,8*sy)},'ground')}

/* ---------- builders ---------- */
function box(w,h,d,m){const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.castShadow=b.receiveShadow=true;return b}
function faced(w,h,d,base,front){const b=std(base,.6,.25);return box(w,h,d,[b,b,std(lighten(base,.08),.6,.25),b,front,front])}
const faceMat=t=>new THREE.MeshStandardMaterial({map:t,roughness:.55,metalness:.3,emissive:'#ffffff',emissiveMap:t,emissiveIntensity:.32});
function desk(g,W,D,h,kind,scrKind){const top=box(W,.06,D,std('#a89e8e',.8));top.position.y=h;g.add(top);const leg=box(W-.15,h,.05,std('#3a3d44',.5,.5));leg.position.set(0,h/2,-D/2+.1);g.add(leg);
  const n=Math.max(1,Math.round(W/1.3));const sm=scrKind?new THREE.MeshBasicMaterial({map:screenTex(scrKind)}):basic(kind==='console'?'#2d6fd6':'#3a8fd1');
  for(let i=0;i<n;i++){const X=-W/2+(i+.5)*W/n;const mon=box(.55,.34,.04,[std('#111'),std('#111'),std('#111'),std('#111'),sm,std('#111')]);mon.position.set(X,h+.3,D/2-.3);g.add(mon);const st_=box(.05,.14,.05,std('#222'));st_.position.set(X,h+.08,D/2-.3);g.add(st_);
    const kb=box(.4,.02,.14,std('#2a2a2a'));kb.position.set(X,h+.04,D/2-.05);g.add(kb);
    const ch_=chair();ch_.position.set(X,0,D/2+.45);ch_.rotation.y=Math.PI;g.add(ch_);
    if(D>1.2){const m2=mon.clone();m2.rotation.y=Math.PI;m2.position.z=-D/2+.3;g.add(m2);const c2=chair();c2.position.set(X,0,-D/2-.45);g.add(c2)}}}
function chair(){const g=new THREE.Group();const m=std('#22262d',.6);const seat=box(.42,.07,.42,m);seat.position.y=.45;g.add(seat);const back=box(.42,.45,.06,m);back.position.set(0,.72,-.2);g.add(back);const post=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.42,6),std('#666',.4,.8));post.position.y=.22;g.add(post);const base=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.03,10),std('#333'));base.position.y=.03;g.add(base);return g}
function buildEntity(e){const g=new THREE.Group(),h=KH[e.kind]||1.2,W=e.w-.08,D=e.h-.08,K=e.kind;g.position.set(e.x+e.w/2,0,e.y+e.h/2);let m;
  const cab=(front,base='#2a2f38')=>{m=faced(W,h,D,base,front);m.position.y=h/2;g.add(m);return m};
  switch(K){
  case'rack':{m=cab(R3.rackMat[(e.x*7+e.y)%4]);e._mesh=m;m.material=m.material.slice();break}
  case'san':case'tape':case'backup':cab(faceMat(storFace()));break;
  case'switch':case'firewall':case'router':case'proxy':case'lb':case'ids':case'patch':cab(faceMat(netFace()));
    {const t=textSprite({switch:'CORE SW',firewall:'NGFW',router:'ROUTER',proxy:'PROXY',lb:'LB',ids:'IPS',patch:'FIBER'}[K],{size:22,h:.18,bg:'rgba(0,0,0,0)',color:'#9fe8ff'});t.position.set(0,h+.08,0);g.add(t)}break;
  case'ups':cab(faceMat(upsFace()),'#c9ced6');break;
  case'crac':cab(faceMat(cracFace()),'#dfe2e6');break;
  case'gen':{const b=faced(W,h,D,'#d8b23a',faceMat(genFace()));b.position.y=h/2;g.add(b);const ex=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,1,10),std('#444',.4,.8));ex.position.set(W/2-.35,h+.5,-D/2+.35);ex.castShadow=true;g.add(ex);break}
  case'fuel':{const t=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,W,18),std('#c9c9c9',.4,.6));t.rotation.z=Math.PI/2;t.position.y=.55;t.castShadow=true;g.add(t);break}
  case'trafo':{const b=box(W*.7,h,D*.7,std('#596b5a',.5,.4));b.position.y=h/2;g.add(b);for(let i=0;i<6;i++){const f=box(.05,h*.8,D*.85,std('#4b5c4c',.5,.4));f.position.set(-W/2+.1+i*(W-.2)/5,h*.45,0);g.add(f)}break}
  case'batt':{const b=faced(W,h,D,'#2b2b2b',faceMat(battFace()));b.position.y=h/2;g.add(b);break}
  case'gas':{for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,1.2,14),std('#c0262b',.35,.3));c.position.set(-W/2+.45+i*(W-.9)/2,.6,0);c.castShadow=true;g.add(c);const t=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8,0,6.3,0,1.57),std('#c0262b',.35,.3));t.position.set(c.position.x,1.2,0);g.add(t)}break}
  case'elec':case'ats':case'bypass':cab(faceMat(panelFace('#bfc5cc','g')),'#bfc5cc');break;
  case'facp':case'suppression':cab(faceMat(panelFace('#b52a2a','r')),'#b52a2a');break;
  case'leak':case'pa':case'nvr':cab(faceMat(panelFace(K==='leak'?'#2f6aa3':'#3a3f48','k'+K)),K==='leak'?'#2f6aa3':'#3a3f48');break;
  case'parts':case'tools':{const b=faced(W,h,D,'#5d636c',faceMat(panelFace('#5d636c','p')));b.position.y=h/2;g.add(b);break}
  case'shutter':cab(faceMat(shutterFace()),'#8c949e');break;
  case'stairs':{for(let i=0;i<6;i++){const s=box(W,.12+i*.2,D/6,std(i%2?'#7a808a':'#6d737d'));s.position.set(0,(.12+i*.2)/2,-D/2+D/12+i*D/6);g.add(s)}const rail=box(.05,.9,D,std('#bbb',.3,.8));rail.position.set(W/2,.9,0);g.add(rail);break}
  case'desk':case'mydesk':case'console':desk(g,W,D,h,K,K==='console'?'video':null);break;
  case'access':case'bms':desk(g,W,D,h,K,K==='bms'?'video':'cctv');break;
  case'siem':case'pam':case'edr':desk(g,W,D,h,K,K);break;
  case'video':case'cctv':{const sm=new THREE.MeshBasicMaterial({map:screenTex(K)});const s=box(W,h-.6,.14,[std('#111'),std('#111'),std('#111'),std('#111'),sm,std('#111')]);s.position.set(0,.6+(h-.6)/2,-D/2+.08);g.add(s);break}
  case'kiosk':{const p=box(.4,1,.3,std('#e0e0e0',.4));p.position.y=.5;g.add(p);const s=box(.45,.32,.05,[std('#111'),std('#111'),std('#111'),std('#111'),basic('#3a8fd1'),std('#111')]);s.position.set(0,1.12,.05);s.rotation.x=-.4;g.add(s);break}
  case'reader':{const p=box(.25,1.2,.25,std('#333',.4,.6));p.position.y=.6;g.add(p);const s=box(.2,.25,.02,basic('#4fd1ff'));s.position.set(0,1.05,.14);g.add(s);break}
  case'crates':[[-.8,.45,-.7,.9],[.3,.4,.2,.8],[-.6,.35,.8,.7],[.8,.3,-.8,.6]].forEach(([x,yh,z,s],i)=>{const b=box(s,yh*2,s,std(['#8a6a3e','#9a7746','#7a5c34'][i%3],.9));b.position.set(x,yh,z);g.add(b)});break;
  case'pantry':{const b=box(W,h,D,std('#7a6046',.7));b.position.y=h/2;g.add(b);const t=box(W,.05,D,std('#9a9a9a',.6));t.position.y=h;g.add(t);const cm=box(.4,.45,.35,std('#222',.4,.6));cm.position.set(W/2-.5,h+.22,0);g.add(cm);break}
  case'vesda':{const b=box(.6,.5,.25,std('#e0e0e0',.5));b.position.set(0,1.2,-.2);g.add(b);const s=box(.3,.12,.01,basic('#3dff6a'));s.position.set(0,1.25,-.07);g.add(s);const p=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.5,6),std('#c33'));p.position.set(0,2,-.25);g.add(p);break}
  case'kvm':{const c=box(.6,.9,.5,std('#444',.5,.5));c.position.y=.45;g.add(c);const s=box(.5,.32,.04,basic('#3a8fd1'));s.position.set(0,1.1,0);g.add(s);break}
  default:cab(std('#666'),'#666')}
  if(!['rack','stairs'].includes(K)&&!/^Desk Cluster/.test(e.label)){const s=textSprite(e.label,{size:24,h:.27});s.position.set(0,h+.5,0);g.add(s)}
  return g}
function plant(){const g=new THREE.Group();const pot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.17,.4,12),std('#8a5a3a',.8));pot.position.y=.2;pot.castShadow=true;g.add(pot);
  for(let i=0;i<5;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),std(['#2f7a3a','#3a8a45','#286a33'][i%3],.8));l.position.set(Math.sin(i*1.3)*.12,.6+i*.12,Math.cos(i*1.3)*.12);l.castShadow=true;g.add(l)}return g}
function tree(){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(.15,.2,1.4,8),std('#5a3d26'));t.position.y=.7;t.castShadow=true;g.add(t);
  [[0,1.9,1.1],[0,2.7,.8],[0,3.3,.5]].forEach(([x,y,r])=>{const c=new THREE.Mesh(new THREE.ConeGeometry(r,1.2,10),std('#2e6b34',.85));c.position.y=y;c.castShadow=true;g.add(c)});return g}

/* ---------- reception brand wall (client logos in /assets) ---------- */
const BRAND_LOGOS=[{src:'assets/logo-powergrid.jpg',x:4.8,w:2.67},{src:'assets/logo-powertel.jpg',x:11.4,w:3.16}];
function addBrandWall(){const g=new THREE.Group(),h=1.5,y=1.2;
  const back=box(12.6,2.4,.12,std('#262b35',.6,.2));back.position.set(8,1.2,14.07);g.add(back);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(12.6,.05,.05),basic('#fff3d6'));strip.position.set(8,2.38,14.16);g.add(strip);
  const ld=new THREE.TextureLoader();
  BRAND_LOGOS.forEach(L=>{const frame=box(L.w+.16,h+.16,.06,std('#c9ced6',.3,.7));frame.position.set(L.x,y,14.15);g.add(frame);
    const mat=new THREE.MeshBasicMaterial({color:'#e6e6e6'});const pl=new THREE.Mesh(new THREE.PlaneGeometry(L.w,h),mat);pl.position.set(L.x,y,14.19);g.add(pl);
    ld.load(L.src,t=>{t.anisotropy=8;mat.map=t;mat.needsUpdate=true},undefined,()=>{g.remove(frame);g.remove(pl)})});
  R3.floors[0].add(g)}
function init3d(){
  if(!window.THREE){$('#cvwrap').insertAdjacentHTML('beforeend','<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#f99">3D engine failed to load. Check your connection and reload.</div>');return}
  const hi=SAVE.gfx!=='low';
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:true});r.setPixelRatio(Math.min(hi?2:1,window.devicePixelRatio||1));R3.r=r;
  r.shadowMap.enabled=hi;r.shadowMap.type=THREE.PCFSoftShadowMap;
  const sc=new THREE.Scene();sc.background=new THREE.Color('#0a1018');sc.fog=new THREE.Fog('#0a1018',38,75);R3.sc=sc;
  R3.cam=new THREE.PerspectiveCamera(42,1.6,.1,250);
  sc.add(new THREE.HemisphereLight('#dfe8ff','#30343c',.62));
  const dl=new THREE.DirectionalLight('#fff4e6',.7);dl.position.set(-8,22,10);dl.castShadow=hi;dl.shadow.mapSize.set(2048,2048);const sc_=dl.shadow.camera;sc_.left=-16;sc_.right=16;sc_.top=16;sc_.bottom=-16;sc_.near=1;sc_.far=60;dl.shadow.bias=-.0005;sc.add(dl);sc.add(dl.target);R3.dl=dl;
  R3.alarm=[0,1,2].map(()=>{const l=new THREE.PointLight('#ff2a2a',0,6,2);sc.add(l);return l});
  R3.rackMat=[0,1,2,3].map(i=>faceMat(rackFace(i*99+5,false)));R3.hotRack=faceMat(rackFace(7,true));R3.hotRack.emissive=new THREE.Color('#ff3030');
  // exterior
  const ext=new THREE.Group();const gp=new THREE.Mesh(new THREE.PlaneGeometry(120,100),new THREE.MeshStandardMaterial({map:groundTex(),roughness:1}));gp.rotation.x=-Math.PI/2;gp.position.set(COLS/2,-.03,ROWS/2);gp.receiveShadow=true;ext.add(gp);
  const tg=RNG(9);for(let i=0;i<40;i++){let x,z;do{x=-20+tg()*80;z=-18+tg()*60}while(x>-3&&x<43&&z>-3&&z<36||x>45&&x<55||z>29&&z<40);const t=tree();t.position.set(x,0,z);t.scale.setScalar(.8+tg()*.6);ext.add(t)}
  for(let i=0;i<6;i++){const car=new THREE.Group();const b=box(1.8,.55,.9,std(['#b33','#36c','#ddd','#333','#c93','#3a6'][i],.35,.6));b.position.y=.4;car.add(b);const tp=box(1,.4,.8,std('#223',.2,.6));tp.position.set(-.1,.85,0);car.add(tp);car.position.set(4.5+i*3.5,0,27.3);car.rotation.y=Math.PI/2;ext.add(car)}
  sc.add(ext);R3.ext=ext;
  R3.floors=[];const wallM=[std('#a9afb8',.9),std('#a9afb8',.9),std('#4a5160',.7),std('#a9afb8',.9),std('#9aa0aa',.9),std('#9aa0aa',.9)];
  const glass=new THREE.MeshStandardMaterial({color:'#9fd8ff',transparent:true,opacity:.28,roughness:.05,metalness:.2,depthWrite:false});
  for(let f=0;f<3;f++){const grp=new THREE.Group();
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(COLS,ROWS),new THREE.MeshStandardMaterial({map:floorTex(f),roughness:.92,metalness:0}));pl.rotation.x=-Math.PI/2;pl.position.set(COLS/2,0,ROWS/2);pl.receiveShadow=true;grp.add(pl);
    const walls=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(GRID[f][y][x]===1)walls.push([x,y]);
    const im=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1.2,1),wallM,walls.length);im.castShadow=im.receiveShadow=true;const o=new THREE.Object3D();
    walls.forEach(([x,y],i)=>{o.position.set(x+.5,.6,y+.5);o.updateMatrix();im.setMatrixAt(i,o.matrix)});grp.add(im);
    // sliding glass doors
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(GRID[f][y][x]===2){const horiz=(GRID[f][y][x-1]===1||GRID[f][y][x+1]===1)||(GRID[f][y][x-1]===2||GRID[f][y][x+1]===2);
      const d={x:x+.5,y:y+.5,h:horiz,o:0,p:[]};for(let s=0;s<2;s++){const p=new THREE.Mesh(new THREE.BoxGeometry(horiz?.5:.06,1.15,horiz?.06:.5),glass);p.position.set(x+.5,.6,y+.5);grp.add(p);const fr=new THREE.Mesh(new THREE.BoxGeometry(horiz?.5:.07,.06,horiz?.07:.5),std('#555',.3,.8));fr.position.y=.55;p.add(fr);d.p.push(p)}R3.doors[f].push(d)}
    ENT.filter(e=>e.f===f).forEach(e=>grp.add(buildEntity(e)));
    DECOR.filter(d=>d.f===f).forEach(d=>{const p=plant();p.position.set(d.x+.5,0,d.y+.5);grp.add(p)});
    grp.visible=false;sc.add(grp);R3.floors.push(grp)}
  addBrandWall();
  // nav arrow + beacon
  const cone=new THREE.Mesh(new THREE.ConeGeometry(.17,.45,14),basic('#f5a524'));cone.rotation.z=-Math.PI/2;R3.arrow=new THREE.Group();R3.arrow.add(cone);sc.add(R3.arrow);
  R3.beacon=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,8,24,1,true),new THREE.MeshBasicMaterial({color:'#f5a524',transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));sc.add(R3.beacon);
  R3.ring=new THREE.Mesh(new THREE.RingGeometry(.5,.62,32),new THREE.MeshBasicMaterial({color:'#f5a524',transparent:true,side:THREE.DoubleSide}));R3.ring.rotation.x=-Math.PI/2;sc.add(R3.ring);
  // fx
  R3.smoke=[];const smTex=cnv(64,64,(x)=>{const gr=x.createRadialGradient(32,32,2,32,32,30);gr.addColorStop(0,'rgba(120,120,120,.7)');gr.addColorStop(1,'rgba(120,120,120,0)');x.fillStyle=gr;x.fillRect(0,0,64,64)},'smoke');
  for(let i=0;i<14;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:smTex,transparent:true,depthWrite:false}));s.visible=false;s.userData.t=i/14;sc.add(s);R3.smoke.push(s)}
  R3.puddle=new THREE.Mesh(new THREE.CircleGeometry(1.1,24),new THREE.MeshStandardMaterial({color:'#3a7fd0',transparent:true,opacity:.55,roughness:.05,metalness:.3}));R3.puddle.rotation.x=-Math.PI/2;R3.puddle.position.y=.02;R3.puddle.visible=false;sc.add(R3.puddle);
  // bloom
  if(hi&&THREE.EffectComposer&&THREE.UnrealBloomPass){try{const comp=new THREE.EffectComposer(r);comp.addPass(new THREE.RenderPass(sc,R3.cam));R3.bloom=new THREE.UnrealBloomPass(new THREE.Vector2(512,512),.45,.4,.93);comp.addPass(R3.bloom);R3.comp=comp}catch(e){R3.comp=null}}
  R3.ok=true;const rs=()=>{const w=$('#cvwrap').clientWidth,h=$('#cvwrap').clientHeight;if(!w||!h)return;r.setSize(w,h,false);if(R3.comp)R3.comp.setSize(w,h);R3.cam.aspect=w/h;R3.cam.updateProjectionMatrix()};rs();
  if(window.ResizeObserver)new ResizeObserver(rs).observe($('#cvwrap'));else addEventListener('resize',rs);
  $('#cvwrap').addEventListener('wheel',e=>{e.preventDefault();R3.zoom=Math.max(.5,Math.min(1.9,R3.zoom*(e.deltaY>0?1.1:.9)))},{passive:false});
  initMini();
}
/* ---------- characters ---------- */
const STYLE={player:{shirt:'#f59e0b',pants:'#2f4a7a',hair:'#1b1410',skin:'#c68a5e',belt:'#d9a400'},guard:{shirt:'#24418a',pants:'#141821',hair:'#111',skin:'#a8714a',cap:'#0b1a40'},staff:{shirt:'#14897a',pants:'#3a3f4a',hair:'#2a1a10',skin:'#d29a6c'},boss:{shirt:'#7b3fa0',pants:'#22252c',hair:'#120c08',skin:'#c4875a'},intruder:{shirt:'#3a1414',pants:'#111',hair:'#111',skin:'#9a6a48',hood:'#2a0c0c'}};
function makeHuman(st,name,nameCol){const g=new THREE.Group(),M=c=>std(c,.8);
  const sh=new THREE.Mesh(new THREE.CircleGeometry(.3,16),new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.28,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.y=.015;g.add(sh);
  const mk=(geo,col,x,y,z)=>{const m=new THREE.Mesh(geo,M(col));m.position.set(x,y,z);m.castShadow=true;return m};
  const limb=(r1,r2,len,col,px,py)=>{const p=new THREE.Group();p.position.set(px,py,0);p.add(mk(new THREE.CylinderGeometry(r1,r2,len,8),col,0,-len/2,0));g.add(p);return p};
  const hipL=limb(.085,.07,.56,st.pants,-.1,.62),hipR=limb(.085,.07,.56,st.pants,.1,.62);
  [hipL,hipR].forEach(h=>h.add(mk(new THREE.BoxGeometry(.15,.08,.26),'#1a1a1a',0,-.57,.05)));
  const torso=mk(new THREE.CylinderGeometry(.22,.18,.56,12),st.shirt,0,.92,0);torso.scale.z=.68;g.add(torso);
  {const b=mk(new THREE.CylinderGeometry(.185,.185,.06,12),st.belt||'#222',0,.66,0);b.scale.z=.7;g.add(b)}
  const shL=limb(.065,.055,.5,st.shirt,-.29,1.14),shR=limb(.065,.055,.5,st.shirt,.29,1.14);
  [shL,shR].forEach(s=>s.add(mk(new THREE.SphereGeometry(.06,8,6),st.skin,0,-.54,0)));
  g.add(mk(new THREE.CylinderGeometry(.07,.07,.1,8),st.skin,0,1.24,0));
  const head=mk(new THREE.SphereGeometry(.17,16,12),st.skin,0,1.4,0);g.add(head);
  g.add(mk(new THREE.SphereGeometry(.178,16,12,0,Math.PI*2,0,Math.PI/2.1),st.hair,0,1.42,-.01));
  const eyeM=st.hood?new THREE.MeshBasicMaterial({color:'#ff2020'}):std('#111');[-.06,.06].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.022,6,4),eyeM);e.position.set(x,1.42,.155);g.add(e)});
  const badge=new THREE.Mesh(new THREE.PlaneGeometry(.08,.11),basic(st.hood?'#3a1414':'#f0f0f0'));badge.position.set(.09,1.0,.128);g.add(badge);
  if(st.cap){g.add(mk(new THREE.CylinderGeometry(.18,.19,.1,14),st.cap,0,1.56,0));g.add(mk(new THREE.BoxGeometry(.26,.025,.16),st.cap,0,1.52,.2))}
  if(st.hood){const h=mk(new THREE.SphereGeometry(.22,14,10,0,Math.PI*2,0,Math.PI*.62),st.hood,0,1.4,-.04);h.rotation.x=-.25;g.add(h)}
  if(st===STYLE.player){const hs=new THREE.Mesh(new THREE.TorusGeometry(.18,.02,6,16,Math.PI),std('#222'));hs.position.set(0,1.42,0);hs.rotation.z=0;g.add(hs);g.add(mk(new THREE.BoxGeometry(.06,.06,.08),'#222',-.18,1.38,.06))}
  if(name){const s=textSprite(name,{size:26,h:.24,color:nameCol||'#fff'});s.position.y=1.9;g.add(s)}
  g.scale.setScalar(1.3);return{g,hipL,hipR,shL,shR,ph:0,lx:null,lz:null}}
function syncChar(key,obj,style,name,col,visible,dt,face){let c=R3.chars.get(key);if(!c){c=makeHuman(style,name,col);R3.chars.set(key,c);R3.sc.add(c.g)}c.seen=true;c.g.visible=visible;
  const x=obj.x,z=obj.y;const dx=c.lx==null?0:x-c.lx,dz=c.lz==null?0:z-c.lz;c.lx=x;c.lz=z;const sp=dt>0?Math.hypot(dx,dz)/dt:0;
  if(sp>.15){const tr=Math.atan2(dx,dz);let d=tr-c.g.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));c.g.rotation.y+=d*Math.min(1,dt*14)}else if(face){c.g.rotation.y=Math.atan2(face[0],face[1])}
  c.ph+=dt*sp*3.2;const a=Math.min(1,sp/3)*.7*Math.sin(c.ph);c.hipL.rotation.x=a;c.hipR.rotation.x=-a;c.shL.rotation.x=-a*.9;c.shR.rotation.x=a*.9;
  c.g.position.set(x,sp>.15?Math.abs(Math.sin(c.ph))*.04:0,z)}

/* ---------- frame ---------- */
let lastDraw=0;
function draw(now){
  const dt=lastDraw?Math.min(.1,(now-lastDraw)/1000):0;lastDraw=now;if(!R3.ok)return;const pulse=(Math.sin(now/160)+1)/2;
  const render=()=>{if(R3.comp)R3.comp.render();else R3.r.render(R3.sc,R3.cam)};
  if(!S){R3.floors.forEach((g,i)=>g.visible=i===1);R3.ext.position.y=-4.5;R3.chars.forEach(c=>c.g.visible=false);R3.arrow.visible=R3.beacon.visible=R3.ring.visible=false;
    const t=now/9000;R3.cam.position.set(20+Math.sin(t)*17,15,12.5+Math.cos(t)*17);R3.cam.lookAt(20,0,16);R3.dl.position.set(12,22,22);R3.dl.target.position.set(20,0,16);render();$('#nav').style.display='none';$('#miniwrap').style.display='none';return}
  const f=S.floor;R3.floors.forEach((g,i)=>g.visible=i===f);R3.ext.position.y=-4.5*f;
  if(((now/450)|0)!==R3.tick){R3.tick=(now/450)|0}
  const hot=new Map();S.inc.forEach(i=>{const s=curStep(i);if(s&&s.loc)hot.set(s.loc,s.p.type==='pickup'?'#f5a524':'#ff4d4d')});
  for(const id in R3.mark)R3.mark[id].g.visible=false;
  ENT.forEach(e=>{if(e._mesh&&e.f===f){const mm=hot.has(e.id)?R3.hotRack:R3.rackMat[((e.x*7+e.y)+R3.tick)%4];e._mesh.material[4]=e._mesh.material[5]=mm}});
  let li=0;R3.alarm.forEach(l=>l.intensity=0);
  hot.forEach((col,id)=>{const e=EBY[id];if(e.f!==f)return;let mk=R3.mark[id];
    if(!mk){const g=new THREE.Group(),h=(KH[e.kind]||1.2)+.06;const ln=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(e.w+.12,h,e.h+.12)),new THREE.LineBasicMaterial({color:col,transparent:true}));ln.position.y=h/2;g.add(ln);
      const b=textSprite(e.kind==='rack'?'⚠ '+e.label:'⚠',{size:30,h:.4,bg:col==='#f5a524'?'rgba(150,90,0,.92)':'rgba(170,20,20,.92)'});b.position.y=h+.75;g.add(b);g.position.set(e.x+e.w/2,0,e.y+e.h/2);R3.sc.add(g);mk=R3.mark[id]={g,ln,b,h}}
    mk.g.visible=true;mk.ln.material.color.set(col);mk.ln.material.opacity=.4+.6*pulse;mk.b.position.y=mk.h+.75+pulse*.15;
    if(li<3&&col!=='#f5a524'){const l=R3.alarm[li++];l.position.set(e.x+e.w/2,2.4,e.y+e.h/2);l.intensity=1.6*pulse}});
  // doors
  const movers=[{x:S.px,y:S.py,f}].concat(S.npcs.filter(n=>n.f===f),S.intr.filter(a=>a.f===f));
  R3.doors[f].forEach(d=>{const near=movers.some(m=>Math.hypot(m.x-d.x,m.y-d.y)<1.7);d.o+=((near?1:0)-d.o)*Math.min(1,dt*8);const off=.25+d.o*.45;d.p.forEach((p,i)=>{const s=i?1:-1;if(d.h)p.position.x=d.x+s*off;else p.position.z=d.y+s*off})});
  // fx
  R3.smoke.forEach(s=>s.visible=false);R3.puddle.visible=false;
  S.inc.forEach(i=>{if(!i.fx||i.idx<i.fx.step)return;const s=curStep(i);if(!s||!s.loc)return;const e=EBY[s.loc];if(e.f!==f)return;
    if(i.fx.k==='smoke')R3.smoke.forEach(sp=>{sp.userData.t=(sp.userData.t+dt*.35)%1;const t=sp.userData.t;sp.visible=true;sp.position.set(e.x+.5+Math.sin(t*9+sp.id)*.25,2+t*2.5,e.y+.5+Math.cos(t*7)*.2);sp.scale.setScalar(.5+t*1.8);sp.material.opacity=.7*(1-t)});
    if(i.fx.k==='puddle'){R3.puddle.visible=true;R3.puddle.position.set(e.x+1.6,.02,e.y+1);R3.puddle.scale.setScalar(1+pulse*.05)}});
  // characters
  R3.chars.forEach(c=>c.seen=false);
  syncChar('player',{x:S.px,y:S.py},STYLE.player,'YOU','#ffd27a',true,dt,S.dir);
  S.npcs.forEach((n,i)=>{const near=n.f===f&&Math.hypot(n.x-S.px,n.y-S.py)<3;syncChar('npc'+i+n.name,n,STYLE[n.k],n.name,'#cfe3ff',n.f===f,dt,near?[S.px-n.x,S.py-n.y]:null)});
  S.intr.forEach(a=>syncChar('intr'+a.inc,a,STYLE.intruder,'INTRUDER','#ff8a8a',a.f===f,dt));
  R3.chars.forEach((c,k)=>{if(!c.seen){R3.sc.remove(c.g);R3.chars.delete(k)}});
  // nav
  const tg=trackTarget();const nav=$('#nav');
  if(tg){const dx=tg.x-S.px,dz=tg.y-S.py,d=Math.hypot(dx,dz);R3.arrow.visible=d>1.5;R3.arrow.position.set(S.px+dx/d*1.15,.3+pulse*.06,S.py+dz/d*1.15);R3.arrow.rotation.y=-Math.atan2(dz,dx);
    R3.beacon.visible=R3.ring.visible=true;R3.beacon.position.set(tg.x,4,tg.y);R3.beacon.material.opacity=.08+.1*pulse;R3.ring.position.set(tg.x,.03,tg.y);R3.ring.scale.setScalar(1+pulse*.5);R3.ring.material.opacity=1-pulse*.6;
    nav.style.display='block';nav.textContent='➜ '+tg.label+(tg.dist?'':'')}
  else{R3.arrow.visible=R3.beacon.visible=R3.ring.visible=false;nav.style.display='none'}
  // camera + light
  const z=R3.zoom,tx=S.px,tz=S.py+.6;R3.cx=R3.cx==null?tx:R3.cx+(tx-R3.cx)*Math.min(1,dt*6);R3.cz=R3.cz==null?tz:R3.cz+(tz-R3.cz)*Math.min(1,dt*6);
  R3.cam.position.set(R3.cx,10.5*z,R3.cz+8*z);R3.cam.lookAt(R3.cx,.8,R3.cz);
  R3.dl.position.set(R3.cx-8,22,R3.cz+10);R3.dl.target.position.set(R3.cx,0,R3.cz);
  render();
  const nt=!MODAL&&nearest();const pr=$('#prompt');if(nt){pr.style.display='block';pr.textContent=nt.n?`[E] Talk to ${nt.n.name}`:`[E] ${nt.e.kind==='stairs'?'Use stairs / lift':'Inspect '+nt.e.label}`}else pr.style.display='none';
  if(now-(R3.miniT||0)>66){R3.miniT=now;drawMini(now)}
}

/* ---------- GTA-style minimap ---------- */
const MP=10;
function initMini(){R3.miniBase=[0,1,2].map(f=>{const c=document.createElement('canvas');c.width=COLS*MP;c.height=ROWS*MP;const x=c.getContext('2d');
  for(let y=0;y<ROWS;y++)for(let X=0;X<COLS;X++){const v=GRID[f][y][X],z=ZONE[f][y][X];x.fillStyle=v===1?'#0b0e13':v===2?'#9aa3b3':z>=0?ROOMS[f][z].c:CORRIDOR;x.fillRect(X*MP,y*MP,MP,MP)}
  ENT.filter(e=>e.f===f).forEach(e=>{x.fillStyle=e.kind==='stairs'?'#e8e8e8':'rgba(20,24,30,.75)';x.fillRect(e.x*MP+1,e.y*MP+1,e.w*MP-2,e.h*MP-2)});
  x.fillStyle='#111';x.font='bold 13px system-ui';x.textAlign='center';x.fillText('⇅',stairsOf(f).x*MP+2*MP,stairsOf(f).y*MP+2*MP);
  x.fillStyle='rgba(255,255,255,.75)';x.font='bold 9px system-ui';ROOMS[f].forEach(r=>{if(r!==STAIRS)x.fillText(r.n.split(' —')[0].toUpperCase(),(r.x+r.w/2)*MP,(r.y+r.h/2)*MP)});return c})}
function drawMini(now){const wrap=$('#miniwrap');wrap.style.display='block';const c=$('#mini'),x=c.getContext('2d'),W=c.width,H=c.height,R=W/2,sc=.85,pulse=(Math.sin(now/160)+1)/2;
  const f=S.floor;x.clearRect(0,0,W,H);x.save();x.beginPath();x.arc(R,R,R-2,0,7);x.clip();x.fillStyle='#22301f';x.fillRect(0,0,W,H);
  x.save();x.translate(R,R);x.scale(sc,sc);x.translate(-S.px*MP,-S.py*MP);x.drawImage(R3.miniBase[f],0,0);x.restore();
  const toS=(tx,ty)=>[R+(tx-S.px)*MP*sc,R+(ty-S.py)*MP*sc];
  const blip=(tx,ty,col,sz,shape,clamp)=>{let [X,Y]=toS(tx,ty);const dx=X-R,dy=Y-R,d=Math.hypot(dx,dy),max=R-10;let edge=false;if(d>max){if(!clamp)return;X=R+dx/d*max;Y=R+dy/d*max;edge=true}
    x.fillStyle=col;x.strokeStyle='#000';x.lineWidth=2;x.beginPath();if(shape==='sq')x.rect(X-sz,Y-sz,sz*2,sz*2);else if(shape==='tri'){x.moveTo(X,Y-sz-1);x.lineTo(X+sz,Y+sz);x.lineTo(X-sz,Y+sz);x.closePath()}else x.arc(X,Y,sz,0,7);x.fill();x.stroke();if(edge&&shape!=='tri'){x.fillStyle='#fff';x.font='bold 9px system-ui';x.textAlign='center';x.fillText('!',X,Y+3)}};
  S.npcs.forEach(n=>{if(n.f===f)blip(n.x,n.y,n.k==='guard'?'#4f7dff':'#3ccfcf',3.5,'c',false)});
  S.inc.forEach(i=>{const s=curStep(i);if(!s)return;if(s.loc){const e=EBY[s.loc];if(e.f===f)blip(e.x+e.w/2,e.y+e.h/2,s.p.type==='pickup'?'#f5a524':'#ff3b3b',4.5+pulse*1.5,'sq',true);else{const st_=stairsOf(f);blip(st_.x+2,st_.y+2,'#ff3b3b',4,'tri',true)}}});
  S.intr.forEach(a=>{const inc=S.inc.find(i=>i.id===a.inc);if(a.f===f&&inc&&inc.revealed)blip(a.x,a.y,'#ff2020',5,'c',true)});
  const tg=trackTarget();if(tg)blip(tg.x,tg.y,'#ffd23a',5+pulse*2,'c',true);
  x.restore();
  // player arrow
  x.save();x.translate(R,R);x.rotate(Math.atan2(S.dir[0],-S.dir[1]));x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=2;x.beginPath();x.moveTo(0,-9);x.lineTo(7,7);x.lineTo(0,3);x.lineTo(-7,7);x.closePath();x.fill();x.stroke();x.restore();
  x.strokeStyle='rgba(0,0,0,.8)';x.lineWidth=5;x.beginPath();x.arc(R,R,R-3,0,7);x.stroke();x.strokeStyle='#d9dde3';x.lineWidth=2;x.beginPath();x.arc(R,R,R-3,0,7);x.stroke();
  x.fillStyle='#fff';x.font='bold 13px system-ui';x.textAlign='center';x.fillText('N',R,16);
  $('#miniLbl').textContent=FLOORS[f].short+' · '+roomAt(f,S.px,S.py)}
