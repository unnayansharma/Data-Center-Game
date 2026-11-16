"use strict";
/* ============ state ============ */
let S=null,MODAL=null,paused=false;
const keys={};
function startLevel(L,free){
  const seed=Date.now()%100000;closeModal();if(typeof ATTRACT!=='undefined'&&ATTRACT){ATTRACT=false;clearInterval(slideT);$('#attract').classList.add('hidden')}
  S={L,free,tier:free?1:tierOf(L),t:0,up:100,floor:0,px:8.5,py:22.5,dir:[0,-1],inv:[],inc:[],queue:free?[]:planLevel(L,seed),intr:[],track:null,over:false,nid:1,g:RNG(seed+L),
     npcs:NPCDEF.map(n=>({...n,x:n.x+.5,y:n.y+.5,pi:0,path:null,li:0})),wrong:0};
  R3.cx=null;$('#screen').classList.add('hidden');
  if(!free){paused=true;const labsIn=S.queue.filter(q=>TPL[q.id].lab).map(q=>LABS[TPL[q.id].lab]);
    openModal(`<h2>Shift ${L} — ${TIERS[S.tier]}</h2><div class="sub">${S.queue.length} incident${S.queue.length>1?'s':''} expected this shift${labsIn.length?` · ${labsIn.length} hands-on lab${labsIn.length>1?'s':''}: ${labsIn.map(l=>l.dom).join(', ')}`:''}</div>
   <div class="txt">${L===1?'Welcome to PAL Manesar DC, your first shift!\n\n• Move with WASD / arrow keys · zoom with mouse wheel or + / −\n• E (or Space) inspects equipment and talks to people — every new thing you inspect unlocks a Codex entry (C)\n• Stairs/lift (top-middle) change floors\n• Follow the orange arrow, beacon and the minimap blips (bottom-left)\n\nKeep SLA Health above 0. Wrong decisions cost SLA.':L===6?'New: your first TERMINAL LAB. Type real Linux commands. Stuck? Use the cheat-sheet on the right or the Hint button. While you work in a terminal, SLA drains more slowly.':'Fix every incident before SLA Health runs out. Wrong decisions cost SLA; fixing an incident restores a little.'+(S.tier>=3?'\n\nFrom here, some alarms are vague — check the NOC Video Wall (2F) to find the device.':'')}</div>
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
function resolve(inc){inc.done=true;S.resolved=(S.resolved||0)+1;S.up=Math.min(100,S.up+3);S.inc=S.inc.filter(i=>i!==inc);if(S.track===inc.id)S.track=S.inc[0]?.id||null;sfx.ok();toast('✅ Resolved: '+inc.title,'ok')}
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
function flavor(e){switch(e.kind){
 case'rack':return'Houses the servers, storage and network gear in standard slots, with dual power feeds and organised cabling.';
 case'ups':return'Keeps IT equipment running on clean, uninterrupted power and bridges the gap until generators take over.';
 case'crac':return'Precision cooling unit: supplies cold air to the cold aisle and controls temperature and humidity.';
 case'gen':return'Standby diesel generator. Starts automatically when grid power fails and carries the critical load.';
 case'fuel':return'Stores diesel for the generators so the site can run on its own during long grid outages.';
 case'ats':return'Automatic Transfer Switch: moves the load between grid power and generator power without manual action.';
 case'elec':return'Distributes incoming power through protective breakers to UPS, cooling and other building loads.';
 case'bypass':return'Lets the UPS be serviced while the IT load stays powered.';
 case'trafo':return'Steps the incoming high-voltage supply down to the voltage used inside the building.';
 case'batt':return'Battery strings that power the UPS during an outage. Every block is monitored continuously.';
 case'suppression':return'Controls the clean-agent gas fire suppression for the IT spaces — safe for people and electronics.';
 case'gas':return'Cylinders holding the clean-agent gas released by the suppression system in case of a confirmed fire.';
 case'leak':return'Monitors water-sensing cables under the raised floor and shows the exact zone of any leak.';
 case'vesda':return'Very early smoke detection: continuously samples the air and warns long before visible smoke.';
 case'facp':return'Fire Alarm Control Panel: supervises all detectors, call points and sounders across the building.';
 case'pa':return'Public address and voice evacuation system for announcements and automatic evacuation messages.';
 case'nvr':return'Records all CCTV cameras and keeps footage for the retention period set by policy.';
 case'access':return'Access control server: decides who may open which door, when — and logs every swipe.';
 case'bms':return'Building Management System: one view of cooling, power, leaks and environmental alarms.';
 case'switch':return'Core switch: connects all racks and network zones with redundant high-speed links and VLANs.';
 case'firewall':return'Next-generation firewall: filters traffic between the internet and internal zones using security rules.';
 case'router':return'Routes traffic between the data centre and the outside world over redundant provider links.';
 case'proxy':return'Secure web gateway: filters users\' web access and blocks malicious or risky sites.';
 case'lb':return'Load balancer: spreads requests across healthy servers and removes failed ones automatically.';
 case'ids':return'Intrusion detection / prevention: inspects traffic for known attack patterns and can block them.';
 case'patch':return'Structured cabling: fiber and copper links between racks, all labelled and documented.';
 case'san':return'Shared storage array: provides protected, high-availability storage to the servers.';
 case'tape':return'Robotic tape library for long-term and offline backup copies.';
 case'backup':return'Runs scheduled backups and restores so data can be recovered after failures or attacks.';
 case'kvm':return'Mobile keyboard, video and mouse cart for direct console access to any server.';
 case'siem':return'SIEM: collects and correlates security logs from across the site to detect threats.';
 case'pam':return'Privileged Access Management: vaults admin passwords and records every privileged session.';
 case'edr':return'Endpoint Detection & Response: watches servers and PCs for malicious behaviour and can isolate them.';
 case'cctv':return'Live view of all CCTV cameras across the site.';
 case'video':return'NOC video wall: real-time status of power, cooling, network and security across the data centre.';
 case'console':return'Monitoring console used by the NOC team to watch alerts and manage tickets.';
 case'reader':return'Badge + biometric reader controlling the mantrap — one person per authorised entry.';
 case'kiosk':return'Visitor registration: ID check, host approval and temporary badge printing.';
 case'parts':return'On-site spares for fast replacement of failed components.';
 case'tools':return'ESD-safe tools and wrist straps for handling sensitive electronics.';
 case'shutter':return'Secure loading dock door — every delivery is verified before entry.';
 case'mydesk':return'Your workstation. Admin access to servers goes through this MFA-protected jump host.';
 case'pantry':return'Tea and coffee. ☕';
 default:return'Part of the POWERGRID PAL Manesar data centre.'}}
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
  if(S.challenge){const rate=(.05+.0022*S.L)*(MODAL&&MODAL.work?.35:1);for(const i of S.inc)S.up-=i.sev*rate*dt;S.up=Math.max(0,S.up);
    if(S.t>=S.limit||S.up<=0||(!S.queue.length&&!S.inc.length)){S.over=true;if(MODAL)closeModal();challengeEnd()}return}
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
  $('#hLevel').textContent=S.challenge?'⚡ Visitor Challenge':S.free?'Free Roam':`Shift ${S.L} / 100`;$('#hTier').textContent=S.challenge?`Fixed: ${S.resolved||0} · Score ${chScore()}`:S.free?'Explore & learn':TIERS[S.tier];
  const u=Math.max(0,S.up);$('#slaFill').style.width=(S.free?100:u)+'%';$('#slaFill').style.background=u>60?'var(--ok)':u>30?'var(--acc)':'var(--bad)';
  $('#slaPct').textContent=S.free?'—':u.toFixed(1)+'%';$('#hTime').textContent=S.challenge?'⏳ '+fmt(Math.max(0,S.limit-S.t))+' left':'⏱ '+fmt(S.t);
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
  sc.innerHTML=`<div class="menu"><div class="mhead"><div><div class="brandbar"><img src="assets/logo-powergrid.jpg" onerror="this.remove()" alt=""><img src="assets/logo-powertel.jpg" onerror="this.remove()" alt=""></div><div class="title">DATA CENTER <span>SIMULATION</span></div><div class="loc">📍 POWERGRID PAL MANESAR</div><div class="tag">Run a 3-floor data center for 100 shifts. Fix power, cooling, servers and networks, configure switches, routers and firewalls, hunt attackers in the SIEM — and learn how every component works.</div>
  <div class="mbtns"><button onclick="startLevel(${SAVE.unlocked})">▶ ${SAVE.unlocked>1?'Continue — Shift '+SAVE.unlocked:'Start Shift 1'}</button><button onclick="showAcademy()">💻 Academy (${Object.keys(SAVE.labs).length}/${LAB_ORDER.length})</button><button onclick="showCodex()">📘 Codex (${Object.keys(SAVE.codex).length}/${Object.keys(CODEX).length})</button><button class="pri" onclick="startChallenge()">⚡ Visitor Challenge (3 min)</button><button onclick="showBoard()">🏆 Leaderboard</button><button onclick="startLevel(1,true)">🧭 Free Roam</button><button onclick="howTo()">❓ How to play</button></div>
  <div class="mbtns"><button onclick="toggleMute(this)">${SAVE.muted?'🔇 Sound off':'🔊 Sound on'}</button><button onclick="setTimeout(enterAttract,0)">🎞 Slideshow</button><button onclick="toggleFS()">⛶ Fullscreen</button><button onclick="toggleGfx(this)">🎨 Graphics: ${SAVE.gfx==='low'?'Low':'High'}</button></div>
  </div><div class="card lbcard"><h3>🏆 Leaderboard</h3><div class="sub" style="color:var(--mut);margin-bottom:8px">Visitor Challenge — top 10</div>${boardHTML(SAVE.board,10)}<div class="row"><button class="pri" onclick="startChallenge()">⚡ Play the challenge</button></div></div></div>
  <div class="card"><h3>Shifts <span style="color:var(--mut);font-weight:500;font-size:13px">· ${tot}/300 ★</span></h3>
  <div class="legend">${TIERS.slice(1).map((t,i)=>`<span><i style="background:${['#2a4d78','#2a6b55','#7a6230','#7a3434','#6a3d85'][i]}"></i>${t} (${['1–15','16–35','36–60','61–85','86–100'][i]})</span>`).join('')}</div>
  <div class="grid">${Array.from({length:100},(_,i)=>{const L=i+1,lk=L>SAVE.unlocked,s=SAVE.stars[L]||0;const sl=SCRIPT[L]?SCRIPT[L].find(x=>x.startsWith('L:')):null;return`<button class="lv t${tierOf(L)}" ${lk?'disabled':''} onclick="startLevel(${L})" title="${sl?esc(LABS[sl.slice(2)].t):''}">${lk?'🔒':L}<small>${sl?'💻':''}${'★'.repeat(s)}</small></button>`}).join('')}</div></div></div>`}
window.showMenu=showMenu;window.startLevel=startLevel;
window.toggleMute=b=>{SAVE.muted=!SAVE.muted;save();b.textContent=SAVE.muted?'🔇 Sound off':'🔊 Sound on'};
window.toggleGfx=b=>{SAVE.gfx=SAVE.gfx==='low'?'high':'low';save();b.textContent='🎨 Graphics: '+(SAVE.gfx==='low'?'Low':'High')+' (reload to apply)'};
window.howTo=()=>openModal(`<h2>How to play</h2><div class="txt">You are the on-shift engineer at POWERGRID PAL Manesar, a 3-floor data centre.

<b>G — Ground:</b> lobby, reception & visitor kiosk, mantrap, Security Office (CCTV, NVR, access control, fire alarm panel, PA, BMS), electrical room (switchgear, ATS, transformer), generator yard, storage (spare parts), loading dock.
<b>1F — Server Hall:</b> rows of server racks, SAN, tape library, backup server, CRAC cooling, VESDA, UPS room, network room (core switch, firewall, router, proxy, load balancer, IPS), batteries & gas suppression.
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
$('#bMap').onclick=()=>{if(MODAL&&MODAL.closable)closeModal();if(S&&!MODAL)showMap()};$('#bCodex').onclick=()=>{if(MODAL&&MODAL.closable)closeModal();if(!MODAL)showCodex()};
$('#bPause').onclick=()=>{if(MODAL&&MODAL.closable)closeModal();if(S&&!MODAL&&!S.over)pauseMenu();else if(!S)showMenu()};$('#bFS').onclick=()=>toggleFS();$('#bSnd').onclick=()=>{SAVE.muted=!SAVE.muted;save();$('#bSnd').textContent=SAVE.muted?'🔇':'🔊'};$('#bSnd').textContent=SAVE.muted?'🔇':'🔊';$('#miniwrap').onclick=()=>{if(S&&!MODAL)showMap()};
function pauseMenu(){paused=true;openModal(`<h2>Paused</h2><div class="sub">${S.free?'Free roam':'Shift '+S.L}</div><div class="opts"><button class="pri" id="rs">▶ Resume</button><button onclick="showCodex()">📘 Codex</button><button onclick="howTo()">❓ How to play</button><button id="rt">↺ Restart shift</button><button onclick="showMenu()">⌂ Main menu</button></div>`,false);
  $('#rs').onclick=()=>{paused=false;closeModal()};$('#rt').onclick=()=>{paused=false;startLevel(S.L,S.free)}}

/* ============ inauguration extras: visitor challenge, leaderboard, attract mode, fullscreen ============ */
const chScore=()=>!S?0:Math.max(0,(S.resolved||0)*100+(S.over?Math.round(S.up)*2:0)-(S.wrong||0)*20+((S.over&&!S.queue.length&&!S.inc.length)?Math.round(Math.max(0,S.limit-S.t))*2:0));
window.startChallenge=()=>{startLevel(9);closeModal();S.challenge=true;S.limit=180;S.resolved=0;
  S.queue=S.g.shuffle(['cable','badge','fan','cctv','vesda','reader','intruder','delivery','tailgate']).slice(0,5).map((id,i)=>({id,at:2+i*13}));paused=true;
  openModal(`<h2>⚡ Visitor Challenge</h2><div class="sub">POWERGRID PAL MANESAR · 3 minutes</div><div class="txt">Five incidents will hit the data centre. Fix as many as you can before time runs out!\n\n• Move: WASD / arrow keys (or the on-screen pad)\n• Interact: E / Space\n• Follow the orange arrow and the minimap blips\n\n100 points per incident · bonus for SLA health and time left · −20 per wrong decision.</div><div class="row"><button class="pri" onclick="closeModal()">Start! ▶</button></div>`)};
function challengeEnd(){const sc=chScore();setTimeout(()=>{openModal(`<h2>⏱ Time!</h2><div style="font-size:44px;font-weight:900;color:#ffd27a">${sc} pts</div><div class="txt">Incidents fixed: ${S.resolved||0}\nSLA health: ${S.up.toFixed(0)}%\nWrong decisions: ${S.wrong}</div><div class="lbl">ENTER YOUR NAME FOR THE LEADERBOARD</div><input class="namein" id="nm" maxlength="18" placeholder="Your name"><div class="row"><button class="pri" id="sv">Save score</button><button onclick="showMenu()">Skip</button></div>`,false);
  const nm=$('#nm');nm.focus();const sv=()=>{const n=(nm.value.trim()||'Guest').slice(0,18);SAVE.board=(SAVE.board||[]).concat({n,s:sc,d:Date.now()}).sort((a,b)=>b.s-a.s).slice(0,10);save();showBoard(n,sc)};$('#sv').onclick=sv;nm.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')sv()})},500)}
window.showBoard=(hn,hs)=>{const b=SAVE.board||[];openModal(`<h2>🏆 Leaderboard</h2><div class="sub">POWERGRID PAL MANESAR · Visitor Challenge — top 10</div>${boardHTML(b,10,hn,hs)}<div class="row"><button class="pri" onclick="startChallenge()">⚡ Play again</button><button onclick="showMenu()">Menu</button></div>`)};
window.toggleFS=()=>{try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>toast('Fullscreen is not allowed here — press F11','warn'))}catch(e){toast('Press F11 for fullscreen','warn')}};
let lastInput=performance.now(),ATTRACT=false;
function boardHTML(b,n,hn,hs){b=(b||[]).slice(0,n);return b.length?`<table class="board"><tr><th>#</th><th>Name</th><th>Score</th></tr>${b.map((r,i)=>`<tr${r.n===hn&&r.s===hs?' style="background:#2a2410"':''}><td>${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td><td>${esc(r.n)}</td><td>${r.s}</td></tr>`).join('')}</table>`:'<p>No scores yet — be the first to play the Visitor Challenge!</p>'}
const SLIDE_MS=8000;let slideI=0,slideT=null;
function slides(){const b=SAVE.board||[];const keys=Object.keys(CODEX);const fact=CODEX[keys[Math.floor(Math.random()*keys.length)]];
  return[
  `<h3>Welcome!</h3><p>Step inside a 3D data center at <b>POWERGRID PAL MANESAR</b> — walk the floors, meet the team and keep everything running.</p><ul><li>⚡ Power: grid, transformers, UPS, batteries and generators</li><li>❄️ Cooling, fire safety and building systems</li><li>🌐 Networks, firewalls and cyber security</li></ul>`,
  `<h3>🏆 Leaderboard — Visitor Challenge</h3>${boardHTML(b,10)}`,
  `<h3>What you can do</h3><ul><li>🔧 Fix real-world incidents: failed fans, disks, power cuts, water leaks</li><li>💻 Type real Linux commands and configure switches, routers and ACLs</li><li>🛡️ Hunt attackers in the SIEM, contain ransomware, manage privileged access</li><li>🚔 Catch intruders with the help of guards and CCTV</li></ul>`,
  `<h3>💡 Did you know? — ${esc(fact.t)}</h3><p>${esc(fact.body)}</p><p style="color:#ffd27a">Tip: ${esc(fact.tip)}</p>`,
  `<h3>⚡ Visitor Challenge — 3 minutes</h3><p>Fix as many incidents as you can and get your name on the board.</p><p>Score to beat:</p><div class="big">${b[0]?b[0].s+' pts':'—'}</div><p>${b[0]?'by '+esc(b[0].n):'Be the first!'}</p>`]}
function showSlide(){const all=slides();slideI=slideI%all.length;$('#slideWrap').innerHTML=`<div class="slide">${all[slideI]}</div><div class="dots">${all.map((_,i)=>`<i class="${i===slideI?'on':''}"></i>`).join('')}</div>`}
function enterAttract(){closeModal();if(S)showMenu();ATTRACT=true;$('#screen').classList.add('hidden');$('#attract').classList.remove('hidden');slideI=0;showSlide();clearInterval(slideT);slideT=setInterval(()=>{slideI++;showSlide()},SLIDE_MS)}
let attractExitT=0;addEventListener('click',e=>{if(performance.now()-attractExitT<600){e.preventDefault();e.stopPropagation()}},{capture:true});
function exitAttract(){ATTRACT=false;attractExitT=performance.now();clearInterval(slideT);$('#attract').classList.add('hidden');showMenu()}
window.enterAttract=enterAttract;
['keydown','pointerdown','wheel','touchstart','mousemove'].forEach(ev=>addEventListener(ev,e=>{lastInput=performance.now();if(ATTRACT&&ev!=='mousemove'){e.preventDefault();e.stopPropagation();exitAttract()}},{capture:true}));
setInterval(()=>{const idle=performance.now()-lastInput;if(ATTRACT)return;if(!S&&!MODAL&&idle>45000)enterAttract();else if(S&&idle>180000){closeModal();showMenu()}},1000);

/* ============ background music (generated live with Web Audio — no audio files needed) ============ */
const MUS={ctx:null,out:null,dly:null,timer:null,next:0,step:0,started:false};
const mtof=m=>440*Math.pow(2,(m-69)/12);
const PROG=[{root:45,ch:[57,60,64,69]},{root:41,ch:[53,57,60,65]},{root:48,ch:[52,55,60,64]},{root:43,ch:[55,59,62,67]}]; // Am F C G
function musVol(){return SAVE.music?Math.pow(SAVE.vol/100,1.5)*.5:0}
function musInit(){if(MUS.ctx)return true;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const c=AC;MUS.ctx=c;
  MUS.out=c.createGain();MUS.out.gain.value=musVol();const comp=c.createDynamicsCompressor();MUS.out.connect(comp);comp.connect(c.destination);
  MUS.dly=c.createDelay(1);MUS.dly.delayTime.value=.45;const fb=c.createGain();fb.gain.value=.35;const dl=c.createGain();dl.gain.value=.5;MUS.dly.connect(fb);fb.connect(MUS.dly);MUS.dly.connect(dl);dl.connect(MUS.out);
  const nb=c.createBuffer(1,c.sampleRate*.2,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;MUS.noise=nb;return true}catch(e){return false}}
function musNote(t,freq,dur,type,vol,cut,toDelay){const c=MUS.ctx,o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type=type;o.frequency.value=freq;f.type='lowpass';f.frequency.value=cut;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+Math.min(.04,dur*.3));g.gain.setTargetAtTime(0,t+dur*.6,dur*.25);o.connect(f);f.connect(g);g.connect(MUS.out);if(toDelay)g.connect(MUS.dly);o.start(t);o.stop(t+dur+.5)}
function musStep(t,st){const c=MUS.ctx,bar=Math.floor(st/16),b=st%16,P=PROG[bar%4],sec=Math.floor(bar/8)%2,S16=60/104/4;
  if(b===0)P.ch.slice(0,3).forEach((n,i)=>{musNote(t,mtof(n),S16*16,'sawtooth',.028,700+sec*500,false);musNote(t,mtof(n)*1.005,S16*16,'sawtooth',.02,700,false)});
  if([0,6,8,11,14].includes(b))musNote(t,mtof(P.root),S16*(b===0||b===8?3:1.6),'triangle',.16,600,false);
  if(sec===1||bar%8>=4){if(b%2===0){const n=P.ch[(b/2)%4]+12;musNote(t,mtof(n),S16*1.4,'square',.022,2200,true)}}
  if(b%4===0){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(40,t+.15);g.gain.setValueAtTime(b%8===0?.32:.14,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(MUS.out);o.start(t);o.stop(t+.3)}
  if(b%2===1){const n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=MUS.noise;f.type='highpass';f.frequency.value=7000;g.gain.setValueAtTime(b%4===3?.05:.025,t);g.gain.exponentialRampToValueAtTime(.001,t+.06);n.connect(f);f.connect(g);g.connect(MUS.out);n.start(t);n.stop(t+.08)}}
function musStart(){if(!SAVE.music||!musInit())return;if(MUS.ctx.state==='suspended')MUS.ctx.resume();if(MUS.timer)return;MUS.next=MUS.ctx.currentTime+.1;
  MUS.timer=setInterval(()=>{const S16=60/104/4;while(MUS.next<MUS.ctx.currentTime+.25){musStep(MUS.next,MUS.step++);MUS.next+=S16}},40)}
function musStop(){if(MUS.timer){clearInterval(MUS.timer);MUS.timer=null}}
function musApply(){if(MUS.out)MUS.out.gain.setTargetAtTime(musVol(),MUS.ctx.currentTime,.1);if(SAVE.music){if(MUS.started)musStart()}else setTimeout(()=>{if(!SAVE.music)musStop()},300);
  const b=$('#bMus');if(b){b.classList.toggle('off',!SAVE.music);b.textContent=SAVE.music?'🎵 Music':'🎵 Off'}const v=$('#vol');if(v)v.value=SAVE.vol}
$('#bMus').onclick=()=>{SAVE.music=!SAVE.music;save();musApply()};
$('#vol').addEventListener('input',e=>{SAVE.vol=+e.target.value;if(SAVE.vol>0&&!SAVE.music)SAVE.music=true;save();musApply()});
$('#vol').addEventListener('keydown',e=>e.stopPropagation());
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>{if(!MUS.started&&SAVE.music){MUS.started=true;musStart()}},{once:false,passive:true}));
document.addEventListener('visibilitychange',()=>{if(!MUS.ctx)return;if(document.hidden)MUS.ctx.suspend();else if(SAVE.music)MUS.ctx.resume()});
musApply();

/* ============ loop ============ */
let last=performance.now(),hudT=0;
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(paused&&!MODAL)paused=false;if(!paused)update(dt);try{draw(now)}catch(e){console.error(e)}hudT-=dt;if(hudT<=0){hud();hudT=.25}requestAnimationFrame(loop)}
init3d();showMenu();enterAttract();requestAnimationFrame(loop);
$('#bSlide').onclick=()=>setTimeout(enterAttract,0);
