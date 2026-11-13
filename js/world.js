"use strict";
/* ============ basics ============ */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(n).padStart(2,'0');
function RNG(seed){let s=(seed>>>0)||1;const f=()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296};
  f.int=n=>Math.floor(f()*n);f.pick=a=>a[f.int(a.length)];
  f.shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=f.int(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};return f}
const COLS=40,ROWS=25;

/* ============ save ============ */
let MEMSAVE=null;
function loadSave(){let v=null;try{v=JSON.parse(localStorage.getItem('dcops_save3')||'null')}catch(e){}v=v||MEMSAVE||{};
  return Object.assign({unlocked:1,stars:{},codex:{},labs:{},gfx:'high',muted:false},v)}
function save(){MEMSAVE=SAVE;try{localStorage.setItem('dcops_save3',JSON.stringify(SAVE))}catch(e){}}
let SAVE=loadSave();

/* ============ audio ============ */
let AC=null;
function beep(f=660,d=.12,type='square',v=.04){if(SAVE.muted)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;g.gain.value=v;o.connect(g);g.connect(AC.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.stop(AC.currentTime+d)}catch(e){}}
const sfx={alert(){beep(880,.15);setTimeout(()=>beep(660,.15),160)},ok(){beep(523,.1,'sine',.06);setTimeout(()=>beep(784,.18,'sine',.06),110)},bad(){beep(140,.25,'sawtooth',.05)},key(){beep(1800,.015,'square',.008)},unlock(){beep(660,.08,'sine',.05);setTimeout(()=>beep(990,.12,'sine',.05),90)}};

/* ============ building ============ */
const FLOORS=[{name:'Ground Floor',short:'G'},{name:'1st Floor',short:'1F'},{name:'2nd Floor',short:'2F'}];
const STAIRS={n:'Stairs / Lift',x:13,y:0,w:6,h:6,c:'#5c6068',d:[[15,5],[16,5]]};
const ROOMS=[
 [{n:'Security Office',x:0,y:0,w:13,h:11,c:'#4b5566',d:[[6,10]]},STAIRS,
  {n:'Electrical Room',x:19,y:0,w:11,h:11,c:'#5d5a52',d:[[24,10]]},
  {n:'Generator Yard',x:29,y:0,w:11,h:11,c:'#5b5e58',d:[[34,10]]},
  {n:'Main Lobby',x:0,y:13,w:18,h:12,c:'#8a8272',d:[[8,24],[9,24],[17,18]]},
  {n:'Mantrap',x:17,y:16,w:5,h:5,c:'#6a5a64',d:[[17,18],[19,16]]},
  {n:'Storage',x:21,y:13,w:6,h:12,c:'#5e5a50',d:[[23,13]]},
  {n:'Loading Dock',x:26,y:13,w:14,h:12,c:'#5f6366',d:[[30,13],[39,19],[39,20]]}],
 [{n:'UPS Room',x:0,y:0,w:13,h:11,c:'#56606e',d:[[6,10]]},STAIRS,
  {n:'Network Room',x:19,y:0,w:11,h:11,c:'#55636a',d:[[24,10]]},
  {n:'Battery & Fire Control',x:29,y:0,w:11,h:11,c:'#5f5650',d:[[34,10]]},
  {n:'Server Hall',x:0,y:13,w:40,h:12,c:'#8d949c',d:[[8,13],[20,13],[32,13]]}],
 [{n:'Ops Manager Cabin',x:0,y:0,w:13,h:11,c:'#5a5466',d:[[6,10]]},STAIRS,
  {n:'NOC — Network Operations Centre',x:19,y:0,w:21,h:11,c:'#3f4a5e',d:[[24,10],[34,10]]},
  {n:'Open Office',x:0,y:13,w:26,h:12,c:'#5a6272',d:[[8,13],[20,13]]},
  {n:'SOC — Security Operations',x:25,y:13,w:9,h:12,c:'#3b4558',d:[[29,13]]},
  {n:'Pantry',x:33,y:13,w:7,h:12,c:'#8a7a66',d:[[36,13]]}]
];
const CORRIDOR='#6b6f76';
const GRID=[],ZONE=[],SOLID=[];
for(let f=0;f<3;f++){
  const g=Array.from({length:ROWS},()=>Array(COLS).fill(0)),z=Array.from({length:ROWS},()=>Array(COLS).fill(-1));
  ROOMS[f].forEach((r,i)=>{for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){if(x<0||y<0||x>=COLS||y>=ROWS)continue;
    if(x===r.x||y===r.y||x===r.x+r.w-1||y===r.y+r.h-1)g[y][x]=1;else z[y][x]=i}});
  for(let x=0;x<COLS;x++){g[0][x]=1;g[ROWS-1][x]=1}for(let y=0;y<ROWS;y++){g[y][0]=1;g[y][COLS-1]=1}
  ROOMS[f].forEach(r=>r.d.forEach(([x,y])=>g[y][x]=2));
  GRID.push(g);ZONE.push(z);
}
const ENT=[],EBY={};
function E(f,id,label,kind,x,y,w=1,h=1){const e={f,id,label,kind,x,y,w,h};ENT.push(e);EBY[id]=e;return e}
// ---- Ground floor
E(0,'cctv','CCTV Video Wall','cctv',1,1,6,1);E(0,'nvr','NVR Recorder','nvr',8,1,2,1);E(0,'pa','PA / Voice Evac','pa',11,1,1,2);
E(0,'secdesk','Access Control Server','access',3,5,4,1);E(0,'facp','Fire Alarm Panel (FACP)','facp',11,5,1,2);E(0,'bms','BMS / EMS Console','bms',2,8,4,1);
E(0,'stairs0','Stairs / Lift','stairs',14,1,4,3);
E(0,'switchgear','LT Switchgear','elec',20,1,4,2);E(0,'ats','ATS Panel','ats',25,1,2,2);E(0,'mdb','Main Distribution Board','elec',20,6,1,3);E(0,'trafo','Transformer','trafo',26,6,2,2);
E(0,'gen1','Generator G1','gen',30,2,3,3);E(0,'gen2','Generator G2','gen',35,2,3,3);E(0,'fuel','Diesel Fuel Tank','fuel',30,7,7,1);
E(0,'reception','Reception Desk','desk',3,17,6,1);E(0,'kiosk','Visitor Kiosk','kiosk',13,15,1,1);E(0,'bioreader','Biometric Reader','reader',20,19,1,1);
E(0,'parts','Spare Parts Cabinet','parts',22,15,4,1);E(0,'toolrack','ESD Tool Rack','tools',22,21,1,2);
E(0,'shutter','Dock Shutter','shutter',38,14,1,3);E(0,'crates','Delivery Crates','crates',28,19,3,3);E(0,'dockdesk','Dock Check-in Desk','desk',32,22,3,1);
// ---- 1st floor
E(1,'stairs1','Stairs / Lift','stairs',14,1,4,3);
E(1,'upsA','UPS-A','ups',2,2,3,3);E(1,'upsB','UPS-B','ups',7,2,3,3);E(1,'bypass','UPS Maintenance Bypass','bypass',3,7,6,1);
E(1,'coresw','Core Switch','switch',20,2,2,2);E(1,'fw','Edge Firewall','firewall',23,2,2,2);E(1,'router','Core / Edge Router','router',26,2,2,2);
E(1,'proxy','Web Proxy','proxy',20,5,2,1);E(1,'lb','Load Balancer','lb',23,5,2,1);E(1,'ids','IDS / IPS Sensor','ids',26,5,2,1);E(1,'patch','Fiber Patch Panel','patch',21,7,6,1);
E(1,'battA','Battery String A','batt',30,2,4,1);E(1,'battB','Battery String B','batt',30,5,4,1);
E(1,'firepanel','Gas Suppression Panel','suppression',37,2,1,2);E(1,'leakpanel','Leak Detection Panel','leak',37,6,1,2);E(1,'gascyl','Clean-Agent Gas Cylinders','gas',30,8,3,1);
E(1,'crac1','CRAC-1','crac',1,15,1,2);E(1,'crac2','CRAC-2','crac',1,20,1,2);E(1,'crac3','CRAC-3','crac',38,15,1,2);E(1,'crac4','CRAC-4','crac',38,20,1,2);
['A','B','C'].forEach((r,ri)=>{const y=[15,18,21][ri];let n=1;for(const [a,b] of [[4,17],[22,33]])for(let x=a;x<=b;x++){E(1,'rack-'+r+pad(n),'Rack '+r+pad(n),'rack',x,y);n++}});
E(1,'san','SAN Storage Array','san',34,15,2,1);E(1,'tape','Tape Library','tape',34,18,2,1);E(1,'backup','Backup Server','backup',34,21,2,1);
E(1,'vesda','VESDA Detector','vesda',19,23,1,1);E(1,'kvm','KVM Crash Cart','kvm',21,23,1,1);
// ---- 2nd floor
E(2,'stairs2','Stairs / Lift','stairs',14,1,4,3);
E(2,'mgrdesk','Ops Manager Desk','desk',4,4,4,1);
E(2,'videowall','NOC Video Wall','video',20,1,19,1);E(2,'noc1','NOC Console 1','console',22,5,5,1);E(2,'noc2','NOC Console 2','console',31,5,5,1);
E(2,'desk1','Your Desk (Jump Host)','mydesk',3,16,4,2);
[[10,16],[17,16],[3,20],[10,20],[17,20]].forEach(([x,y],i)=>E(2,'desk'+(i+2),'Desk Cluster '+(i+2),'desk',x,y,4,2));
E(2,'siem','SIEM Console','siem',27,15,4,1);E(2,'pam','PAM Vault Console','pam',27,18,4,1);E(2,'edr','EDR Console','edr',27,21,4,1);
E(2,'pantry','Pantry & Coffee Machine','pantry',34,15,5,1);
// decor (solid, not interactive)
const DECOR=[[0,1,14],[0,16,14],[0,1,23],[0,16,23],[0,10,9],[2,1,14],[2,24,14],[2,24,23],[2,11,1],[2,38,9],[2,20,9],[1,11,9]].map(([f,x,y])=>({f,x,y,k:'plant'}));
for(let f=0;f<3;f++)SOLID.push(GRID[f].map(r=>r.map(v=>v===1)));
ENT.forEach(e=>{for(let y=e.y;y<e.y+e.h;y++)for(let x=e.x;x<e.x+e.w;x++)SOLID[e.f][y][x]=true});
DECOR.forEach(d=>SOLID[d.f][d.y][d.x]=true);
const solid=(f,x,y)=>x<0||y<0||x>=COLS||y>=ROWS||SOLID[f][y][x];
const WALK=[0,1,2].map(f=>{const a=[];for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(!SOLID[f][y][x]&&GRID[f][y][x]===0)a.push([x,y]);return a});
const roomAt=(f,x,y)=>{const z=ZONE[f][y|0]?.[x|0];return z>=0?ROOMS[f][z].n:'Corridor'};
const eRoom=e=>roomAt(e.f,e.x+(e.w>>1),e.y+(e.h>>1));
const eWhere=e=>`${FLOORS[e.f].short} · ${eRoom(e)}`;
const stairsOf=f=>EBY['stairs'+f];
function bfs(f,sx,sy,tx,ty){sx|=0;sy|=0;tx|=0;ty|=0;if(solid(f,tx,ty))return null;const prev=new Int16Array(COLS*ROWS).fill(-1),s=sy*COLS+sx,t=ty*COLS+tx;prev[s]=s;const q=[s];let h=0;
  while(h<q.length){const c=q[h++];if(c===t)break;const cx=c%COLS,cy=(c/COLS)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(solid(f,nx,ny))continue;const n=ny*COLS+nx;if(prev[n]!==-1)continue;prev[n]=c;q.push(n)}}
  if(prev[t]===-1)return null;const p=[];let c=t;while(c!==s){p.push([c%COLS,(c/COLS)|0]);c=prev[c]}return p.reverse()}

/* ============ NPCs ============ */
const NPCDEF=[
 {f:0,name:'Raju',role:'Guard',x:12,y:20,k:'guard',lines:['Welcome to DC-1! Badge through the mantrap to reach the inner corridor.','Visitors need photo ID, a pre-approved visit and an escort. No exceptions.','If I see anything suspicious I\'ll radio it in. Ask me any time.']},
 {f:0,name:'Meena',role:'Security Supervisor',x:9,y:4,k:'guard',lines:['Cameras record to the NVR and we keep footage 90 days. During an intrusion, check the CCTV wall.','Tailgating — one badge, two people — is the most common way strangers get in.','The access control server logs every swipe. Anti-passback stops people sharing badges.']},
 {f:0,name:'Imran',role:'ELV Technician',x:5,y:3,k:'staff',lines:['ELV = Extra Low Voltage: CCTV, access control, fire alarm, PA, BMS — all the "building brains".','The Fire Alarm Panel shows ALARMS (fire) and TROUBLES (faults like an earth fault). Never ignore troubles.','VESDA sucks air through pipes and spots smoke long before a normal detector would.']},
 {f:0,name:'Dev',role:'Facility Engineer',x:27,y:4,k:'staff',lines:['Power path: utility → transformer → switchgear → ATS → UPS → PDU → rack. Know it by heart.','We load-test the generators every month. A generator that is never tested is a generator that will not start.','The ATS flips the building from grid to generator automatically in a few seconds.']},
 {f:0,name:'Vikram',role:'Dock Guard',x:34,y:18,k:'guard',lines:['No delivery gets in without a matching purchase order or change ticket.','The diesel tanker for the generators uses this dock too.']},
 {f:0,name:'Pooja',role:'Receptionist',x:6,y:15,k:'staff',lines:['Good morning! Visitors register at the kiosk.','Forgot your badge? I\'ll need photo ID and your manager\'s approval.']},
 {f:1,name:'Sunil',role:'Patrol Guard',x:3,y:14,k:'guard',patrol:[[3,14],[36,14],[36,23],[3,23]],lines:['Cold aisle in front of the racks, hot aisle behind. I walk them all night.','Servers breathe cold air in the front and push hot air out the back.']},
 {f:1,name:'Neha',role:'Network Engineer',x:24,y:8,k:'staff',lines:['VLANs split one physical switch into separate networks — CCTV, BMS, servers, guests.','ACLs are read top-down and stop at the first match. Order matters!','"show running-config" tells you what IS configured. "write memory" makes it survive a reboot.']},
 {f:2,name:'Priya',role:'Ops Manager',x:9,y:4,k:'boss',lines:['Our SLA promises 99.99% uptime — only ~52 minutes of downtime a year.','Every incident needs a ticket, a timeline and a root cause.','N+1 means one more unit than you need, so one can fail without an outage. 2N means a full duplicate.']},
 {f:2,name:'Arjun',role:'NOC Engineer',x:24,y:7,k:'staff',lines:['The video wall shows every alarm in the building.','When an alert is vague, check the video wall first — it names the exact device.']},
 {f:2,name:'Zoya',role:'SOC Analyst',x:31,y:20,k:'staff',lines:['The SIEM collects logs from firewalls, servers, VPN and EDR, then correlates them into alerts.','PAM means nobody knows the root passwords — they are checked out, recorded, then rotated.','Incident response: Prepare → Detect → Contain → Eradicate → Recover → Lessons learned.']},
 {f:2,name:'Kabir',role:'SysAdmin',x:8,y:18,k:'staff',lines:['On Linux: df -h for disk, free -m for memory, journalctl for logs, ss -tlnp for ports.','Least privilege: give users and files only the access they need — nothing more.','Backups you have never test-restored are not backups.']},
];
