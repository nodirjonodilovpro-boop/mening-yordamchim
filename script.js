/* ===== Yordamchi funksiyalar ===== */
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function $(id){ return document.getElementById(id); }
var UID='', tasks=[], debts=[], sites=[];

var currentWeekOffset = 0;
var selectedDayIndex = 0;
var currentSelectedDateStr = "";
var currentSelectedDayName = "Dushanba";

const weekDaysNames = ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'];

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
    renderWeekCalendar();
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
  $('tText').value = '';$('tTime').value = '';
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