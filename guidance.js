// =====================================================
// MODULE: กิจกรรมแนะแนว (Guidance)
// ระบบ: dropdown ป/ข/ล/- รายวัน + หัวข้อกิจกรรม
// pre-fill: ป ทุกวันอัตโนมัติ (ครูเปลี่ยนเฉพาะวันขาด/ลา)
// =====================================================

App.guidanceDates  = [];
App.guidanceTopics = [];
App.hrMap          = App.hrMap || {};
App.guidanceAttMap = {}; // { studentId: { "dd/mm/yyyy": "ม"|"ข"|"ล"|"ป" } }

// ── 1. คำนวณวันที่แนะแนวจาก termDates ─────────────
function calcGuidanceDates() {
  const termEl = document.getElementById('guide_term');
  const dayEl  = document.getElementById('guide_day');
  if (!termEl || !dayEl) return [];

  const term      = termEl.value;
  const dayOfWeek = parseInt(dayEl.value);
  const startD    = App.termDates[`t${term}_start`];
  const endD      = App.termDates[`t${term}_end`];
  const dates     = [];
  if (!startD || !endD) return dates;

  const parseD = str => {
    const p = String(str).split(/[\/\-]/);
    if (p.length !== 3) return new Date();
    const y = parseInt(p[2]) > 2500 ? parseInt(p[2]) - 543 : parseInt(p[2]);
    return new Date(y, parseInt(p[1]) - 1, parseInt(p[0]));
  };

  const hSet = new Set(
    (App.holidays || []).filter(h => h.type === 'holiday').map(h => h.date)
  );

  let cur = parseD(startD), end = parseD(endD);
  cur.setHours(0,0,0,0); end.setHours(0,0,0,0);

  while (cur <= end) {
    if (cur.getDay() === dayOfWeek) {
      const dd = String(cur.getDate()).padStart(2,'0');
      const mm = String(cur.getMonth()+1).padStart(2,'0');
      const yy = cur.getFullYear() + 543;
      const key = `${dd}/${mm}/${yy}`;
      if (!hSet.has(key)) dates.push(key);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── helper: dd/mm/yyyy(พ.ศ.) → "15 มิ.ย.68" ────────
function shortThaiDate(dStr) {
  const p = dStr.split('/');
  if (p.length !== 3) return dStr;
  const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
             'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${parseInt(p[0])} ${m[parseInt(p[1])-1]}${String(p[2]).slice(-2)}`;
}

// ── 2. เรนเดอร์แผงควบคุม ────────────────────────────
function renderGuidanceTable(isRecalculating = false) {
  const container = $('guidanceContainer');
  if (!container || !App.students || !App.students.length) return;

  const cls = $('gClass').value.trim();

  if (!isRecalculating) {
    document.querySelectorAll(
      '#guide_panel_control_v3, #guide_panel_control, .guide-dynamic-panel'
    ).forEach(el => el.remove());

    if (App.hrMap[cls] === undefined) {
      App.hrMap[cls] = (App.user && App.user.classroom === cls)
        ? (App.user.name || '') : '';
    }
    const hrName      = App.hrMap[cls] || '';
    const defaultTerm = cls.includes('เทอม 2') ? '2' : '1';

    const panel = document.createElement('div');
    panel.id = 'guide_panel_control_v3';
    panel.className = 'guide-dynamic-panel';
    panel.innerHTML = `
      <div style="background:#fff;border:1px solid #e9d5ff;border-radius:10px;
                  padding:14px 16px;margin-bottom:14px;display:flex;
                  flex-wrap:wrap;gap:12px;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
          <label style="font-weight:700;color:#7c3aed;margin:0;white-space:nowrap;font-size:.85rem;">
            👨‍🏫 ครูประจำชั้น
          </label>
          <input type="text" id="guidance_teacher" value="${hrName}"
            style="width:230px;padding:6px 10px;border:1.5px solid #c4b5fd;
                   border-radius:6px;font-weight:700;font-family:inherit;font-size:.85rem;"
            placeholder="ชื่อครู / ครู ก และ ครู ข"
            oninput="
              App.hrMap[document.getElementById('gClass').value.trim()] = this.value;
              var rt = document.getElementById('rtw_homeroom_teacher');
              if (rt) rt.value = this.value;
            ">
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <label style="font-weight:700;color:#0369a1;margin:0;font-size:.85rem;">ภาคเรียน</label>
          <select id="guide_term"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid #bae6fd;font-weight:700;font-family:inherit;"
            onchange="onGuidanceSettingChange()">
            <option value="1" ${defaultTerm==='1'?'selected':''}>1</option>
            <option value="2" ${defaultTerm==='2'?'selected':''}>2</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <label style="font-weight:700;color:#0369a1;margin:0;font-size:.85rem;">วันเรียน</label>
          <select id="guide_day"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid #bae6fd;font-weight:700;font-family:inherit;"
            onchange="onGuidanceSettingChange()">
            <option value="1">จันทร์</option>
            <option value="2">อังคาร</option>
            <option value="3">พุธ</option>
            <option value="4">พฤหัสบดี</option>
            <option value="5" selected>ศุกร์</option>
          </select>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;
                    padding:5px 14px;border-radius:50px;font-weight:700;font-size:.85rem;">
          รวม <span id="guide_total_show" style="font-size:1rem;color:#15803d;">0</span> คาบ
        </div>
      </div>`;

    container.parentNode.insertBefore(panel, container);

    // เรียก API ดึง attendance detail เฉพาะตอนเปิดแท็บแนะแนว
    loadGuidanceAttendance().then(() => {
      setTimeout(() => onGuidanceSettingChange(), 50);
    });
    return;
  }

  App.guidanceDates = calcGuidanceDates();
  const tot = document.getElementById('guide_total_show');
  if (tot) tot.textContent = App.guidanceDates.length;
  _buildGuidanceTable();
}

// ── เรียก API ดึง attendance รายวัน (เฉพาะตอนเปิดแท็บแนะแนว) ──
async function loadGuidanceAttendance() {
  try {
    const res = await api('getAttendanceDetail', {
      year      : $('gYear').value,
      classroom : $('gClass').value
    });
    // res = { [studentId]: { "dd/mm/yyyy": "ม"|"ข"|"ล"|"ป" } }
    App.guidanceAttMap = res || {};
  } catch (e) {
    App.guidanceAttMap = {};
    console.warn('getAttendanceDetail failed:', e.message);
  }
}

function onGuidanceSettingChange() {
  App.guidanceDates = calcGuidanceDates();
  const tot = document.getElementById('guide_total_show');
  if (tot) tot.textContent = App.guidanceDates.length;
  _buildGuidanceTable();
}

// ── 3. สร้างตารางหลัก ────────────────────────────────
function _buildGuidanceTable() {
  const container = $('guidanceContainer');
  if (!container) return;

  const dates  = App.guidanceDates;
  const nDates = dates.length;

  const dateHeaders = dates.map((d, i) => `
    <th style="min-width:52px;vertical-align:bottom;padding:0 2px 4px;border:1px solid #e9d5ff;background:#f5f3ff;">
      <div style="font-size:10px;font-weight:600;color:#7c3aed;white-space:nowrap;text-align:center;">
        ครั้งที่ ${i+1}<br>
        <span style="color:#94a3b8;font-weight:400;">${shortThaiDate(d)}</span>
      </div>
    </th>`).join('');

  const topicInputs = dates.map((d, i) => `
    <th style="padding:2px;border:1px solid #e9d5ff;background:#fdf4ff;">
      <input type="text" class="guide-topic" data-idx="${i}"
        placeholder="หัวข้อ..."
        value="${App.guidanceTopics[i] || ''}"
        style="width:100%;min-width:48px;font-size:10px;padding:3px 4px;
               border:1px solid #ddd6fe;border-radius:4px;font-family:inherit;text-align:center;">
    </th>`).join('');

  const attStyle = v => {
    if (v === 'ข') return { bg:'#fee2e2', color:'#dc2626' };
    if (v === 'ล') return { bg:'#fef3c7', color:'#b45309' };
    if (v === '-') return { bg:'#f1f5f9', color:'#94a3b8' };
    return { bg:'#f0fdf4', color:'#166534' };
  };

  const bodyRows = App.students.map((s, idx) => {
    const saved = s.guidance_data || {};

    // pre-fill: ถ้ามีข้อมูลบันทึกไว้ → ใช้ของเดิม
    // ถ้ายังไม่มี → ดึงจาก statusByDate รายวันจริง (ม/ข/ล/ป)
    let attArray;
    if (saved.attArray && Array.isArray(saved.attArray) && saved.attArray.length > 0) {
      attArray = [...saved.attArray];
      while (attArray.length < nDates) attArray.push('ป');
    } else {
      // ดึงจาก App.guidanceAttMap ที่โหลดมาจาก getAttendanceDetail API
      const sbd = App.guidanceAttMap[s.studentId] || {};
      attArray = dates.map(dateStr => {
        const raw = String(sbd[dateStr] || '').trim();
        if (raw === 'ข') return 'ข';
        if (raw === 'ล' || raw === 'ป') return 'ล';
        return 'ป'; // ม หรือ ว่าง → ถือว่ามา
      });
    }

    const nPresent = attArray.filter(v => v === 'ป').length;
    const nBase    = attArray.filter(v => v !== '-').length;
    const result   = saved.result || (nBase > 0 && nPresent >= Math.ceil(nBase * 0.8) ? 'ผ่าน' : 'ไม่ผ่าน');
    const resColor = result === 'ผ่าน' ? '#16a34a' : '#dc2626';
    const resBg    = result === 'ผ่าน' ? '#dcfce7' : '#fee2e2';

    const attCells = dates.map((d, i) => {
      const v  = attArray[i] !== undefined ? attArray[i] : 'ป';
      const st = attStyle(v);
      return `
        <td style="padding:2px;border:1px solid #e9d5ff;text-align:center;">
          <select class="guide-att" data-idx="${i}"
            onchange="calcGuidanceGridRow(this)"
            style="width:48px;padding:2px 1px;font-size:12px;font-weight:700;
                   text-align:center;border:1px solid #ddd6fe;border-radius:4px;
                   font-family:inherit;cursor:pointer;background:${st.bg};color:${st.color};">
            <option value="ป" ${v==='ป'?'selected':''} style="background:#f0fdf4;color:#166534;">ป</option>
            <option value="ข" ${v==='ข'?'selected':''} style="background:#fee2e2;color:#dc2626;">ข</option>
            <option value="ล" ${v==='ล'?'selected':''} style="background:#fef3c7;color:#b45309;">ล</option>
            <option value="-" ${v==='-'?'selected':''} style="background:#f1f5f9;color:#94a3b8;">-</option>
          </select>
        </td>`;
    }).join('');

    return `
      <tr data-guidesid="${s.studentId}">
        <td class="ass-no"
          style="text-align:center;background:#fff;position:sticky;left:0;z-index:10;
                 border-right:1px solid #e9d5ff;font-size:.78rem;color:#94a3b8;">
          ${idx+1}
        </td>
        <td class="ass-name"
          style="text-align:left;background:#fff;position:sticky;left:35px;z-index:10;
                 border-right:2px solid #c4b5fd;white-space:nowrap;padding:6px 10px;font-weight:600;">
          ${s.name}
          <span style="font-size:.7rem;color:#94a3b8;margin-left:6px;">
            ม${s.stats&&s.stats.present||0} ข${s.stats&&s.stats.absent||0} ล${s.stats&&s.stats.leave||0}
          </span>
        </td>
        ${attCells}
        <td class="guide-total-val"
          style="text-align:center;font-weight:700;color:#0369a1;
                 background:#eff6ff;border:1px solid #e9d5ff;white-space:nowrap;">
          ${nPresent}
        </td>
        <td style="text-align:center;border:1px solid #e9d5ff;">
          <select class="guide-result sinput"
            style="width:90px;padding:3px 4px;font-size:.78rem;font-weight:700;
                   background:${resBg};color:${resColor};
                   border:1.5px solid ${result==='ผ่าน'?'#86efac':'#fca5a5'};
                   border-radius:6px;font-family:inherit;"
            onchange="
              this.style.background  = this.value==='ผ่าน'?'#dcfce7':'#fee2e2';
              this.style.color       = this.value==='ผ่าน'?'#16a34a':'#dc2626';
              this.style.borderColor = this.value==='ผ่าน'?'#86efac':'#fca5a5';
            ">
            <option value="ผ่าน"    ${result==='ผ่าน'   ?'selected':''}>ผ่าน</option>
            <option value="ไม่ผ่าน" ${result==='ไม่ผ่าน'?'selected':''}>ไม่ผ่าน</option>
          </select>
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="ass-wrap"
      style="max-height:65vh;overflow:auto;border:1px solid #e9d5ff;border-radius:10px;">
      <table class="ass-tbl"
        style="font-size:13px;border-collapse:collapse;width:max-content;min-width:100%;">
        <thead style="position:sticky;top:0;z-index:20;background:#f5f3ff;">
          <tr>
            <th rowspan="2"
              style="width:35px;position:sticky;left:0;z-index:30;background:#f5f3ff;border-right:1px solid #e9d5ff;">ที่</th>
            <th rowspan="2"
              style="min-width:180px;position:sticky;left:35px;z-index:30;
                     background:#f5f3ff;border-right:2px solid #c4b5fd;text-align:left;padding-left:10px;">ชื่อ-นามสกุล</th>
            ${dateHeaders}
            <th rowspan="2" style="width:48px;background:#eff6ff;border:1px solid #e9d5ff;">มา<br>(ครั้ง)</th>
            <th rowspan="2" style="width:90px;background:#f0fdf4;border:1px solid #e9d5ff;">ผลประเมิน</th>
          </tr>
          <tr>${topicInputs}</tr>
        </thead>
        <tbody id="guidanceBody">${bodyRows}</tbody>
      </table>
    </div>
    <div style="font-size:.78rem;color:#6d28d9;margin-top:8px;background:#f5f3ff;border-radius:6px;padding:6px 12px;">
      💡 สัญลักษณ์:
      <b style="color:#166534;">ป = มาเรียนปกติ</b> &nbsp;|&nbsp;
      <b style="color:#dc2626;">ข = ขาดเรียน</b> &nbsp;|&nbsp;
      <b style="color:#b45309;">ล = ลา</b> &nbsp;|&nbsp;
      <b style="color:#94a3b8;">- = งดเรียน (ไม่นับคาบ)</b>
    </div>`;
}

// ── 4. คำนวณ ผ่าน/ไม่ผ่าน เมื่อเปลี่ยน dropdown ──
function calcGuidanceGridRow(sel) {
  const v  = sel.value;
  const st = v==='ข' ? {bg:'#fee2e2',color:'#dc2626'}
           : v==='ล' ? {bg:'#fef3c7',color:'#b45309'}
           : v==='-' ? {bg:'#f1f5f9',color:'#94a3b8'}
                     : {bg:'#f0fdf4',color:'#166534'};
  sel.style.background = st.bg;
  sel.style.color      = st.color;

  const tr       = sel.closest('tr');
  const atts     = [...tr.querySelectorAll('.guide-att')].map(s => s.value);
  const nPresent = atts.filter(v => v === 'ป').length;
  const nBase    = atts.filter(v => v !== '-').length;

  tr.querySelector('.guide-total-val').textContent = nPresent;

  const resSel  = tr.querySelector('.guide-result');
  const pass    = nBase > 0 && nPresent >= Math.ceil(nBase * 0.8) ? 'ผ่าน' : 'ไม่ผ่าน';
  resSel.value              = pass;
  resSel.style.background   = pass==='ผ่าน' ? '#dcfce7' : '#fee2e2';
  resSel.style.color        = pass==='ผ่าน' ? '#16a34a' : '#dc2626';
  resSel.style.borderColor  = pass==='ผ่าน' ? '#86efac' : '#fca5a5';
}

// ── 5. บันทึกข้อมูล ──────────────────────────────────
async function saveGuidanceData() {
  const topics = [...document.querySelectorAll('.guide-topic')].map(i => i.value);
  App.guidanceTopics = topics;

  const rows = $$('#guidanceBody tr[data-guidesid]');
  if (!rows.length) return Utils.toast('ไม่พบข้อมูล', 'error');

  const records = [...rows].map(tr => ({
    studentId : tr.getAttribute('data-guidesid'),
    attArray  : [...tr.querySelectorAll('.guide-att')].map(s => s.value),
    attended  : tr.querySelector('.guide-total-val').textContent,
    result    : tr.querySelector('.guide-result').value
  }));

  Utils.showLoading('กำลังบันทึกแนะแนว...');
  try {
    await api('saveGuidance', {
      year      : $('gYear').value,
      classroom : $('gClass').value,
      subject   : $('gSubj').value,
      maxTime   : App.guidanceDates.length,
      teacher   : (document.getElementById('guidance_teacher') || {}).value || '',
      topics,
      records
    });
    Utils.toast('✅ บันทึกกิจกรรมแนะแนวสำเร็จ');
  } catch (e) { Utils.toast(e.message, 'error'); }
  Utils.hideLoading();
}

// ── 6. พิมพ์รายงาน 5 หน้า ────────────────────────────
function printGuidanceReport() {
  const cls          = $('gClass').value;
  const year         = $('gYear').value;
  const term         = (document.getElementById('guide_term') || {}).value || '1';
  const clsName      = cls.split('เทอม')[0].trim();
  const evalHeadName = 'นางสาวกิตติญา สินทม';
  const directorName = 'นางปราณี วาดเขียน';
  const schoolName   = 'โรงเรียนบ้านคลอง ๑๔';

  let rawTeacher = (document.getElementById('guidance_teacher') || {}).value || '';
  rawTeacher = rawTeacher.trim() || '........................................................';
  const teachers = rawTeacher.split(/\s*(?:และ|\/|,)\s*/).filter(t => t);

  const topics      = [...document.querySelectorAll('.guide-topic')].map(i => i.value);
  const nDates      = App.guidanceDates.length;
  const displayCols = Math.max(20, nDates);

  const rows = [...$$('#guidanceBody tr[data-guidesid]')].map((tr, i) => ({
    no      : i + 1,
    name    : tr.querySelector('.ass-name').textContent.replace(/ม\d+ ข\d+ ล\d+/,'').trim(),
    atts    : [...tr.querySelectorAll('.guide-att')].map(s => s.value),
    attended: tr.querySelector('.guide-total-val').textContent,
    result  : tr.querySelector('.guide-result').value
  }));

  if (!rows.length) return Utils.toast('ไม่พบข้อมูล', 'error');

  const passCount = rows.filter(r => r.result === 'ผ่าน').length;
  const failCount = rows.length - passCount;

  const fmtDate = dStr => {
    const p = dStr.split('/');
    if (p.length !== 3) return dStr;
    const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
               'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return `${parseInt(p[0])}${m[parseInt(p[1])-1]}${p[2].slice(-2)}`;
  };

  const attDateHeaders = Array(displayCols).fill(0).map((_, i) => {
    const dStr = App.guidanceDates[i];
    if (!dStr) return '<th style="width:18px;border:1px solid #000;"></th>';
    const p = dStr.split('/');
    const m = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
               'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return `<th style="width:18px;vertical-align:bottom;padding-bottom:4px;border:1px solid #000;">
      <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px;color:red;font-weight:normal;">
        ${parseInt(p[0])} ${m[parseInt(p[1])]} ${p[2].slice(-2)}
      </div></th>`;
  }).join('');

  const attRows = rows.map(r => {
    const cells = Array(displayCols).fill(0).map((_, i) => {
      if (i >= nDates) return '<td style="border:1px solid #000;"></td>';
      const v     = r.atts[i] || 'ป';
      const label = v==='ป' ? `<span style="color:#166534;font-weight:bold;">/</span>`
                  : v==='ข' ? `<span style="color:#dc2626;font-weight:bold;">ข</span>`
                  : v==='ล' ? `<span style="color:#ca8a04;font-weight:bold;">ล</span>`
                  :           `<span style="color:#94a3b8;">-</span>`;
      return `<td style="text-align:center;border:1px solid #000;">${label}</td>`;
    }).join('');
    return `<tr>
      <td style="text-align:center;border:1px solid #000;">${r.no}</td>
      <td style="text-align:left;padding-left:6px;border:1px solid #000;white-space:nowrap;">${r.name}</td>
      ${cells}
      <td style="text-align:center;font-weight:bold;border:1px solid #000;">${r.attended}</td>
      <td style="text-align:center;font-weight:bold;color:#166534;border:1px solid #000;">${r.result==='ผ่าน'?'✓':''}</td>
      <td style="text-align:center;font-weight:bold;color:#dc2626;border:1px solid #000;">${r.result!=='ผ่าน'?'✓':''}</td>
    </tr>`;
  }).join('');

  const signLines = teachers.map(t => `
    <div style="text-align:center;min-width:220px;">
      ลงชื่อ.......................................ครูประจำชั้น<br>
      <div style="margin-top:8px;">( ${t} )</div>
    </div>`).join('');

  const win = window.open('', '_blank');
  if (!win) return Utils.toast('กรุณาอนุญาต Popup', 'error');

  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8">
<title>รายงานกิจกรรมแนะแนว_${cls}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4 portrait;margin:15mm;}
body{font-family:'Sarabun',sans-serif;font-size:15px;color:#000;margin:0;line-height:1.4;}
.page{page-break-after:always;min-height:260mm;padding:10px 25px;}
.tc{text-align:center;}.fw{font-weight:bold;}
table{width:100%;border-collapse:collapse;}
th,td{border:1px solid #000;padding:6px;text-align:center;}
.cover-box{border:1.5px solid #000;border-radius:12px;padding:15px;text-align:center;margin-bottom:15px;}
.appr{border:1.5px solid #000;border-radius:25px;padding:20px 25px;margin-top:15px;}
.st{width:90%;margin:15px auto;font-size:15px;}
.rc{display:inline-block;width:13px;height:13px;border:1.5px solid #000;border-radius:50%;vertical-align:middle;margin-right:5px;}
.sf{display:flex;justify-content:space-around;flex-wrap:wrap;margin-top:20px;gap:10px;}
.rh{border:1px solid #000;border-radius:8px;padding:8px;width:65%;margin:0 auto 12px;text-align:center;font-size:17px;font-weight:bold;}
</style></head><body>

<div class="page">
  <div class="tc"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/The_Emblem_of_the_Ministry_of_Education_of_Thailand.svg/1200px-The_Emblem_of_the_Ministry_of_Education_of_Thailand.svg.png" style="width:75px;margin-bottom:8px;"></div>
  <div class="cover-box">
    <div style="font-size:22px;font-weight:bold;">แบบบันทึกผลกิจกรรมแนะแนว</div>
    <div style="font-size:17px;font-weight:bold;margin-top:8px;">ระดับชั้น <span style="border-bottom:1.5px dotted #000;display:inline-block;min-width:300px;">${clsName}</span></div>
  </div>
  <div class="tc" style="font-size:15px;line-height:1.8;">
    หลักสูตรการศึกษาขั้นพื้นฐาน ระดับชั้น <u>${clsName}</u> ภาคเรียนที่ <u>${term}</u> ปีการศึกษา <u>${year}</u><br>
    ${schoolName}<br>
    ครูประจำชั้น <span style="border-bottom:1.5px dotted #000;display:inline-block;min-width:320px;">${teachers.join(' และ ')}</span>
  </div>
  <table class="st">
    <tr><td rowspan="2" style="width:25%;">นักเรียนทั้งหมด</td><td colspan="2">จำนวนนักเรียน</td><td rowspan="2" style="width:30%;">หมายเหตุ</td></tr>
    <tr><td>ผ่าน</td><td>ไม่ผ่าน</td></tr>
    <tr><td style="padding:15px 0;">${rows.length}</td><td>${passCount}</td><td>${failCount}</td><td></td></tr>
  </table>
  <div class="appr">
    <div style="font-size:17px;font-weight:bold;margin-bottom:15px;">การอนุมัติผลการเรียน</div>
    <div class="sf">${signLines}</div>
    <div style="margin-top:18px;">ลงชื่อ...............................................หัวหน้ากิจกรรมพัฒนาผู้เรียน<br><span style="margin-left:40px;">(...............................................)</span></div>
    <div style="margin-top:12px;">ลงชื่อ...............................................หัวหน้างานวัดผลและประเมินผล<br><span style="margin-left:40px;">( ${evalHeadName} )</span></div>
    <div style="margin-top:20px;text-align:center;">
      <div style="font-weight:bold;">เรียน เสนอเพื่อพิจารณาอนุมัติผลการเรียน</div>
      <div style="display:flex;justify-content:center;gap:50px;margin:15px 0;">
        <span><span class="rc"></span> อนุมัติ</span><span><span class="rc"></span> ไม่อนุมัติ</span>
      </div>
      ลงชื่อ....................................................................<br>
      <div style="margin-top:8px;">${directorName}</div><div>ผู้อำนวยการ${schoolName}</div>
    </div>
  </div>
</div>

<div class="page" style="padding:40px;">
  <div class="tc fw" style="font-size:18px;margin-bottom:10px;">วิสัยทัศน์</div>
  <div style="text-indent:40px;text-align:justify;margin-bottom:25px;">โรงเรียนบ้านคลอง ๑๔ มุ่งจัดการศึกษาให้เยาวชนเป็นคนดี มีคุณธรรม มีทักษะในการสื่อสาร มีความรู้ความสามารถเต็มตามศักยภาพของแต่ละบุคคล มีเจตคติที่ดีในการประกอบอาชีพสุจริตและใช้ชีวิตในสังคมได้อย่างมีความสุขตามแนวปรัชญาเศรษฐกิจพอเพียงด้วยกระบวนการบริหารจัดการที่ทันสมัยและการมีส่วนร่วมของบุคคลทั้งในและนอกสถานศึกษา</div>
  <div class="tc fw" style="font-size:18px;margin-bottom:10px;">พันธกิจ</div>
  <div style="margin-bottom:25px;padding-left:20px;line-height:1.9;">
    ๑. ส่งเสริมสนับสนุนให้ชุมชนเข้ามามีส่วนร่วมในการจัดการศึกษา และใช้ภูมิปัญญาท้องถิ่น<br>
    ๒. จัดการเรียนการสอนโดยยึดนักเรียนเป็นสำคัญ นักเรียนแสวงหาความรู้ด้วยตนเอง<br>
    ๓. ส่งเสริมสนับสนุนให้ครูและบุคลากรทางการศึกษาพัฒนาตนเองและทำการวิจัยในชั้นเรียน<br>
    ๔. จัดสภาพแวดล้อมของโรงเรียนให้เอื้อต่อการจัดการเรียนการสอน<br>
    ๕. จัดกิจกรรมโครงการพระราชดำริอย่างต่อเนื่องและเป็นระบบ
  </div>
  <div class="tc fw" style="font-size:18px;margin-bottom:10px;">เป้าหมาย</div>
  <div style="padding-left:20px;line-height:1.9;">
    ๑. ชุมชนมีส่วนร่วมในการจัดการศึกษา<br>๒. นำภูมิปัญญาท้องถิ่นมาใช้ในการจัดการเรียนการสอน<br>
    ๓. ครูจัดการเรียนรู้โดยยึดนักเรียนเป็นสำคัญ<br>๔. นักเรียนรู้จักแสวงหาความรู้ได้ด้วยตนเองและสร้างองค์ความรู้ได้<br>
    ๕. นักเรียนมีคุณธรรม จริยธรรมที่ดีงาม<br>๖. ส่งเสริมสนับสนุนครูและบุคลากรทางการศึกษาพัฒนาตนเองอยู่เสมอ<br>
    ๗. จัดสภาพแวดล้อมในโรงเรียนให้เอื้อต่อการเรียนรู้<br>๘. จัดกิจกรรมตามโครงการพระราชดำริอย่างต่อเนื่องและเป็นระบบ
  </div>
</div>

<div class="page">
  <div class="rh">กิจกรรมแนะแนว ระดับชั้น ${clsName}</div>
  <div style="margin-left:15%;font-size:15px;margin-bottom:6px;">จำนวนนักเรียน..........${rows.length}..........คน</div>
  <table>
    <thead><tr><th style="width:40px;font-weight:normal;">ที่</th><th style="font-weight:normal;">ชื่อ – สกุล</th><th style="width:35%;font-weight:normal;">หมายเหตุ</th></tr></thead>
    <tbody>
      ${rows.map(r => `<tr><td>${r.no}</td><td style="text-align:left;padding-left:15px;">${r.name}</td><td></td></tr>`).join('')}
      ${Array(Math.max(0,20-rows.length)).fill('<tr><td><br></td><td></td><td></td></tr>').join('')}
    </tbody>
  </table>
  <div class="sf" style="margin-top:40px;">
    ${teachers.map(t => `<div style="text-align:center;min-width:200px;">ลงชื่อ.......................................ครูประจำชั้น<br><div style="margin-top:10px;">( ${t} )</div></div>`).join('')}
  </div>
</div>

<div class="page">
  <div class="tc fw" style="font-size:17px;margin-bottom:6px;">บันทึกการจัดกิจกรรม</div>
  <table>
    <thead><tr>
      <th style="width:8%;font-weight:normal;">ครั้งที่</th>
      <th style="width:12%;font-weight:normal;">วัน/เดือน/ปี</th>
      <th style="font-weight:normal;">หัวข้อกิจกรรม / แผนการจัดการเรียนรู้</th>
      <th style="width:20%;font-weight:normal;">ผู้สอน</th>
    </tr></thead>
    <tbody>
      ${Array(displayCols).fill(0).map((_,i) => {
        const dStr  = App.guidanceDates[i] ? fmtDate(App.guidanceDates[i]) : '';
        const topic = topics[i] || '';
        const tStr  = App.guidanceDates[i] ? teachers[0] : '';
        return `<tr><td style="height:28px;">${i+1}</td><td style="font-size:13px;">${dStr}</td><td style="text-align:left;padding-left:10px;font-size:13px;">${topic}</td><td style="font-size:13px;">${tStr}</td></tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

<div class="page">
  <div class="tc fw" style="font-size:17px;margin-bottom:6px;">การเข้าร่วมกิจกรรมแนะแนว</div>
  <div class="fw" style="margin-bottom:3px;">ชั้น.....................${cls}.....................</div>
  <div style="font-size:13px;font-weight:bold;text-decoration:underline;margin-bottom:4px;">คำชี้แจง</div>
  <div style="font-size:13px;margin-bottom:8px;padding-left:12px;line-height:1.6;">
    1. เครื่องหมาย / = มาเรียนปกติ, ข = ขาดเรียน, ล = ลา, - = งดเรียน (ไม่นับคาบ)<br>
    2. เกณฑ์ผ่าน: เวลาเรียนไม่น้อยกว่า 80% ของเวลาเรียนทั้งหมด
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead>
      <tr>
        <th rowspan="2" style="width:25px;border:1px solid #000;">ที่</th>
        <th rowspan="2" style="min-width:140px;text-align:left;padding-left:5px;border:1px solid #000;">ชื่อ – สกุล</th>
        <th colspan="${nDates}" style="border:1px solid #000;font-size:11px;">วัน/เดือน/ปี ครั้งที่เข้าร่วมกิจกรรม</th>
        <th rowspan="2" style="width:30px;border:1px solid #000;">รวม</th>
        <th rowspan="2" style="width:28px;border:1px solid #000;">ผ่าน</th>
        <th rowspan="2" style="width:28px;border:1px solid #000;">ไม่ผ่าน</th>
      </tr>
      <tr style="height:100px;">${attDateHeaders}</tr>
    </thead>
    <tbody>${attRows}</tbody>
  </table>
</div>

</body></html>`);
  win.document.close();
}

// ── stubs compat ──────────────────────────────────────
function calcGuidanceSchedule() { onGuidanceSettingChange(); }
function calcGuidanceRow()      { /* legacy stub */ }
function toggleGuidanceDay()    { /* legacy stub */ }
