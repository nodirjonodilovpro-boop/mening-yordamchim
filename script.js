/* ===== Yordamchi funksiyalar ===== */
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function $(id){ return document.getElementById(id); }
var UID='', tasks=[], debts=[], passwords=[];

var currentWeekOffset = 0;
var selectedDayIndex = 0;
var currentSelectedDateStr = "";
var currentSelectedDayName = "Dushanba";

const weekDaysNames = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];

// Raqamlarni probel bilan ajratish (100000 -> 100 000)
function formatNumberInput(val) {
  var clean = val.replace(/\D/g, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function parseNumber(val) {
  return parseFloat(String(val).replace(/\s+/g, '')) || 0;
}

$('qSum').addEventListener('input', function(e) {
  e.target.value = formatNumberInput(e.target.value);
});

$('vSum').addEventListener('input', function(e) {
  e.target.value = formatNumberInput(e.target.value);
  convertCurrency();
});

// Mavzu o'zgartirish (Light / Dark)
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

/* ===== Navigation (Menyu bo'limlari) ===== */
$('nav').addEventListener('click', function(e) {
  var b = e.target.closest('button');
  if(!b) return;
  document.querySelectorAll('nav button').forEach(function(x){ x.classList.toggle('on', x===b); });
  document.querySelectorAll('.sec').forEach(function(s){ s.classList.toggle('on', s.id===b.dataset.s); });
});

/* ===== Firebase Baza (Ma'lumotlarni yuklash va saqlash) ===== */
function loadUserData() {
  if (!UID) return;
  db.collection('users').doc(UID).get().then(function(doc) {
    if (doc.exists) {
      var data = doc.data();
      tasks = data.tasks || [];
      debts = data.debts || [];
      passwords = data.passwords || [];
    } else {
      tasks = []; debts = []; passwords = [];
    }
    renderWeekCalendar();
    renderTasks();
    renderDebts();
    renderPasswords();
    check();
  }).catch(function(err) { console.error("Yuklashda xatolik:", err); });
}

function saveUserData() {
  if (!UID) return;
  db.collection('users').doc(UID).set({
    tasks: tasks, debts: debts, passwords: passwords
  }, { merge: true });
}

/* ===== HAFTA VA SANALARINI HISOBLASH ===== */
function getMondayOfOffsetWeek(offsetWeeks) {
  var d = new Date();
  var day = d.getDay();
  var diff = d.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(d.setDate(diff));
  monday.setDate(monday.getDate() + (offsetWeeks * 7));
  return monday;
}

function formatDateISO(d) {
  var year = d.getFullYear();
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function formatDateUz(d) {
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return day + '.' + month + '.' + d.getFullYear();
}

function renderWeekCalendar() {
  var monday = getMondayOfOffsetWeek(currentWeekOffset);
  
  document.querySelectorAll('.week-btn').forEach(function(btn, idx) {
    var thisDay = new Date(monday);
    thisDay.setDate(monday.getDate() + idx);
    
    var dayNum = String(thisDay.getDate()).padStart(2, '0');
    var monthNum = String(thisDay.getMonth() + 1).padStart(2, '0');
    
    btn.innerHTML = weekDaysNames[idx] + '<br><small style="font-size:0.75rem;opacity:0.85">' + dayNum + '.' + monthNum + '</small>';
    btn.dataset.isoDate = formatDateISO(thisDay);
    btn.dataset.displayDate = formatDateUz(thisDay);
  });

  var activeBtn = document.querySelectorAll('.week-btn')[selectedDayIndex];
  if (activeBtn) {
    currentSelectedDateStr = activeBtn.dataset.isoDate;
    currentSelectedDayName = weekDaysNames[selectedDayIndex];
    $('selectedDayTitle').innerText = '📌 ' + currentSelectedDayName + ' (' + activeBtn.dataset.displayDate + ') kuni uchun ishlar';
  }
}

$('prevWeekBtn').onclick = function() {
  currentWeekOffset--;
  renderWeekCalendar();
  renderTasks();
};

$('nextWeekBtn').onclick = function() {
  currentWeekOffset++;
  renderWeekCalendar();
  renderTasks();
};

$('todayBtn').onclick = function() {
  currentWeekOffset = 0;
  var now = new Date();
  var day = now.getDay();
  selectedDayIndex = (day === 0 ? 6 : day - 1);
  
  document.querySelectorAll('.week-btn').forEach((b, i) => {
    b.classList.toggle('on', i === selectedDayIndex);
  });

  renderWeekCalendar();
  renderTasks();
};

$('weekSelector').addEventListener('click', function(e) {
  var btn = e.target.closest('.week-btn');
  if(!btn) return;
  
  document.querySelectorAll('.week-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');

  selectedDayIndex = parseInt(btn.dataset.dayIdx);
  currentSelectedDateStr = btn.dataset.isoDate;
  currentSelectedDayName = weekDaysNames[selectedDayIndex];

  $('selectedDayTitle').innerText = '📌 ' + currentSelectedDayName + ' (' + btn.dataset.displayDate + ') kuni uchun ishlar';
  renderTasks();
});

/* ===== ISHLAR RO'YXATI ===== */
function renderTasks() {
  var dayTasks = tasks.filter(function(t) { return t.fullDate === currentSelectedDateStr; });
  var l = dayTasks.slice().sort(function(a,b){ return (a.done - b.done) || ((a.time || '') > (b.time || '') ? 1 : -1); });

  $('tList').innerHTML = l.length ? l.map(function(t) {
    return '<div class="item '+(t.done ? 'done' : '')+'">' +
      '<input type="checkbox" style="width:22px;height:22px" '+(t.done ? 'checked' : '')+' data-d="'+t.id+'">' +
      '<div class="t"><b>'+esc(t.text)+'</b><small>⏰ '+esc(t.time || 'Vaqt belgilanmagan')+'</small></div>' +
      '<button class="mini" data-x="'+t.id+'">✕</button></div>';
  }).join('') : '<div class="empty-box"><span>📝</span>Ushbu kunga rejalashtirilgan ishlar yo‘q</div>';
}

$('tAdd').onclick = function() {
  var tx = $('tText').value.trim();
  if(!tx) return;

  tasks.push({ 
    id: Date.now(), 
    text: tx, 
    fullDate: currentSelectedDateStr, 
    dayName: currentSelectedDayName,
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

function check() {
  var now = new Date();
  var todayISO = formatDateISO(now);
  var currentTimeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  var hit = [];

  tasks.forEach(function(t) {
    if(!t.done && !t.notified && t.fullDate === todayISO && t.time && t.time <= currentTimeStr) {
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

/* ===== KALKULYATOR VA VALYUTA ===== */
$('calcTabOddiy').onclick = function() {
  $('calcTabOddiy').classList.add('on');
  $('calcTabValyuta').classList.remove('on');
  $('calcOddiyBox').style.display = 'block';
  $('calcValyutaBox').style.display = 'none';
};

$('calcTabValyuta').onclick = function() {
  $('calcTabValyuta').classList.add('on');
  $('calcTabOddiy').classList.remove('on');
  $('calcOddiyBox').style.display = 'none';
  $('calcValyutaBox').style.display = 'block';
  fetchLiveRates();
};

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

var exchangeRates = { "UZS": 1, "USD": 12850, "EUR": 13950, "RUB": 138 };

function fetchLiveRates() {
  fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/')
    .then(response => response.json())
    .then(data => {
      data.forEach(item => {
        if (item.Ccy === 'USD') exchangeRates['USD'] = parseFloat(item.Rate);
        if (item.Ccy === 'EUR') exchangeRates['EUR'] = parseFloat(item.Rate);
        if (item.Ccy === 'RUB') exchangeRates['RUB'] = parseFloat(item.Rate);
      });
      convertCurrency();
    })
    .catch(err => { convertCurrency(); });
}

function convertCurrency() {
  var amount = parseNumber($('vSum').value);
  var from = $('vFrom').value;
  var to = $('vTo').value;

  var amountInUZS = amount * exchangeRates[from];
  var result = amountInUZS / exchangeRates[to];

  var formattedResult = result.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  $('vResult').innerText = formattedResult + ' ' + to;
}

$('vFrom').onchange = convertCurrency;
$('vTo').onchange = convertCurrency;

/* ===== QARZLAR ===== */
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
  var s = parseNumber($('qSum').value), ism = $('qIsm').value.trim();
  if(!ism || !s){ alert('Ism va pul miqdorini kiriting'); return; }

  var rawTel = $('qTel').value.trim();
  var fullTel = rawTel ? ($('qCode').value + ' ' + rawTel) : '';

  debts.push({ 
    id: Date.now(), 
    ism: ism, 
    fam: $('qFam').value.trim(), 
    tel: fullTel, 
    sum: s, 
    tur: $('qTur').value, 
    izoh: $('qIzoh').value.trim(), 
    date: new Date().toLocaleDateString('ru-RU') 
  });

  saveUserData(); 
  ['qIsm','qFam','qTel','qSum','qIzoh'].forEach(function(i){ $(i).value=''; }); 
  renderDebts();
};

$('qList').addEventListener('click', function(e) {
  var x = e.target.dataset.x;
  if(x && confirm('O‘chirilsinmi?')){ debts = debts.filter(function(d){ return d.id!=x; }); saveUserData(); renderDebts(); }
});
$('qFind').oninput = renderDebts;

/* ===== LOGIN VA PAROLLAR BO'LIMI ===== */
function renderPasswords() {
  var f = $('pFind').value.toLowerCase();
  var l = passwords.filter(function(p){ 
    return (p.app + ' ' + p.login).toLowerCase().indexOf(f) > -1; 
  }).slice().reverse();

  $('pList').innerHTML = l.length ? l.map(function(p){
    var iconHtml = p.img ? 
      '<img class="pass-icon" src="'+p.img+'" alt="icon">' : 
      '<div class="pass-icon">'+esc(p.app.charAt(0).toUpperCase())+'</div>';

    return '<div class="pass-card">' + iconHtml +
      '<div class="pass-info"><b>'+esc(p.app)+'</b>' +
      '<small>👤 Login: '+esc(p.login)+'</small>' +
      '<small>🔑 Parol: <span id="passText_'+p.id+'">••••••••</span></small></div>' +
      '<div class="pass-actions">' +
        '<button class="mini" onclick="togglePass('+p.id+', \''+esc(p.pass)+'\')">👁</button>' +
        '<button class="mini" onclick="copyPass(\''+esc(p.pass)+'\')">📋</button>' +
        '<button class="mini" data-px="'+p.id+'">✕</button>' +
      '</div></div>';
  }).join('') : '<div style="text-align:center;padding:16px;color:var(--muted)">Parollar yo‘q</div>';
}

function togglePass(id, realPass) {
  var el = $('passText_' + id);
  if (el) {
    el.innerText = el.innerText === '••••••••' ? realPass : '••••••••';
  }
}

function copyPass(text) {
  navigator.clipboard.writeText(text).then(function() {
    alert('Parol nusxalandi!');
  });
}

$('pAdd').onclick = function() {
  var app = $('pApp').value.trim();
  var login = $('pLogin').value.trim();
  var pass = $('pPass').value.trim();

  if(!app || !login || !pass){ 
    alert('Ilova nomi, login va parolni kiriting'); 
    return; 
  }

  var f = $('pImg').files[0];
  function add(img) {
    passwords.push({ id: Date.now(), app: app, login: login, pass: pass, img: img || '' });
    saveUserData(); 
    $('pApp').value=''; $('pLogin').value=''; $('pPass').value=''; $('pImg').value=''; 
    renderPasswords();
  }

  if(f) shrinkProfileImg(f, add); else add('');
};

$('pList').addEventListener('click', function(e) {
  var x = e.target.dataset.px;
  if(x && confirm('O‘chirilsinmi?')){ 
    passwords = passwords.filter(function(p){ return p.id != x; }); 
    saveUserData(); 
    renderPasswords(); 
  }
});

$('pFind').oninput = renderPasswords;

/* ===== PROFIL MODALI VA SOZLAMALARI ===== */
$('meImg').onclick = function() {
  var user = auth.currentUser;
  if (user) {
    $('profileEmailDisplay').innerText = user.email;
    $('profilePreviewImg').src = $('meImg').src;
    $('profileModal').style.display = 'flex';
  }
};

$('closeProfileModal').onclick = function() {
  $('profileModal').style.display = 'none';
  $('profileErr').innerText = '';
  $('currentAccountPassword').value = '';
  $('newAccountPassword').value = '';
  $('profileImgInput').value = '';
};

// Rasmni kichik o'lchamga keltirish (Firestore cheklovlaridan o'tish uchun)
function shrinkProfileImg(file, cb) {
  var r = new FileReader();
  r.onload = function(){
    var im = new Image();
    im.onload = function(){
      var maxDimension = 150;
      var w = im.width, h = im.height;
      if (w > h) {
        if (w > maxDimension) { h *= maxDimension / w; w = maxDimension; }
      } else {
        if (h > maxDimension) { w *= maxDimension / h; h = maxDimension; }
      }
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(im, 0, 0, w, h);
      cb(c.toDataURL('image/jpeg', 0.8));
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
}

$('saveProfileBtn').onclick = function() {
  var user = auth.currentUser;
  var currentPass = $('currentAccountPassword').value.trim();
  var newPass = $('newAccountPassword').value.trim();
  var imgFile = $('profileImgInput').files[0];
  var errEl = $('profileErr');
  errEl.innerText = '';

  if (!user) return;

  function savePhotoToFirestore(base64Img) {
    return db.collection('users').doc(user.uid).set({
      photoData: base64Img
    }, { merge: true }).then(function() {
      $('meImg').src = base64Img;
      $('profilePreviewImg').src = base64Img;
    });
  }

  var tasksToRun = [];

  if (imgFile) {
    tasksToRun.push(new Promise(function(resolve, reject) {
      shrinkProfileImg(imgFile, function(base64Img) {
        savePhotoToFirestore(base64Img).then(resolve).catch(reject);
      });
    }));
  }

  if (newPass) {
    if (newPass.length < 6) {
      errEl.innerText = 'Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak!';
      return;
    }
    if (!currentPass) {
      errEl.innerText = 'Parolni o‘zgartirish uchun hozirgi parolingizni kiriting!';
      return;
    }

    var credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);
    
    tasksToRun.push(
      user.reauthenticateWithCredential(credential).then(function() {
        return user.updatePassword(newPass);
      })
    );
  }

  if (tasksToRun.length === 0) {
    $('profileModal').style.display = 'none';
    return;
  }

  $('saveProfileBtn').disabled = true;
  $('saveProfileBtn').innerText = 'Saqlanmoqda...';

  Promise.all(tasksToRun).then(function() {
    alert('Profil va ma\'lumotlar muvaffaqiyatli yangilandi!');
    $('currentAccountPassword').value = '';
    $('newAccountPassword').value = '';
    $('profileImgInput').value = '';
    $('profileModal').style.display = 'none';
  }).catch(function(error) {
    console.error(error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      errEl.innerText = 'Hozirgi parol noto‘g‘ri kiritildi!';
    } else {
      errEl.innerText = 'Xatolik: ' + error.message;
    }
  }).finally(function() {
    $('saveProfileBtn').disabled = false;
    $('saveProfileBtn').innerText = 'Saqlash';
  });
};

/* ===== KIRISH VA RO'YXATDAN O'TISH ===== */
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
      console.error(error);
      err.textContent = error.code === 'auth/email-already-in-use' ? 'Bu login band.' : error.message;
    });
  } else {
    auth.signInWithEmailAndPassword(email, pw).catch(function(error) {
      console.error(error);
      err.textContent = 'Login yoki parol noto‘g‘ri';
    });
  }
}

auth.onAuthStateChanged(function(user) {
  if (user) {
    UID = user.uid;
    var name = user.displayName || user.email.split('@')[0];
    
    // Profil rasmini Firestore'dan olish
    db.collection('users').doc(UID).get().then(function(doc) {
      if (doc.exists && doc.data().photoData) {
        $('meImg').src = doc.data().photoData;
      } else {
        $('meImg').src = user.photoURL || av(name);
      }
    }).catch(function() {
      $('meImg').src = user.photoURL || av(name);
    });

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
$('lBtn').onclick = function(e){ 
  e.preventDefault();
  submitAuth(); 
};

['lLogin','lPass','lPass2'].forEach(function(id){ 
  $(id).addEventListener('keydown', function(e){ 
    if(e.key==='Enter') submitAuth(); 
  }); 
});

$('eye').onclick = function(){ 
  var t = $('lPass').type==='password'?'text':'password'; 
  $('lPass').type=t; 
  $('lPass2').type=t; 
};

$('out').onclick = function(){ 
  auth.signOut().then(function(){ location.reload(); }); 
};