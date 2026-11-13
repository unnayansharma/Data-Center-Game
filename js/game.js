"use strict";
/* ============ state ============ */
let S=null,MODAL=null,paused=false;
const keys={};
function startLevel(L,free){
  const seed=Date.now()%100000;closeModal();
  S={L,free,tier:free?1:tierOf(L),t:0,up:100,floor:0,px:8.5,py:22.5,dir:[0,-1],inv:[],inc:[],queue:free?[]:planLevel(L,seed),intr:[],track:null,over:false,nid:1,g:RNG(seed+L),
     npcs:NPCDEF.map(n=>({...n,x:n.x+.5,y:n.y+.5,pi:0,path:null,li:0})),wrong:0};
  R3.cx=null;$('#screen').classList.add('hidden');
  if(!free){paused=true;const labsIn=S.queue.filter(q=>TPL[q.id].lab).map(q=>LABS[TPL[q.id].lab]);
    openModal(`<h2>Shift ${L} — ${TIERS[S.tier]}</h2><div class="sub">${S.queue.length} incident${S.queue.length>1?'s':''} expected this shift${labsIn.length?` · ${labsIn.length} hands-on lab${labsIn.length>1?'s':''}: ${labsIn.map(l=>l.dom).join(', ')}`:''}</div>
   <div class="txt">${L===1?'Welcome to DC-1, your first shift!\n\n• Move with WASD / arrow keys · zoom with mouse wheel or + / −\n• E (or Space) inspects equipment and talks to people — every new thing you inspect unlocks a Codex entry (C)\n• Stairs/lift (top-middle) change floors\n• Follow the orange arrow, beacon and the minimap blips (bottom-left)\n\nKeep SLA Health above 0. Wrong decisions cost SLA.':L===6?'New: your first TERMINAL LAB. Type real Linux commands. Stuck? Use the cheat-sheet on the right or the Hint button. While you work in a terminal, SLA drains more slowly.':'Fix every incident before SLA Health runs out. Wrong decisions cost SLA; fixing an incident restores a little.'+(S.tier>=3?'\n\nFrom here, some alarms are vague — check the NOC Video Wall (2F) to find the device.':'')}</div>
   <div class="row"><button class="pri" onclick="closeModal()">Start shift ▶</button></div>`)}
  else toast('Free roam — explore, inspect everything (E) to fill your Codex, talk to people.','ok');
}
function spawn(id){
  const t=TPL[id],g=S.g,inc=Object.assign({id:S.nid++,tid:id,sev:t.sev,idx:0,born:S.t},t.make(g,S.L));
  if(t.fx)inc.fx=t.fx;if(!inc.fx&&inc.fx===undefined)delete inc.fx;
  inc.steps.forEach(s=>{if(s.p.type==='choice'&&!s.p.shuf)s.p.shuf=g.shuffle(s.p.opts)});
  const first=inc.steps.find(s=>s.p.type!=='pickup');
  if(S.tier>=3&&first&&first.loc&&/^(rack|crac)$/.test(EBY[first.loc].kind)&&g()<(S.tier>=5?1:.6)){
    const e=EBY[first.loc];inc.steps.unshift(st('videowall',info('NOC Video Wall',`ALARM ▸ ${inc.title}\n${inc.desc}\nDevice: ${e.label} — ${FLOORS[e.f].name}, ${eRoom(e)}`)));inc.vague=true;if(inc.fx)inc.fx={...inc.fx,step:inc.fx.step+1}}
  if(inc.intr){const f=S.tier===1?0:g.int(3);let p;if(f===0&&S.tier===1)p=[36,20];else{const c=WALK[f].filter(([x,y])=>f!==S.floor||Math.hypot(x-S.px,y-S.py)>10);p=g.pick(c)}
    S.intr.push({f,x:p[0]+.5,y:p[1]+.5,path:null,inc:inc.id,spd:1.7+S.tier*.35,re:0});inc.revealed=S.tier<=2}
  S.inc.push(inc);skipPickups(inc);if(!S.track)S.track=inc.id;sfx.alert();toast('🚨 '+(inc.vague?'Alarm — check NOC Video Wall':inc.title),'warn');
}
function skipPickups(inc){while(inc.steps[inc.idx]&&inc.steps[inc.idx].p.type==='pickup'&&S.inv.includes(inc.steps[inc.idx].p.item))inc.idx++}
function advance(inc){inc.idx++;skipPickups(inc);if(inc.idx>=inc.steps.length)resolve(inc)}
function resolve(inc){inc.done=true;S.up=Math.min(100,S.up+3);S.inc=S.inc.filter(i=>i!==inc);if(S.track===inc.id)S.track=S.inc[0]?.id||null;sfx.ok();toast('✅ Resolved: '+inc.title,'ok')}
function penalty(msg){if(!S||S.free){sfx.bad();return}const p=4+S.L*.06;S.up-=p;S.wrong++;sfx.bad();toast(`✖ ${msg} (−${p.toFixed(1)}% SLA)`,'bad')}
const curStep=inc=>inc.steps[inc.idx];

/* ============ UI helpers ============ */
function toast(m,c=''){const d=document.createElement('div');d.className='toast '+c;d.textContent=m;$('#toasts').appendChild(d);setTimeout(()=>d.remove(),4500);while($('#toasts').children.length>5)$('#toasts').firstChild.remove()}
let sayT=0;function say(html,t=6){const s=$('#say');s.innerHTML=html;s.style.display='block';sayT=t}
function openModal(html,closable=true,cls=''){MODAL={closable};const b=$('#mbox');b.className='box '+cls;b.innerHTML=html;$('#modal').classList.remove('hidden')}
function closeModal(){MODAL=null;$('#modal').classList.add('hidden');$('#mbox').innerHTML='';LABRUN=null}
window.closeModal=closeModal;

/* ============ interaction ============ */
function nearest(){if(!S)return null;let best=null,bd=1.15;
  for(const n of S.npcs){if(n.f!==S.floor)continue;const d=Math.hypot(n.x-S.px,n.y-S.py);if(d<1.4&&d-.3<bd){best={n};bd=d-.3}}
  for(const e of ENT){if(e.f!==S.floor)continue;const cx=Math.max(e.x,Math.min(S.px,e.x+e.w)),cy=Math.max(e.y,Math.min(S.py,e.y+e.h));const d=Math.hypot(cx-S.px,cy-S.py);if(d<bd){bd=d;best={e}}}
  return best}
function interact(){
  if(!S||MODAL||S.over)return;const t=nearest();if(!t)return;
  if(t.n)return talk(t.n);const e=t.e;unlockCodex(codexKey(e));
  if(e.kind==='stairs')return floorMenu();
  if(e.id==='cctv'){const hid=S.inc.filter(i=>i.intr&&!i.revealed);if(hid.length){hid.forEach(i=>i.revealed=true);const x=S.intr.find(q=>q.inc===hid[0].id);
    return openModal(`<h2>CCTV Video Wall</h2><div class="txt mono">CAM ${pad(10+x.f*7)} ▸ Unbadged person in dark hoodie\nLocation: ${FLOORS[x.f].name} — ${roomAt(x.f,x.x,x.y)}\nFootage exported to case file ✓</div><div class="row"><button class="pri" onclick="closeModal()">On my way!</button></div>`)}}
  const inc=S.inc.find(i=>{const s=curStep(i);return s&&s.loc===e.id&&s.p.type!=='pickup'});
  if(inc){const s=curStep(inc);if(s.need&&!S.inv.includes(s.need)){const k=inc.steps.findIndex(x=>x.p.type==='pickup'&&x.p.item===s.need);if(k>=0)inc.idx=k;toast(`You need: ${s.need} — get it from the Spare Parts Cabinet (G · Storage)`,'warn');return}
    return openPuzzle(inc,s)}
  if(e.id==='parts')return partsMenu();
  const k=codexKey(e);say(`<b>${esc(e.label)}</b> — ${esc(flavor(e))}${k?`<div class="cxs">📘 ${esc(CODEX[k].body.split('. ')[0])}. <i>(C = Codex)</i></div>`:''}`,8);
}
function talk(n){
  let line;
  if(n.k==='guard'){const hid=S.inc.filter(i=>i.intr);if(hid.length){const x=S.intr.find(q=>q.inc===hid[0].id);if(x){hid[0].revealed=true;line=`📻 Radio: someone unbadged is on the ${FLOORS[x.f].name}, near the ${roomAt(x.f,x.x,x.y)}! Go — I'll cover the exits.`}}}
  if(!line&&n.k!=='guard'&&S.inc.length&&Math.random()<.4){const i=S.inc.find(x=>x.id===S.track)||S.inc[0];line=`Busy shift! Your tracked incident: "${i.vague&&i.idx===0?'alarm on the NOC video wall':i.title}".`}
  if(!line){line=n.lines[n.li%n.lines.length];n.li++}
  say(`<b>${esc(n.name)}</b> <span style="color:var(--mut)">(${esc(n.role)})</span>: ${esc(line)}`);
}
function flavor(e){const h=[...e.id].reduce((a,c)=>a+c.charCodeAt(0),0);switch(e.kind){
 case'rack':return`12 servers online. Inlet ${21+h%4}°C. PDU-A ${30+h%25}% · PDU-B ${28+h%27}%.`;
 case'ups':return'Online (double-conversion). Load 48%. Battery 100%, runtime 22 min.';
 case'crac':return`Running. Supply air ${17+h%3}°C, return ${30+h%4}°C. Humidity 47%.`;
 case'gen':return'Standby — AUTO. Fuel 92%. Coolant heater on. Last load test: passed.';
 case'fuel':return'Diesel: 18,000 L — about 36 hours at full load.';
 case'ats':return'Source = UTILITY. Generator ready. Last transfer test: 12 days ago.';
 case'elec':case'bypass':return'All breakers closed. 415 V, 50 Hz. LOTO tags: none.';
 case'trafo':return'11 kV → 415 V. Winding 72°C. Load 58%.';
 case'batt':return'40 blocks, all 24–26°C. Float voltage normal.';
 case'suppression':return'Clean-agent system: ARMED. Cross-zoned detection. No alarms.';
 case'gas':return'3 cylinders. Pressure in green band. Last weighed: 5 months ago.';
 case'leak':return'Leak cable: dry in all 8 zones.';
 case'vesda':return'Level: NORMAL (0.002 %obs/m). Airflow OK.';
 case'facp':return'System NORMAL. 412 addressable devices. 0 troubles.';
 case'pa':return'Voice-evac amplifiers OK. Last weekly test: passed.';
 case'nvr':return'64 channels recording. Storage 71%. Retention 90 days.';
 case'access':return'Doors online: 38/38. Last swipe: you, at the mantrap.';
 case'bms':return'Chillers OK · CRACs OK · PUE 1.42 · No active alarms.';
 case'switch':return'48×25G + 8×100G. All uplinks up. CPU 9%.';
 case'firewall':return'HA pair active/passive. 2.1 Gbps. 312 rules.';
 case'router':return'BGP: ISP-A & ISP-B Established. 2 × 10G uplinks.';
 case'proxy':return'4,120 users today. 312 blocked requests.';
 case'lb':return'Pool web-prod: 6/6 members healthy.';
 case'ids':return'Inline IPS. 14 low alerts today. Signatures updated 2 h ago.';
 case'patch':return'144 fiber ports. Labels match the cable records.';
 case'san':return'2 controllers, 240 disks, RAID-6. 61% used. Snapshots hourly.';
 case'tape':return'LTO-9 library: 80 slots. Weekly off-site rotation.';
 case'backup':return'Last night: 214 jobs OK, 0 failed. Last restore test: 9 days ago.';
 case'kvm':return'Crash cart with monitor and keyboard.';
 case'siem':return'14,200 events/sec. 3 open alerts.';
 case'pam':return'312 privileged accounts vaulted. 2 live sessions (recorded).';
 case'edr':return'1,214 endpoints protected. 0 isolated.';
 case'cctv':return'64 cameras online.';
 case'video':case'console':return'Dashboards green. Nothing unusual right now.';
 case'reader':return'Badge + fingerprint. Last entry: you.';
 case'parts':return'Spares for fans, disks, PSUs, filters, optics.';
 case'mydesk':return'Your laptop (MFA jump host). A sticky note: "test the backups!"';
 case'pantry':return'You grab a coffee. ☕';
 default:return'All normal.'}}
function floorMenu(){openModal(`<h2>Stairs / Lift</h2><div class="sub">Choose a floor</div><div class="opts">${FLOORS.map((f,i)=>`<button ${i===S.floor?'disabled':''} onclick="goFloor(${i})">${f.short} — ${f.name}<br><small style="color:var(--mut)">${ROOMS[i].filter(r=>r!==STAIRS).map(r=>r.n.split(' —')[0]).join(' · ')}</small></button>`).join('')}</div><div class="row"><button onclick="closeModal()">Cancel</button></div>`)}
window.goFloor=f=>{S.floor=f;S.px=15.5;S.py=6.6;R3.cx=null;closeModal();toast('📍 '+FLOORS[f].name)};
function partsMenu(){const need=new Set(S.inc.map(i=>curStep(i)).filter(s=>s&&s.p.type==='pickup').map(s=>s.p.item));
 openModal(`<h2>Spare Parts Cabinet</h2><div class="sub">Toolbag: ${S.inv.length}/4 — ★ = needed right now</div><div class="opts">${PARTS.map(p=>`<button ${need.has(p)?'class="good"':''} data-p="${esc(p)}">${need.has(p)?'★ ':''}${esc(p)}</button>`).join('')}</div>
 ${S.inv.length?`<div class="sub" style="margin-top:10px">Return a part:</div><div class="row">${S.inv.map((p,i)=>`<button data-d="${i}">↩ ${esc(p)}</button>`).join('')}</div>`:''}<div class="row"><button onclick="closeModal()">Close</button></div>`);
 document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{if(S.inv.length>=4){toast('Toolbag full — return something first','warn');return}S.inv.push(b.dataset.p);S.inc.forEach(skipPickups);toast('🧰 Took: '+b.dataset.p,'ok');partsMenu()});
 document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{S.inv.splice(+b.dataset.d,1);partsMenu()})}

/* ============ puzzles ============ */
function openPuzzle(inc,s){const p=s.p,head=`<h2>${esc(p.title||'')}</h2><div class="sub">${esc(inc.vague&&inc.idx===0?'Unidentified alarm':inc.title)} · ${esc(eWhere(EBY[s.loc]))}</div>`;
 const done=()=>{if(s.need){const k=S.inv.indexOf(s.need);if(k>=0)S.inv.splice(k,1)}closeModal();advance(inc)};
 if(p.type==='lab'){runLab(p.lab,{holder:s,pen:penalty,onDone:()=>advance(inc),cheatClosed:S.tier>=4});return}
 if(p.type==='info'){openModal(head+`<div class="txt mono">${esc(p.text)}</div><div class="row"><button class="pri" id="ok">Got it</button></div>`);$('#ok').onclick=done;return}
 if(p.type==='choice'){openModal(head+`<div class="txt ${p.mono?'mono':''}">${esc(p.text)}</div><div class="opts">${p.shuf.map((o,i)=>`<button data-i="${i}">${esc(o[0])}</button>`).join('')}</div><div class="err" id="err"></div><div id="ex"></div>`);MODAL.work=true;
  document.querySelectorAll('.opts button').forEach(b=>b.onclick=()=>{const o=p.shuf[+b.dataset.i];if(o[1]){b.classList.add('good');document.querySelectorAll('.opts button').forEach(x=>x.disabled=true);
   $('#ex').innerHTML=`<div class="explain">✔ ${esc(p.explain)}</div><div class="row"><button class="pri" id="ok">Continue</button></div>`;$('#ok').onclick=done;sfx.ok()}
   else{b.classList.add('bad');b.disabled=true;penalty('Wrong call');$('#err').textContent='That would make things worse. Think about what the readings are telling you.'}});return}
 if(p.type==='seq'){const order=S.g.shuffle(p.items);let k=0;const draw_=()=>{openModal(head+`<div class="txt">${esc(p.text)}</div><div class="seqdone">${p.items.slice(0,k).map((x,i)=>`<div>${i+1}. ${esc(x)}</div>`).join('')}</div>
   ${k<p.items.length?`<div class="sub">Pick step ${k+1}:</div><div class="opts">${order.filter(x=>p.items.indexOf(x)>=k).map(x=>`<button data-x="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:`<div class="explain">✔ ${esc(p.explain)}</div><div class="row"><button class="pri" id="ok">Continue</button></div>`}<div class="err" id="err"></div>`);MODAL.work=true;
   if(k>=p.items.length){$('#ok').onclick=done;return}
   document.querySelectorAll('.opts button').forEach(b=>b.onclick=()=>{if(b.dataset.x===p.items[k]){k++;if(k>=p.items.length)sfx.ok();draw_()}else{penalty('Wrong order');k=0;draw_();$('#err').textContent='Out of order — start again from step 1.'}})};draw_()}
}

/* ============ update ============ */
function walkable(x,y,r=.3){return!solid(S.floor,Math.floor(x-r),Math.floor(y-r))&&!solid(S.floor,Math.floor(x+r),Math.floor(y-r))&&!solid(S.floor,Math.floor(x-r),Math.floor(y+r))&&!solid(S.floor,Math.floor(x+r),Math.floor(y+r))}
function moveAgent(a,dt){if(!a.path||!a.path.length)return true;const [tx,ty]=a.path[0],gx=tx+.5,gy=ty+.5,dx=gx-a.x,dy=gy-a.y,d=Math.hypot(dx,dy),s=a.spd*dt;if(d<=s){a.x=gx;a.y=gy;a.path.shift()}else{a.x+=dx/d*s;a.y+=dy/d*s}return!a.path.length}
function update(dt){
  if(!S||S.over)return;S.t+=dt;if(sayT>0){sayT-=dt;if(sayT<=0)$('#say').style.display='none'}
  while(S.queue.length&&S.t>=S.queue[0].at)spawn(S.queue.shift().id);
  if(!MODAL){let mx=(keys.right?1:0)-(keys.left?1:0),my=(keys.down?1:0)-(keys.up?1:0);if(mx||my){const l=Math.hypot(mx,my);mx/=l;my/=l;S.dir=[mx,my];const sp=(keys.shift?7.5:5.5)*dt;
    if(walkable(S.px+mx*sp,S.py))S.px+=mx*sp;if(walkable(S.px,S.py+my*sp))S.py+=my*sp;if(sayT>1.5)sayT=1.5}}
  for(const n of S.npcs){if(!n.patrol)continue;n.spd=1.6;if(moveAgent(n,dt)){n.pi=(n.pi+1)%n.patrol.length;const [tx,ty]=n.patrol[n.pi];n.path=bfs(n.f,n.x,n.y,tx,ty)}}
  for(const a of S.intr){a.re-=dt;const near=a.f===S.floor&&Math.hypot(a.x-S.px,a.y-S.py)<5;
    if(near&&a.re<=0){let best=null,bd=-1;for(let i=0;i<25;i++){const c=S.g.pick(WALK[a.f]);const d=Math.hypot(c[0]-S.px,c[1]-S.py);if(d>bd){bd=d;best=c}}a.path=bfs(a.f,a.x,a.y,best[0],best[1]);a.re=1.2}
    if(moveAgent(a,dt)&&!near){const c=S.g.pick(WALK[a.f]);a.path=bfs(a.f,a.x,a.y,c[0],c[1])}
    if(a.f===S.floor&&Math.hypot(a.x-S.px,a.y-S.py)<.8){a.caught=true;const inc=S.inc.find(i=>i.id===a.inc);toast('🚔 Intruder detained and handed to security!','ok');unlockCodex('reader');if(inc)resolve(inc)}}
  S.intr=S.intr.filter(a=>!a.caught);
  if(!S.free){const rate=(.05+.0022*S.L)*(MODAL&&MODAL.work?.35:1);for(const i of S.inc)S.up-=i.sev*rate*dt;
    if(S.up<=0){S.up=0;S.over=true;sfx.bad();if(MODAL)closeModal();endScreen(false)}
    else if(!S.queue.length&&!S.inc.length){S.over=true;endScreen(true)}}
}
function endScreen(win){
  const L=S.L,stars=S.up>=85?3:S.up>=60?2:1;
  if(win){SAVE.stars[L]=Math.max(SAVE.stars[L]||0,stars);SAVE.unlocked=Math.max(SAVE.unlocked,Math.min(100,L+1));save()}
  setTimeout(()=>openModal(win?`<h2>${L===100?'🏆 You run the data center!':'Shift '+L+' complete!'}</h2><div style="font-size:34px;letter-spacing:4px">${'★'.repeat(stars)}<span style="opacity:.25">${'★'.repeat(3-stars)}</span></div>
   <div class="txt">SLA Health: ${S.up.toFixed(1)}%\nTime: ${fmt(S.t)}\nWrong decisions: ${S.wrong}\nCodex: ${Object.keys(SAVE.codex).length}/${Object.keys(CODEX).length} · Labs mastered: ${Object.keys(SAVE.labs).length}/${LAB_ORDER.length}${L===100?'\n\nAll 100 shifts cleared — Director-level operator! 🎉':''}</div>
   <div class="row">${L<100?`<button class="pri" onclick="startLevel(${L+1})">Next shift ▶</button>`:''}<button onclick="startLevel(${L})">Replay</button><button onclick="showMenu()">Menu</button></div>`
   :`<h2>SLA breached 💥</h2><div class="txt">Customers felt the outage on shift ${L}.\nTips: handle red incidents first, pre-stock spare parts, and practise the terminal labs in the Academy.</div><div class="row"><button class="pri" onclick="startLevel(${L})">Retry</button><button onclick="showMenu()">Menu</button></div>`,false),600);
}
const fmt=t=>`${Math.floor(t/60)}:${pad(Math.floor(t%60))}`;

/* ============ target / nav ============ */
function trackTarget(){
  const inc=S.inc.find(i=>i.id===S.track)||S.inc[0];if(!inc)return null;const s=curStep(inc);
  let f,x,y,label;
  if(s.p.type==='catch'){if(!inc.revealed){const c=EBY.cctv;f=0;x=c.x+3;y=c.y+1.5;label='Check CCTV'}else{const a=S.intr.find(q=>q.inc===inc.id);if(!a)return null;f=a.f;x=a.x;y=a.y;label='Catch intruder'}}
  else{const e=EBY[s.loc];f=e.f;x=e.x+e.w/2;y=e.y+e.h/2;label=e.label}
  if(f!==S.floor){const sx=stairsOf(S.floor);return{x:sx.x+2,y:sx.y+3.2,label:`Stairs → ${FLOORS[f].short} (${label})`}}
  return{x,y,label}}
function stepHint(inc){const s=curStep(inc);if(!s)return'';
  if(s.p.type==='pickup')return`Collect ${s.p.item} — G · Storage (Spare Parts)`;
  if(s.p.type==='catch'){if(!inc.revealed)return'Location unknown — check CCTV (G · Security Office) or ask a guard';const a=S.intr.find(q=>q.inc===inc.id);return a?`Catch them! ${FLOORS[a.f].short} · ${roomAt(a.f,a.x,a.y)}`:''}
  const e=EBY[s.loc];return`${s.p.type==='info'?'Check':s.p.type==='lab'?'💻 Lab at':'Fix at'} ${e.label} — ${eWhere(e)}`}

/* ============ HUD ============ */
function hud(){if(!S)return;
  $('#hLevel').textContent=S.free?'Free Roam':`Shift ${S.L} / 100`;$('#hTier').textContent=S.free?'Explore & learn':TIERS[S.tier];
  const u=Math.max(0,S.up);$('#slaFill').style.width=(S.free?100:u)+'%';$('#slaFill').style.background=u>60?'var(--ok)':u>30?'var(--acc)':'var(--bad)';
  $('#slaPct').textContent=S.free?'—':u.toFixed(1)+'%';$('#hTime').textContent='⏱ '+fmt(S.t);
  $('#hInv').innerHTML=S.inv.length?S.inv.map(p=>`<span class="chip">${esc(p)}</span>`).join(''):'<span style="color:var(--mut);font-size:12px">empty</span>';
  $('#hCodex').textContent=`📘 ${Object.keys(SAVE.codex).length}/${Object.keys(CODEX).length} · 💻 ${Object.keys(SAVE.labs).length}/${LAB_ORDER.length}`;
  $('#hCount').textContent=S.free?'':`(${S.inc.length} open · ${S.queue.length} pending)`;
  $('#hInc').innerHTML=S.inc.length?S.inc.map(i=>`<div class="inc sev${i.sev} ${i.id===S.track?'trk':''}" data-id="${i.id}"><div class="t">${['','🟡','🟠','🔴'][i.sev]} ${i.lab?'<span class="dtag" style="background:'+DOMCOL[LABS[i.lab].dom]+'">'+LABS[i.lab].dom+'</span> ':''}${esc(i.vague&&i.idx===0?'Alarm — details on NOC wall':i.title)}</div><div class="h">▸ ${esc(stepHint(i))}</div><div class="h" style="font-size:11px">step ${i.idx+1}/${i.steps.length} · open ${fmt(S.t-i.born)}</div></div>`).join('')
   :`<div style="color:var(--mut);font-size:12.5px">${S.free?'No incidents in free roam. Inspect equipment to unlock Codex entries.':S.queue.length?'All quiet… for now. Pre-stock spare parts?':'—'}</div>`;
  document.querySelectorAll('.inc').forEach(d=>d.onclick=()=>{S.track=+d.dataset.id;hud()});
}

/* ============ big map ============ */
function showMap(){if(!S)return;let h='<h2>Building Map</h2><div class="sub">Red = incident · Orange = pick-up · Yellow = you</div><div class="maps">';
  for(let f=2;f>=0;f--)h+=`<div class="ml">${FLOORS[f].short} — ${FLOORS[f].name}</div><canvas id="mp${f}" width="${COLS*MP}" height="${ROWS*MP}"></canvas>`;
  openModal(h+'</div><div class="row"><button class="pri" onclick="closeModal()">Close (M)</button></div>');
  const hot=new Map();S.inc.forEach(i=>{const s=curStep(i);if(s&&s.loc)hot.set(s.loc,s.p.type==='pickup'?'#f5a524':'#ff4d4d')});
  for(let f=0;f<3;f++){const c=$('#mp'+f).getContext('2d');c.drawImage(R3.miniBase[f],0,0);
    ENT.filter(e=>e.f===f&&hot.has(e.id)).forEach(e=>{c.fillStyle=hot.get(e.id);c.fillRect(e.x*MP-1,e.y*MP-1,e.w*MP+2,e.h*MP+2)});
    S.intr.forEach(a=>{const inc=S.inc.find(i=>i.id===a.inc);if(a.f===f&&inc&&inc.revealed){c.fillStyle='#ff2020';c.beginPath();c.arc(a.x*MP,a.y*MP,6,0,7);c.fill()}});
    if(S.floor===f){c.fillStyle='#ffd23a';c.strokeStyle='#000';c.beginPath();c.arc(S.px*MP,S.py*MP,6,0,7);c.fill();c.stroke()}}}

/* ============ codex & academy ============ */
function showCodex(){const tot=Object.keys(CODEX).length,have=Object.keys(SAVE.codex).length;
  let h=`<h2>📘 Data Center Codex</h2><div class="sub">${have}/${tot} unlocked — inspect equipment (E) and complete terminal labs to unlock more.</div><div class="cxbar"><div style="width:${have/tot*100}%"></div></div>`;
  CODEX_ORDER.forEach(cat=>{const ks=Object.keys(CODEX).filter(k=>CODEX[k].cat===cat);h+=`<div class="cxcat">${cat} <small>${ks.filter(k=>SAVE.codex[k]).length}/${ks.length}</small></div><div class="cxgrid">`;
    ks.forEach(k=>{const c=CODEX[k];h+=SAVE.codex[k]?`<details class="cx"><summary>${esc(c.t)}</summary><p>${esc(c.body)}</p><p class="tip">💡 ${esc(c.tip)}</p></details>`:`<div class="cx lock">🔒 ${esc(c.t)}</div>`});h+='</div>'});
  openModal(h+'<div class="row"><button class="pri" onclick="closeModal()">Close (C)</button></div>',true,'wide')}
window.showCodex=showCodex;
function showAcademy(){const sc=$('#screen');sc.classList.remove('hidden');S=null;
  const doms=[...new Set(LAB_ORDER.map(id=>LABS[id].dom))];
  sc.innerHTML=`<div class="menu"><div class="title" style="font-size:32px">💻 Academy <span>Labs</span></div><div class="tag">Practise every hands-on lab with no time pressure. ${Object.keys(SAVE.labs).length}/${LAB_ORDER.length} mastered.</div>
  ${doms.map(d=>`<div class="card"><h3><span class="dtag" style="background:${DOMCOL[d]}">${d}</span></h3><div class="labs">${LAB_ORDER.filter(id=>LABS[id].dom===d).map(id=>`<button class="labbtn" onclick="practice('${id}')"><b>${SAVE.labs[id]?'✅':'⬜'} ${esc(LABS[id].t)}</b><small>${esc(LABS[id].brief.slice(0,110))}…</small></button>`).join('')}</div></div>`).join('')}
  <div class="mbtns"><button onclick="showMenu()">⬅ Back</button></div></div>`}
window.showAcademy=showAcademy;
window.practice=id=>runLab(id,{onDone:showAcademy});

/* ============ menus ============ */
function showMenu(){closeModal();paused=false;S=null;const sc=$('#screen');sc.classList.remove('hidden');const tot=Object.values(SAVE.stars).reduce((a,b)=>a+b,0);
  sc.innerHTML=`<div class="menu"><div class="title">DC<span>·</span>OPS</div><div class="tag">Run a 3-floor data center for 100 shifts. Fix power, cooling, servers and networks, configure switches, routers and firewalls, hunt attackers in the SIEM — and learn how every component works.</div>
  <div class="mbtns"><button class="pri" onclick="startLevel(${SAVE.unlocked})">▶ ${SAVE.unlocked>1?'Continue — Shift '+SAVE.unlocked:'Start Shift 1'}</button><button onclick="showAcademy()">💻 Academy (${Object.keys(SAVE.labs).length}/${LAB_ORDER.length})</button><button onclick="showCodex()">📘 Codex (${Object.keys(SAVE.codex).length}/${Object.keys(CODEX).length})</button><button onclick="startLevel(1,true)">🧭 Free Roam</button><button onclick="howTo()">❓ How to play</button></div>
  <div class="mbtns"><button onclick="toggleMute(this)">${SAVE.muted?'🔇 Sound off':'🔊 Sound on'}</button><button onclick="toggleGfx(this)">🎨 Graphics: ${SAVE.gfx==='low'?'Low':'High'}</button></div>
  <div class="card"><h3>Shifts <span style="color:var(--mut);font-weight:500;font-size:13px">· ${tot}/300 ★</span></h3>
  <div class="legend">${TIERS.slice(1).map((t,i)=>`<span><i style="background:${['#2a4d78','#2a6b55','#7a6230','#7a3434','#6a3d85'][i]}"></i>${t} (${['1–15','16–35','36–60','61–85','86–100'][i]})</span>`).join('')}</div>
  <div class="grid">${Array.from({length:100},(_,i)=>{const L=i+1,lk=L>SAVE.unlocked,s=SAVE.stars[L]||0;const sl=SCRIPT[L]?SCRIPT[L].find(x=>x.startsWith('L:')):null;return`<button class="lv t${tierOf(L)}" ${lk?'disabled':''} onclick="startLevel(${L})" title="${sl?esc(LABS[sl.slice(2)].t):''}">${lk?'🔒':L}<small>${sl?'💻':''}${'★'.repeat(s)}</small></button>`}).join('')}</div></div></div>`}
window.showMenu=showMenu;window.startLevel=startLevel;
window.toggleMute=b=>{SAVE.muted=!SAVE.muted;save();b.textContent=SAVE.muted?'🔇 Sound off':'🔊 Sound on'};
window.toggleGfx=b=>{SAVE.gfx=SAVE.gfx==='low'?'high':'low';save();b.textContent='🎨 Graphics: '+(SAVE.gfx==='low'?'Low':'High')+' (reload to apply)'};
window.howTo=()=>openModal(`<h2>How to play</h2><div class="txt">You are the on-shift engineer at DC-1, a 3-floor data center.

<b>G — Ground:</b> lobby, reception & visitor kiosk, mantrap, Security Office (CCTV, NVR, access control, fire alarm panel, PA, BMS), electrical room (switchgear, ATS, transformer), generator yard, storage (spare parts), loading dock.
<b>1F — Server Hall:</b> 78 racks, SAN, tape library, backup server, CRAC cooling, VESDA, UPS room, network room (core switch, firewall, router, proxy, load balancer, IPS), batteries & gas suppression.
<b>2F — Offices:</b> NOC video wall, SOC (SIEM, PAM, EDR consoles), ops manager, open office with your jump-host desk, pantry.

<b>Controls</b>
<span class="kbd">WASD</span>/<span class="kbd">Arrows</span> move · <span class="kbd">Shift</span> run · <span class="kbd">E</span>/<span class="kbd">Space</span> interact · <span class="kbd">M</span> map · <span class="kbd">C</span> codex · <span class="kbd">wheel</span>/<span class="kbd">+ −</span> zoom · <span class="kbd">Esc</span> menu

<b>Terminal labs</b>
Real commands: Linux (df, du, systemctl, ss, chmod, ufw, apt, journalctl…), Cisco-style switch/router config (VLANs, trunks, ACLs, routes, BGP), firewall rules & NAT, web proxy policy, SIEM searches, EDR response and PAM access. Use ↑/↓ for history, Tab to complete, the cheat-sheet and Hint when stuck. Practise any lab in the Academy.

<b>Rules</b>
• Open incidents drain SLA Health — red ones fastest. Wrong decisions cost SLA. In a terminal, the drain slows.
• Some fixes need spare parts from the Storage room. You can pre-stock up to 4.
• Intruders flee — corner them! Guards and CCTV tell you where they are.
• From shift 36 some alarms are vague: check the NOC Video Wall first.</div><div class="row"><button class="pri" onclick="closeModal()">Got it</button></div>`);

/* ============ input ============ */
const KM={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
addEventListener('keydown',e=>{const tg=e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA')return;
  if(KM[e.code]){keys[KM[e.code]]=true;e.preventDefault()}
  if(e.key==='Shift')keys.shift=true;
  if((e.code==='KeyE'||e.code==='Space')&&S){e.preventDefault();if(!MODAL)interact()}
  if((e.key==='+'||e.key==='=')&&S)R3.zoom=Math.max(.5,R3.zoom*.9);if(e.key==='-'&&S)R3.zoom=Math.min(1.9,R3.zoom*1.1);
  if(e.code==='KeyM'&&S){if(MODAL&&MODAL.closable)closeModal();else if(!MODAL)showMap()}
  if(e.code==='KeyC'){if(MODAL&&MODAL.closable&&$('.cxbar'))closeModal();else if(!MODAL)showCodex()}
  if(e.code==='Escape'){if(MODAL&&MODAL.closable)closeModal();else if(S&&!MODAL&&!S.over)pauseMenu()}});
addEventListener('keyup',e=>{if(KM[e.code])keys[KM[e.code]]=false;if(e.key==='Shift')keys.shift=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
document.querySelectorAll('#touch [data-k]').forEach(b=>{const k=b.dataset.k;const on=e=>{e.preventDefault();keys[k]=true},off=e=>{e.preventDefault();keys[k]=false};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off)});
$('#tAct').addEventListener('pointerdown',e=>{e.preventDefault();interact()});
$('#bMap').onclick=()=>{if(S&&!MODAL)showMap()};$('#bCodex').onclick=()=>{if(!MODAL)showCodex()};
$('#bPause').onclick=()=>{if(S&&!MODAL&&!S.over)pauseMenu()};$('#miniwrap').onclick=()=>{if(S&&!MODAL)showMap()};
function pauseMenu(){paused=true;openModal(`<h2>Paused</h2><div class="sub">${S.free?'Free roam':'Shift '+S.L}</div><div class="opts"><button class="pri" id="rs">▶ Resume</button><button onclick="showCodex()">📘 Codex</button><button onclick="howTo()">❓ How to play</button><button id="rt">↺ Restart shift</button><button onclick="showMenu()">⌂ Main menu</button></div>`,false);
  $('#rs').onclick=()=>{paused=false;closeModal()};$('#rt').onclick=()=>{paused=false;startLevel(S.L,S.free)}}

/* ============ loop ============ */
let last=performance.now(),hudT=0;
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(paused&&!MODAL)paused=false;if(!paused)update(dt);try{draw(now)}catch(e){console.error(e)}hudT-=dt;if(hudT<=0){hud();hudT=.25}requestAnimationFrame(loop)}
init3d();showMenu();requestAnimationFrame(loop);
