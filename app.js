const DATA_URL = "./data.json";
const BASE_PATH = "/pluga-contact-app";

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
  String(s ?? "").replace(/[\u200E\u200F\u202A-\u202E]/g, "").trim();
const cleanLower = (s) => clean(s).toLowerCase();

function uniqSorted(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a, b) =>
    cleanLower(a).localeCompare(cleanLower(b), "he")
  );
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

function applySort() {
  filtered.sort((a, b) => {
    const av = cleanLower(a[sortKey]);
    const bv = cleanLower(b[sortKey]);
    if (av === bv) return 0;
    return av < bv ? (sortDir === "asc" ? -1 : 1) : sortDir === "asc" ? 1 : -1;
  });
}

function buildVCard(r) {
  const first = clean(r.firstName);
  const last = clean(r.lastName);
  const fn = `${first} ${last}`.trim();
  const tel = clean(r.mobileE164);

  const lines = [
    "BEGIN:VCARD",
    "VERSION:4.0",
    `N:${last};${first};;;`,
    `FN:${fn}`,
  ];
  if (tel) lines.push(`TEL;TYPE=cell:${tel}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeName(s) {
  return clean(s)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}

function render() {
  if (!filtered.length) {
    tableWrap.innerHTML =
      "<div style='padding:16px;color:#666;'>אין תוצאות</div>";
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
        <th>פעולות</th>
      </tr>
    </thead>
    <tbody>
  `;

  filtered.forEach((r, i) => {
    const tel = clean(r.mobileE164);
    const wa = clean(r.mobileWA);

	html += `
	  <tr>
		<td data-label="שם פרטי">${clean(r.firstName)}</td>
		<td data-label="שם משפחה">${clean(r.lastName)}</td>
		<td data-label="פלוגה">${clean(r.pluga)}</td>
		<td data-label="מסגרת">${clean(r.framework)}</td>
		<td data-label="תפקיד">${clean(r.role)}</td>
		<td data-label="טלפון">${clean(r.mobile)}</td>
		<td data-label="פעולות">
		  <div class="actions">
			<a href="tel:${tel}" title="חיוג" ${tel ? "" : "onclick='return false;'"}>📞</a>
			<a href="https://wa.me/${wa}" target="_blank" rel="noopener"
			   class="wa-link" title="WhatsApp" ${wa ? "" : "onclick='return false;'"}">
			  <img src="/pluga-contact-app/assets/icons/whatsapp.png" class="wa-icon" alt="WhatsApp">
			</a>
			<a href="#" class="vcard" title="שמור איש קשר">👤</a>
		  </div>
		</td>
	  </tr>
	`;

  html += "</tbody></table>";
  tableWrap.innerHTML = html;

  document.querySelectorAll(".vcard").forEach((el, i) => {
    el.onclick = (e) => {
      e.preventDefault();
      const vcf = buildVCard(filtered[i]);
      downloadText(
        vcf,
        `${safeName(filtered[i].firstName)}_${safeName(
          filtered[i].lastName
        )}.vcf`
      );
    };
  });

  document.querySelectorAll("th[data-key]").forEach((th) => {
    th.onclick = () => {
      if (sortKey === th.dataset.key)
        sortDir = sortDir === "asc" ? "desc" : "asc";
      else {
        sortKey = th.dataset.key;
        sortDir = "asc";
      }
      applySort();
      render();
    };
  });
}

downloadBtn.onclick = () => {
  const vcf = filtered.map(buildVCard).join("\n");
  downloadText(
    vcf,
    `Pluga_${safeName(plugaFilter.value)}_${safeName(
      frameworkFilter.value
    )}.vcf`
  );
};

plugaFilter.onchange = () => {
  frameworkFilter.innerHTML = `<option value="all">כל המסגרות</option>`;
  uniqSorted(
    allData.filter((x) => clean(x.pluga) === clean(plugaFilter.value))
      .map((x) => x.framework)
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
  const res = await fetch(DATA_URL, { cache: "no-store" });
  allData = (await res.json()).map((x) => ({
    firstName: clean(x.firstName),
    lastName: clean(x.lastName),
    pluga: clean(x.pluga),
    framework: clean(x.framework),
    role: clean(x.role),
    mobile: clean(x.mobile),
    mobileE164: clean(x.mobileE164),
    mobileWA: clean(x.mobileWA),
  }));

  uniqSorted(allData.map((x) => x.pluga)).forEach((p) => {
    const o = document.createElement("option");
    o.value = p;
    o.textContent = p;
    plugaFilter.appendChild(o);
  });

  applyFilter();
  applySort();
  render();
})();
