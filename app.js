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
let sortDir = "asc";

const clean = (s) =>
  String(s ?? "")
    .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
    .trim();

const cleanLower = (s) => clean(s).toLowerCase();

function uniqSorted(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a, b) =>
    cleanLower(a).localeCompare(cleanLower(b), "he")
  );
}

function compare(a, b) {
  const av = cleanLower(a[sortKey]);
  const bv = cleanLower(b[sortKey]);
  if (av === bv) return 0;
  return (av < bv ? -1 : 1) * (sortDir === "asc" ? 1 : -1);
}

function applySort() {
  filtered.sort((a, b) => {
    const p = compare(a, b);
    if (p !== 0) return p;
    return cleanLower(a.firstName).localeCompare(cleanLower(b.firstName), "he");
  });
}

function applyFilter() {
  const p = clean(plugaFilter.value);
  const f = clean(frameworkFilter.value);
  const q = cleanLower(searchBox.value);

  filtered = allData.filter((x) => {
    if (p !== "all" && clean(x.pluga) !== p) return false;
    if (f !== "all" && clean(x.framework) !== f) return false;

    if (q) {
      const hay = [
        x.firstName,
        x.lastName,
        x.role,
        x.pluga,
        x.framework,
        x.mobile,
      ]
        .map(cleanLower)
        .join(" ");
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  downloadBtn.disabled = !(p !== "all" && f !== "all" && filtered.length > 0);
  statusEl.textContent = `מציג ${filtered.length} מתוך ${allData.length}`;
}

function buildVCard(rec) {
  const first = clean(rec.firstName);
  const last = clean(rec.lastName);
    tableWrap.innerHTML = `<div style="padding:16px;color:#666;">אין תוצאות</div>`;
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th data-key="firstName">שם פרטי</th>
          <th data-key="lastName">שם משפחה</th>
          <th data-key="pluga">פלוגה</th>
          <th data-key="framework">מסגרת</th>
          <th data-key="role">תפקיד</th>
          <th data-key="mobile">טלפון</th>
          <th class="noSort">פעולות</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const r of filtered) {
    const tel = clean(r.mobileE164);
    const wa = clean(r.mobileWA);

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
            <a href="tel:${tel}" ${tel ? "" : "onclick='return false;'"} title="חיוג">📞</a>
            <a href="https://wa.me/${wa}" target="_blank" rel="noopener"
               class="wa-link" ${wa ? "" : "onclick='return false;'"} title="WhatsApp">
              <img src="/pluga-contact-app/assets/icons/whatsapp.png" class="wa-icon">
            </a>
            <a href="#" class="vcard" title="שמור איש קשר">👤</a>
          </div>
        </td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  tableWrap.innerHTML = html;

  document.querySelectorAll(".vcard").forEach((el, i) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const vcf = buildVCard(filtered[i]);
      downloadText(vcf, `${safeName(filtered[i].firstName)}_${safeName(filtered[i].lastName)}.vcf`);
    });
  });

  document.querySelectorAll("th[data-key]").forEach((th) => {
    th.onclick = () => {
      sortKey === th.dataset.key
        ? (sortDir = sortDir === "asc" ? "desc" : "asc")
        : ((sortKey = th.dataset.key), (sortDir = "asc"));
      applySort();
      render();
    };
  });
}

downloadBtn.onclick = () => {
  const vcf = filtered.map(buildVCard).join("\n");
  downloadText(vcf, `Pluga_${safeName(plugaFilter.value)}_${safeName(frameworkFilter.value)}.vcf`);
};

plugaFilter.onchange = () => {
  frameworkFilter.innerHTML = `<option value="all">כל המסגרות</option>`;
  uniqSorted(
    allData.filter((x) => clean(x.pluga) === clean(plugaFilter.value)).map((x) => x.framework)
  ).forEach((f) => {
    const o = document.createElement("option");
    o.value = f;
    o.textContent = f;
    frameworkFilter.appendChild(o);
  });
  frameworkFilter.disabled = false;
  applyFilter();
  applySort();
  render();
};

frameworkFilter.onchange = searchBox.oninput = () => {
  applyFilter();
  applySort();
  render();
};

(async function init() {
  try {
    statusEl.textContent = "טוען נתונים...";

    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load data.json (HTTP ${res.status})`);

    const raw = await res.json();
    allData = (raw || []).map((x) => ({
      firstName: clean(x.firstName),
      lastName: clean(x.lastName),
      pluga: clean(x.pluga),
      framework: clean(x.framework),
      role: clean(x.role),
      mobile: clean(x.mobile),
      mobileE164: clean(x.mobileE164),
      mobileWA: clean(x.mobileWA),
    }));

    // Plugot list
    uniqSorted(allData.map((x) => x.pluga)).forEach((p) => {
      const o = document.createElement("option");
      o.value = p;
      o.textContent = p;
      plugaFilter.appendChild(o);
    });

    statusEl.textContent = `מציג ${allData.length} מתוך ${allData.length}`;
    applyFilter();
    applySort();
    render();
  } catch (e) {
    console.error(e);
    statusEl.textContent = "שגיאה";
    tableWrap.innerHTML = `
      <div style="padding:16px;color:#b00;">
        שגיאה בטעינת הנתונים.<br>
        בדוק ש- <b>data.json</b> נמצא ב-root וששם הקובץ זהה בדיוק.<br>
        פרטים: <code>${String(e.message || e)}</code>
      </div>
    `;
  }
})();
