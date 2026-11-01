/* ===== Yordamchi funksiyalar ===== */
function load(k){try{var v=localStorage.getItem(K(k));return v?JSON.parse(v):[]}catch(e){return []}}
function save(k,v){try{localStorage.setItem(K(k),JSON.stringify(v))}catch(e){alert('Saqlab bo‘lmadi (xotira to‘lgan bo‘lishi mumkin)')}}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function $(id){return document.getElementById(id)}
var UID='',tasks=[],debts=[],sites=[];
function K(k){return k+'_'+UID}

/* ===== Menyu (bo'limlar) ===== */
$('nav').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
document.querySelectorAll('nav button').forEach(function(x){x.classList.toggle('on',x===b)});
document.querySelectorAll('.sec').forEach(function(s){s.classList.toggle('on',s.id===b.dataset.s)})});

/* ===== Kundalik ishlar ===== */
var d0=new Date();
$('tDate').value=d0.getFullYear()+'-'+String(d0.getMonth()+1).padStart(2,'0')+'-'+String(d0.getDate()).padStart(2,'0');

function renderTasks(){
var l=tasks.slice().sort(function(a,b){return (a.done-b.done)||((a.date+a.time)>(b.date+b.time)?1:-1)});
var now=new Date();
$('tList').innerHTML=l.length?l.map(function(t){
var late=!t.done&&t.date&&new Date(t.date+'T'+(t.time||'23:59'))<now;
return '<div class="item '+(t.done?'done':'')+'"><input type="checkbox" style="width:22px;height:22px" '+(t.done?'checked':'')+' data-d="'+t.id+'"><div class="t"><b>'+esc(t.text)+'</b><small class="'+(late?'late':'')+'">'+esc(t.date||'')+' '+esc(t.time||'')+(late?' · kechikdi':'')+'</small></div><button class="mini" data-x="'+t.id+'">✕</button></div>'}).join(''):'<div class="empty">Hozircha ish yo‘q</div>'}

$('tAdd').onclick=function(){var tx=$('tText').value.trim();if(!tx)return;
tasks.push({id:Date.now(),text:tx,date:$('tDate').value,time:$('tTime').value,done:false,notified:false});
save('y_tasks',tasks);$('tText').value='';renderTasks()};

$('tList').addEventListener('click',function(e){var d=e.target.dataset;
if(d.d){var t=tasks.find(function(x){return x.id==d.d});t.done=e.target.checked;save('y_tasks',tasks);renderTasks()}
if(d.x){tasks=tasks.filter(function(x){return x.id!=d.x});save('y_tasks',tasks);renderTasks()}});

$('notifBtn').onclick=function(){try{Notification.requestPermission()}catch(e){alert('Brauzer bildirishnomani qo‘llamaydi')}};

function beep(){try{var c=new (window.AudioContext||window.webkitAudioContext)();[0,.3,.6].forEach(function(t){var o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=880;g.gain.value=.15;o.start(c.currentTime+t);o.stop(c.currentTime+t+.2)})}catch(e){}}

function check(){var now=new Date(),hit=[];
tasks.forEach(function(t){if(!t.done&&!t.notified&&t.date&&t.time&&new Date(t.date+'T'+t.time)<=now){t.notified=true;hit.push(t.text)}});
if(hit.length){save('y_tasks',tasks);renderTasks();beep();
$('alarmT').textContent='⏰ Eslatma: '+hit.join(' • ');$('alarm').style.display='block';
try{if(Notification.permission==='granted')new Notification('Eslatma',{body:hit.join(', ')})}catch(e){}}}

$('alarmX').onclick=function(){$('alarm').style.display='none'};
setInterval(check,15000);check();renderTasks();

/* ===== Kalkulyator ===== */
var cur='0',acc=null,op=null,fresh=true;
var KEYS=['C','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','±','0','.','='];
$('keys').innerHTML=KEYS.map(function(k){var c=('÷×−+%'.indexOf(k)>-1||k==='C'||k==='⌫'||k==='±')?'op':(k==='='?'eq':'');return '<button class="'+c+'">'+k+'</button>'}).join('');

function calc(a,b,o){return o==='+'?a+b:o==='−'?a-b:o==='×'?a*b:o==='÷'?(b===0?NaN:a/b):b}
function fmt(n){return isNaN(n)?'Xato':String(parseFloat(n.toPrecision(12)))}

$('keys').addEventListener('click',function(e){var k=e.target.textContent;if(e.target.tagName!=='BUTTON')return;
if(/[0-9]/.test(k)){cur=(fresh||cur==='0')?k:cur+k;fresh=false}
else if(k==='.'){if(fresh){cur='0.';fresh=false}else if(cur.indexOf('.')<0)cur+='.'}
else if(k==='C'){cur='0';acc=null;op=null;fresh=true}
else if(k==='⌫'){cur=cur.length>1?cur.slice(0,-1):'0'}
else if(k==='±'){cur=cur==='0'?cur:(cur[0]==='-'?cur.slice(1):'-'+cur)}
else if(k==='%'){cur=fmt(parseFloat(cur)/100);fresh=true}
else if(k==='='){if(op!==null){cur=fmt(calc(acc,parseFloat(cur),op));acc=null;op=null;fresh=true}}
else{if(op!==null&&!fresh){acc=calc(acc,parseFloat(cur),op);cur=fmt(acc)}else acc=parseFloat(cur);op=k;fresh=true}
$('disp').textContent=cur});

/* ===== Qarzlar ===== */
function money(n){return Number(n).toLocaleString('ru-RU')}

function renderDebts(){
var f=$('qFind').value.toLowerCase();
var g=0,o=0;debts.forEach(function(d){if(d.tur==='berdim')g+=d.sum;else o+=d.sum});
$('qSum2').innerHTML='<div>Men berganim<b class="plus">'+money(g)+'</b></div><div>Men olganim<b class="minus">'+money(o)+'</b></div><div>Balans<b class="'+(g-o>=0?'plus':'minus')+'">'+money(g-o)+'</b></div>';
var l=debts.filter(function(d){return (d.ism+' '+d.fam+' '+d.tel).toLowerCase().indexOf(f)>-1}).slice().reverse();
$('qList').innerHTML=l.length?l.map(function(d){return '<div class="item"><div class="t"><b>'+esc(d.ism)+' '+esc(d.fam)+'</b><small>'+(d.tel?'<a href="tel:'+esc(d.tel)+'" style="color:inherit">'+esc(d.tel)+'</a> · ':'')+esc(d.date)+(d.izoh?' · '+esc(d.izoh):'')+'</small></div><div style="text-align:right"><b class="'+(d.tur==='berdim'?'plus':'minus')+'">'+(d.tur==='berdim'?'+':'−')+money(d.sum)+'</b><span class="tag">'+(d.tur==='berdim'?'berdim':'oldim')+'</span></div><button class="mini" data-x="'+d.id+'">✕</button></div>'}).join(''):'<div class="empty">Yozuv yo‘q</div>'}

$('qAdd').onclick=function(){var s=parseFloat($('qSum').value);var ism=$('qIsm').value.trim();
if(!ism||!s){alert('Ism va pul miqdorini kiriting');return}
debts.push({id:Date.now(),ism:ism,fam:$('qFam').value.trim(),tel:$('qTel').value.trim(),sum:s,tur:$('qTur').value,izoh:$('qIzoh').value.trim(),date:new Date().toLocaleDateString('ru-RU')});
save('y_debts',debts);['qIsm','qFam','qTel','qSum','qIzoh'].forEach(function(i){$(i).value=''});renderDebts()};

$('qList').addEventListener('click',function(e){var x=e.target.dataset.x;if(x&&confirm('O‘chirilsinmi?')){debts=debts.filter(function(d){return d.id!=x});save('y_debts',debts);renderDebts()}});
$('qFind').oninput=renderDebts;renderDebts();

/* ===== Saytlarim ===== */
var colors=['#4f46e5,#7c3aed','#0ea5e9,#2563eb','#10b981,#059669','#f59e0b,#ef4444','#ec4899,#8b5cf6','#14b8a6,#0ea5e9'];
function host(u){try{return new URL(u).hostname.replace('www.','')}catch(e){return u}}

function renderSites(){
$('sList').innerHTML=sites.length?sites.map(function(s,i){
var bg=s.img?'background-image:url('+s.img+')':'background-image:linear-gradient(135deg,'+colors[i%colors.length]+')';
return '<div class="site"><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer"><div class="pic" style="'+bg+'">'+(s.img?'':esc(host(s.url).charAt(0).toUpperCase()))+'</div></a><div class="info"><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer"><b>'+esc(s.name||host(s.url))+'</b><small>'+esc(host(s.url))+'</small></a><button class="mini" data-x="'+s.id+'">✕</button></div></div>'}).join(''):'<div class="empty" style="grid-column:1/-1">Hali sayt qo‘shilmagan</div>'}

function shrink(file,cb){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var w=Math.min(600,im.width),h=im.height*w/im.width,c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);cb(c.toDataURL('image/jpeg',.7))};im.src=r.result};r.readAsDataURL(file)}

$('sAdd').onclick=function(){var u=$('sUrl').value.trim();if(!u)return;if(!/^https?:\/\//i.test(u))u='https://'+u;
var f=$('sImg').files[0];
function add(img){sites.push({id:Date.now(),url:u,name:$('sName').value.trim(),img:img||''});save('y_sites',sites);$('sUrl').value='';$('sName').value='';$('sImg').value='';renderSites()}
if(f)shrink(f,add);else add('')};

$('sList').addEventListener('click',function(e){var x=e.target.dataset.x;if(x&&confirm('O‘chirilsinmi?')){sites=sites.filter(function(s){return s.id!=x});save('y_sites',sites);renderSites()}});
renderSites();

/* ===== Kirish va ro'yxatdan o'tish ===== */
// var GOOGLE_CLIENT_ID='926831343170-nu6nd007rq8duanf5fgvbolt9dsv01d3.apps.googleusercontent.com';   // <-- Google Client ID ni shu yerga qo'ying
var mode='login';

function av(n){return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#6366f1"/><text x="32" y="43" font-size="32" text-anchor="middle" fill="#fff" font-family="sans-serif">'+esc((n||'?').charAt(0).toUpperCase())+'</text></svg>')}

function getUsers(){try{return JSON.parse(localStorage.getItem('y_users'))||{}}catch(e){return {}}}
function setUsers(u){try{localStorage.setItem('y_users',JSON.stringify(u))}catch(e){}}
function toHex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2)}).join('')}
function hashPw(pw,salt){
var s=salt+':'+pw;
if(window.crypto&&crypto.subtle&&window.TextEncoder){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(toHex)}
var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;
return Promise.resolve('x'+h)}

/* hisobga kirgach: ma'lumotlarni yuklash */
function enter(m){UID=m.id;
tasks=load('y_tasks');debts=load('y_debts');sites=load('y_sites');
$('meImg').src=m.avatarUrl;$('meImg').title=m.name||'';
$('login').style.display='none';$('app').style.display='block';
renderTasks();renderDebts();renderSites();check()}

function finish(m){try{localStorage.setItem('y_session',JSON.stringify(m))}catch(e){}enter(m)}

/* Kirish / Ro'yxatdan o'tish rejimi */
function setMode(m){mode=m;
$('tabLogin').classList.toggle('on',m==='login');
$('tabReg').classList.toggle('on',m==='reg');
$('lPass2').style.display=m==='reg'?'block':'none';
$('lBtn').textContent=m==='reg'?'Ro‘yxatdan o‘tish':'Kirish';
$('lSub').textContent=m==='reg'?'Yangi login va parol yarating':'Hisobingizga kiring';
$('lErr').textContent=''}

function submitAuth(){
var lg=$('lLogin').value.trim(),pw=$('lPass').value,err=$('lErr');err.textContent='';
if(lg.length<3){err.textContent='Login kamida 3 ta belgidan iborat bo‘lsin';return}
if(pw.length<4){err.textContent='Parol kamida 4 ta belgidan iborat bo‘lsin';return}
var key=lg.toLowerCase(),users=getUsers();
if(mode==='reg'){
if(users[key]){err.textContent='Bu login band. Boshqa login tanlang';return}
if(pw!==$('lPass2').value){err.textContent='Parollar bir xil emas';return}
var salt=String(Date.now())+Math.random();
hashPw(pw,salt).then(function(h){
users[key]={salt:salt,hash:h,name:lg};setUsers(users);
finish({id:'l_'+encodeURIComponent(key),name:lg,avatarUrl:av(lg)})});
}else{
var u=users[key];
if(!u){err.textContent='Bunday login topilmadi. Avval ro‘yxatdan o‘ting';return}
hashPw(pw,u.salt).then(function(h){
if(h!==u.hash){err.textContent='Parol noto‘g‘ri';return}
finish({id:'l_'+encodeURIComponent(key),name:u.name,avatarUrl:av(u.name)})})}}

/* Google bilan kirish */
function parseJwt(t){try{var b=t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(decodeURIComponent(escape(atob(b))))}catch(e){return null}}
function onGoogle(r){var p=parseJwt(r.credential);
if(!p||!p.sub){$('lErr').textContent='Google bilan kirib bo‘lmadi';return}
finish({id:'g_'+p.sub,name:p.name||p.email||'Foydalanuvchi',avatarUrl:p.picture||av(p.name)})}

function initGoogle(){
if(!GOOGLE_CLIENT_ID){
$('gBtn').innerHTML='<button type="button" class="gfake" id="gFake">Google bilan kirish</button>';
$('gFake').onclick=function(){$('lErr').textContent='Google ishlashi uchun script.js ichiga Client ID kiriting'};
return}
var s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;
s.onload=function(){
google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:onGoogle});
google.accounts.id.renderButton($('gBtn'),{theme:'filled_black',size:'large',shape:'pill',text:'continue_with',width:300})};
s.onerror=function(){$('lErr').textContent='Google yuklanmadi. Internetni tekshiring'};
document.head.appendChild(s)}

/* tugmalar */
$('tabLogin').onclick=function(){setMode('login')};
$('tabReg').onclick=function(){setMode('reg')};
$('lBtn').onclick=submitAuth;
['lLogin','lPass','lPass2'].forEach(function(id){$(id).addEventListener('keydown',function(e){if(e.key==='Enter')submitAuth()})});
$('eye').onclick=function(){var t=$('lPass').type==='password'?'text':'password';$('lPass').type=t;$('lPass2').type=t};
$('out').onclick=function(){try{localStorage.removeItem('y_session')}catch(e){}location.reload()};

/* oldin kirgan bo'lsa, avtomatik kirish */
var ses=null;try{ses=JSON.parse(localStorage.getItem('y_session'))}catch(e){}
if(ses&&ses.id)enter(ses);else initGoogle();