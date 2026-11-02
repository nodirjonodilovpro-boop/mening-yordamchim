/* ===== Yordamchi funksiyalar ===== */
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function $(id){ return document.getElementById(id); }
var UID='', tasks=[], debts=[], sites=[];
var currentSelectedDay = "Dushanba";
var currentSelectedDate = ""; // Tanlangan kunning aniq sanasi

// Mavzu o'zgartirish
$('themeBtn').addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

(function() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

/* ===== Menyu ===== */
$('nav').addEventListener('click', function(e) {
  var b = e.target.closest('button');
  if(!b) return;
  document.querySelectorAll('nav button').forEach(function(x){ x.classList.toggle('on', x===b); });
  document.querySelectorAll('.sec').forEach(function(s){ s.classList.toggle('on', s.id===b.dataset.s); });
});

/* ===== Firebase Baza ===== */
function loadUserData() {
  if (!UID) return;
  db.collection('users').doc(UID).get().then(function(doc) {
    if (doc.exists) {
      var data = doc.data();
      tasks = data.tasks || [];
      debts = data.debts || [];
      sites = data.sites || [];
    } else {
      tasks = []; debts = []; sites = [];
    }
    updateWeekDaysWithDates();
    renderTasks();
    renderDebts();
    renderSites();
    check();
  }).catch(function(err) { console.error("Yuklashda xatolik:", err); });
}

function saveUserData() {
  if (!UID) return;
  db.collection('users').doc(UID).set({
    tasks: tasks, debts: debts, sites: sites
  }, { merge: true });
}

/* ===== HAFTA KUNLARI VA SANALARINI HISOBLASH ===== */
const weekDaysOrder = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];
var weekDatesMap = {}; // { "Dushanba": "02.11.2026", ... }

function updateWeekDaysWithDates() {
  var now = new Date();
  var dayOfWeek = now.getDay(); // 0 - Yakshanba, 1 - Dushanba...
  var diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  
  // Haftaning Dushanba kunini aniqlash
  var monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  // Har bir kun uchun sanani hisoblab tugmalarga va obyektga biriktirish
  document.querySelectorAll('.week-btn').forEach(function(btn, index) {
    var dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + index);

    var d = String(dayDate.getDate()).padStart(2, '0');
    var m = String(dayDate.getMonth() + 1).padStart(2, '0');
    var y = dayDate.getFullYear();
    var dateFormatted = d + '.' + m + '.' + y;
    var dayName = btn.dataset.day;

    weekDatesMap[dayName] = dateFormatted;

    // Tugma matniga sanani chiqarish (Masalan: Dushanba 02.11)
    btn.innerHTML = dayName + '<br><small style="font-size:0.75rem;opacity:0.8">' + d + '.' + m + '</small>';
  });

  // Boshlang'ich tanlangan kun sanasini o'rnatish
  currentSelectedDate = weekDatesMap[currentSelectedDay];
  $('selectedDayTitle').innerText = '📌 ' + currentSelectedDay + ' (' + currentSelectedDate + ') kuni uchun ishlar';
}

// Hafta kuni tugmasi bosilganda
const weekSelector = $('weekSelector');
if (weekSelector) {
  weekSelector.addEventListener('click', function(e) {
    const btn = e.target.closest('.week-btn');
    if (!btn) return;

    document.querySelectorAll('.week-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');

    currentSelectedDay = btn.dataset.day;
    currentSelectedDate = weekDatesMap[currentSelectedDay];
    
    $('selectedDayTitle').innerText = '📌 ' + currentSelectedDay + ' (' + currentSelectedDate + ') kuni uchun ishlar';
    renderTasks();
  });
}

function renderTasks() {
  var dayTasks = tasks.filter(function(t) { return t.day === currentSelectedDay; });
  var l = dayTasks.slice().sort(function(a,b){ return (a.done - b.done) || ((a.time || '') > (b.time || '') ? 1 : -1); });

  $('tList').innerHTML = l.length ? l.map(function(t) {
    return '<div class="item '+(t.done ? 'done' : '')+'">' +
      '<input type="checkbox" style="width:22px;height:22px" '+(t.done ? 'checked' : '')+' data-d="'+t.id+'">' +
      '<div class="t"><b>'+esc(t.text)+'</b><small>📅 '+esc(t.date || '')+' · ⏰ '+esc(t.time || 'Vaqt belgilanmagan')+'</small></div>' +
      '<button class="mini" data-x="'+t.id+'">✕</button></div>';
  }).join('') : '<div class="empty-box"><span>📝</span>'+currentSelectedDay+' ('+currentSelectedDate+') kuni uchun ishlar yo‘q</div>';
}

// Ish qo'shish
$('tAdd').onclick = function() {
  var tx = $('tText').value.trim();
  if(!tx) return;

  tasks.push({ 
    id: Date.now(), 
    text: tx, 
    day: currentSelectedDay, 
    date: currentSelectedDate, // Sanani ham saqlaymiz
    time: $('tTime').value, 
    done: false, 
    notified: false 
  });

  saveUserData(); 
  $('tText').value = ''; 
  $('tTime').value = '';
  renderTasks();
};

$('tList').addEventListener('click', function(e) {
  var d = e.target.dataset;
  if(d.d) {
    var t = tasks.find(function(x){ return x.id == d.d; });
    if(t) { t.done = e.target.checked; saveUserData(); renderTasks(); }
  }
  if(d.x) { 
    tasks = tasks.filter(function(x){ return x.id != d.x; }); 
    saveUserData(); 
    renderTasks(); 
  }
});

$('notifBtn').onclick = function() {
  try { 
    Notification.requestPermission().then(function(p){ 
      if(p === 'granted') alert('Bildirishnomaga ruxsat berildi!'); 
    }); 
  } catch(e) { 
    alert('Brauzer bildirishnomani qo‘llamaydi'); 
  }
};

function beep() {
  try {
    var c = new (window.AudioContext || window.webkitAudioContext)();
    [0, .3, .6].forEach(function(t) {
      var o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value = 880; g.gain.value = .15;
      o.start(c.currentTime + t); o.stop(c.currentTime + t + .2);
    });
  } catch(e){}
}

const weekDaysMapUz = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

function check() {
  var now = new Date();
  var todayName = weekDaysMapUz[now.getDay()];
  var currentTimeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  var hit = [];

  tasks.forEach(function(t) {
    if(!t.done && !t.notified && t.day === todayName && t.time && t.time <= currentTimeStr) {
      t.notified = true; 
      hit.push(t.text);
    }
  });

  if(hit.length) {
    saveUserData(); renderTasks(); beep();
    $('alarmT').textContent = '⏰ Eslatma: ' + hit.join(' • ');
    $('alarm').style.display = 'block';
    try { if(Notification.permission==='granted') new Notification('Eslatma', {body: hit.join(', ')}); } catch(e){}
  }
}

$('alarmX').onclick = function(){ $('alarm').style.display = 'none'; };
setInterval(check, 15000);

/* ===== Kalkulyator ===== */
var cur='0', acc=null, op=null, fresh=true;
var KEYS=['C','⌫','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','±','0','.','='];
$('keys').innerHTML = KEYS.map(function(k){
  var c = ('÷×−+%'.indexOf(k)>-1 || k==='C'||k==='⌫'||k==='±') ? 'op' : (k==='=' ? 'eq' : '');
  return '<button class="'+c+'">'+k+'</button>';
}).join('');

function calc(a,b,o){ return o==='+'?a+b : o==='−'?a-b : o==='×'?a*b : o==='÷'?(b===0?NaN:a/b):b; }
function fmt(n){ return isNaN(n)?'Xato':String(parseFloat(n.toPrecision(12))); }

$('keys').addEventListener('click', function(e) {
  var k = e.target.textContent; if(e.target.tagName !== 'BUTTON') return;
  if(/[0-9]/.test(k)){ cur = (fresh || cur==='0') ? k : cur+k; fresh = false; }
  else if(k==='.'){ if(fresh){ cur='0.'; fresh=false; } else if(cur.indexOf('.')<0) cur+='.'; }
  else if(k==='C'){ cur='0'; acc=null; op=null; fresh=true; }
  else if(k==='⌫'){ cur = cur.length>1 ? cur.slice(0,-1) : '0'; }
  else if(k==='±'){ cur = cur==='0' ? cur : (cur[0]==='-' ? cur.slice(1) : '-'+cur); }
  else if(k==='%'){ cur = fmt(parseFloat(cur)/100); fresh = true; }
  else if(k==='='){ if(op!==null){ cur = fmt(calc(acc,parseFloat(cur),op)); acc=null; op=null; fresh=true; } }
  else { if(op!==null && !fresh){ acc = calc(acc,parseFloat(cur),op); cur = fmt(acc); } else acc = parseFloat(cur); op=k; fresh=true; }
  $('disp').textContent = cur;
});

/* ===== Qarzlar ===== */
function money(n){ return Number(n).toLocaleString('ru-RU'); }

function renderDebts() {
  var f = $('qFind').value.toLowerCase();
  var g=0, o=0; debts.forEach(function(d){ if(d.tur==='berdim') g+=d.sum; else o+=d.sum; });
  $('qSum2').innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:4px">Men berganim<b style="color:var(--plus)">'+money(g)+'</b></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:4px">Men olganim<b style="color:var(--minus)">'+money(o)+'</b></div>' +
    '<div style="display:flex;justify-content:space-between;font-weight:bold">Balans<b style="color:'+(g-o>=0?'var(--plus)':'var(--minus)')+'">'+money(g-o)+'</b></div>';
  
  var l = debts.filter(function(d){ return (d.ism+' '+d.fam+' '+d.tel).toLowerCase().indexOf(f)>-1; }).slice().reverse();
  $('qList').innerHTML = l.length ? l.map(function(d){
    return '<div class="item"><div class="t"><b>'+esc(d.ism)+' '+esc(d.fam)+'</b><small>'+(d.tel?'<a href="tel:'+esc(d.tel)+'" style="color:inherit">'+esc(d.tel)+'</a> · ':'')+esc(d.date)+(d.izoh?' · '+esc(d.izoh):'')+'</small></div>' +
      '<div style="text-align:right"><b style="color:'+(d.tur==='berdim'?'var(--plus)':'var(--minus)')+'">'+(d.tur==='berdim'?'+':'−')+money(d.sum)+'</b></div>' +
      '<button class="mini" data-x="'+d.id+'">✕</button></div>';
  }).join('') : '<div style="text-align:center;padding:16px;color:var(--muted)">Yozuv yo‘q</div>';
}

$('qAdd').onclick = function() {
  var s = parseFloat($('qSum').value), ism = $('qIsm').value.trim();
  if(!ism || !s){ alert('Ism va pul miqdorini kiriting'); return; }
  debts.push({ id: Date.now(), ism: ism, fam: $('qFam').value.trim(), tel: $('qTel').value.trim(), sum: s, tur: $('qTur').value, izoh: $('qIzoh').value.trim(), date: new Date().toLocaleDateString('ru-RU') });
  saveUserData(); ['qIsm','qFam','qTel','qSum','qIzoh'].forEach(function(i){ $(i).value=''; }); renderDebts();
};

$('qList').addEventListener('click', function(e) {
  var x = e.target.dataset.x;
  if(x && confirm('O‘chirilsinmi?')){ debts = debts.filter(function(d){ return d.id!=x; }); saveUserData(); renderDebts(); }
});
$('qFind').oninput = renderDebts;

/* ===== Saytlarim ===== */
var colors = ['#4f46e5,#7c3aed','#0ea5e9,#2563eb','#10b981,#059669','#f59e0b,#ef4444'];
function host(u){ try{ return new URL(u).hostname.replace('www.',''); }catch(e){ return u; } }

function renderSites() {
  $('sList').innerHTML = sites.length ? sites.map(function(s,i){
    var bg = s.img ? 'background-image:url('+s.img+')' : 'background-image:linear-gradient(135deg,'+colors[i%colors.length]+')';
    return '<div class="site"><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer"><div class="pic" style="'+bg+'">'+(s.img?'':esc(host(s.url).charAt(0).toUpperCase()))+'</div></a>' +
      '<div style="margin-top:4px"><a href="'+esc(s.url)+'" target="_blank" style="color:var(--text);text-decoration:none;font-size:0.85rem"><b>'+esc(s.name||host(s.url))+'</b></a></div>' +
      '<button class="mini" style="margin-top:4px" data-x="'+s.id+'">✕</button></div>';
  }).join('') : '<div style="grid-column:1/-1;text-align:center;padding:16px;color:var(--muted)">Hali sayt qo‘shilmagan</div>';
}

function shrink(file,cb) {
  var r = new FileReader();
  r.onload = function(){
    var im = new Image();
    im.onload = function(){
      var w = Math.min(600, im.width), h = im.height*w/im.width, c = document.createElement('canvas');
      c.width = w; c.height = h; c.getContext('2d').drawImage(im,0,0,w,h);
      cb(c.toDataURL('image/jpeg', .7));
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
}

$('sAdd').onclick = function() {
  var u = $('sUrl').value.trim(); if(!u) return;
  if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
  var f = $('sImg').files[0];
  function add(img) {
    sites.push({ id: Date.now(), url: u, name: $('sName').value.trim(), img: img||'' });
    saveUserData(); $('sUrl').value=''; $('sName').value=''; $('sImg').value=''; renderSites();
  }
  if(f) shrink(f, add); else add('');
};

$('sList').addEventListener('click', function(e) {
  var x = e.target.dataset.x;
  if(x && confirm('O‘chirilsinmi?')){ sites = sites.filter(function(s){ return s.id!=x; }); saveUserData(); renderSites(); }
});

/* ===== Kirish va Ro'yxatdan O'tish ===== */
var mode = 'login';
function av(n){ return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#6366f1"/><text x="32" y="43" font-size="32" text-anchor="middle" fill="#fff" font-family="sans-serif">'+esc((n||'?').charAt(0).toUpperCase())+'</text></svg>'); }

function setMode(m) {
  mode = m;
  $('tabLogin').classList.toggle('on', m==='login');
  $('tabReg').classList.toggle('on', m==='reg');
  $('lPass2').style.display = m==='reg' ? 'block' : 'none';
  $('lBtn').textContent = m==='reg' ? 'Ro‘yxatdan o‘tish' : 'Kirish';
  $('lSub').textContent = m==='reg' ? 'Yangi email va parol yarating' : 'Hisobingizga kiring';
  $('lErr').textContent = '';
}

function submitAuth() {
  var lg = $('lLogin').value.trim(), pw = $('lPass').value, err = $('lErr');
  err.textContent = '';
  var email = lg.includes('@') ? lg : lg.toLowerCase() + '@yordamchi.app';

  if(lg.length < 3){ err.textContent = 'Login kamida 3 ta belgidan iborat bo‘lsin'; return; }
  if(pw.length < 6){ err.textContent = 'Parol kamida 6 ta belgidan iborat bo‘lsin'; return; }

  if(mode === 'reg') {
    if(pw !== $('lPass2').value){ err.textContent = 'Parollar bir xil emas'; return; }
    auth.createUserWithEmailAndPassword(email, pw).then(function(userCredential) {
      return userCredential.user.updateProfile({ displayName: lg });
    }).catch(function(error) {
      err.textContent = error.code === 'auth/email-already-in-use' ? 'Bu login band.' : error.message;
    });
  } else {
    auth.signInWithEmailAndPassword(email, pw).catch(function() {
      err.textContent = 'Login yoki parol noto‘g‘ri';
    });
  }
}

auth.onAuthStateChanged(function(user) {
  if (user) {
    UID = user.uid;
    var name = user.displayName || user.email.split('@')[0];
    $('meImg').src = user.photoURL || av(name);
    $('login').style.display = 'none';
    $('app').style.display = 'block';
    loadUserData();
  } else {
    UID = '';
    $('login').style.display = 'flex';
    $('app').style.display = 'none';
  }
});

$('tabLogin').onclick = function(){ setMode('login'); };
$('tabReg').onclick = function(){ setMode('reg'); };
$('lBtn').onclick = submitAuth;
['lLogin','lPass','lPass2'].forEach(function(id){ $(id).addEventListener('keydown', function(e){ if(e.key==='Enter') submitAuth(); }); });
$('eye').onclick = function(){ var t = $('lPass').type==='password'?'text':'password'; $('lPass').type=t; $('lPass2').type=t; };
$('out').onclick = function(){ auth.signOut().then(function(){ location.reload(); }); };