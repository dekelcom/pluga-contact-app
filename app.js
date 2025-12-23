const DATA_URL = "./data.json";

const statusEl = document.getElementById("status");
const tableWrap = document.getElementById("tableWrap");
const searchBox = document.getElementById("searchBox");
const plugaFilter = document.getElementById("plugaFilter");
const frameworkFilter = document.getElementById("frameworkFilter");
const downloadBtn = document.getElementById("downloadBtn");

let allData = [];
let filtered = [];

let sortKey = "lastName";
let sortDir = "asc"; // asc/desc

const clean = (s) => String(s ?? "")
  .replace(/[\u200E\u200F\u202A-\u202E]/g, "") // RTL/LTR
  .trim();

const cleanLower = (s) => clean(s).toLowerCase();

function uniqSorted(arr){
  return [...new Set(arr.filter(Boolean))].sort((a,b)=>cleanLower(a).localeCompare(cleanLower(b), "he"));
}

function compare(a,b){
  const av = cleanLower(a[sortKey]);
  const bv = cleanLower(b[sortKey]);
  if (av === bv) return 0;
  return (av < bv ? -1 : 1) * (sortDir === "asc" ? 1 : -1);
}

function applySort(){
  filtered.sort((a,b)=>{
    const p = compare(a,b);
    if (p !== 0) return p;
    const lnA = cleanLower(a.lastName), lnB = cleanLower(b.lastName);
    if (lnA !== lnB) return lnA < lnB ? -1 : 1;
    const fnA = cleanLower(a.firstName), fnB = cleanLower(b.firstName);
    if (fnA !== fnB) return fnA < fnB ? -1 : 1;
    return 0;
  });
}

function applyFilter(){
  const p = clean(plugaFilter.value);
  const f = clean(frameworkFilter.value);
  const q = cleanLower(searchBox.value);

  filtered = allData.filter(x=>{
    if (p !== "all" && clean(x.pluga) !== p) return false;
    if (f !== "all" && clean(x.framework) !== f) return false;

    if (q){
      const hay = [
        x.firstName,x.lastName,x.role,x.pluga,x.framework,x.mobile,x.mobileE164,x.mobileWA
      ].map(cleanLower).join(" ");
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // הורדה פעילה רק אם בחרת מסגרת ספציפית ויש תוצאות
  const canDownload = (p !== "all" && f !== "all" && filtered.length > 0);
  downloadBtn.disabled = !canDownload;

  statusEl.textContent = `מציג ${filtered.length} מתוך ${allData.length}`;
}

function buildVCard(rec){
  const first = clean(rec.firstName);
  const last  = clean(rec.lastName);
  const fn = (first + " " + last).trim() || "איש קשר";
  const tel = clean(rec.mobileE164);

  const meta = [];
  if (rec.pluga) meta.push(`פלוגה: ${clean(rec.pluga)}`);
  if (rec.framework) meta.push(`מסגרת: ${clean(rec.framework)}`);
  if (rec.role) meta.push(`תפקיד: ${clean(rec.role)}`);

  const lines = [
    "BEGIN:VCARD",
    "VERSION:4.0",
    `N:${last};${first};;;`,
    `FN:${fn}`,
  ];
  if (tel) lines.push(`TEL;TYPE=cell:${tel}`);
  if (meta.length) lines.push(`NOTE:${meta.join(" | ")}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

function downloadText(text, filename){
  const blob = new Blob([text], { type:"text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeName(s){
  return clean(s).replace(/[\\/:*?"<>|]/g,"-").replace(/\s+/g,"_").slice(0,120) || "contacts";
}

function render(){
  if (!filtered.length){
    tableWrap.innerHTML = `<div style="padding:16px;color:#666;">אין תוצאות לתצוגה.</div>`;
    return;
  }

  let html = `
    <table id="tbl">
      <thead>
        <tr>
          <th data-key="firstName">שם פרטי</th>
          <th data-key="lastName">שם משפחה</th>
          <th data-key="pluga">פלוגה</th>
          <th data-key="framework">מסגרת</th>
          <th data-key="role">תפקיד בפועל</th>
          <th data-key="mobile">טלפון נייד</th>
          <th class="noSort">פעולות</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const r of filtered){
    const tel = clean(r.mobileE164);
    const wa  = clean(r.mobileWA);

    const telHref = tel ? `tel:${tel}` : "#";
    const waHref  = wa  ? `https://wa.me/${wa}` : "#";

    html += `
      <tr>
        <td>${clean(r.firstName)}</td>
        <td>${clean(r.lastName)}</td>
        <td>${clean(r.pluga)}</td>
        <td>${clean(r.framework)}</td>
        <td>${clean(r.role)}</td>
        <td>${clean(r.mobile)}</td>
        <td>
          <div class="actions">
            <a href="${telHref}" title="חיוג" ${tel ? "" : "onclick='return false;'"}>📞</a>
            <a href="${waHref}" title="WhatsApp" target="_blank" rel="noopener" ${wa ? "" : "onclick='return false;'"}>💬</a>
            <a href="#" class="vcard" title="שמור איש קשר">👤</a>
          </div>
        </td>
      </tr>
    `;
  }

  html += `</tbody></table>`;
  tableWrap.innerHTML = html;

  // vCard per row
  document.querySelectorAll("a.vcard").forEach((el, idx)=>{
    el.addEventListener("click",(e)=>{
      e.preventDefault();
      const rec = filtered[idx];
      const vcf = buildVCard(rec);
      const filename = `${safeName(rec.firstName)}_${safeName(rec.lastName)}.vcf`;
      downloadText(vcf, filename);
    });
  });

  // sort handlers
  document.querySelectorAll("th[data-key]").forEach(th=>{
    th.addEventListener("click", ()=>{
      const key = th.dataset.key;
      if (sortKey === key) sortDir = (sortDir === "asc") ? "desc" : "asc";
      else { sortKey = key; sortDir = "asc"; }
      applySort();
      render();
    });
  });
}

function populateFrameworksForPluga(pluga){
  const p = clean(pluga);
  if (!p || p === "all"){
    frameworkFilter.disabled = true;
    frameworkFilter.innerHTML = `<option value="all">בחר פלוגה קודם</option>`;
    return;
  }
  const frameworks = uniqSorted(allData.filter(x=>clean(x.pluga)===p).map(x=>clean(x.framework)));
  frameworkFilter.disabled = false;
  frameworkFilter.innerHTML = `<option value="all">כל המסגרות</option>`;
  for (const f of frameworks){
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    frameworkFilter.appendChild(opt);
  }
}

downloadBtn.addEventListener("click", ()=>{
  const p = clean(plugaFilter.value);
  const f = clean(frameworkFilter.value);
  const vcf = filtered.map(buildVCard).join("\n");
  downloadText(vcf, `Pluga_882__${safeName(p)}__${safeName(f)}.vcf`);
});

plugaFilter.addEventListener("change", ()=>{
  populateFrameworksForPluga(plugaFilter.value);
  frameworkFilter.value = "all";
  applyFilter();
  applySort();
  render();
});

frameworkFilter.addEventListener("change", ()=>{
  applyFilter();
  applySort();
  render();
});

searchBox.addEventListener("input", ()=>{
  applyFilter();
  applySort();
  render();
});

(async function init(){
  try{
    const res = await fetch(DATA_URL, { cache:"no-store" });
    if (!res.ok) throw new Error("Failed to load data.json");

    const data = await res.json();
    allData = (data || []).map(x=>({
      firstName: clean(x.firstName),
      lastName: clean(x.lastName),
      pluga: clean(x.pluga),
      framework: clean(x.framework),
      role: clean(x.role),
      mobile: clean(x.mobile),
      mobileE164: clean(x.mobileE164),
      mobileWA: clean(x.mobileWA),
    }));

    // fill plugot
    const plugot = uniqSorted(allData.map(x=>x.pluga));
    for (const p of plugot){
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      plugaFilter.appendChild(opt);
    }

    populateFrameworksForPluga("all");
    applyFilter();
    applySort();
    render();
  } catch(e){
    console.error(e);
    statusEl.textContent = "שגיאה";
    tableWrap.innerHTML = `<div style="padding:16px;color:#b00;">
      שגיאה בטעינת הנתונים. ודא שיש <b>data.json</b> ב-root ושהשם זהה בדיוק (כולל אותיות קטנות/גדולות).
    </div>`;
  }
})();
