// 1. CONFIG & STATE (การจัดการตั้งค่าและสถานะของแอปพลิเคชัน)
// =====================================================
const CONFIG = {
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbwOa2Qg0CXQiq1NqI10NKDajlHCiqn0n3Ytkv_0UvdWseBTMqZ_y0ZfChEuV2L7y9ZF/exec",
  ALL_CLS:["ป.1","ป.2","ป.3","ป.4","ป.5","ป.6","ม.1 เทอม 1","ม.1 เทอม 2","ม.2 เทอม 1","ม.2 เทอม 2","ม.3 เทอม 1","ม.3 เทอม 2"]
};

const App = {
  isSemMode: false,
  user: null,
  pin: "",
  subs: {},
  students: [],
  units: { 1: [], 2:[] },
  expanded: { 1: true, 2: true },
  editTid: null,
  editAssigned:[],
  ignoreR: false,
  termDates: {},
  holidays:[],
  schoolProfile: {
    school_name: '', director_name: '', director_position: 'ผู้อำนวยการโรงเรียน',
    academic_head_name: '', academic_head_position: 'หัวหน้าวิชาการ'
  }
};

// =====================================================
// 2. DOM HELPERS (ตัวช่วยจัดการ HTML เพื่อลดความยาวโค้ด)
// =====================================================
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// =====================================================
// 3. UTILITIES & API (ฟังก์ชันช่วยเหลือและการเชื่อมต่อข้อมูล)
// =====================================================
const Utils = {
  toast: (msg, type = 'success') => {
    const d = document.createElement('div');
    d.className = `tst ${type}`;
    d.textContent = msg;
    $('tshelf').appendChild(d);
    setTimeout(() => d.remove(), 3000);
  },
  
  showLoading: (text = '...') => {
    $('pgov').style.display = 'flex';
    $('pgTxt').textContent = text;
  },
  
  hideLoading: () => {
    $('pgov').style.display = 'none';
  },
  
  showPage: (id) => {
    $$('.pg').forEach(p => p.classList.remove('on'));
    $(id).classList.add('on');
    
    const tabsWrap = $('settingsTabsWrap');
    if (tabsWrap) {
      tabsWrap.classList.toggle('is-visible', id === 'gradePage');
    }
    window.scrollTo(0, 0);
  },
  
  calcGradeFrontend: (score) => {
    const s = Number(score) || 0;
    if (s >= 80) return "4";
    if (s >= 75) return "3.5";
    if (s >= 70) return "3";
    if (s >= 65) return "2.5";
    if (s >= 60) return "2";
    if (s >= 55) return "1.5";
    if (s >= 50) return "1";
    return "0";
  }
};

async function api(action, data = {}) {
  const r = await fetch(CONFIG.WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify({ action, data })
  });
  const j = await r.json();
  if (j.status === 'error') throw new Error(j.message);
  return j.data;
}

// =====================================================
