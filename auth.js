// 4. AUTH & LOGIN (ระบบเข้าสู่ระบบด้วย PIN)
// =====================================================
function updDots(err = false) {
  $$('.dot').forEach((d, i) => {
    d.className = 'dot' + (err ? ' err' : (i < App.pin.length ? ' on' : ''));
  });
}

function ap(n) {
  if (App.pin.length < 4) {
    App.pin += n;
    updDots();
    if (App.pin.length === 4) setTimeout(doLogin, 150);
  }
}

function dp() { App.pin = App.pin.slice(0, -1); updDots(); }
function cp() { App.pin = ""; updDots(); }

async function doLogin() {
  Utils.showLoading('กำลังโหลด...');
  try {
    const [u, subs] = await Promise.all([
      api('login', { password: App.pin }),
      api('getAllSubjects')
    ]);

    App.user = u;
    App.subs = subs;

    // แสดงปุ่มและป้ายชื่อ
    if ($('teacherTag')) { 
      $('teacherTag').textContent = `🎓 ${App.user.name}`; 
      $('teacherTag').style.display = 'flex'; 
    }['btnGrade', 'btnOut'].forEach(id => { if ($(id)) $(id).style.display = 'inline-flex'; });

    // แยกการนำทางระหว่าง Admin กับ Teacher
    if (App.user.isAdmin) {
      if ($('btnAdmin')) $('btnAdmin').style.display = 'inline-flex';
      loadTeachers();
      Utils.showPage('adminPage');
    } else {
      App.user.mySubjects = App.user.subjects ? App.user.subjects.split(',') : [];
      const cls =[...new Set(App.user.mySubjects.map(s => s.split('_')[0]).filter(Boolean))];
      App.user.allowedClasses = cls;

      const sel = $('gClass');
      sel.innerHTML = cls.length
        ? cls.map(c => `<option>${c}</option>`).join('')
        : `<option value="">ไม่มีสิทธิ์</option>`;

      if (cls.includes(App.user.classroom)) sel.value = App.user.classroom;
      updateSubjDrop(); // ฟังก์ชันนี้จะถูกเรียกจากด้านล่างของโค้ดเดิม
      Utils.showPage('gradePage');
    }
    cp();
  } catch (e) {
    updDots(true);
    setTimeout(cp, 400);
    Utils.toast(e.message, 'error');
  }
  Utils.hideLoading();
}

function logout() {
  App.user = null;
  cp();
  ['teacherTag', 'btnAdmin', 'btnGrade', 'btnOut'].forEach(id => {
    if ($(id)) $(id).style.display = 'none';
  });
  if ($('settingsTabsWrap')) $('settingsTabsWrap').classList.remove('is-visible');
  Utils.showPage('loginPage');
}
// =====================================================
