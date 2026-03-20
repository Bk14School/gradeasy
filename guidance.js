// ── State ──────────────────────────────────────────
App.guidanceDates = [];   // วันที่จริงที่คำนวณได้
App.hrMap = App.hrMap || {};  // จดจำชื่อครูประจำชั้นแยกห้อง

// ── 1. คำนวณวันที่แนะแนวจาก termDates ─────────────
function calcGuidanceDates() {
  const termEl = document.getElementById('guide_term');
  const dayEl  = document.getElementById('guide_day');
  if (!termEl || !dayEl) return [];

  const term      = termEl.value;
  const dayOfWeek = parseInt(dayEl.value);   // 1=จ … 5=ศ
  const startKey  = `t${term}_start`;
  const endKey    = `t${term}_end`;
  const startD    = App.termDates[startKey];
  const endD      = App.termDates[endKey];

  const dates = [];
  if (!startD || !endD) return dates;

  // แปลง dd/mm/yyyy (พ.ศ.) → Date
  const parseD = str => {
    const p = String(str).split(/[\/\-]/);
    if (p.length !== 3) return new Date();
    const y = parseInt(p[2]) > 2500 ? parseInt(p[2]) - 543 : parseInt(p[2]);
    return new Date(y, parseInt(p[1]) - 1, parseInt(p[0]));
  };

  const hSet = new Set(
    (App.holidays || [])
      .filter(h => h.type === 'holiday')
      .map(h => h.date)
  );

  let cur = parseD(startD);
  const end = parseD(endD);
  cur.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (cur <= end) {
    if (cur.getDay() === dayOfWeek) {
      const dd = String(cur.getDate()).padStart(2, '0');
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
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
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${parseInt(p[0])} ${months[parseInt(p[1]) - 1]}${String(p[2]).slice(-2)}`;
}

// ── 2. เรนเดอร์แผงควบคุม + ตาราง ──────────────────
function renderGuidanceTable(isRecalculating = false) {
  const container = $('guidanceContainer');
  if (!container) return;
  if (!App.students || !App.students.length) return;

  const cls = $('gClass').value.trim();

  // ── 2a. สร้างแผงควบคุมครั้งแรก (ไม่ใช่ recalc) ──
  if (!isRecalculating) {
    // ล้างแผงเก่าทุกรูปแบบ
    document.querySelectorAll(
      '#guide_panel_control_v3, #guide_panel_control, .guide-dynamic-panel'
    ).forEach(el => el.remove());

    // ชื่อครูประจำชั้น (จดจำแยกห้อง)
    if (App.hrMap[cls] === undefined) {
      App.hrMap[cls] = (App.user && App.user.classroom === cls)
        ? (App.user.name || '') : '';
    }
    const hrName = App.hrMap[cls] || '';

    // ค่า default ภาคเรียน
    const defaultTerm = cls.includes('เทอม 2') ? '2' : '1';

    const panel = document.createElement('div');
    panel.id = 'guide_panel_control_v3';
    panel.className = 'guide-dynamic-panel';
    panel.innerHTML = `
      <div style="background:#fff;border:1px solid #e9d5ff;border-radius:10px;
                  padding:14px 16px;margin-bottom:14px;display:flex;
                  flex-wrap:wrap;gap:12px;align-items:center;">

        <!-- ครูประจำชั้น -->
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

        <!-- ภาคเรียน -->
        <div style="display:flex;align-items:center;gap:6px;">
          <label style="font-weight:700;color:#0369a1;margin:0;font-size:.85rem;">ภาคเรียน</label>
          <select id="guide_term"
            style="padding:5px 8px;border-radius:6px;border:1.5px solid #bae6fd;font-weight:700;font-family:inherit;"
            onchange="onGuidanceSettingChange()">
            <option value="1" ${defaultTerm==='1'?'selected':''}>1</option>
            <option value="2" ${defaultTerm==='2'?'selected':''}>2</option>
          </select>
        </div>

        <!-- วันในสัปดาห์ -->
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

        <!-- Badge: จำนวนคาบ -->
        <div id="guide_count_badge"
          style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;
                 padding:5px 14px;border-radius:50px;font-weight:700;font-size:.85rem;">
          รวม <span id="guide_total_show" style="font-size:1rem;color:#15803d;">0</span> คาบ
        </div>
      </div>
    `;

    // แทรกเหนือ container
    container.parentNode.insertBefore(panel, container);

    // คำนวณและวาดตารางหลังสร้าง DOM
    setTimeout(() => onGuidanceSettingChange(), 50);
    return;
  }

  // ── 2b. Re-calculate dates แล้ว re-render ตาราง ──
  App.guidanceDates = calcGuidanceDates();
  const totalShow = $('guide_total_show');
  if (totalShow) totalShow.textContent = App.guidanceDates.length;

  _buildGuidanceTable();
}

// เรียกเมื่อผู้ใช้เปลี่ยน setting (ภาคเรียน / วันเรียน)
function onGuidanceSettingChange() {
  App.guidanceDates = calcGuidanceDates();
  const totalShow = $('guide_total_show');
  if (totalShow) totalShow.textContent = App.guidanceDates.length;
  _buildGuidanceTable();
}

// ── 3. สร้างตารางข้อมูลจริง ──────────────────────
function _buildGuidanceTable() {
  const container = $('guidanceContainer');
  if (!container) return;

  const dates   = App.guidanceDates;
  const nDates  = dates.length;

  // header วันที่ (แนวตั้ง)
  const dateHeaders = dates.map(d => `
    <th style="width:22px;vertical-align:bottom;padding-bottom:4px;border:1px solid #e9d5ff;">
      <div style="writing-mode:vertical-rl;transform:rotate(180deg);
                  font-size:10px;font-weight:600;color:#7c3aed;white-space:nowrap;">
        ${shortThaiDate(d)}
      </div>
    </th>`).join('');

  // แถวนักเรียน
  const bodyRows = App.students.map((s, idx) => {
    const saved    = s.guidance_data || {};        // ข้อมูลที่บันทึกไว้แล้ว
    const stats    = s.stats || {};

    // ── Pre-fill logic ──────────────────────────────
    // ถ้ามีข้อมูลที่บันทึกไว้ ใช้ของเดิม
    // ถ้ายังไม่มี ให้ pre-fill จาก s.stats.present
    let dayFlags;   // array of 'P' | 'A' | 'L' | '' ขนาด nDates
    if (saved.day_flags && Array.isArray(saved.day_flags)) {
      // โหลดข้อมูลเดิม (pad ให้ครบถ้ามีวันเพิ่ม)
      dayFlags = [...saved.day_flags];
      while (dayFlags.length < nDates) dayFlags.push('');
    } else {
      // Pre-fill: ติ๊ก P ตามจำนวน present
      const nPresent = parseInt(stats.present) || 0;
      const nAbsent  = parseInt(stats.absent)  || 0;
      const nLeave   = parseInt(stats.leave)   || 0;
      dayFlags = Array(nDates).fill('').map((_, i) => {
        if (i < nPresent) return 'P';
        if (i < nPresent + nAbsent) return 'A';
        if (i < nPresent + nAbsent + nLeave) return 'L';
        return '';
      });
    }

    // ── คำนวณ present count จาก flags ──────────────
    const presentCount = dayFlags.filter(f => f === 'P').length;
    const result = saved.result ||
      (nDates > 0 && presentCount >= nDates * 0.8 ? 'ผ่าน' : 'ไม่ผ่าน');

    // ── เซลล์รายวัน ────────────────────────────────
    const dayCells = dates.map((_, i) => {
      const f = dayFlags[i] || '';
      const bg = f === 'P' ? '#dcfce7' : f === 'A' ? '#fee2e2' : f === 'L' ? '#fef3c7' : '#fff';
      const color = f === 'P' ? '#166534' : f === 'A' ? '#991b1b' : f === 'L' ? '#92400e' : '#94a3b8';
      const label = f === 'P' ? '✓' : f === 'A' ? 'ข' : f === 'L' ? 'ล' : '';
      return `
        <td class="guide-day-cell"
          data-idx="${i}"
          data-sid="${s.studentId}"
          onclick="toggleGuidanceDay(this)"
          style="cursor:pointer;width:22px;min-width:22px;padding:0;
                 background:${bg};border:1px solid #e9d5ff;text-align:center;
                 font-size:12px;font-weight:700;color:${color};
                 user-select:none;transition:background .1s;"
          data-flag="${f}">
          ${label}
        </td>`;
    }).join('');

    // ── สรุปผล ──────────────────────────────────────
    const resColor  = result === 'ผ่าน' ? '#166534' : '#991b1b';
    const resBg     = result === 'ผ่าน' ? '#dcfce7' : '#fee2e2';

    return `
      <tr data-guidesid="${s.studentId}">
        <td style="text-align:center;color:#94a3b8;font-size:.78rem;">${idx + 1}</td>
        <td class="ass-name" style="text-align:left;background:#fff;white-space:nowrap;
            font-weight:600;padding:6px 10px;border:1px solid #e9d5ff;">
          ${s.name}
          <span style="font-size:.72rem;color:#94a3b8;margin-left:6px;">
            ม${stats.present||0} ข${stats.absent||0} ล${stats.leave||0}
          </span>
        </td>
        ${dayCells}
        <td class="guide-present-count" style="text-align:center;font-weight:700;
            color:#0369a1;background:#eff6ff;border:1px solid #e9d5ff;white-space:nowrap;">
          ${presentCount}/${nDates}
        </td>
        <td style="text-align:center;border:1px solid #e9d5ff;">
          <select class="guide-result sinput"
            style="width:85px;padding:3px 4px;font-size:.78rem;font-weight:700;
                   background:${resBg};color:${resColor};
                   border:1.5px solid ${result==='ผ่าน'?'#86efac':'#fca5a5'};
                   border-radius:6px;font-family:inherit;"
            onchange="
              this.style.background = this.value==='ผ่าน'?'#dcfce7':'#fee2e2';
              this.style.color      = this.value==='ผ่าน'?'#166534':'#991b1b';
              this.style.borderColor= this.value==='ผ่าน'?'#86efac':'#fca5a5';
            ">
            <option value="ผ่าน"   ${result==='ผ่าน'   ?'selected':''}>ผ่าน</option>
            <option value="ไม่ผ่าน" ${result==='ไม่ผ่าน'?'selected':''}>ไม่ผ่าน</option>
          </select>
        </td>
        <td style="border:1px solid #e9d5ff;padding:4px 6px;">
          <input type="text" class="guide-note"
            value="${escHtml(saved.note || '')}"
            placeholder="หมายเหตุ..."
            style="width:100%;border:none;background:transparent;
                   font-family:inherit;font-size:.82rem;padding:2px 4px;">
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="ass-wrap" style="max-height:65vh;overflow:auto;
         border:1px solid #e9d5ff;border-radius:10px;">
      <table class="ass-tbl" style="font-size:13px;border-collapse:collapse;
             width:max-content;min-width:100%;">
        <thead style="position:sticky;top:0;z-index:20;background:#f5f3ff;">
          <tr>
            <th style="width:36px;border:1px solid #e9d5ff;">ที่</th>
            <th style="min-width:200px;text-align:left;padding-left:10px;
                border:1px solid #e9d5ff;">ชื่อ-นามสกุล</th>
            ${dateHeaders}
            <th style="width:56px;border:1px solid #e9d5ff;">มา/รวม</th>
            <th style="width:90px;border:1px solid #e9d5ff;">ผลการประเมิน</th>
            <th style="min-width:120px;border:1px solid #e9d5ff;">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody id="guidanceBody">${bodyRows}</tbody>
      </table>
    </div>
    <div style="font-size:.78rem;color:#6d28d9;margin-top:8px;
         background:#f5f3ff;border-radius:6px;padding:6px 12px;">
      💡 คลิกช่องรายวันเพื่อสลับ:
      <b style="color:#166534;">✓ มาเรียน</b> →
      <b style="color:#991b1b;">ข ขาด</b> →
      <b style="color:#92400e;">ล ลา</b> →
      <b style="color:#94a3b8;">ว่าง</b>
    </div>`;
}

// ── 4. Toggle วัน (คลิก cycle: '' → P → A → L → '') ─
function toggleGuidanceDay(cell) {
  const cycle = { '': 'P', 'P': 'A', 'A': 'L', 'L': '' };
  const cur  = cell.getAttribute('data-flag') || '';
  const next = cycle[cur] ?? '';

  const styleMap = {
    'P': { bg: '#dcfce7', color: '#166534', label: '✓' },
    'A': { bg: '#fee2e2', color: '#991b1b', label: 'ข' },
    'L': { bg: '#fef3c7', color: '#92400e', label: 'ล' },
    '' : { bg: '#fff',    color: '#94a3b8', label: ''  }
  };
  const st = styleMap[next];
  cell.setAttribute('data-flag', next);
  cell.style.background = st.bg;
  cell.style.color      = st.color;
  cell.textContent      = st.label;

  // อัปเดต present count ของแถว
  const tr   = cell.closest('tr');
  const flags = [...tr.querySelectorAll('.guide-day-cell')]
                    .map(c => c.getAttribute('data-flag') || '');
  const nP   = flags.filter(f => f === 'P').length;
  const nAll = App.guidanceDates.length;
  const countCell = tr.querySelector('.guide-present-count');
  if (countCell) countCell.textContent = `${nP}/${nAll}`;

  // auto-update ผลการประเมิน
  const sel = tr.querySelector('.guide-result');
  if (sel && nAll > 0) {
    const pass = nP >= nAll * 0.8 ? 'ผ่าน' : 'ไม่ผ่าน';
    sel.value = pass;
    sel.style.background  = pass === 'ผ่าน' ? '#dcfce7' : '#fee2e2';
    sel.style.color       = pass === 'ผ่าน' ? '#166534' : '#991b1b';
    sel.style.borderColor = pass === 'ผ่าน' ? '#86efac' : '#fca5a5';
  }
}

// ── 5. บันทึกข้อมูล ──────────────────────────────
async function saveGuidanceData() {
  const rows = $$('#guidanceBody tr[data-guidesid]');
  if (!rows.length) return Utils.toast('ไม่พบข้อมูล', 'error');

  const records = [...rows].map(tr => {
    const dayFlags = [...tr.querySelectorAll('.guide-day-cell')]
                        .map(c => c.getAttribute('data-flag') || '');
    const nP = dayFlags.filter(f => f === 'P').length;
    return {
      studentId : tr.getAttribute('data-guidesid'),
      day_flags : dayFlags,
      attended  : nP,
      result    : tr.querySelector('.guide-result').value,
      note      : tr.querySelector('.guide-note').value
    };
  });

  Utils.showLoading('กำลังบันทึกแนะแนว...');
  try {
    await api('saveGuidance', {
      year      : $('gYear').value,
      classroom : $('gClass').value,
      subject   : $('gSubj').value,
      maxTime   : App.guidanceDates.length,
      teacher   : ($('guidance_teacher') || {}).value || '',
      records
    });
    Utils.toast('✅ บันทึกกิจกรรมแนะแนวสำเร็จ');
  } catch (e) {
    Utils.toast(e.message, 'error');
  }
  Utils.hideLoading();
}

// ── 6. พิมพ์รายงาน 4 หน้า ────────────────────────
function printGuidanceReport() {
  const cls        = $('gClass').value;
  const year       = $('gYear').value;
  const term       = ($('guide_term') || {}).value || '1';
  const clsName    = cls.split('เทอม')[0].trim();
  const directorName   = 'นางปราณี วาดเขียน';
  const evalHeadName   = 'นางสาวกิตติญา สินทม';
  const schoolName     = 'โรงเรียนบ้านคลอง ๑๔';
  const academicHead   = $('sp_academic_head_name')?.value || '';

  let rawTeacher = ($('guidance_teacher') || {}).value?.trim() || '';
  if (!rawTeacher) rawTeacher = '........................................................';
  const teachers = rawTeacher.split(/\s*(?:และ|\/|,)\s*/).filter(t => t);

  // เก็บข้อมูลจากตาราง
  const rows = [...$$('#guidanceBody tr[data-guidesid]')].map((tr, i) => ({
    no       : i + 1,
    name     : tr.querySelector('.ass-name').textContent.replace(/ม\d+ ข\d+ ล\d+/,'').trim(),
    dayFlags : [...tr.querySelectorAll('.guide-day-cell')].map(c => c.getAttribute('data-flag') || ''),
    attended : [...tr.querySelectorAll('.guide-day-cell')].filter(c => c.getAttribute('data-flag') === 'P').length,
    result   : tr.querySelector('.guide-result').value,
    note     : tr.querySelector('.guide-note').value
  }));

  if (!rows.length) return Utils.toast('ไม่พบข้อมูล', 'error');

  const nDates   = App.guidanceDates.length;
  const passCount = rows.filter(r => r.result === 'ผ่าน').length;
  const failCount = rows.length - passCount;

  const getVeryShortDate = dStr => {
    const p = dStr.split('/');
    if (p.length !== 3) return dStr;
    const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
               'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return `${parseInt(p[0])}${m[parseInt(p[1])-1]}${p[2].slice(-2)}`;
  };

  // หัวคอลัมน์วันที่ (แนวตั้ง)
  const attDateHeaders = App.guidanceDates.map(d => `
    <th style="width:18px;vertical-align:bottom;padding-bottom:4px;border:1px solid #000;">
      <div style="writing-mode:vertical-rl;transform:rotate(180deg);
                  font-size:10px;color:red;font-weight:normal;">
        ${getVeryShortDate(d)}
      </div>
    </th>`).join('');

  // แถวเช็คชื่อ
  const attRows = rows.map(r => {
    const cells = App.guidanceDates.map((_, i) => {
      const f = r.dayFlags[i] || '';
      const label = f === 'P' ? '/' : f === 'A' ? 'ข' : f === 'L' ? 'ล' : '';
      const color = f === 'P' ? '#166534' : f === 'A' ? '#991b1b' : f === 'L' ? '#92400e' : '';
      return `<td style="width:18px;text-align:center;border:1px solid #000;
                         font-weight:bold;color:${color};font-size:11px;">${label}</td>`;
    }).join('');
    return `
      <tr>
        <td style="text-align:center;border:1px solid #000;">${r.no}</td>
        <td style="text-align:left;padding-left:6px;border:1px solid #000;
                   white-space:nowrap;">${r.name}</td>
        ${cells}
        <td style="text-align:center;font-weight:bold;border:1px solid #000;">${r.attended}</td>
        <td style="text-align:center;font-weight:bold;border:1px solid #000;">
          ${r.result === 'ผ่าน' ? '✓' : ''}
        </td>
        <td style="text-align:center;font-weight:bold;border:1px solid #000;">
          ${r.result !== 'ผ่าน' ? '✓' : ''}
        </td>
        <td style="border:1px solid #000;padding:0 5px;">${r.note || ''}</td>
      </tr>`;
  }).join('');

  const signLines = teachers.map(t => `
    <div style="text-align:center;min-width:220px;">
      ลงชื่อ.......................................ครูประจำชั้น<br>
      <div style="margin-top:8px;">( ${t} )</div>
    </div>`).join('');

  const win = window.open('', '_blank');
  if (!win) return Utils.toast('กรุณาอนุญาต Popup', 'error');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <title>รายงานกิจกรรมแนะแนว_${cls}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size:A4 portrait; margin:15mm; }
    body { font-family:'Sarabun',sans-serif; font-size:15px; color:#000; margin:0; line-height:1.4; }
    .page { page-break-after:always; min-height:260mm; padding:10px 20px; }
    .text-center { text-align:center; }
    table { width:100%; border-collapse:collapse; }
    th,td { border:1px solid #000; padding:6px; text-align:center; }
    .cover-box { border:1.5px solid #000; border-radius:12px; padding:15px; text-align:center; margin-bottom:15px; }
    .approval-box { border:1.5px solid #000; border-radius:25px; padding:20px 25px; margin-top:15px; }
    .stat-table { width:90%; margin:15px auto; font-size:15px; }
    .stat-table th,.stat-table td { border:1px solid #000; padding:10px; }
    .radio-c { display:inline-block; width:13px; height:13px; border:1.5px solid #000; border-radius:50%; vertical-align:middle; margin-right:5px; }
    .sign-flex { display:flex; justify-content:space-around; flex-wrap:wrap; margin-top:20px; gap:10px; }
    .att-table th,
    .att-table td { padding:3px 1px; font-size:12px; }
  </style>
</head>
<body>

<!-- หน้า 1: ปก -->
<div class="page">
  <div class="text-center">
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/The_Emblem_of_the_Ministry_of_Education_of_Thailand.svg/1200px-The_Emblem_of_the_Ministry_of_Education_of_Thailand.svg.png"
         style="width:75px;margin-bottom:8px;">
  </div>
  <div class="cover-box">
    <div style="font-size:22px;font-weight:bold;">แบบบันทึกผลกิจกรรมแนะแนว</div>
    <div style="font-size:17px;font-weight:bold;margin-top:8px;">
      ระดับชั้น <span style="border-bottom:1.5px dotted #000;display:inline-block;min-width:300px;">${clsName}</span>
    </div>
  </div>
  <div class="text-center" style="font-size:15px;line-height:1.8;">
    หลักสูตรการศึกษาขั้นพื้นฐาน ระดับชั้น <u>${clsName}</u>
    ภาคเรียนที่ <u>${term}</u>
    ปีการศึกษา <u>${year}</u><br>
    ${schoolName}<br>
    ครูประจำชั้น <span style="border-bottom:1.5px dotted #000;display:inline-block;min-width:320px;">
      ${teachers.join(' และ ')}
    </span>
  </div>
  <table class="stat-table">
    <tr>
      <td rowspan="2" style="width:25%;">นักเรียนทั้งหมด</td>
      <td colspan="2">จำนวนนักเรียน</td>
      <td rowspan="2" style="width:30%;">หมายเหตุ</td>
    </tr>
    <tr><td>ผ่าน</td><td>ไม่ผ่าน</td></tr>
    <tr>
      <td style="padding:15px 0;">${rows.length}</td>
      <td>${passCount}</td>
      <td>${failCount}</td>
      <td></td>
    </tr>
  </table>
  <div class="approval-box">
    <div style="font-size:17px;font-weight:bold;margin-bottom:15px;">การอนุมัติผลการเรียน</div>
    <div class="sign-flex">
      ${signLines}
    </div>
    <div style="margin-top:18px;">
      ลงชื่อ...............................................หัวหน้ากิจกรรมพัฒนาผู้เรียน<br>
      <span style="margin-left:40px;">(...............................................)</span>
    </div>
    <div style="margin-top:12px;">
      ลงชื่อ...............................................หัวหน้างานวัดผลและประเมินผล<br>
      <span style="margin-left:40px;">( ${evalHeadName} )</span>
    </div>
    <div style="margin-top:20px;text-align:center;">
      <div style="font-weight:bold;">เรียน เสนอเพื่อพิจารณาอนุมัติผลการเรียน</div>
      <div style="display:flex;justify-content:center;gap:50px;margin:15px 0;">
        <span><span class="radio-c"></span> อนุมัติ</span>
        <span><span class="radio-c"></span> ไม่อนุมัติ</span>
      </div>
      ลงชื่อ....................................................................<br>
      <div style="margin-top:8px;">${directorName}</div>
      <div>ผู้อำนวยการ${schoolName}</div>
    </div>
  </div>
</div>

<!-- หน้า 2: วิสัยทัศน์ พันธกิจ เป้าหมาย -->
<div class="page" style="padding:40px;">
  <div class="text-center" style="font-size:18px;font-weight:bold;margin-bottom:10px;">วิสัยทัศน์</div>
  <div style="text-indent:40px;text-align:justify;margin-bottom:25px;">
    โรงเรียนบ้านคลอง ๑๔ มุ่งจัดการศึกษาให้เยาวชนเป็นคนดี มีคุณธรรม มีทักษะในการสื่อสาร
    มีความรู้ความสามารถเต็มตามศักยภาพของแต่ละบุคคล มีเจตคติที่ดีในการประกอบอาชีพสุจริต
    และใช้ชีวิตในสังคมได้อย่างมีความสุขตามแนวปรัชญาเศรษฐกิจพอเพียง
    ด้วยกระบวนการบริหารจัดการที่ทันสมัยและการมีส่วนร่วมของบุคคลทั้งในและนอกสถานศึกษา
  </div>
  <div class="text-center" style="font-size:18px;font-weight:bold;margin-bottom:10px;">พันธกิจ</div>
  <div style="margin-bottom:25px;padding-left:20px;line-height:1.9;">
    ๑. ส่งเสริมสนับสนุนให้ชุมชนเข้ามามีส่วนร่วมในการจัดการศึกษา และใช้ภูมิปัญญาท้องถิ่น<br>
    ๒. จัดการเรียนการสอนโดยยึดนักเรียนเป็นสำคัญ นักเรียนแสวงหาความรู้ด้วยตนเอง สร้างองค์ความรู้ได้ และมีคุณธรรม จริยธรรมที่ดีงาม<br>
    ๓. ส่งเสริมสนับสนุนให้ครูและบุคลากรทางการศึกษาได้พัฒนาตนเองและทำการวิจัยในชั้นเรียน<br>
    ๔. จัดสภาพแวดล้อมของโรงเรียนให้เอื้อต่อการจัดการเรียนการสอน<br>
    ๕. จัดกิจกรรมโครงการพระราชดำริ อย่างต่อเนื่องและเป็นระบบ
  </div>
  <div class="text-center" style="font-size:18px;font-weight:bold;margin-bottom:10px;">เป้าหมาย</div>
  <div style="padding-left:20px;line-height:1.9;">
    ๑. ชุมชนมีส่วนร่วมในการจัดการศึกษา<br>
    ๒. นำภูมิปัญญาท้องถิ่นมาใช้ในการจัดการเรียนการสอน<br>
    ๓. ครูจัดการเรียนรู้โดยยึดนักเรียนเป็นสำคัญ<br>
    ๔. นักเรียนรู้จักแสวงหาความรู้ได้ด้วยตนเองและสร้างองค์ความรู้ได้<br>
    ๕. นักเรียนมีคุณธรรม จริยธรรมที่ดีงาม<br>
    ๖. ส่งเสริมสนับสนุนครูและบุคลากรทางการศึกษาพัฒนาตนเองอยู่เสมอ<br>
    ๗. จัดสภาพแวดล้อมในโรงเรียนให้เอื้อต่อการเรียนรู้<br>
    ๘. จัดกิจกรรมตามโครงการพระราชดำริอย่างต่อเนื่องและเป็นระบบ
  </div>
</div>

<!-- หน้า 3: รายชื่อ -->
<div class="page">
  <div class="text-center" style="border:1.5px solid #000;border-radius:8px;
       padding:8px;width:65%;margin:0 auto 12px;font-size:17px;font-weight:bold;">
    กิจกรรมแนะแนว ระดับชั้น ${clsName}
  </div>
  <div style="margin-left:15%;font-size:15px;margin-bottom:6px;">
    จำนวนนักเรียน..........${rows.length}..........คน
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px;font-weight:normal;">ที่</th>
        <th style="font-weight:normal;">ชื่อ – สกุล</th>
        <th style="width:35%;font-weight:normal;">หมายเหตุ</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `
        <tr>
          <td>${r.no}</td>
          <td style="text-align:left;padding-left:15px;">${r.name}</td>
          <td>${r.note||''}</td>
        </tr>`).join('')}
      ${Array(Math.max(0,20-rows.length)).fill('<tr><td><br></td><td></td><td></td></tr>').join('')}
    </tbody>
  </table>
  <div class="sign-flex" style="margin-top:40px;">
    ${teachers.map(t => `
      <div style="text-align:center;min-width:200px;">
        ลงชื่อ.......................................ครูประจำชั้น<br>
        <div style="margin-top:10px;">( ${t} )</div>
      </div>`).join('')}
  </div>
</div>

<!-- หน้า 4: ตารางเช็คชื่อ -->
<div class="page">
  <div class="text-center" style="font-size:17px;font-weight:bold;margin-bottom:6px;">
    การเข้าร่วมกิจกรรมแนะแนว
  </div>
  <div style="font-size:14px;font-weight:bold;margin-bottom:3px;">
    ชั้น.....................${cls}.....................
  </div>
  <div style="font-size:13px;font-weight:bold;text-decoration:underline;margin-bottom:4px;">คำชี้แจง</div>
  <div style="font-size:13px;margin-bottom:8px;padding-left:12px;line-height:1.6;">
    1. ใส่เครื่องหมาย / = มาเรียน, ข = ขาด, ล = ลา<br>
    2. เกณฑ์ผ่าน: เวลาเรียนไม่น้อยกว่า 80% ของเวลาเรียนทั้งหมด
  </div>
  <table class="att-table" style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead>
      <tr>
        <th rowspan="2" style="width:25px;border:1px solid #000;">ที่</th>
        <th rowspan="2" style="min-width:140px;text-align:left;padding-left:5px;border:1px solid #000;">ชื่อ – สกุล</th>
        <th colspan="${nDates}" style="border:1px solid #000;font-size:11px;">วัน/เดือน/ปี ครั้งที่เข้าร่วมกิจกรรม</th>
        <th rowspan="2" style="width:30px;border:1px solid #000;">รวม</th>
        <th rowspan="2" style="width:28px;border:1px solid #000;">ผ่าน</th>
        <th rowspan="2" style="width:28px;border:1px solid #000;">ไม่ผ่าน</th>
        <th rowspan="2" style="width:60px;border:1px solid #000;">หมายเหตุ</th>
      </tr>
      <tr style="height:100px;">
        ${attDateHeaders}
      </tr>
    </thead>
    <tbody>${attRows}</tbody>
  </table>
</div>

</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ── ฟังก์ชันที่ไม่ใช้แล้ว (stub เพื่อกันพัง) ────────
function calcGuidanceSchedule() { onGuidanceSettingChange(); }
function calcGuidanceRow(input) {
  // Legacy stub — ตอนนี้ใช้ toggleGuidanceDay แทน
}
