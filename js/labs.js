"use strict";
/* ================= Terminal lab engine ================= */
const LABS={};
const DOMCOL={Linux:'#3ccf91',Network:'#5aa9ff',Firewall:'#ff8a3c',Proxy:'#e3c34a',SIEM:'#c17bff',EDR:'#ff5d8a',PAM:'#4fd1c5'};
function lab(id,o){o.id=id;LABS[id]=o}
const ipInt=s=>{const p=String(s).split('.').map(Number);if(p.length!==4||p.some(x=>!(x>=0&&x<=255)||isNaN(x)))return null;return(((p[0]<<24)>>>0)+(p[1]<<16)+(p[2]<<8)+p[3])>>>0};
const inCidr=(ip,c)=>{if(c==='any')return true;const [n,b]=c.split('/');const bits=b==null?32:+b;const a=ipInt(ip),m=ipInt(n);if(a==null||m==null)return false;const mask=bits===0?0:(~0<<(32-bits))>>>0;return((a&mask)>>>0)===((m&mask)>>>0)};
const IOSP={exec:'#',conf:'(config)#',if:'(config-if)#',vlan:'(config-vlan)#',acl:'(config-ext-nacl)#',rtr:'(config-router)#'};
function iosCommon(c,s){
  if(/^en(able)?$/.test(c))return'';
  if(/^conf(igure)?( t(erminal)?)?$/.test(c)){s.mode='conf';return'Enter configuration commands, one per line.  End with CNTL/Z.'}
  if(c==='end'){s.mode='exec';return''}
  if(c==='exit'){s.mode=(s.mode==='exec'||s.mode==='conf')?'exec':'conf';return''}
  return undefined}
const linP=(host,u='kabir')=>s=>`${u}@${host}:~$ `;
const needSudo='Permission denied. (Tip: this needs admin rights — prefix the command with sudo)';

let LABRUN=null;
function runLab(id,opt={}){
  const L=LABS[id];const holder=opt.holder||{};
  let R=holder.run;if(!R){R={st:L.init?L.init(RNG((Date.now()^(id.length*7919))>>>0)):{},done:{},log:[],hist:[],unk:0};if(L.ios)R.st.mode='exec';holder.run=R;
    R.log.push({t:`${L.host} — ${L.dom} lab\n${L.intro||''}`,c:'sys'})}
  LABRUN={L,R,opt,hi:R.hist.length};
  openModal(`<div class="labhdr"><span class="dom" style="background:${DOMCOL[L.dom]}">${L.dom}</span><h2>${esc(L.t)}</h2></div>
  <div class="labgrid"><div class="termcol"><div class="term" id="tout"></div><div class="tin"><span id="tps"></span><input id="tinput" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type a command…"></div>
   <div class="row"><button id="tHint">💡 Hint</button><button id="tHelp">? help</button><button id="tClose">Close (Esc)</button></div></div>
  <div class="labside"><div class="lbl">MISSION</div><div class="brief">${esc(L.brief)}</div><div class="lbl">OBJECTIVES</div><div id="tobj"></div><div id="tfin"></div>
   <details ${opt.cheatClosed?'':'open'}><summary>📖 Command cheat-sheet <small>(click to paste)</small></summary><div class="cheat">${L.cheat.map(x=>{const i=x.indexOf(' — ');const cmd=i<0?x:x.slice(0,i),d=i<0?'':x.slice(i+3);return`<div><code data-c="${esc(cmd)}">${esc(cmd)}</code>${d?' <span>'+esc(d)+'</span>':''}</div>`}).join('')}</div></details></div></div>
  <div id="tedit" class="hidden"><div class="lbl" id="tedName"></div><textarea id="tedArea" spellcheck="false"></textarea><div class="row"><button class="pri" id="tedSave">Save (Ctrl+S)</button><button id="tedCancel">Cancel (Esc)</button></div></div>`,true,'wide');
  MODAL.work=true;
  const inp=$('#tinput');
  inp.addEventListener('keydown',e=>{e.stopPropagation();
    if(e.key==='Enter'){labExec(inp.value);inp.value='';LABRUN.hi=R.hist.length}
    else if(e.key==='ArrowUp'){if(LABRUN.hi>0){LABRUN.hi--;inp.value=R.hist[LABRUN.hi]||''}e.preventDefault()}
    else if(e.key==='ArrowDown'){if(LABRUN.hi<R.hist.length){LABRUN.hi++;inp.value=R.hist[LABRUN.hi]||''}e.preventDefault()}
    else if(e.key==='Escape'){closeModal()}
    else if(e.key==='Tab'){e.preventDefault();const v=inp.value;const c=L.cheat.map(x=>x.split(' — ')[0]).find(x=>x.startsWith(v)&&x!==v);if(c)inp.value=c.replace(/<.*$/,'')}
    else sfx.key()});
  document.querySelectorAll('.cheat code').forEach(c=>c.onclick=()=>{inp.value=c.dataset.c.replace(/<[^>]*>/g,'');inp.focus()});
  $('#tHint').onclick=()=>{labHint();inp.focus()};$('#tHelp').onclick=()=>{labExec('help');inp.focus()};$('#tClose').onclick=closeModal;
  $('#tout').onclick=()=>inp.focus();
  labRender();setTimeout(()=>inp.focus(),30);
}
function labPrint(t,c){LABRUN.R.log.push({t,c});if(LABRUN.R.log.length>400)LABRUN.R.log.shift()}
function labRender(){const {L,R}=LABRUN;const o=$('#tout');if(!o)return;
  o.innerHTML=R.log.map(l=>`<div class="${l.c||''}">${esc(l.t)}</div>`).join('');o.scrollTop=o.scrollHeight;
  $('#tps').textContent=labPrompt();
  $('#tobj').innerHTML=L.obj.map(([k,t])=>`<div class="obj ${R.done[k]?'done':''}">${R.done[k]?'✅':'⬜'} ${esc(t)}</div>`).join('');
  if(R.finished)$('#tfin').innerHTML=`<div class="explain"><b>✔ Lab complete!</b><br>${esc(L.learn)}</div><div class="row"><button class="pri" id="tDone">Continue ▶</button></div>`,$('#tDone').onclick=()=>{const od=LABRUN.opt.onDone;closeModal();od&&od()}}
function labPrompt(){const {L,R}=LABRUN;return L.ios?L.host+(IOSP[R.st.mode]||'#')+' ':L.prompt(R.st)}
function labHint(){const {L,R}=LABRUN;const o=L.obj.find(([k])=>!R.done[k]);if(!o){labPrint('All objectives done!','ok')}else labPrint('💡 '+(o[2]||o[1]),'hint');labRender()}
function labExec(line){const {L,R,opt}=LABRUN;if(R.finished&&!line.trim())return;const raw=line.trim();labPrint(labPrompt()+raw,'cmd');if(!raw){labRender();return}
  R.hist.push(raw);let c=raw.replace(/\s+/g,' ');if(L.lower)c=c.toLowerCase();
  if(c==='clear'){R.log=[];labRender();return}
  if(c==='help'||c==='?'){labPrint('Commands this system understands:\n  '+L.cheat.map(x=>x.split(' — ')[0]).join('\n  ')+'\n  hint · clear · exit');labRender();return}
  if(c==='hint'){labHint();return}
  if((c==='exit'&&!L.ios)||c==='quit'||c==='logout'){closeModal();return}
  let sudo=false;if(L.dom==='Linux'&&/^sudo /.test(c)){sudo=true;c=c.slice(5).trim();if(c==='su'||c==='su -'||c==='-i'){labPrint('Avoid a full root shell — use sudo per command so every action is logged.','hint');labRender();return}}
  if(L.ios&&c.startsWith('do '))c=c.slice(3);
  const api={sudo,st:R.st,
    ok:k=>{if(R.done[k])return;R.done[k]=1;const o=L.obj.find(x=>x[0]===k);labPrint('✔ Objective complete: '+(o?o[1]:k),'ok');sfx.ok()},
    pen:m=>{labPrint('✖ '+m,'bad');if(opt.pen)opt.pen(m);else sfx.bad()},
    edit:(path,text,onSave)=>labEditor(path,text,onSave)};
  let out;
  for(const [re,fn] of L.cmds){const m=c.match(re);if(m){out=fn(m,R.st,api);break}}
  if(out===undefined&&L.ios)out=iosCommon(c,R.st);
  if(out===undefined){R.unk++;out=L.ios?'% Invalid input detected at \'^\' marker.':L.dom==='Linux'?`${c.split(' ')[0]}: command not found`:'Unknown command.';out+=' (type "help" or "hint")';if(R.unk%3===0)out+='\n💡 Stuck? Click a command in the cheat-sheet on the right.'}
  if(out)labPrint(out,'');
  labCheckDone();labRender()}
function labCheckDone(){const {L,R}=LABRUN;if(!R.finished&&L.obj.every(([k])=>R.done[k])){R.finished=true;labPrint('\n★ All objectives complete. Great work!','ok');SAVE.labs[L.id]=1;save();if(L.cx)unlockCodex(L.cx)}}
function labEditor(path,text,onSave){const ed=$('#tedit');ed.classList.remove('hidden');$('#tedName').textContent='GNU nano — '+path+'   (edit the text, then Save)';const ta=$('#tedArea');ta.value=text;ta.focus();
  const close=()=>{ed.classList.add('hidden');$('#tinput').focus()};
  const doSave=()=>{const r=onSave(ta.value);close();labPrint(`[ Wrote ${ta.value.split('\n').length} lines to ${path} ]`+(r?'\n'+r:''),'');labCheckDone();labRender()};
  $('#tedSave').onclick=doSave;$('#tedCancel').onclick=close;
  ta.onkeydown=e=>{e.stopPropagation();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();doSave()}else if(e.key==='Escape')close()}}

/* ================= LINUX LABS ================= */
lab('lx-disk',{t:'Disk full on an app server',dom:'Linux',host:'app-14',cx:'linux',prompt:linP('app-14'),
 intro:'[ALERT] / is 100% full. The app is failing with "No space left on device".',
 brief:'The root filesystem is full so the application cannot write. Find what is using the space, free it safely, and restart the app.',
 obj:[['find','See which filesystem is full','Run: df -h'],['big','Find the biggest file in /var/log','Run: du -sh /var/log/*'],['free','Free the space safely','Run: sudo truncate -s 0 /var/log/<big file>'],['restart','Restart the app service','Run: sudo systemctl restart app']],
 cheat:['df -h — disk usage per filesystem','du -sh /var/log/* — size of each item','ls -lh /var/log — list files with sizes','sudo truncate -s 0 /var/log/<file> — empty a file safely','sudo rm /var/log/<file> — delete a file','sudo journalctl --vacuum-size=200M — trim system journal','sudo systemctl restart app — restart the service','systemctl status app — check the service'],
 learn:'df shows filesystems, du shows folder sizes. Deleting a file that a process still has open does NOT free space until that process restarts — truncating is safer. Prevent repeats with logrotate.',
 init:g=>({f:g.pick(['app.log','debug.log','worker.log']),sz:40+g.int(40),freed:false,rm:false,rs:false}),
 cmds:[
  [/^df( -h| -hT| -Th)?$/,(m,s,a)=>{a.ok('find');const u=s.freed?100-s.sz:100;return`Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1       100G  ${u}G  ${100-u}G  ${u}% /\n/dev/sdb1       500G  120G  380G  24% /data\ntmpfs           7.8G     0  7.8G   0% /dev/shm`}],
  [/^du( -\w+)* \/var\/log\/?\*?$/,(m,s,a)=>{a.ok('big');return`8.0K\t/var/log/auth.log\n2.1M\t/var/log/nginx\n118M\t/var/log/syslog\n${s.freed?'0':s.sz+'G'}\t/var/log/${s.f}   <-- !!`}],
  [/^du/,(m,s)=>'Tip: point du at a folder, e.g. du -sh /var/log/*'],
  [/^ls( -\w+)* \/var\/log\/?$/,(m,s)=>`-rw-r----- 1 syslog adm  8.0K auth.log\ndrwxr-xr-x 2 root   root 4.0K nginx\n-rw-r----- 1 syslog adm  118M syslog\n-rw-r--r-- 1 app    app  ${s.freed?'0':s.sz+'G'} ${s.f}`],
  [/^truncate -s ?0 (\S+)$/,(m,s,a)=>{if(!a.sudo)return'truncate: cannot open \''+m[1]+'\' for writing: '+needSudo;if(m[1].endsWith(s.f)){s.freed=true;a.ok('free');return''}return'(emptied — but that was not the big file)'}],
  [/^journalctl --vacuum/,(m,s,a)=>a.sudo?'Vacuuming done, freed 96.0M of archived journals.\n(Helpful, but the giant file is still there.)':needSudo],
  [/^rm( -f| -rf)? (\S+)$/,(m,s,a)=>{if(!a.sudo)return'rm: cannot remove: '+needSudo;if(m[2]==='/'||m[2]==='/*'){a.pen('You tried to delete the whole system!');return'rm: it is dangerous to operate recursively on \'/\''}if(m[2].endsWith(s.f)){s.rm=true;return'⚠ Deleted — but the app still holds this file open, so the space is NOT freed until the app restarts.'}return'removed (small file, nothing changed)'}],
  [/^systemctl restart app$/,(m,s,a)=>{if(!a.sudo)return'Failed to restart app.service: Access denied (use sudo)';if(s.rm&&!s.freed){s.freed=true;a.ok('free')}if(!s.freed)return'Job for app.service failed: No space left on device';s.rs=true;a.ok('restart');return''}],
  [/^systemctl status app$/,s=>'● app.service - Orders App\n   Active: '+(LABRUN.R.st.rs?'active (running)':'active (running) — errors: ENOSPC No space left on device')]]});

lab('lx-service',{t:'Website down: nginx will not start',dom:'Linux',host:'web-07',cx:'linux',prompt:linP('web-07'),
 intro:'[ALERT] https://shop.dc1.example is DOWN. nginx.service is in "failed" state.',
 brief:'The web server failed to start. Find out why, fix it, and make sure it starts automatically after a reboot.',
 obj:[['status','Check why nginx failed','Run: systemctl status nginx'],['port','Find which process is using port 80','Run: sudo ss -tlnp'],['kill','Stop the stray process','Run: sudo kill <PID of python3>'],['start','Start nginx','Run: sudo systemctl start nginx'],['enable','Make nginx start on boot','Run: sudo systemctl enable nginx']],
 cheat:['systemctl status nginx — service state + last log lines','journalctl -u nginx -n 20 — service logs','sudo ss -tlnp — listening ports with process names','ps aux — all processes','sudo kill <pid> — stop a process','sudo systemctl start nginx — start the service','sudo systemctl enable nginx — start on boot','curl -I http://localhost — test the site'],
 learn:'"Address already in use" means another process holds the port. ss -tlnp (with sudo) shows who. Always find what a process is before killing it, and enable services so they survive reboots.',
 init:g=>({pid:2000+g.int(6000),pg:900+g.int(800),killed:false,up:false}),
 cmds:[
  [/^systemctl status nginx$|^journalctl -u nginx/,(m,s,a)=>{a.ok('status');return s.up?'● nginx.service - A high performance web server\n   Active: active (running)':'● nginx.service - A high performance web server\n   Active: failed (Result: exit-code)\n   nginx[812]: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)'}],
  [/^(ss|netstat) -\w+$|^lsof -i ?:?80$/,(m,s,a)=>{if(!a.sudo)return'State   Local Address:Port\nLISTEN  0.0.0.0:22\nLISTEN  0.0.0.0:80\nLISTEN  127.0.0.1:5432\n(process names hidden — run with sudo to see them)';a.ok('port');return`State   Local Address:Port   Process\nLISTEN  0.0.0.0:22           users:(("sshd",pid=812))\n${s.killed?'':`LISTEN  0.0.0.0:80           users:(("python3",pid=${s.pid}))   <- test web server left by a developer\n`}LISTEN  127.0.0.1:5432       users:(("postgres",pid=${s.pg}))${s.up?'\nLISTEN  0.0.0.0:80           users:(("nginx",pid=4411))':''}`}],
  [/^ps( aux| -ef)?$/,(m,s)=>`USER      PID  COMMAND\nroot      812  /usr/sbin/sshd -D\npostgres  ${s.pg}  postgres -D /var/lib/postgresql\n${s.killed?'':`dev       ${s.pid}  python3 -m http.server 80\n`}${s.up?'root      4411 nginx: master process':''}`],
  [/^kill( -9| -15| -TERM| -KILL)? (\d+)$/i,(m,s,a)=>{const p=+m[2];if(p===s.pid){if(!a.sudo)return`kill: (${p}) - Operation not permitted (it belongs to user "dev" — use sudo)`;s.killed=true;a.ok('kill');return''}if(p===s.pg){a.pen('You stopped PostgreSQL — the database went down!');return''}if(p===812){a.pen('You killed sshd — remote access lost!');return''}return`kill: (${p}) - No such process`}],
  [/^systemctl (start|restart) nginx$/,(m,s,a)=>{if(!a.sudo)return'Failed to start nginx.service: Access denied (use sudo)';if(!s.killed)return'Job for nginx.service failed because the control process exited with error code.\nSee "systemctl status nginx" for details.';s.up=true;a.ok('start');return''}],
  [/^systemctl enable nginx$/,(m,s,a)=>{if(!a.sudo)return'Access denied (use sudo)';a.ok('enable');return'Created symlink /etc/systemd/system/multi-user.target.wants/nginx.service → /lib/systemd/system/nginx.service.'}],
  [/^curl/,(m,s)=>s.up?'HTTP/1.1 200 OK\nServer: nginx':'curl: (7) Failed to connect to localhost port 80']]});

const SSHD0=`# /etc/ssh/sshd_config
Port 22
PermitRootLogin yes
PasswordAuthentication yes
PubkeyAuthentication yes
MaxAuthTries 6
X11Forwarding yes
UsePAM yes`;
function sshdGet(cfg,k){let v=null;cfg.split('\n').forEach(l=>{const t=l.trim();if(!t||t.startsWith('#'))return;const m=t.match(/^(\S+)\s+(\S+)/);if(m&&m[1].toLowerCase()===k.toLowerCase())v=m[2].toLowerCase()});return v}
function sshdCheck(s,a){if(sshdGet(s.cfg,'PermitRootLogin')==='no')a.ok('root');if(sshdGet(s.cfg,'PasswordAuthentication')==='no')a.ok('pwd');return''}
lab('lx-ssh',{t:'Harden SSH on a server',dom:'Linux',host:'db-07',cx:'hardening',prompt:linP('db-07'),
 intro:'[AUDIT] Security scan: db-07 allows root login and password authentication over SSH.',
 brief:'Attackers constantly guess SSH passwords. Turn off direct root login and password logins (admins use SSH keys), test the config, and reload SSH without locking anyone out.',
 obj:[['read','Open the SSH server config','Run: sudo nano /etc/ssh/sshd_config'],['root','Set PermitRootLogin no','In the editor change "PermitRootLogin yes" to "PermitRootLogin no"'],['pwd','Set PasswordAuthentication no','In the editor change "PasswordAuthentication yes" to "no"'],['test','Validate the config','Run: sudo sshd -t   (no output = valid)'],['reload','Reload the SSH service','Run: sudo systemctl reload ssh']],
 cheat:['cat /etc/ssh/sshd_config — view the config','sudo nano /etc/ssh/sshd_config — edit the config','sudo sed -i \'s/^PermitRootLogin yes/PermitRootLogin no/\' /etc/ssh/sshd_config — edit with sed','sudo sshd -t — test config syntax','sudo systemctl reload ssh — apply without dropping sessions','grep -i permitroot /etc/ssh/sshd_config — search the config'],
 learn:'Disabling root login and passwords stops most SSH brute-force attacks. Always validate with "sshd -t" before reloading — a typo can lock every admin out. Keep one session open while testing.',
 init:()=>({cfg:SSHD0,tested:false}),
 cmds:[
  [/^cat \/etc\/ssh\/sshd_config$/,(m,s,a)=>{a.ok('read');return s.cfg}],
  [/^grep( -i)? (\S+) \/etc\/ssh\/sshd_config$/,(m,s)=>s.cfg.split('\n').filter(l=>l.toLowerCase().includes(m[2].replace(/['"]/g,'').toLowerCase())).join('\n')],
  [/^(nano|vi|vim) \/etc\/ssh\/sshd_config$/,(m,s,a)=>{if(!a.sudo)return'[ Error: /etc/ssh/sshd_config is not writable — open it with sudo ]';a.ok('read');a.edit('/etc/ssh/sshd_config',s.cfg,t=>{s.cfg=t;s.tested=false;return sshdCheck(s,a)});return''}],
  [/^sed -i ['"]?s\/(.+?)\/(.*?)\/g?['"]? \/etc\/ssh\/sshd_config$/,(m,s,a)=>{if(!a.sudo)return'sed: couldn\'t open temporary file: '+needSudo;try{s.cfg=s.cfg.replace(new RegExp(m[1],'mi'),m[2])}catch(e){return'sed: invalid regular expression'}s.tested=false;a.ok('read');return sshdCheck(s,a)}],
  [/^sshd -t$/,(m,s,a)=>{if(!a.sudo)return'sshd: must be run as root (use sudo)';const bad=s.cfg.split('\n').map((l,i)=>[l.trim(),i+1]).find(([l])=>l&&!l.startsWith('#')&&!/^[A-Za-z0-9]+\s+\S+/.test(l));if(bad)return`/etc/ssh/sshd_config line ${bad[1]}: Bad configuration option: ${bad[0]}`;s.tested=true;a.ok('test');return'(no output — the configuration is valid)'}],
  [/^systemctl (reload|restart) (ssh|sshd)$/,(m,s,a)=>{if(!a.sudo)return'Access denied (use sudo)';if(!s.tested)return'⚠ Run "sudo sshd -t" first — reloading a broken config can lock everyone out.';if(LABRUN.R.done.root&&LABRUN.R.done.pwd){a.ok('reload');return''}return'Reloaded — but the required settings are not all in place yet.'}]]});

lab('lx-ufw',{t:'Configure a host firewall (ufw)',dom:'Linux',host:'web-11',cx:'hardening',prompt:linP('web-11'),
 intro:'[AUDIT] web-11 has no host firewall. Every port is reachable.',
 brief:'Set up ufw so that: everything incoming is denied by default, SSH is allowed ONLY from the management network 10.10.99.0/24, and HTTPS (443) is allowed from anywhere. Then enable it — without locking yourself out.',
 obj:[['look','Check the firewall status','Run: sudo ufw status verbose'],['def','Deny incoming by default','Run: sudo ufw default deny incoming'],['ssh','Allow SSH only from 10.10.99.0/24','Run: sudo ufw allow from 10.10.99.0/24 to any port 22 proto tcp'],['https','Allow HTTPS (443) from anywhere','Run: sudo ufw allow 443/tcp'],['enable','Enable the firewall','Run: sudo ufw enable']],
 cheat:['sudo ufw status verbose — show status and rules','sudo ufw default deny incoming — default policy','sudo ufw allow from <net> to any port 22 proto tcp — allow from one network','sudo ufw allow 443/tcp — allow a port from anywhere','sudo ufw delete allow 22 — remove a rule','sudo ufw enable — turn the firewall on','sudo ufw disable — turn it off'],
 learn:'Default-deny plus a short allow-list is the core of host hardening. Always add your SSH rule BEFORE enabling a firewall on a remote server, and limit SSH to the management network.',
 init:()=>({rules:[],def:'allow',on:false,any22:false}),
 cmds:[
  [/^ufw status( verbose| numbered)?$/,(m,s,a)=>{if(!a.sudo)return'ERROR: You need to be root to run this script';a.ok('look');return`Status: ${s.on?'active':'inactive'}\nDefault: ${s.def} (incoming), allow (outgoing)\n`+(s.rules.length?'To            Action   From\n'+s.rules.join('\n'):'(no rules)')}],
  [/^ufw default (deny|allow)( incoming)?$/,(m,s,a)=>{if(!a.sudo)return'ERROR: You need to be root';s.def=m[1];if(m[1]==='deny'){a.ok('def');return"Default incoming policy changed to 'deny'"}a.pen('Default ALLOW means everything is open — the opposite of hardening.');return''}],
  [/^ufw allow from 10\.10\.99\.0\/24( to any)? port 22( proto tcp)?$/,(m,s,a)=>{if(!a.sudo)return'ERROR: You need to be root';s.rules.push('22/tcp        ALLOW    10.10.99.0/24');a.ok('ssh');return'Rule added'}],
  [/^ufw allow (22|ssh|22\/tcp|openssh)$/,(m,s,a)=>{if(!a.sudo)return'ERROR: You need to be root';s.any22=true;s.rules.push('22/tcp        ALLOW    Anywhere   <-- !');a.pen('That opens SSH to the whole internet. Only 10.10.99.0/24 should reach SSH. (Remove it: sudo ufw delete allow 22)');return'Rule added'}],
  [/^ufw delete allow (22|ssh|22\/tcp|openssh)$/,(m,s,a)=>{if(!a.sudo)return'ERROR: You need to be root';s.any22=false;s.rules=s.rules.filter(r=>!r.includes('Anywhere   <--'));return'Rule deleted'}],
  [/^ufw allow (443|443\/tcp|https)$/,(m,s,a)=>{if(!a.sudo)return'ERROR: You need to be root';s.rules.push('443/tcp       ALLOW    Anywhere');a.ok('https');return'Rule added'}],
  [/^ufw allow (80|80\/tcp|http)$/,(m,s,a)=>{if(!a.sudo)return'ERROR: You need to be root';s.rules.push('80/tcp        ALLOW    Anywhere');return'Rule added (fine for redirects, but not required here)'}],
  [/^ufw enable$/,(m,s,a)=>{if(!a.sudo)return'ERROR: You need to be root';if(!LABRUN.R.done.ssh){if(s.def==='deny'){a.pen('You enabled default-deny BEFORE allowing SSH — you locked yourself out!');return'Firewall is active and enabled on system startup\n...connection to web-11 lost.\n[ Kabir restored access from the KVM console and disabled ufw. Add the SSH rule first. ]'}}if(s.any22)return'Fix the rule that allows SSH from Anywhere first (sudo ufw delete allow 22).';s.on=true;a.ok('enable');return'Firewall is active and enabled on system startup'}],
  [/^ufw disable$/,(m,s,a)=>{if(!a.sudo)return'ERROR: You need to be root';s.on=false;return'Firewall stopped and disabled on system startup'}]]});

function modeApply(cur,spec){if(/^[0-7]{3,4}$/.test(spec))return spec.slice(-3);const m=spec.match(/^([ugoa]*)([+\-=])([rwx]*)$/);if(!m)return null;const who=m[1]||'a',bits=(m[3].includes('r')?4:0)+(m[3].includes('w')?2:0)+(m[3].includes('x')?1:0);const d=cur.split('').map(Number);
  [['u',0],['g',1],['o',2]].forEach(([k,i])=>{if(who.includes(k)||who.includes('a')){if(m[2]==='+')d[i]|=bits;else if(m[2]==='-')d[i]&=~bits;else d[i]=bits}});return d.join('')}
const permStr=m=>'-'+m.split('').map(d=>((d&4)?'r':'-')+((d&2)?'w':'-')+((d&1)?'x':'-')).join('');
lab('lx-perms',{t:'Fix dangerous file permissions',dom:'Linux',host:'app-03',cx:'perms',prompt:linP('app-03'),
 intro:'[AUDIT] /etc/app/.env (database password) is readable and writable by EVERY user on the server.',
 brief:'The app runs as user "app". Its secrets file must be readable only by that user. Fix the permissions and ownership, then hunt for other world-writable files in /etc/app.',
 obj:[['look','List permissions in /etc/app','Run: ls -la /etc/app'],['env','Make .env readable by its owner only','Run: sudo chmod 600 /etc/app/.env'],['owner','Make "app" the owner of .env','Run: sudo chown app:app /etc/app/.env'],['find','Find other world-writable files','Run: find /etc/app -perm -o+w'],['cfg','Remove world-write from config.yml','Run: sudo chmod o-w /etc/app/config.yml']],
 cheat:['ls -la /etc/app — permissions, owner, group','sudo chmod 600 <file> — owner read/write only','sudo chmod o-w <file> — remove write for "others"','sudo chown app:app <file> — set owner and group','find /etc/app -perm -o+w — find world-writable files','stat <file> — detailed file info'],
 learn:'Permissions are rwx for owner / group / others. 600 = only the owner can read and write. Secrets should never be world-readable, and 777 is almost never right. Least privilege applies to files too.',
 init:()=>({f:{'.env':{m:'777',o:'root:root'},'config.yml':{m:'666',o:'app:app'},'app.service.conf':{m:'644',o:'root:root'}}}),
 cmds:[
  [/^ls( -\w+)?( \/etc\/app\/?)?$/,(m,s,a)=>{if(!m[1]||!m[1].includes('l'))return Object.keys(s.f).join('  ');a.ok('look');return Object.entries(s.f).map(([n,v])=>`${permStr(v.m)} 1 ${v.o.replace(':',' ')}  ${n}`).join('\n')}],
  [/^stat (\S+)$/,(m,s)=>{const k=Object.keys(s.f).find(n=>m[1].endsWith(n));return k?`File: ${m[1]}\nAccess: (0${s.f[k].m}/${permStr(s.f[k].m)})  Owner: ${s.f[k].o}`:'stat: No such file'}],
  [/^cat \/etc\/app\/\.env$/,(m,s,a)=>{const v=s.f['.env'];if(!a.sudo&&v.m[2]==='0')return'cat: /etc/app/.env: Permission denied  (good — that is the point!)';return'DB_HOST=10.10.5.20\nDB_USER=orders\nDB_PASSWORD=************  (exposed to every user!)'}],
  [/^chmod (\S+) (\S+)$/,(m,s,a)=>{const k=Object.keys(s.f).find(n=>m[2].endsWith('/'+n)||m[2]===n);if(!k)return'chmod: cannot access: No such file or directory';if(!a.sudo&&s.f[k].o.split(':')[0]!=='kabir')return'chmod: changing permissions: Operation not permitted (use sudo)';const nm=modeApply(s.f[k].m,m[1]);if(!nm)return'chmod: invalid mode';s.f[k].m=nm;
    if(k==='.env'){const d=nm.split('').map(Number);if(d[2]===0&&!(d[1]&2)&&(d[0]&4))a.ok('env');else if(d[2])return'Others can still access it. Use 600.'}
    if(k==='config.yml'){if(!(+nm[2]&2))a.ok('cfg')}
    if(nm==='777'&&k!=='.env')a.pen('777 makes a file writable by everyone!');return''}],
  [/^chown (\S+) (\S+)$/,(m,s,a)=>{const k=Object.keys(s.f).find(n=>m[2].endsWith(n));if(!k)return'chown: No such file';if(!a.sudo)return'chown: changing ownership: Operation not permitted (use sudo)';s.f[k].o=m[1].includes(':')?m[1]:m[1]+':'+m[1];if(k==='.env'&&/^app(:app)?$/.test(m[1]))a.ok('owner');return''}],
  [/^find \/etc\/app -perm (-o\+w|-o=w|-002|-0002|\/o\+w|\/o=w)( -type f)?$/,(m,s,a)=>{a.ok('find');const r=Object.entries(s.f).filter(([n,v])=>+v.m[2]&2).map(([n])=>'/etc/app/'+n);return r.join('\n')||'(none)'}]]});

lab('lx-users',{t:'Unknown admin account',dom:'Linux',host:'app-22',cx:'ir',prompt:linP('app-22'),
 intro:'[SIEM] New user "tempadmin" was added to the sudo group on app-22 at 03:10. No change ticket exists.',
 brief:'Someone created an admin account with no approval. Investigate, contain it while preserving evidence (do not delete it yet), and end its sessions.',
 obj:[['find','Check who has sudo rights','Run: getent group sudo'],['evidence','See when and from where tempadmin logged in','Run: last tempadmin'],['lock','Lock the account (keep it as evidence)','Run: sudo usermod -L tempadmin'],['sudo','Remove it from the sudo group','Run: sudo gpasswd -d tempadmin sudo'],['kill','End its active sessions','Run: sudo pkill -KILL -u tempadmin']],
 cheat:['getent group sudo — members of the sudo group','grep tempadmin /etc/passwd — account details','last tempadmin — login history','who — who is logged in now','sudo usermod -L <user> — lock an account','sudo gpasswd -d <user> sudo — remove from sudo group','sudo pkill -KILL -u <user> — end the user\'s processes/sessions','sudo userdel <user> — delete an account'],
 learn:'Contain first, but preserve evidence: lock the account instead of deleting it so investigators can review its files and history. Then remove privileges, end sessions, and find how it was created.',
 cmds:[
  [/^(getent group sudo|grep sudo \/etc\/group)$/,(m,s,a)=>{a.ok('find');return'sudo:x:27:admin,kabir,tempadmin'}],
  [/^(grep tempadmin \/etc\/passwd|id tempadmin|getent passwd tempadmin)$/,()=>'tempadmin:x:1007:1007::/home/tempadmin:/bin/bash   (created today 03:10)'],
  [/^(last|lastlog)( -u)? ?(tempadmin)?$/,(m,s,a)=>{a.ok('evidence');return'tempadmin pts/2  203.0.113.77   Thu 03:12   still logged in\nkabir     pts/0  10.10.99.15    Wed 18:02 - 19:40\nadmin     pts/1  10.10.99.11    Wed 11:20 - 11:58'}],
  [/^(who|w)$/,(m,s)=>s.killed?'kabir    pts/0  10.10.99.15':'kabir    pts/0  10.10.99.15\ntempadmin pts/2 203.0.113.77   <-- external IP!'],
  [/^(?:usermod -L|passwd -l) (\S+)$/,(m,s,a)=>{if(!a.sudo)return needSudo;if(m[1]==='tempadmin'){a.ok('lock');return'passwd: password expiry information changed. (account locked)'}a.pen(`You locked out ${m[1]}, a legitimate admin!`);return''}],
  [/^(?:gpasswd -d (\S+) sudo|deluser (\S+) sudo)$/,(m,s,a)=>{if(!a.sudo)return needSudo;const u=m[1]||m[2];if(u==='tempadmin'){a.ok('sudo');return'Removing user tempadmin from group sudo'}a.pen(`You removed ${u}'s legitimate admin rights!`);return''}],
  [/^userdel( -r)? tempadmin$/,(m,s,a)=>a.sudo?'Hold on — deleting it destroys evidence. Lock it instead so the security team can investigate.':needSudo],
  [/^(?:pkill|killall)(?: -KILL| -9| -u)* (?:-u )?tempadmin$/,(m,s,a)=>{if(!a.sudo)return needSudo;s.killed=true;a.ok('kill');return'(tempadmin sessions terminated)'}]]});

lab('lx-patch',{t:'Patch a critical vulnerability',dom:'Linux',host:'web-03',cx:'hardening',prompt:linP('web-03'),
 intro:'[VULN SCAN] web-03: OpenSSL has a CRITICAL security update available.',
 brief:'A critical OpenSSL security fix is out. Refresh the package lists, find the update, install it, restart the service that uses it, and verify the new version.',
 obj:[['update','Refresh package lists','Run: sudo apt update'],['list','See which packages can be upgraded','Run: apt list --upgradable'],['upgrade','Upgrade openssl','Run: sudo apt install --only-upgrade openssl'],['restart','Restart nginx so it loads the new library','Run: sudo systemctl restart nginx'],['verify','Verify the OpenSSL version','Run: openssl version']],
 cheat:['sudo apt update — refresh package lists','apt list --upgradable — available updates','sudo apt install --only-upgrade openssl — upgrade one package','sudo apt upgrade — upgrade everything','sudo needrestart — which services need a restart','sudo systemctl restart nginx — restart a service','openssl version — show installed version'],
 learn:'Patching closes known holes. After updating a shared library like OpenSSL, running services still use the OLD copy in memory until restarted. Patch in a maintenance window and verify.',
 init:()=>({upd:false,up:false,rs:false}),
 cmds:[
  [/^apt(-get)? update$/,(m,s,a)=>{if(!a.sudo)return'E: Could not open lock file - '+needSudo;s.upd=true;a.ok('update');return'Hit:1 http://archive.ubuntu.com jammy InRelease\nGet:2 http://security.ubuntu.com jammy-security InRelease\nReading package lists... Done\n3 packages can be upgraded.'}],
  [/^apt list --upgradable$/,(m,s,a)=>{if(!s.upd)return'Listing... Done (run "sudo apt update" first to see new updates)';a.ok('list');return s.up?'Listing... Done\ncurl/jammy-updates 7.81.0-1ubuntu1.17\ntzdata/jammy-updates 2024b':'Listing... Done\nopenssl/jammy-security 3.0.2-0ubuntu1.18 [upgradable from: 3.0.2-0ubuntu1.12]   <- SECURITY\ncurl/jammy-updates 7.81.0-1ubuntu1.17\ntzdata/jammy-updates 2024b'}],
  [/^apt(-get)? (install --only-upgrade openssl|upgrade openssl|install openssl|upgrade( -y)?|full-upgrade( -y)?)( -y)?$/,(m,s,a)=>{if(!a.sudo)return'E: '+needSudo;if(!s.upd)return'(run sudo apt update first so apt knows about the new version)';s.up=true;a.ok('upgrade');return'Unpacking openssl (3.0.2-0ubuntu1.18) ...\nSetting up libssl3 (3.0.2-0ubuntu1.18) ...\nSetting up openssl (3.0.2-0ubuntu1.18) ...'}],
  [/^needrestart( -r l)?$/,(m,s)=>s.up&&!s.rs?'Services using outdated libraries:\n  nginx.service':'No services need to be restarted.'],
  [/^systemctl restart nginx$/,(m,s,a)=>{if(!a.sudo)return'Access denied (use sudo)';if(!s.up)return'(restarted — but nothing was upgraded yet)';s.rs=true;a.ok('restart');return''}],
  [/^openssl version$/,(m,s,a)=>{if(s.up)a.ok('verify');return s.up?'OpenSSL 3.0.2 15 Mar 2022 (Library: 3.0.2-0ubuntu1.18)':'OpenSSL 3.0.2 15 Mar 2022 (Library: 3.0.2-0ubuntu1.12)'}]]});

lab('lx-brute',{t:'SSH brute-force attack',dom:'Linux',host:'bastion-01',cx:'hardening',prompt:linP('bastion-01'),
 intro:'[ALERT] bastion-01: thousands of failed SSH logins in the last 10 minutes.',
 brief:'Someone is guessing passwords against the jump host. Read the auth log, confirm none of the attackers got in, and ban every attacking IP — but do not block your own deploy server (10.0.4.12).',
 obj:[['read','Read the authentication log','Run: sudo grep "Failed password" /var/log/auth.log'],['check','Confirm no attacker logged in successfully','Run: sudo grep "Accepted" /var/log/auth.log'],['ban','Ban every attacking IP','Run: sudo fail2ban-client set sshd banip <ip>  (for each attacker)']],
 cheat:['sudo tail -n 20 /var/log/auth.log — last log lines','sudo grep "Failed password" /var/log/auth.log — failed logins','sudo grep "Accepted" /var/log/auth.log — successful logins','sudo fail2ban-client status sshd — banned IPs','sudo fail2ban-client set sshd banip <ip> — ban an IP','sudo ufw deny from <ip> — block with the firewall'],
 learn:'Log analysis first: failures tell you who is attacking; "Accepted" lines tell you whether anyone succeeded. Ban attackers, keep legitimate automation working, and prefer key-only SSH so guessing cannot work.',
 init:g=>{const bad=['203.0.113.'+(10+g.int(200)),'198.51.100.'+(10+g.int(200))];return{bad,ban:new Set()}},
 cmds:[
  [/^(tail|cat|less|grep)\b.*\/var\/log\/auth\.log.*$/,(m,s,a)=>{if(!a.sudo)return'grep: /var/log/auth.log: '+needSudo;const c=m[0];
    if(/accepted/i.test(c)){a.ok('check');return'Nov 13 02:10:04 sshd[2211]: Accepted publickey for deploy from 10.0.4.12 port 51822\nNov 13 08:15:40 sshd[3310]: Accepted publickey for kabir from 10.10.99.15 port 50110\n(only known users and IPs — no attacker got in ✓)'}
    a.ok('read');const L=[];for(let i=0;i<10;i++){const b=s.bad[i%2];L.push(s.ban.has(b)?`Nov 13 09:4${i} kernel: [UFW BLOCK] SRC=${b} DPT=22`:`Nov 13 09:4${i} sshd[${4000+i}]: Failed password for ${['root','admin','oracle','test'][i%4]} from ${b} port ${40000+i*31} ssh2`)}if(!/failed/i.test(c))L.splice(4,0,'Nov 13 09:44 sshd[3999]: Accepted publickey for deploy from 10.0.4.12 port 51900');return L.join('\n')+(/\| ?wc -l/.test(c)?'\n(4,812 lines)':'')}],
  [/^fail2ban-client status( sshd)?$/,(m,s,a)=>a.sudo?`Status for the jail: sshd\n|- Currently banned: ${s.ban.size}\n\`- Banned IP list: ${[...s.ban].join(' ')}`:needSudo],
  [/^(?:fail2ban-client set sshd banip|ufw deny from|iptables -A INPUT -s) (\d+\.\d+\.\d+\.\d+)(?: -j DROP)?$/,(m,s,a)=>{if(!a.sudo)return needSudo;const ip=m[1];if(ip==='10.0.4.12'){a.pen('You banned the deploy server — all releases are now broken!');return'1'}if(ip.startsWith('10.10.99.')){a.pen('You banned the admin management network!');return'1'}if(s.bad.includes(ip)){s.ban.add(ip);if(s.bad.every(b=>s.ban.has(b)))a.ok('ban');return'1  (banned)'+(s.ban.size<s.bad.length?'\nStill seeing attacks from another IP…':'')}return'1  (banned — but no attack traffic came from that IP)'}]]});

lab('lx-backup',{t:'Nightly backup job failed',dom:'Linux',host:'backup-01',cx:'backup',prompt:linP('backup-01'),
 intro:'[ALERT] backup.service failed last night. Database has no fresh backup.',
 brief:'Find why last night\'s backup failed, clean up ONLY backups older than the 14-day retention policy, rerun the backup and verify it can be read.',
 obj:[['diag','Find why the backup failed','Run: journalctl -u backup -n 20'],['clean','Delete only backups older than 14 days','Preview: find /backup -mtime +14   then: sudo find /backup -mtime +14 -delete'],['run','Run the backup job again','Run: sudo systemctl start backup'],['verify','Verify the new backup is readable','Run: tar -tzf /backup/latest.tar.gz']],
 cheat:['systemctl status backup — service state','journalctl -u backup -n 20 — last log lines','df -h /backup — free space','ls -lh /backup — list backups','cat /etc/backup/policy.conf — retention policy','find /backup -mtime +14 — preview files older than 14 days','sudo find /backup -mtime +14 -delete — delete them','sudo systemctl start backup — run the job','tar -tzf /backup/latest.tar.gz — list archive contents'],
 learn:'Read logs before acting. Always PREVIEW a destructive find before adding -delete, and follow the retention policy. A backup only counts once you have verified you can read/restore it.',
 init:()=>({clean:false,run:false,wiped:false}),
 cmds:[
  [/^(systemctl status backup(\.service|\.timer)?|journalctl -u backup.*)$/,(m,s,a)=>{a.ok('diag');return s.run?'● backup.service — Active: inactive (dead) — last run: SUCCESS':'● backup.service — Active: failed\n tar: /backup/db-full.tar.gz: Wrote only 4096 of 10240 bytes\n tar: Error is not recoverable: No space left on device'}],
  [/^df -h( \/backup)?$/,(m,s,a)=>{a.ok('diag');return`Filesystem  Size Used Avail Use% Mounted on\n/dev/sdc1   2.0T ${s.clean?'0.9T 1.1T  45%':'2.0T    0 100%'} /backup`}],
  [/^ls( -\w+)* \/backup\/?$/,(m,s)=>(s.clean?'':'db-2026-09-01.tar.gz … (40 more older files)\n')+'db-2026-10-30.tar.gz\ndb-2026-11-05.tar.gz\ndb-2026-11-11.tar.gz\ndb-2026-11-12.tar.gz'+(s.run?'\nlatest.tar.gz -> db-2026-11-13.tar.gz':'')],
  [/^cat \/etc\/backup\/policy(\.conf)?$/,()=>'RETENTION_DAYS=14\nSCHEDULE=02:00 daily\nOFFSITE_COPY=tape weekly'],
  [/^find \/backup( -name \S+)?( -type f)? -mtime \+(\d+)( -print)?$/,(m,s)=>s.clean?'(nothing)':`/backup/db-2026-09-01.tar.gz\n/backup/db-2026-09-02.tar.gz\n… ${+m[3]>=14?'41':'44'} files`],
  [/^find \/backup( -name \S+)?( -type f)? -mtime \+(\d+) -delete$/,(m,s,a)=>{if(!a.sudo)return'find: cannot delete: '+needSudo;if(+m[3]<14){a.pen('That deletes backups INSIDE the 14-day retention window!');s.clean=true;return''}s.clean=true;a.ok('clean');return''}],
  [/^rm -r?f? \/backup\/?\*?$/,(m,s,a)=>{if(!a.sudo)return needSudo;a.pen('You deleted ALL backups, including recent ones. Never wipe a backup volume!');s.clean=true;s.wiped=true;return''}],
  [/^systemctl start backup(\.service)?$/,(m,s,a)=>{if(!a.sudo)return'Access denied (use sudo)';if(!s.clean)return'Job for backup.service failed: No space left on device';s.run=true;a.ok('run');return'(backup completed: db-2026-11-13.tar.gz, 412G)'}],
  [/^(tar -?tzf|sha256sum -c) \S+( \| head)?$/,(m,s,a)=>{if(!s.run)return'tar: /backup/latest.tar.gz: Cannot open: No such file';a.ok('verify');return'var/lib/postgresql/base/\nvar/lib/postgresql/base/16384/…\n(archive OK)'}]]});

lab('lx-mem',{t:'Application out of memory',dom:'Linux',host:'app-31',cx:'linux',prompt:linP('app-31'),
 intro:'[ALERT] orders-api on app-31: response time 9s, swap 100% used.',
 brief:'The server is almost out of memory. Find which process is responsible, check its logs, restart it cleanly and confirm memory is back to normal.',
 obj:[['mem','Check memory usage','Run: free -m'],['find','Find the process using the most memory','Run: ps aux --sort=-%mem | head'],['logs','Check the service logs','Run: journalctl -u orders-api -n 20'],['restart','Restart the service','Run: sudo systemctl restart orders-api'],['verify','Confirm memory recovered','Run: free -m']],
 cheat:['free -m — memory in MB','top — live process view','ps aux --sort=-%mem | head — top memory users','journalctl -u orders-api -n 20 — service logs','sudo systemctl restart orders-api — restart service','dmesg | tail — kernel messages (OOM killer)'],
 learn:'free shows memory, ps/top show who uses it, logs show why. A restart buys time; a bug report fixes the memory leak for good.',
 init:()=>({rs:false}),
 cmds:[
  [/^free( -[mhg])?$/,(m,s,a)=>{if(s.rs)a.ok('verify');else a.ok('mem');return s.rs?'               total   used   free\nMem:           32000   9100  22900\nSwap:           4096      0   4096':'               total   used   free\nMem:           32000  31700    300\nSwap:           4096   4096      0'}],
  [/^(top|htop|ps\b.*)$/,(m,s,a)=>{a.ok('find');return s.rs?'PID   %MEM COMMAND\n5512  24.0 java -jar orders-api.jar':'PID   %MEM COMMAND\n4410  94.6 java -jar orders-api.jar   <- growing every minute\n812    0.1 sshd'}],
  [/^(journalctl -u orders-api.*|dmesg.*)$/,(m,s,a)=>{a.ok('logs');return'java.lang.OutOfMemoryError: Java heap space\n  at com.dc1.orders.CacheManager.put(CacheManager.java:88)\nkernel: Out of memory: Killed process 2231 (node_exporter)'}],
  [/^systemctl restart orders-api$/,(m,s,a)=>{if(!a.sudo)return'Access denied (use sudo)';s.rs=true;a.ok('restart');return''}],
  [/^kill/,()=>'Prefer a clean service restart: sudo systemctl restart orders-api']]});

/* ================= NETWORK LABS (Cisco-style) ================= */
const wr=/^(write( memory)?|wr( mem)?|copy run(ning-config)? start(up-config)?)$/;
const PORTRE=/^int(?:erface)? (?:range )?(?:g(?:i|igabitethernet)?) ?1\/0\/(\d+)(?: ?- ?(?:g(?:i|igabitethernet)?1\/0\/)?(\d+))?$/;
lab('nw-vlan',{t:'Put new CCTV cameras in their own VLAN',dom:'Network',host:'acc-sw-03',ios:1,lower:1,cx:'vlan',
 intro:'[CHANGE CHG-5120] 3 new IP cameras are cabled to Gi1/0/10, Gi1/0/11 and Gi1/0/12 on acc-sw-03.',
 brief:'Cameras must be isolated from servers. Create VLAN 30 named CCTV, make ports Gi1/0/10–12 access ports in VLAN 30, and save the config. Do not touch the server ports (Gi1/0/1–9).',
 obj:[['look','Check the existing VLANs','Run: show vlan brief'],['vlan','Create VLAN 30 named CCTV','configure terminal → vlan 30 → name CCTV → exit'],['ports','Make Gi1/0/10-12 access ports in VLAN 30','interface range gi1/0/10-12 → switchport mode access → switchport access vlan 30'],['save','Save the configuration','end → write memory']],
 cheat:['show vlan brief — list VLANs and ports','show interfaces status — port states','show running-config — current config','configure terminal — enter config mode','vlan 30 — create/enter a VLAN','name CCTV — name the VLAN','interface range gi1/0/10-12 — select several ports','switchport mode access — single-VLAN port','switchport access vlan 30 — set the port VLAN','end — leave config mode','write memory — save config'],
 learn:'VLANs separate traffic on the same switch. Cameras, BMS and guests should never share a VLAN with servers. Access ports carry one VLAN. Always "write memory" or the change is lost on reboot.',
 init:()=>({vl:{1:'default',10:'SERVERS',20:'MGMT'},p:{},sel:[]}),
 cmds:[
  [/^sh(ow)? vlan( br(ief)?)?$/,(m,s,a)=>{a.ok('look');let o='VLAN Name        Status   Ports\n---- ----------- -------- ------------------------------\n';for(const v of Object.keys(s.vl).map(Number).sort((x,y)=>x-y)){const ps=[];for(let i=1;i<=24;i++){const pv=s.p[i]?.v??(i<=9?10:i>=20?20:1);if(pv===v)ps.push('Gi1/0/'+i)}o+=`${String(v).padEnd(4)} ${s.vl[v].padEnd(11)} active   ${ps.join(', ')}\n`}return o}],
  [/^sh(ow)? int(erfaces)? status$/,(m,s)=>{let o='Port      Status     Vlan  Type\n';for(let i=1;i<=12;i++)o+=`Gi1/0/${i}`.padEnd(10)+'connected  '+String(s.p[i]?.v??(i<=9?10:1)).padEnd(6)+(i<=9?'server':'camera')+'\n';return o}],
  [/^sh(ow)? run(ning-config)?.*$/,(m,s)=>'hostname acc-sw-03\n'+Object.keys(s.vl).map(v=>`vlan ${v}\n name ${s.vl[v]}`).join('\n')+'\n'+Object.entries(s.p).map(([i,p])=>`interface Gi1/0/${i}\n switchport mode ${p.m||'dynamic'}\n switchport access vlan ${p.v}`).join('\n')],
  [/^vlan (\d+)$/,(m,s)=>{if(s.mode==='exec')return'% Enter "configure terminal" first';s.cur=+m[1];if(!s.vl[s.cur])s.vl[s.cur]='VLAN'+pad(s.cur).padStart(4,'0');s.mode='vlan';return''}],
  [/^name (\S+)$/,(m,s,a)=>{if(s.mode!=='vlan')return'% Use "vlan <id>" first';s.vl[s.cur]=m[1].toUpperCase();if(s.cur===30&&m[1]==='cctv')a.ok('vlan');return''}],
  [PORTRE,(m,s)=>{if(s.mode==='exec')return'% Enter "configure terminal" first';const a=+m[1],b=m[2]?+m[2]:a;s.sel=[];for(let i=a;i<=b;i++)s.sel.push(i);s.mode='if';return''}],
  [/^switchport mode (access|trunk)$/,(m,s,a)=>{if(s.mode!=='if')return'% Select an interface first';s.sel.forEach(i=>{s.p[i]=s.p[i]||{v:i<=9?10:1};s.p[i].m=m[1]});if(m[1]==='trunk')a.pen('Cameras must be ACCESS ports, not trunks.');vlanChk(s,a);return''}],
  [/^switchport access vlan (\d+)$/,(m,s,a)=>{if(s.mode!=='if')return'% Select an interface first';const v=+m[1];let o='';if(!s.vl[v]){s.vl[v]='VLAN'+String(v).padStart(4,'0');o='% Access VLAN does not exist. Creating vlan '+v}s.sel.forEach(i=>{s.p[i]=s.p[i]||{};s.p[i].v=v});if(s.sel.some(i=>i<=9)&&v!==10)a.pen('You moved a SERVER port out of the servers VLAN — servers just went offline!');vlanChk(s,a);return o}],
  [/^no shut(down)?$|^desc(ription)? .*$/,()=>''],
  [wr,(m,s,a)=>{if(LABRUN.R.done.vlan&&LABRUN.R.done.ports)a.ok('save');return'Building configuration...\n[OK]'}]]});
function vlanChk(s,a){if([10,11,12].every(i=>s.p[i]&&s.p[i].v===30&&s.p[i].m==='access'))a.ok('ports')}

lab('nw-errdis',{t:'Port err-disabled (BPDU guard)',dom:'Network',host:'acc-sw-07',ios:1,lower:1,cx:'switch',
 intro:'[TICKET] Finance printer and PCs on one desk lost network. Users say someone plugged in "a small switch".',
 brief:'A port went into err-disabled state. Find it, read the log to learn why, have the rogue device removed (done — facilities took it away), then recover the port and verify.',
 obj:[['find','Find the disabled port','Run: show interfaces status'],['cause','Find out why it was disabled','Run: show logging'],['recover','Recover the port (shutdown then no shutdown)','configure terminal → interface gi1/0/N → shutdown → no shutdown'],['verify','Verify the port is connected','Run: show interfaces status']],
 cheat:['show interfaces status — port states','show logging — switch log','show errdisable recovery — auto-recovery settings','configure terminal — config mode','interface gi1/0/<n> — select a port','shutdown — disable the port','no shutdown — enable the port','end — leave config mode','write memory — save'],
 learn:'BPDU guard err-disables an access port when a switch is plugged into it, protecting the network from loops. Remove the cause first, then shut / no shut to recover.',
 init:g=>({n:5+g.int(5),shut:false,up:false}),
 cmds:[
  [/^sh(ow)? int(erfaces)? status$/,(m,s,a)=>{let o='Port      Name          Status        Vlan\n';for(let i=1;i<=10;i++){const bad=i===s.n&&!s.up;o+=`Gi1/0/${i}`.padEnd(10)+(i===s.n?'finance-desk':'user-'+i).padEnd(14)+(bad?(s.shut?'disabled':'err-disabled'):'connected').padEnd(14)+'10\n'}if(s.up)a.ok('verify');else a.ok('find');return o}],
  [/^sh(ow)? log(ging)?$/,(m,s,a)=>{a.ok('cause');return`%SPANTREE-2-BLOCK_BPDUGUARD: Received BPDU on port Gi1/0/${s.n} with BPDU Guard enabled. Disabling port.\n%PM-4-ERR_DISABLE: bpduguard error detected on Gi1/0/${s.n}, putting Gi1/0/${s.n} in err-disable state`}],
  [/^sh(ow)? errdisable recovery$/,()=>'ErrDisable Reason    Timer Status\nbpduguard            Disabled'],
  [PORTRE,(m,s)=>{if(s.mode==='exec')return'% Enter "configure terminal" first';s.sel=+m[1];s.mode='if';return''}],
  [/^shut(down)?$/,(m,s,a)=>{if(s.mode!=='if')return'% Select an interface first';if(s.sel!==s.n){a.pen(`You shut down Gi1/0/${s.sel} — a working user port!`);return''}s.shut=true;return''}],
  [/^no shut(down)?$/,(m,s,a)=>{if(s.mode!=='if')return'% Select an interface first';if(s.sel!==s.n)return'';if(!s.shut)return'(port is still err-disabled — do "shutdown" first, then "no shutdown")';s.up=true;a.ok('recover');return`%LINK-3-UPDOWN: Interface Gi1/0/${s.n}, changed state to up`}],
  [wr,()=>'[OK]']]});

function aclEnd(t,i){if(t[i]==='any')return[{n:'0.0.0.0',w:'255.255.255.255'},i+1];if(t[i]==='host')return[{n:t[i+1],w:'0.0.0.0'},i+2];return[{n:t[i],w:t[i+1]},i+2]}
function aclMatch(ip,e){const a=ipInt(ip),n=ipInt(e.n),w=ipInt(e.w);if(a==null||n==null||w==null)return false;return((a&~w)>>>0)===((n&~w)>>>0)}
function aclEval(acl,src,dst){for(const r of acl)if(aclMatch(src,r.s)&&aclMatch(dst,r.d))return r.a;return'deny'}
const fmtEnd=e=>e.w==='255.255.255.255'?'any':e.w==='0.0.0.0'?'host '+e.n:e.n+' '+e.w;
lab('nw-acl',{t:'Block guests from the server network (ACL)',dom:'Network',host:'core-rtr-01',ios:1,lower:1,cx:'acl',
 intro:'[AUDIT FINDING] Devices on Guest Wi-Fi (VLAN 50, 10.50.0.0/24) can reach the server network 10.10.0.0/16!',
 brief:'Write an extended ACL called GUEST-IN that DENIES guests (10.50.0.0/24) to servers (10.10.0.0/16) but still PERMITS them to the internet. Apply it INBOUND on interface Vlan50, test with ping, and save.',
 obj:[['look','Check the router interfaces','Run: show ip interface brief'],['acl','ACL denies 10.50.0.0/24 → 10.10.0.0/16','ip access-list extended GUEST-IN → deny ip 10.50.0.0 0.0.0.255 10.10.0.0 0.0.255.255'],['permit','ACL still lets guests reach the internet','(inside the ACL) permit ip any any'],['apply','Apply GUEST-IN inbound on Vlan50','interface vlan50 → ip access-group GUEST-IN in'],['verify','Test: ping a server and the internet as a guest','ping 10.10.5.20 source vlan50   and   ping 8.8.8.8 source vlan50'],['save','Save the configuration','end → write memory']],
 cheat:['show ip interface brief — interfaces and IPs','show access-lists — ACLs and their entries','configure terminal — config mode','ip access-list extended GUEST-IN — create/edit ACL','deny ip 10.50.0.0 0.0.0.255 10.10.0.0 0.0.255.255 — block guests→servers','permit ip any any — allow everything else','no <seq> — delete an ACL line (inside the ACL)','interface vlan50 — select guest interface','ip access-group GUEST-IN in — apply inbound','ping 10.10.5.20 source vlan50 — test as a guest','write memory — save'],
 learn:'ACLs are processed top-down and stop at the first match, with a hidden "deny any" at the end. Wildcard masks are inverted subnet masks (0.0.0.255 = /24). Put specific denies ABOVE broad permits and apply ACLs close to the source.',
 init:()=>({acls:{},cur:null,ap:null,ifc:null,t1:false,t2:false}),
 cmds:[
  [/^sh(ow)? ip int(erface)? br(ief)?$/,(m,s,a)=>{a.ok('look');return'Interface   IP-Address     Status  Description\nGi0/0       203.0.113.2    up      INTERNET\nVlan10      10.10.0.1      up      SERVERS (10.10.0.0/16)\nVlan20      10.20.0.1      up      MGMT\nVlan50      10.50.0.1      up      GUEST-WIFI (10.50.0.0/24)'}],
  [/^sh(ow)? (ip )?access-lists?( \S+)?$/,(m,s)=>Object.entries(s.acls).map(([n,l])=>`Extended IP access list ${n}\n`+l.map(r=>`    ${r.q} ${r.a} ip ${fmtEnd(r.s)} ${fmtEnd(r.d)}`).join('\n')).join('\n')||'(no access lists)'],
  [/^sh(ow)? run(ning-config)?.*$/,(m,s)=>Object.entries(s.acls).map(([n,l])=>`ip access-list extended ${n}\n`+l.map(r=>` ${r.a} ip ${fmtEnd(r.s)} ${fmtEnd(r.d)}`).join('\n')).join('\n')+(s.ap?`\ninterface Vlan${s.ap.i}\n ip access-group ${s.ap.n} ${s.ap.d}`:'')],
  [/^ip access-list extended (\S+)$/,(m,s)=>{if(s.mode==='exec')return'% Enter "configure terminal" first';const n=m[1].toUpperCase();s.cur=n;s.acls[n]=s.acls[n]||[];s.mode='acl';return''}],
  [/^no ip access-list extended (\S+)$/,(m,s)=>{delete s.acls[m[1].toUpperCase()];return''}],
  [/^(?:(\d+) )?(permit|deny) ip (.+)$/,(m,s,a)=>{if(s.mode!=='acl')return'% Enter "ip access-list extended <name>" first';const t=m[3].split(' ');let [src,i]=aclEnd(t,0);let [dst,j]=aclEnd(t,i);if(!src.w||!dst.w||j!==t.length||ipInt(src.n)==null||ipInt(dst.n)==null||ipInt(src.w)==null||ipInt(dst.w)==null)return'% Invalid input. Format: deny ip <src> <wildcard> <dst> <wildcard>   (or any / host x.x.x.x)';
    const l=s.acls[s.cur];const q=m[1]?+m[1]:(l.length?l[l.length-1].q+10:10);l.push({q,a:m[2],s:src,d:dst});l.sort((x,y)=>x.q-y.q);aclChk(s,a);return''}],
  [/^no (\d+)$/,(m,s,a)=>{if(s.mode!=='acl')return'% Enter the ACL first';s.acls[s.cur]=s.acls[s.cur].filter(r=>r.q!==+m[1]);return''}],
  [/^int(?:erface)? vlan ?(\d+)$/,(m,s)=>{if(s.mode==='exec')return'% Enter "configure terminal" first';s.ifc=+m[1];s.mode='if';return''}],
  [/^ip access-group (\S+) (in|out)$/,(m,s,a)=>{if(s.mode!=='if')return'% Select an interface first';s.ap={n:m[1].toUpperCase(),d:m[2],i:s.ifc};if(s.ifc===50&&m[2]==='in'){a.ok('apply');return''}if(s.ifc===10)a.pen('That filters the SERVERS interface — you may have cut off server traffic!');return'(applied — but the task is inbound on Vlan50)'}],
  [/^ping (\d+\.\d+\.\d+\.\d+) source (vlan ?50|10\.50\.0\.1)$/,(m,s,a)=>{const acl=s.ap&&s.ap.i===50&&s.ap.d==='in'?s.acls[s.ap.n]||[]:null;const r=acl?aclEval(acl,'10.50.0.23',m[1]):'permit';const isSrv=inCidr(m[1],'10.10.0.0/16');
    if(isSrv&&r==='deny')s.t1=true;if(!isSrv&&r==='permit')s.t2=true;if(s.t1&&s.t2&&LABRUN.R.done.acl&&LABRUN.R.done.permit&&LABRUN.R.done.apply)a.ok('verify');
    return r==='permit'?`Sending 5, 100-byte ICMP Echos to ${m[1]}:\n!!!!!\nSuccess rate is 100 percent (5/5)`+(isSrv?'  <- guests can still reach servers!':''):`Sending 5, 100-byte ICMP Echos to ${m[1]}:\nU.U.U\nSuccess rate is 0 percent (0/5)  (blocked by ACL)`}],
  [/^ping \S+$/,()=>'Test as a guest: ping <ip> source vlan50'],
  [wr,(m,s,a)=>{if(['acl','permit','apply'].every(k=>LABRUN.R.done[k]))a.ok('save');return'Building configuration...\n[OK]'}]]});
function aclChk(s,a){const l=s.acls[s.cur];if(aclEval(l,'10.50.0.23','10.10.5.20')==='deny'&&l.some(r=>r.a==='deny'))a.ok('acl');if(aclEval(l,'10.50.0.23','8.8.8.8')==='permit')a.ok('permit');
  const pi=l.findIndex(r=>r.a==='permit'&&r.s.w==='255.255.255.255'&&r.d.w==='255.255.255.255'),di=l.findIndex(r=>r.a==='deny');if(pi>=0&&di>pi)labPrint('⚠ Your "permit ip any any" is ABOVE the deny — the deny will never be reached. Remove it with "no <seq>" and re-add it at the end.','hint')}

lab('nw-route',{t:'No internet: missing default route',dom:'Network',host:'edge-rtr-02',ios:1,lower:1,cx:'routing',
 intro:'[ALERT] After a router replacement last night, nothing in DC-1 can reach the internet.',
 brief:'The new edge router has no default route. Find the ISP gateway from the interface addressing (/30 link), add a default route, test, and save.',
 obj:[['look','Check the routing table','Run: show ip route'],['route','Add a default route to the ISP gateway','ip route 0.0.0.0 0.0.0.0 203.0.113.1'],['verify','Test internet reachability','Run: ping 8.8.8.8'],['save','Save the configuration','write memory']],
 cheat:['show ip interface brief — interfaces and IPs','show ip route — routing table','configure terminal — config mode','ip route 0.0.0.0 0.0.0.0 <next-hop> — default route','no ip route 0.0.0.0 0.0.0.0 <next-hop> — remove it','ping 8.8.8.8 — test','write memory — save'],
 learn:'A default route (0.0.0.0/0) sends any traffic without a more specific route to the internet gateway. On a /30 point-to-point link there are only two usable IPs: yours and the ISP\'s.',
 init:()=>({gw:null}),
 cmds:[
  [/^sh(ow)? ip int(erface)? br(ief)?$/,()=>'Interface   IP-Address      Status\nGi0/0       203.0.113.2/30  up     (link to ISP-A)\nGi0/1       10.0.0.1/30     up     (to core)'],
  [/^sh(ow)? ip route$/,(m,s,a)=>{a.ok('look');return`Codes: C - connected, S - static, O - OSPF\n${s.gw?`Gateway of last resort is ${s.gw} to network 0.0.0.0\nS*  0.0.0.0/0 [1/0] via ${s.gw}\n`:'Gateway of last resort is not set\n'}C   203.0.113.0/30 is directly connected, Gi0/0\nC   10.0.0.0/30 is directly connected, Gi0/1\nO   10.10.0.0/16 [110/2] via 10.0.0.2`}],
  [/^ip route 0\.0\.0\.0 0\.0\.0\.0 (\S+)$/,(m,s,a)=>{if(s.mode!=='conf')return'% Enter "configure terminal" first';if(m[1]==='203.0.113.2')return'% Invalid next hop address (it\'s this router\'s own address)';s.gw=m[1];if(m[1]==='203.0.113.1')a.ok('route');else return'(route added — but is that really the ISP side of the /30?)';return''}],
  [/^no ip route 0\.0\.0\.0 0\.0\.0\.0 \S+$/,(m,s)=>{s.gw=null;return''}],
  [/^ping \S+$/,(m,s,a)=>{if(s.gw==='203.0.113.1'){a.ok('verify');return'Sending 5, 100-byte ICMP Echos:\n!!!!!\nSuccess rate is 100 percent (5/5)'}return'Sending 5, 100-byte ICMP Echos:\n.....\nSuccess rate is 0 percent (0/5)'}],
  [wr,(m,s,a)=>{if(LABRUN.R.done.route)a.ok('save');return'[OK]'}]]});

lab('nw-trunk',{t:'New BMS VLAN not reaching the core',dom:'Network',host:'dist-sw-01',ios:1,lower:1,cx:'vlan',
 intro:'[TICKET] The new BMS controllers on VLAN 40 cannot reach the BMS server.',
 brief:'VLAN 40 exists but is not allowed on the trunk Te1/1/1 to the core. Add it WITHOUT removing the VLANs already allowed (1,10,20,30).',
 obj:[['look','Check which VLANs the trunk allows','Run: show interfaces trunk'],['trunk','Allow VLAN 40 on Te1/1/1 (keep the others)','interface te1/1/1 → switchport trunk allowed vlan add 40'],['verify','Verify the trunk','Run: show interfaces trunk'],['save','Save the configuration','write memory']],
 cheat:['show interfaces trunk — trunks and allowed VLANs','show vlan brief — VLANs','configure terminal — config mode','interface te1/1/1 — select the trunk','switchport trunk allowed vlan add 40 — ADD a VLAN','switchport trunk allowed vlan remove 40 — remove one','switchport trunk allowed vlan 1,10,20,30,40 — replace whole list','write memory — save'],
 learn:'"switchport trunk allowed vlan 40" REPLACES the list and can instantly cut off every other VLAN. Use "add" / "remove" to change one VLAN safely.',
 init:()=>({al:[1,10,20,30],sel:false}),
 cmds:[
  [/^sh(ow)? int(erfaces)? trunk$/,(m,s,a)=>{const need=[1,10,20,30,40];if(need.every(v=>s.al.includes(v))&&s.al.length)a.ok('verify');else a.ok('look');return`Port      Mode  Encapsulation  Status    Native vlan\nTe1/1/1   on    802.1q         trunking  1\n\nPort      Vlans allowed on trunk\nTe1/1/1   ${s.al.slice().sort((x,y)=>x-y).join(',')||'none'}`}],
  [/^sh(ow)? vlan( br(ief)?)?$/,()=>'VLAN Name     Status\n1    default  active\n10   SERVERS  active\n20   MGMT     active\n30   CCTV     active\n40   BMS      active'],
  [/^int(?:erface)? (te|tengigabitethernet) ?1\/1\/1$/,(m,s)=>{if(s.mode==='exec')return'% Enter "configure terminal" first';s.mode='if';s.sel=true;return''}],
  [/^switchport trunk allowed vlan (add |remove )?([\d,\- ]+)$/,(m,s,a)=>{if(s.mode!=='if')return'% Select interface te1/1/1 first';const list=[];m[2].replace(/\s/g,'').split(',').forEach(x=>{const r=x.split('-').map(Number);if(r.length===2)for(let i=r[0];i<=r[1];i++)list.push(i);else if(!isNaN(r[0]))list.push(r[0])});
    const before=s.al.slice();if(m[1]==='add ')list.forEach(v=>{if(!s.al.includes(v))s.al.push(v)});else if(m[1]==='remove ')s.al=s.al.filter(v=>!list.includes(v));else s.al=list;
    const lost=before.filter(v=>!s.al.includes(v));if(lost.length)a.pen(`VLAN(s) ${lost.join(',')} were removed from the trunk — those networks just went down!`);if([1,10,20,30,40].every(v=>s.al.includes(v)))a.ok('trunk');return''}],
  [wr,(m,s,a)=>{if(LABRUN.R.done.trunk)a.ok('save');return'[OK]'}]]});

lab('nw-bgp',{t:'BGP session to ISP-B is down',dom:'Network',host:'edge-rtr-01',ios:1,lower:1,cx:'routing',
 intro:'[ALERT] Lost BGP session to ISP-B. All traffic is on ISP-A only — no redundancy.',
 brief:'Find out why the BGP neighbor 198.51.100.1 (ISP-B) is down and bring it back without touching ISP-A (192.0.2.1).',
 obj:[['look','Check BGP neighbor states','Run: show ip bgp summary'],['cause','Find the cause in the log','Run: show logging'],['up','Re-enable the ISP-B neighbor','configure terminal → router bgp 65010 → no neighbor 198.51.100.1 shutdown'],['verify','Confirm the session is Established','Run: show ip bgp summary']],
 cheat:['show ip bgp summary — neighbor states','show logging — router log','configure terminal — config mode','router bgp 65010 — enter BGP config','no neighbor <ip> shutdown — re-enable a neighbor','neighbor <ip> shutdown — disable a neighbor','clear ip bgp <ip> — reset a session','write memory — save'],
 learn:'Two ISPs with BGP give redundancy. A neighbor in "Idle (Admin)" was shut down on purpose (here by a script) — clearing it will not help; un-shut it in router bgp config.',
 init:()=>({up:false}),
 cmds:[
  [/^sh(ow)? ip bgp( summary)?$|^sh(ow)? bgp summary$/,(m,s,a)=>{if(s.up)a.ok('verify');else a.ok('look');return`BGP router identifier 203.0.113.2, local AS 65010\nNeighbor        AS     State/PfxRcd\n192.0.2.1       64500  Established  912,410\n198.51.100.1    64511  ${s.up?'Established  905,118':'Idle (Admin)'}`}],
  [/^sh(ow)? log(ging)?$/,(m,s,a)=>{a.ok('cause');return'%BGP-5-ADJCHANGE: neighbor 198.51.100.1 Down - Admin. shutdown (by user: maint-script)'}],
  [/^clear ip bgp/,()=>'% Neighbor is administratively shut down — clearing will not bring it up.'],
  [/^router bgp (\d+)$/,(m,s)=>{if(s.mode==='exec')return'% Enter "configure terminal" first';if(m[1]!=='65010')return'% BGP is already running; AS is 65010';s.mode='rtr';return''}],
  [/^(no )?neighbor (\S+) shutdown$/,(m,s,a)=>{if(s.mode!=='rtr')return'% Enter "router bgp 65010" first';if(!m[1]){if(m[2]==='192.0.2.1')a.pen('You shut down ISP-A — DC-1 is now OFFLINE!');return''}if(m[2]==='198.51.100.1'){s.up=true;a.ok('up');return'%BGP-5-ADJCHANGE: neighbor 198.51.100.1 Up'}return''}],
  [wr,()=>'[OK]']]});

/* ================= FIREWALL LABS ================= */
const fwShow=s=>'#  NAME              ACTION  SOURCE            DESTINATION     PORT\n'+s.rules.map((r,i)=>`${String(i+1).padEnd(2)} ${r.n.padEnd(17)} ${r.a.padEnd(7)} ${r.s.padEnd(17)} ${r.d.padEnd(15)} ${r.p}`).join('\n')+(s.dirty?'\n(* uncommitted changes — run "commit")':'');
function fwEval(rules,src,dst,port){for(const r of rules)if(inCidr(src,r.s)&&inCidr(dst,r.d)&&(r.p==='any'||r.p===String(port)))return r;return null}
function fwAdd(s,m){const r={n:m[1].toUpperCase(),a:m[2],s:m[3],d:m[4],p:m[5]||'any'};const pos=m[6];const di=s.rules.findIndex(x=>x.n==='DEFAULT-DENY');if(pos==='top')s.rules.unshift(r);else s.rules.splice(di<0?s.rules.length:di,0,r);s.dirty=true;return r}
const FWCMD=[
  [/^show rules$/,(m,s,a)=>{a.ok('look');return fwShow(s)}],
  [/^rule move (\S+) (top|bottom)$/,(m,s)=>{const i=s.rules.findIndex(r=>r.n===m[1].toUpperCase());if(i<0)return'Error: no such rule';const [r]=s.rules.splice(i,1);if(m[2]==='top')s.rules.unshift(r);else{const di=s.rules.findIndex(x=>x.n==='DEFAULT-DENY');s.rules.splice(di,0,r)}s.dirty=true;if(LABRUN.L.chk)LABRUN.L.chk(s);return''}],
  [/^rule delete (\S+)$/,(m,s)=>{if(m[1].toUpperCase()==='DEFAULT-DENY')return'Error: the default deny rule cannot be removed';s.rules=s.rules.filter(r=>r.n!==m[1].toUpperCase());s.dirty=true;return''}]];
lab('fw-block',{t:'Block a malicious network at the firewall',dom:'Firewall',host:'fw-edge-01',lower:1,cx:'firewall',prompt:()=>'admin@fw-edge-01> ',
 intro:'[THREAT INTEL] 198.51.100.0/24 is a known scanning network. It is probing our VPN portal right now.',
 brief:'Create a rule that denies 198.51.100.0/24 to anything, make sure it sits ABOVE the allow rules (first match wins), commit, and test.',
 obj:[['look','Review the current rule base','Run: show rules'],['intel','Check the threat log','Run: show log threat'],['rule','Create a deny rule for 198.51.100.0/24','rule add BLOCK-TI deny src 198.51.100.0/24 dst any'],['order','Place it ABOVE the allow rules','rule move BLOCK-TI top'],['commit','Commit the change','commit'],['test','Test that the scanner is now blocked','test policy src 198.51.100.23 dst 192.0.2.10 port 443']],
 cheat:['show rules — rule base (top-down)','show log threat — threat log','rule add <name> deny src <cidr> dst any — add rule (above default deny)','rule add <name> deny src <cidr> dst any position top — add at the top','rule move <name> top — move rule to the top','rule delete <name> — delete a rule','commit — activate changes','test policy src <ip> dst <ip> port <n> — which rule matches?'],
 learn:'Firewall rules are evaluated top-down and the first match wins. A deny placed below a broad allow never triggers. Changes on most NGFWs only take effect after commit.',
 init:()=>({rules:[{n:'ALLOW-VPN',a:'allow',s:'any',d:'192.0.2.10/32',p:'443'},{n:'ALLOW-WEB',a:'allow',s:'any',d:'192.0.2.80/32',p:'443'},{n:'DEFAULT-DENY',a:'deny',s:'any',d:'any',p:'any'}],live:null,dirty:false}),
 chk(s){const a=LABRUN._api;const i=s.rules.findIndex(r=>r.a==='deny'&&r.s==='198.51.100.0/24');if(i>=0){a.ok('rule');const v=s.rules.findIndex(r=>r.n==='ALLOW-VPN');if(i<v)a.ok('order');else labPrint('⚠ Your deny rule is BELOW ALLOW-VPN, so VPN traffic from the scanner still matches the allow first. Move it: rule move <name> top','hint')}},
 cmds:[...FWCMD,
  [/^show log threat$/,(m,s,a)=>{a.ok('intel');return'TIME   SOURCE           DEST         THREAT\n09:41  198.51.100.23    192.0.2.10   Scan: VPN portal login enumeration\n09:41  198.51.100.87    192.0.2.10   Scan: VPN portal\n09:42  198.51.100.140   192.0.2.80   Scan: web directory brute-force\n(312 more from 198.51.100.0/24)'}],
  [/^rule add (\S+) (allow|deny) src (\S+) dst (\S+)(?: port (\S+))?(?: position (top|bottom))?$/,(m,s,a)=>{LABRUN._api=a;const r=fwAdd(s,m);if(r.a==='allow'&&r.s==='any'&&r.d==='any')a.pen('An allow any→any rule opens everything!');LABRUN.L.chk(s);return`Rule ${r.n} added at position ${s.rules.indexOf(r)+1}`}],
  [/^commit$/,(m,s,a)=>{s.live=JSON.parse(JSON.stringify(s.rules));s.dirty=false;if(LABRUN.R.done.order)a.ok('commit');return'Commit job 1182 ... 100% — Configuration committed successfully'}],
  [/^test policy src (\S+) dst (\S+)(?: port (\d+))?$/,(m,s,a)=>{const r=fwEval(s.live||[{n:'ALLOW-VPN',a:'allow',s:'any',d:'192.0.2.10/32',p:'443'},{n:'ALLOW-WEB',a:'allow',s:'any',d:'192.0.2.80/32',p:'443'},{n:'DEFAULT-DENY',a:'deny',s:'any',d:'any',p:'any'}],m[1],m[2],m[3]||443);if(r&&r.a==='deny'&&inCidr(m[1],'198.51.100.0/24')&&r.s==='198.51.100.0/24')a.ok('test');return`Matched rule: ${r?r.n:'(none)'} → ${r?r.a.toUpperCase():'DENY'}`+(s.dirty?'\n(note: testing the COMMITTED policy — you have uncommitted changes)':'')}]],
 });
LABS['fw-block'].cmds=LABS['fw-block'].cmds.map(([re,fn])=>[re,(m,s,a)=>{LABRUN._api=a;return fn(m,s,a)}]);

lab('fw-publish',{t:'Publish a new web server safely',dom:'Firewall',host:'fw-edge-01',lower:1,cx:'firewall',prompt:()=>'admin@fw-edge-01> ',
 intro:'[CHANGE CHG-6034] New customer web server 10.20.0.15 (DMZ) must be reachable from the internet on HTTPS via public IP 192.0.2.80.',
 brief:'Create a destination NAT from public 192.0.2.80 to 10.20.0.15, add a rule that allows ONLY port 443 to it (not SSH, not the database), commit and test.',
 obj:[['look','Review rules and NAT','Run: show rules   and   show nat'],['nat','NAT 192.0.2.80 → 10.20.0.15','nat add WEB15 public 192.0.2.80 private 10.20.0.15'],['rule','Allow ONLY HTTPS (443) to the server','rule add ALLOW-WEB15 allow src any dst 10.20.0.15 port 443'],['commit','Commit the change','commit'],['test','Test HTTPS is allowed and SSH is still blocked','test policy src 203.0.113.9 dst 10.20.0.15 port 443   then port 22']],
 cheat:['show rules — rule base','show nat — NAT rules','nat add <name> public <ip> private <ip> — destination NAT','rule add <name> allow src any dst <ip> port 443 — allow one port','rule delete <name> — delete a rule','commit — activate','test policy src <ip> dst <ip> port <n> — check the result'],
 learn:'Least privilege: publish only the exact service (443). An "any port" rule would expose SSH, databases and admin panels to the whole internet. NAT maps the public IP to the private server.',
 init:()=>({rules:[{n:'ALLOW-VPN',a:'allow',s:'any',d:'192.0.2.10/32',p:'443'},{n:'DEFAULT-DENY',a:'deny',s:'any',d:'any',p:'any'}],nat:[],live:null,t443:false,t22:false}),
 cmds:[...FWCMD,
  [/^show nat$/,(m,s,a)=>{a.ok('look');return'NAME     PUBLIC         PRIVATE\n'+(s.nat.map(n=>`${n.n.padEnd(8)} ${n.p.padEnd(14)} ${n.v}`).join('\n')||'(none)')}],
  [/^nat add (\S+) public (\S+) private (\S+)$/,(m,s,a)=>{s.nat.push({n:m[1].toUpperCase(),p:m[2],v:m[3]});s.dirty=true;if(m[2]==='192.0.2.80'&&m[3]==='10.20.0.15')a.ok('nat');return'NAT rule added'}],
  [/^rule add (\S+) (allow|deny) src (\S+) dst (\S+)(?: port (\S+))?(?: position (top|bottom))?$/,(m,s,a)=>{const r=fwAdd(s,m);const d=r.d.replace('/32','');if(r.a==='allow'&&(d==='10.20.0.15'||d==='192.0.2.80')){if(r.p==='any'){a.pen('Port "any" exposes SSH, databases and admin panels to the whole internet! Delete it and allow only 443.');return`Rule ${r.n} added`}if(r.p==='443')a.ok('rule');else return`Rule ${r.n} added (port ${r.p} — the requirement was HTTPS 443)`}if(r.a==='allow'&&r.d==='any')a.pen('Allowing to "any" destination opens far too much!');return`Rule ${r.n} added`}],
  [/^commit$/,(m,s,a)=>{s.live=JSON.parse(JSON.stringify(s.rules));s.dirty=false;if(LABRUN.R.done.nat&&LABRUN.R.done.rule)a.ok('commit');return'Configuration committed successfully'}],
  [/^test policy src (\S+) dst (\S+)(?: port (\d+))?$/,(m,s,a)=>{const rules=s.live||[];const port=m[3]||443;const r=fwEval(rules,m[1],m[2],port);if(!LABRUN.R.done.commit)return'(commit first — tests run against the committed policy)';if(r&&r.a==='allow'&&String(port)==='443')s.t443=true;if((!r||r.a==='deny')&&String(port)==='22')s.t22=true;if(s.t443&&s.t22)a.ok('test');else if(s.t443)labPrint('Now test port 22 to prove SSH stays closed.','hint');return`Matched rule: ${r?r.n:'DEFAULT-DENY'} → ${r?r.a.toUpperCase():'DENY'}`}]]});

lab('fw-ddos',{t:'Mitigate a DDoS attack',dom:'Firewall',host:'fw-edge-01',lower:1,cx:'ddos',prompt:()=>'admin@fw-edge-01> ',
 intro:'[ALERT] Inbound traffic 38 Gbps (normal 2 Gbps). Thousands of half-open connections. Customer sites are timing out.',
 brief:'This is a SYN flood from thousands of addresses — too many to block one by one. Turn on SYN cookies for the untrust zone, activate the upstream scrubbing service, commit and verify traffic is back to normal.',
 obj:[['look','Analyse the traffic','Run: show traffic'],['syn','Enable SYN cookies on the untrust zone','set zone-protection untrust syn-cookies on'],['scrub','Activate upstream DDoS scrubbing','ddos-scrubbing activate'],['commit','Commit','commit'],['verify','Verify traffic is normal','show traffic']],
 cheat:['show traffic — traffic summary','show sessions — session table','show zone-protection untrust — current protection','set zone-protection untrust syn-cookies on — SYN flood defence','set zone-protection untrust syn-rate <n> — rate threshold','ddos-scrubbing activate — reroute through scrubbing provider','commit — activate'],
 learn:'Big floods are absorbed upstream by scrubbing providers that filter bad traffic before it reaches your link. SYN cookies let the firewall survive half-open floods without filling its session table.',
 init:()=>({syn:false,scrub:false,live:false}),
 cmds:[
  [/^show traffic$/,(m,s,a)=>{if(s.live&&s.scrub){a.ok('verify');return'Inbound: 2.3 Gbps (normal)\nHalf-open sessions: 1%\nCustomer latency: 40 ms ✓'}a.ok('look');return`Inbound: ${s.live&&s.syn?'31':'38'} Gbps   (normal: 2 Gbps)\nTop pattern: TCP SYN to 192.0.2.80:443 from 41,200 different source IPs\nHalf-open sessions: 97%\nLink utilisation: 100%`}],
  [/^show sessions$/,()=>'Active sessions: 1,982,441 (97% half-open SYN)'],
  [/^show zone-protection untrust$/,(m,s)=>`syn-cookies: ${s.syn?'on':'off'}\nscrubbing: ${s.scrub?'ACTIVE':'standby'}`],
  [/^set zone-protection untrust syn-cookies on$/,(m,s,a)=>{s.syn=true;a.ok('syn');return''}],
  [/^set zone-protection untrust syn-rate \d+$/,()=>'(threshold set)'],
  [/^ddos-scrubbing activate$/,(m,s,a)=>{s.scrub=true;a.ok('scrub');return'Requesting BGP diversion to scrubbing provider "CleanPipe"... accepted.\nTraffic now passes through scrubbing centres.'}],
  [/^(block|rule add .* deny src any)/,(m,s,a)=>{a.pen('Blocking "any" source would block every real customer too!');return''}],
  [/^commit$/,(m,s,a)=>{s.live=true;if(s.syn)a.ok('commit');return'Configuration committed successfully'}]]});

/* ================= PROXY ================= */
lab('px-filter',{t:'Secure Web Gateway: stop risky browsing',dom:'Proxy',host:'proxy-01',lower:1,cx:'proxy',prompt:()=>'admin@proxy-01> ',
 intro:'[SOC] Two staff clicked a phishing link today, and someone downloaded an .exe from a brand-new website.',
 brief:'Review the proxy logs, block the phishing and malware categories, block newly-registered domains and .exe downloads, then add an exception for the business partner site from the helpdesk ticket. Commit.',
 obj:[['logs','Review the proxy logs','Run: show logs'],['phish','Block phishing AND malware categories','category block phishing   +   category block malware'],['nrd','Block newly-registered domains','category block newly-registered'],['exe','Block .exe downloads','filetype block exe'],['exc','Allow the partner site from the ticket','show tickets   then   allow domain <domain>'],['commit','Commit the policy','commit']],
 cheat:['show logs — recent web requests','show tickets — helpdesk tickets','category list — categories and actions','category block <name> — block a category','filetype block exe — block a file type','allow domain <domain> — exception for one domain','test url <url> — check verdict','commit — activate'],
 learn:'A web proxy controls outbound browsing: block risky categories (phishing, malware, newly-registered domains), stop executable downloads, and allow specific business exceptions through a ticket.',
 init:()=>({cat:{phishing:'allow',malware:'allow','newly-registered':'allow',social:'allow',news:'allow'},exe:false,allow:[]}),
 cmds:[
  [/^show logs$/,(m,s,a)=>{a.ok('logs');return'TIME  USER       URL                                       CATEGORY          ACTION\n09:02 p.sharma   login-secure-update.example/office365     phishing          allow\n09:05 r.iyer     login-secure-update.example/office365     phishing          allow\n10:11 a.khan     files-free-download.example/setup.exe     newly-registered  allow\n10:30 m.das      news.example/today                         news              allow'}],
  [/^show tickets$/,()=>'TKT-311 (approved by IT manager): "Please make sure partnerportal.example keeps working — it is our logistics partner\'s new portal (newly registered last week)."'],
  [/^category list$/,(m,s)=>Object.entries(s.cat).map(([k,v])=>k.padEnd(18)+v).join('\n')],
  [/^category block (\S+)$/,(m,s,a)=>{if(!(m[1] in s.cat))return'Unknown category. See: category list';s.cat[m[1]]='block';if(m[1]==='news'||m[1]==='social')return'(blocked — but that was not required)';if(s.cat.phishing==='block'&&s.cat.malware==='block')a.ok('phish');if(s.cat['newly-registered']==='block')a.ok('nrd');return''}],
  [/^category allow (\S+)$/,(m,s,a)=>{if(m[1] in s.cat)s.cat[m[1]]='allow';if(['phishing','malware'].includes(m[1]))a.pen('Allowing phishing/malware puts every user at risk!');return''}],
  [/^filetype block (exe|\.exe)$/,(m,s,a)=>{s.exe=true;a.ok('exe');return''}],
  [/^allow domain (\S+)$/,(m,s,a)=>{s.allow.push(m[1]);if(m[1]==='partnerportal.example')a.ok('exc');else if(m[1].includes('login-secure')||m[1].includes('files-free'))a.pen('You whitelisted a malicious site!');return`Exception added for ${m[1]}`}],
  [/^test url (\S+)$/,(m,s)=>{const u=m[1];if(s.allow.some(d=>u.includes(d)))return'ALLOW (exception)';if(u.endsWith('.exe')&&s.exe)return'BLOCK (file type)';if(u.includes('login-secure'))return s.cat.phishing==='block'?'BLOCK (phishing)':'ALLOW';if(u.includes('partnerportal')||u.includes('files-free'))return s.cat['newly-registered']==='block'?'BLOCK (newly-registered)':'ALLOW';return'ALLOW'}],
  [/^commit$/,(m,s,a)=>{if(['phish','nrd','exe','exc'].every(k=>LABRUN.R.done[k]))a.ok('commit');return'Policy committed'}]]});

/* ================= SIEM ================= */
lab('siem-brute',{t:'SIEM: password spray → compromised account',dom:'SIEM',host:'siem',lower:1,cx:'siem',prompt:()=>'siem> ',
 intro:'[CORRELATION ALERT] "Many failed VPN logins followed by a success" — severity HIGH.',
 brief:'Investigate in the SIEM: find the attacking IP, check whether it got in, see what the account did, open a case, contain (disable the user and block the IP) and fix the root cause (MFA was missing on the legacy VPN profile).',
 obj:[['top','Find the top failing source IPs','search event=auth_failure | stats count by src_ip'],['success','Check if that IP ever logged in successfully','search event=auth_success src_ip=203.0.113.45'],['scope','Investigate what the user did','search user=r.mehta'],['case','Open an incident case','case create severity=high title="VPN account compromise"'],['contain','Disable the user and block the IP','respond disable-user r.mehta   +   respond block-ip 203.0.113.45'],['mfa','Enforce MFA on the legacy VPN profile','respond enforce-mfa vpn-legacy']],
 cheat:['search event=auth_failure | stats count by src_ip — count failures per IP','search event=auth_success src_ip=<ip> — successful logins from an IP','search user=<name> — everything a user did','search src_ip=<ip> — everything from an IP','case create severity=high title="..." — open a case','respond disable-user <user> — disable account','respond block-ip <ip> — block at the firewall','respond enforce-mfa <profile> — require MFA'],
 learn:'SIEMs correlate logs from many systems. Here: thousands of failures, then a success = a guessed password. Scope what the account touched, contain fast, and fix the root cause — accounts without MFA are the weakest link.',
 init:()=>({d:false,b:false}),
 cmds:[
  [/^search .*auth_failure.*\|.*(stats|count|top).*$/,(m,s,a)=>{a.ok('top');return'src_ip           count   targets\n203.0.113.45     4,812   vpn (312 different usernames)\n198.51.100.7        14   vpn (1 user — typo?)\n10.20.4.18           3   ad-01'}],
  [/^search .*auth_failure.*$/,()=>'… 4,829 events. Tip: summarise with  | stats count by src_ip'],
  [/^search .*auth_success.*203\.0\.113\.45.*$|^search .*203\.0\.113\.45.*auth_success.*$/,(m,s,a)=>{a.ok('success');return'time   user      src_ip         app   mfa\n02:41  r.mehta   203.0.113.45   vpn   NOT REQUIRED (profile: vpn-legacy)'}],
  [/^search .*src_ip=203\.0\.113\.45.*$/,()=>'4,812 auth_failure … and 1 auth_success (user r.mehta at 02:41) ← look closer'],
  [/^search .*user=r\.mehta.*$/,(m,s,a)=>{a.ok('scope');return'02:41 vpn        login success from 203.0.113.45 (abroad) — no MFA\n02:50 fileshare  opened \\\\fs-02\\HR\\salaries\n02:55 proxy      upload 1.2 GB to file-drop.example   <- possible data exfiltration\n08:30 vpn        normal login from Mumbai (the real user)'}],
  [/^case create.*$/,(m,s,a)=>{a.ok('case');return'CASE-2291 created (severity HIGH). Timeline attached.'}],
  [/^respond disable-user (\S+)$/,(m,s,a)=>{if(m[1]!=='r.mehta'){a.pen(`You disabled ${m[1]}, who did nothing wrong!`);return''}s.d=true;if(s.b)a.ok('contain');return'Account r.mehta disabled, sessions revoked.'}],
  [/^respond block-ip (\S+)$/,(m,s,a)=>{if(m[1]!=='203.0.113.45')return`Blocked ${m[1]} (not the attacker)`;s.b=true;if(s.d)a.ok('contain');return'Firewall object updated: 203.0.113.45 blocked.'}],
  [/^respond enforce-mfa (\S+)$/,(m,s,a)=>{if(m[1]==='vpn-legacy'){a.ok('mfa');return'MFA now required for all users on vpn-legacy.'}return'(profile updated — but the weak one was vpn-legacy)'}]]});

/* ================= EDR ================= */
lab('edr-ransom',{t:'EDR: ransomware behaviour detected',dom:'EDR',host:'edr',lower:1,cx:'edr',prompt:()=>'edr> ',
 intro:'[EDR ALERT 311] Mass file renaming/encryption behaviour on file server fs-03, originating from workstation WS-117.',
 brief:'Triage the alert, isolate BOTH machines from the network (keep them powered on for evidence), block the malicious file hash everywhere, purge the phishing email from all inboxes, and scan the workstation.',
 obj:[['look','List open alerts','Run: alerts'],['triage','Open the alert details','Run: alert show 311'],['isolate','Isolate WS-117 and FS-03 (do NOT power off)','host isolate ws-117   +   host isolate fs-03'],['block','Block the file hash on all endpoints','hash block <sha256 from the alert>'],['purge','Purge the phishing email from all inboxes','email purge subject "Invoice 2291"'],['scan','Run a full scan on WS-117','host scan ws-117']],
 cheat:['alerts — open alerts','alert show <id> — details','host isolate <host> — network-isolate (stays powered on)','host shutdown <host> — power off','hash block <sha256> — block a file everywhere','email purge subject "<text>" — remove an email from all mailboxes','host scan <host> — full scan'],
 learn:'Contain fast: network isolation stops the spread while keeping memory evidence (powering off loses it). Then block the indicator everywhere and remove the delivery method (the email). Recovery comes from clean, offline backups.',
 init:()=>({iso:new Set()}),
 cmds:[
  [/^alerts$/,(m,s,a)=>{a.ok('look');return'ID   SEV   HOST     TITLE\n311  HIGH  fs-03    Mass file rename + encryption behaviour\n308  LOW  ws-044   Unsigned driver loaded'}],
  [/^alert show 311$/,(m,s,a)=>{a.ok('triage');return'Alert 311 — HIGH\nOrigin: WS-117 (user p.sharma) opened attachment "Invoice_2291.pdf.exe" from email "Invoice 2291" at 09:12\nBehaviour: 2,340 files renamed to *.locked on \\\\fs-03\\finance via SMB\nFile SHA256: 4b1e9c27a0f3d…e17  (prefix 4b1e9c27)\nStatus: still active'}],
  [/^host isolate (\S+)$/,(m,s,a)=>{const h=m[1].replace(/^ws117$/,'ws-117');if(!['ws-117','fs-03'].includes(h))return`${h} isolated (not involved in this alert)`;s.iso.add(h);if(s.iso.size===2)a.ok('isolate');return`${h.toUpperCase()} isolated from the network — EDR console access only.`}],
  [/^host shutdown (\S+)$/,(m,s,a)=>{a.pen('Powering off destroys memory evidence — isolate instead.');return''}],
  [/^hash block (\S+)$/,(m,s,a)=>{if(m[1].startsWith('4b1e9c27')){a.ok('block');return'Hash blocked on 1,214 endpoints.'}return'Hash not found in this alert.'}],
  [/^email purge.*invoice 2291.*$/,(m,s,a)=>{a.ok('purge');return'Purged 37 copies of "Invoice 2291" from mailboxes.'}],
  [/^host scan (\S+)$/,(m,s,a)=>{if(m[1]!=='ws-117')return'Scan complete: clean.';if(!s.iso.has('ws-117'))return'Isolate the host before scanning.';a.ok('scan');return'Scan complete: 1 malicious file quarantined (Invoice_2291.pdf.exe).'}]]});

/* ================= PAM ================= */
lab('pam-vendor',{t:'PAM: vendor needs root access',dom:'PAM',host:'pam',lower:1,cx:'pam',prompt:()=>'pam> ',
 intro:'[REQUEST] DB vendor "ankit.dbvendor" messaged on chat: "pls send me root password of db-07 for patching".',
 brief:'Never share passwords. Grant the vendor time-limited, ticket-approved, recorded access through the vault, watch the session, revoke it when done and rotate the root password.',
 obj:[['look','Review pending requests','Run: requests'],['grant','Grant ticketed, time-limited, recorded access','access grant ankit.dbvendor root@db-07 --ticket CHG-4821 --duration 60m --record'],['monitor','Watch the live session','session list   then   session show S-77'],['revoke','Revoke access when the work is done','access revoke ankit.dbvendor'],['rotate','Rotate the root password','account rotate root@db-07']],
 cheat:['requests — pending access requests','account list — vaulted accounts','access grant <user> <account> --ticket <id> --duration <n>m --record — grant access','password show <account> — reveal a password','session list — live sessions','session show <id> — watch commands','access revoke <user> — remove access','account rotate <account> — new random password'],
 learn:'PAM vaults privileged passwords so humans never see or share them. Access is approved by ticket, limited in time, fully recorded, and the password is rotated afterwards so it cannot be reused.',
 init:()=>({g:false,r:false}),
 cmds:[
  [/^requests$/,(m,s,a)=>{a.ok('look');return'REQ-901  ankit.dbvendor  wants root@db-07  reason: PostgreSQL patch  ticket: CHG-4821 (approved 14:00–15:00)\n(also sent via chat asking for the password — policy violation)'}],
  [/^account list$/,()=>'root@db-07        vaulted   last rotated 30d ago\nadmin@fw-edge-01  vaulted\nsa@sql-02         vaulted'],
  [/^password (show|reveal) .*$/,(m,s,a)=>{a.pen('Never reveal or share privileged passwords — that is exactly what PAM prevents.');return'(denied by policy)'}],
  [/^access grant (\S+) (\S+)(.*)$/,(m,s,a)=>{const o=m[3];if(m[1]!=='ankit.dbvendor'||m[2]!=='root@db-07')return'Request does not match REQ-901.';if(!/--ticket chg-4821/.test(o))return'Error: an approved change ticket is required (--ticket CHG-4821)';const d=o.match(/--duration (\d+)m/);if(!d)return'Error: vendor access must be time-limited (--duration <n>m)';if(+d[1]>120)return'Policy: vendor access is limited to 120 minutes';if(!/--record/.test(o))return'Policy: vendor sessions must be recorded (--record)';s.g=true;a.ok('grant');return`Access granted for ${d[1]} minutes. Vendor connects through the PAM proxy; password is never shown.\nSession S-77 started (recording).`}],
  [/^session list$/,(m,s)=>s.g&&!s.r?'S-77  ankit.dbvendor → root@db-07  recording  12 min':'(no live sessions)'],
  [/^session show s-77$/,(m,s,a)=>{if(!s.g)return'No such session';a.ok('monitor');return'14:03  systemctl stop postgresql\n14:04  apt install --only-upgrade postgresql-14\n14:09  systemctl start postgresql\n14:10  psql -c "select version();"\n(work matches the change ticket ✓)'}],
  [/^(access revoke ankit\.dbvendor|session end s-77)$/,(m,s,a)=>{if(!s.g)return'Nothing to revoke';s.r=true;a.ok('revoke');return'Access revoked, session S-77 closed and archived.'}],
  [/^account rotate root@db-07$/,(m,s,a)=>{if(!s.r)return'Revoke the vendor first, then rotate.';a.ok('rotate');return'Password rotated (32 random characters). Vendor\'s access is now useless.'}]]});

const LAB_ORDER=['lx-disk','lx-service','lx-mem','lx-perms','lx-ssh','lx-ufw','lx-patch','lx-backup','lx-brute','lx-users','nw-vlan','nw-errdis','nw-trunk','nw-route','nw-acl','nw-bgp','fw-block','fw-publish','fw-ddos','px-filter','siem-brute','edr-ransom','pam-vendor'];
