// 12. PDF & EXPORT REPORTING
// =====================================================
const escHtml = v => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
function writeToPrintWindow(win, html, title) {
  if (!win) return;
  try { win.document.open(); win.document.write(html.includes('<html') ? html : `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>${title}</title></head><body>${html}</body></html>`); win.document.close(); } catch (e) { Utils.toast('เปิดหน้าพิมพ์ไม่ได้', 'error'); }
}

async function printRowPDF(sid, type = 'year') {
  const win = window.open('', '_blank'); if (!win) return Utils.toast('อนุญาต Popup ด้วยครับ', 'error');
  win.document.write('<html><head><meta charset="UTF-8"></head><body style="text-align:center;padding-top:80px;color:#666;font-family:sans-serif;"><h2>⏳ กำลังสร้างเอกสาร...</h2></body></html>');
  Utils.showLoading('กำลังสร้างเอกสาร...');
  try { writeToPrintWindow(win, await api('generateStudentHTML', { year: $('gYear').value, classroom: $('gClass').value, studentId: sid, ignoreR: App.ignoreR, reportType: type }), `ปพ6_${sid}`); } 
  catch (e) { win.close(); Utils.toast(e.message, 'error'); } Utils.hideLoading();
}

async function printClassPDF(type = 'year') {
  if (!confirm(`พิมพ์รายงาน ปพ.6 ${type === 'term1' ? 'เทอม 1' : 'ทั้งปี'} ?`)) return;
  const win = window.open('', '_blank'); if (!win) return Utils.toast('อนุญาต Popup ด้วยครับ', 'error');
  win.document.write('<html><head><meta charset="UTF-8"></head><body style="text-align:center;padding-top:80px;color:#666;font-family:sans-serif;"><h2>⏳ กำลังสร้างเอกสาร...</h2></body></html>');
  Utils.showLoading('กำลังสร้างเอกสาร...');
  try { writeToPrintWindow(win, await api('generateClassHTML', { year: $('gYear').value, classroom: $('gClass').value, ignoreR: App.ignoreR, reportType: type }), `ปพ6_ทั้งห้อง`); } 
  catch (e) { win.close(); Utils.toast(e.message, 'error'); } Utils.hideLoading();
}

  // =====================================================
// ฟังก์ชันช่วยดึงข้อมูลจากหน้าตาราง HTML โดยตรง
// =====================================================
function getTableDataForSummary(type) {
  const rows = [];
  $$('#gtBody tr[data-sid]').forEach((tr, index) => {
    const id = tr.querySelector('.s-c1')?.textContent.trim() || '';
    const name = tr.querySelector('.s-c2 span')?.textContent.trim() || '';
    
    let keep = '', exam = '', total = '', grade = '';
    
    if (App.isSemMode) {
      // โหมดมัธยม (รายเทอม)
      keep = tr.querySelector('.t1sc')?.textContent.trim() || '0';
      exam = tr.querySelector('.s-t1e')?.value || '0';
      total = tr.querySelector('.t1tot')?.textContent.trim() || '0';
      grade = tr.querySelector('.final-grade')?.textContent.trim() || '';
    } else {
      // โหมดประถม (รายปี)
      if (type === 'term1') {
        keep = tr.querySelector('.t1sc')?.textContent.trim() || '0';
        exam = tr.querySelector('.s-t1e')?.value || '0';
        total = tr.querySelector('.t1tot')?.textContent.trim() || '0';
        grade = '-'; // เทอม 1 ยังไม่ตัดเกรด
      } else if (type === 'term2') {
        keep = tr.querySelector('.t2sc')?.textContent.trim() || '0';
        exam = tr.querySelector('.s-t2e')?.value || '0';
        total = tr.querySelector('.t2tot')?.textContent.trim() || '0';
        grade = '-'; // เทอม 2 ย่อย ยังไม่ตัดเกรด
      } else {
        // ทั้งปี (year)
        keep = tr.querySelector('.sum-keep')?.textContent.trim() || '0';
        exam = tr.querySelector('.sum-exam')?.textContent.trim() || '0';
        total = tr.querySelector('.gtot')?.textContent.trim() || '0';
        grade = tr.querySelector('.final-grade')?.textContent.trim() || '';
      }
    }
    
    rows.push({ no: index + 1, id, name, keep, exam, total, grade });
  });
  return rows;
}

// =====================================================
// พิมพ์สรุปผลการเรียน (ดึงจาก HTML)
// =====================================================
async function printSummaryPDF(type = 'year') {
  closeSummaryModeModal();
  
  const year = $('gYear').value;
  const classroom = $('gClass').value;
  const subject = $('gSubj').value;
  
  const termLabel = App.isSemMode ? '' : (type === 'term1' ? '(ภาคเรียนที่ 1)' : (type === 'term2' ? '(ภาคเรียนที่ 2)' : '(สรุปทั้งปีการศึกษา)'));
  
  const dataRows = getTableDataForSummary(type);
  if (!dataRows.length) return Utils.toast('ไม่พบข้อมูลนักเรียน', 'error');

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <title>สรุปผลการเรียน_${classroom}_${subject}</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: 'Sarabun', sans-serif; font-size: 14px; color: #000; margin: 0; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        h3 { margin: 0 0 5px 0; font-size: 18px; }
        p { margin: 0 0 15px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #000; padding: 6px 8px; text-align: center; vertical-align: middle; }
        th { background: #f8fafc; font-weight: 700; }
        .col-no { width: 40px; }
        .col-id { width: 80px; }
        .col-name { text-align: left; }
        .col-score { width: 70px; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h3>สรุปผลการเรียน รายวิชา ${subject}</h3>
        <p>ชั้น ${classroom} ปีการศึกษา ${year} ${termLabel}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th class="col-no">ที่</th>
            <th class="col-id">รหัส</th>
            <th class="col-name">ชื่อ-นามสกุล</th>
            <th class="col-score">คะแนนเก็บ</th>
            <th class="col-score">คะแนนสอบ</th>
            <th class="col-score">รวม</th>
            <th class="col-score">เกรด</th>
          </tr>
        </thead>
        <tbody>
          ${dataRows.map(r => `
            <tr>
              <td>${r.no}</td>
              <td>${r.id}</td>
              <td class="text-left">${r.name}</td>
              <td>${r.keep}</td>
              <td>${r.exam}</td>
              <td><b>${r.total}</b></td>
              <td><b>${r.grade}</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const win = window.open('', '_blank'); 
  if (!win) return Utils.toast('กรุณาอนุญาต Popup ด้วยครับ', 'error');
  writeToPrintWindow(win, html, `สรุปผลการเรียน_${classroom}_${subject}`);
}

// =====================================================
// Export Excel (ดึงจาก HTML)
// =====================================================
async function exportSummaryCSV() {
  if (!confirm(`ดาวน์โหลดไฟล์ Excel (CSV) สรุปคะแนนวิชา ${$('gSubj').value}?`)) return; 
  
  // ใช้ Type = year เป็นค่าเริ่มต้นสำหรับดึงคอลัมน์ (ถ้าเป็นมัธยมมันจะจัดการให้อัตโนมัติ)
  const dataRows = getTableDataForSummary('year');
  if (!dataRows.length) return Utils.toast('ไม่พบข้อมูลนักเรียน', 'error');

  // ใส่ BOM (\uFEFF) เพื่อให้ Excel อ่านภาษาไทยได้ถูกต้อง
  let csvContent = "\uFEFFที่,รหัสประจำตัว,ชื่อ-นามสกุล,คะแนนเก็บ,คะแนนสอบ,รวม,เกรด\n";
  
  dataRows.forEach(r => {
    // ใส่ " คลุมชื่อเผื่อมีช่องว่างหรือเครื่องหมายคอมม่า
    csvContent += `${r.no},${r.id},"${r.name}",${r.keep},${r.exam},${r.total},${r.grade}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `สรุปคะแนน_${$('gClass').value}_${$('gSubj').value}_ปี${$('gYear').value}.csv`;
  
  document.body.appendChild(link);
  link.click();
  link.remove();
  
  Utils.toast('✅ ดาวน์โหลดไฟล์ Excel สำเร็จ');
}



async function printPp5SubjectPDF() {
  if (!$('gClass').value.includes('เทอม')) return Utils.toast('ปพ.5 เวอร์ชันนี้ใช้กับมัธยมก่อน', 'warning');
  const win = window.open('', '_blank'); if (!win) return Utils.toast('อนุญาต Popup ด้วยครับ', 'error');
  win.document.write('<html><head><meta charset="UTF-8"></head><body style="text-align:center;padding-top:80px;color:#666;font-family:sans-serif;"><h2>⏳ กำลังสร้าง ปพ.5 ...</h2></body></html>');
  Utils.showLoading('กำลังสร้าง ปพ.5 ...');
  try { writeToPrintWindow(win, await api('generatePp5SubjectHTML', { year: $('gYear').value, classroom: $('gClass').value, subject: $('gSubj').value }), `ปพ5`); } 
  catch (e) { win.close(); Utils.toast(e.message, 'error'); } Utils.hideLoading();
}



function printHolisticReport(mode) {
  const rows =[...$$(`${mode === 'homeroom' ? '#hrAssBody' : '#assBody'} tr[data-hsid]`)].map((tr, i) => ({
    no: i + 1,
    name: tr.querySelector('.ass-name')?.textContent || '',
    cS:[...tr.querySelectorAll('.c-inp')].map(i => i.value),
    cT: tr.querySelector('.c-total')?.textContent || '-',
    cR: tr.querySelector('.c-result')?.textContent || '-',
    rS: [...tr.querySelectorAll('.r-inp')].map(i => i.value),
    rT: tr.querySelector('.r-total')?.textContent || '-',
    rR: tr.querySelector('.r-result')?.textContent || '-',
    sS: [...tr.querySelectorAll('.s-inp')].map(i => i.value),
    sT: tr.querySelector('.s-total')?.textContent || '-',
    sR: tr.querySelector('.s-result')?.textContent || '-'
  }));

  if (!rows.length) return Utils.toast('ไม่พบข้อมูล', 'error');

  // ตรวจสอบว่าเป็นรายงานแบบรายวิชา หรือ ประจำชั้น
  const metaText = mode === 'homeroom' 
    ? `ชั้น ${$('gClass').value} | สรุปประเมินประจำชั้น` 
    : `ชั้น ${$('gClass').value} | รายวิชา ${$('gSubj').value}`;

  const mkTbl = (tit, hdrs, kS, kT, kR, cls) => {
    // นับจำนวนสรุปผลการประเมิน
    const counts = { 'ดีเยี่ยม': 0, 'ดี': 0, 'ผ่าน': 0, 'ไม่ผ่าน': 0 };
    rows.forEach(r => {
      let res = r[kR];
      if (counts[res] !== undefined) counts[res]++;
    });

    return `<section class="print-page">
      <div class="report-head">
        <div class="report-school">โรงเรียนบ้านคลอง 14</div>
        <div class="report-title">${tit}</div>
        <div class="report-meta">${metaText}</div>
      </div>
      <table class="print-tbl ${cls}">
        <thead>
          <tr>
            <th class="col-no">ที่</th>
            <th class="col-name">ชื่อ-นามสกุล</th>
            ${hdrs.map(h => `<th>${h}</th>`).join('')}
            <th class="col-total">รวม</th>
            <th class="col-result">ผล</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td>${r.no}</td>
            <td style="text-align:left">${escHtml(r.name)}</td>
            ${r[kS].map(v => `<td>${v || '-'}</td>`).join('')}
            <td>${r[kT]}</td>
            <td><b>${r[kR]}</b></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="report-summary">
        <b>สรุปผลการประเมิน:</b> 
        <span class="sum-item sum-3">ดีเยี่ยม: ${counts['ดีเยี่ยม']} คน</span> |
        <span class="sum-item sum-2">ดี: ${counts['ดี']} คน</span> |
        <span class="sum-item sum-1">ผ่าน: ${counts['ผ่าน']} คน</span> |
        <span class="sum-item sum-0">ไม่ผ่าน: ${counts['ไม่ผ่าน']} คน</span>
      </div>
    </section>`;
  };

  const win = window.open('', '_blank');
  if (!win) return Utils.toast('กรุณาอนุญาตให้เปิดหน้าต่างใหม่ (Popup)', 'error');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>รายงานประเมิน</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: "Sarabun", sans-serif; margin: 0; color: #111827; }
  .print-page { page-break-after: always; padding: 4mm 2mm; }
  .report-head { text-align: center; margin-bottom: 12px; }
  .report-school { font-size: 16px; font-weight: bold; }
  .report-title { font-size: 18px; font-weight: bold; margin: 4px 0; }
  .report-meta { font-size: 14px; color: #4b5563; }
  .print-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
  .print-tbl th, .print-tbl td { border: 1px solid #9ca3af; padding: 6px; text-align: center; }
  .print-tbl .col-no { width: 40px; }
  .print-tbl .col-name { width: 220px; }
  .theme-char thead th { background: #fef08a; }
  .theme-read thead th { background: #fdba74; }
  .theme-skill thead th { background: #d1d5db; }
  .report-summary { margin-top: 15px; text-align: right; font-size: 15px; padding: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; }
  .sum-item { margin: 0 8px; font-weight: bold; }
  .sum-3 { color: #166534; }
  .sum-2 { color: #075985; }
  .sum-1 { color: #92400e; }
  .sum-0 { color: #991b1b; }
</style>
</head>
<body>
  ${mkTbl('ประเมินคุณลักษณะอันพึงประสงค์',['1','2','3','4','5','6','7','8'], 'cS', 'cT', 'cR', 'theme-char')}
  ${mkTbl('ประเมินการอ่าน คิด วิเคราะห์ เขียน', ['1','2','3','4','5'], 'rS', 'rT', 'rR', 'theme-read')}
  ${mkTbl('ประเมินสมรรถนะสำคัญของผู้เรียน', ['1','2','3','4','5'], 'sS', 'sT', 'sR', 'theme-skill')}
</body>
</html>`;

  writeToPrintWindow(win, html, 'รายงานประเมิน');
}

// =====================================================
// 13. UI NAVIGATION & KEYBOARD EVENTS
// =====================================================
function switchHolisticTab(mode, btn) { $$('#holisticTabs .ttab').forEach(t => t.classList.remove('on')); if (btn) btn.classList.add('on'); $('holisticSubjectPanel').style.display = mode === 'subject' ? '' : 'none'; $('holisticHomeroomPanel').style.display = mode === 'homeroom' ? '' : 'none'; }
function showScoreMain(btn) { if($('scoreMainArea')) $('scoreMainArea').style.display='block'; if($('settingsContentArea')) $('settingsContentArea').style.display='none'; $$('.settings-panel').forEach(p=>p.classList.remove('active')); $$('#settingsTabs .settings-tab').forEach(t=>t.classList.remove('active')); if(btn) btn.classList.add('active'); }
function switchSettingsTab(tid, btn) { if($('scoreMainArea')) $('scoreMainArea').style.display='none'; if($('settingsContentArea')) $('settingsContentArea').style.display='block'; $$('.settings-panel').forEach(p=>p.classList.remove('active')); $$('#settingsTabs .settings-tab').forEach(t=>t.classList.remove('active')); if($('panel_'+tid)) $('panel_'+tid).classList.add('active'); if(btn) btn.classList.add('active'); }
function openSummaryModeModal() { if($('gClass').value.includes('เทอม')) return printSummaryPDF('term1'); $('summaryModeModal').style.display='flex'; }
function closeSummaryModeModal() { $('summaryModeModal').style.display='none'; }
$('summaryModeModal')?.addEventListener('click', function(e) { if(e.target===this) closeSummaryModeModal(); });

function updateScoreInputState(inp) {
  if (!inp) return; inp.classList.remove('score-empty', 'score-partial', 'score-full');
  const v = Number(inp.value), mx = Number(inp.getAttribute('max')) || 0;
  if (inp.value.trim() === '' || isNaN(v) || v <= 0) inp.classList.add('score-empty');
  else if (mx > 0 && v >= mx) inp.classList.add('score-full');
  else inp.classList.add('score-partial');
}
function refreshAllScoreInputStates(s = document) { s.querySelectorAll('.sub1, .sub2, .s-t1e, .s-t2e').forEach(updateScoreInputState); }

document.addEventListener('keydown', e => {
  if (!['Enter','ArrowDown','ArrowUp'].includes(e.key) || !document.activeElement.classList.contains('sinput')) return;
  e.preventDefault(); const tr = document.activeElement.closest('tr'), rows = Array.from(tr.closest('tbody').querySelectorAll('tr'));
  const target = rows[rows.indexOf(tr) + (e.key === 'ArrowUp' ? -1 : 1)]?.cells[document.activeElement.closest('td').cellIndex]?.querySelector('.sinput');
  if (target) { target.focus(); target.select(); }
});

  // =====================================================
