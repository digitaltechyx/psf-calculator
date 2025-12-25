/* PSF Quote Calculator (vanilla JS, embeddable)
 * - Compact row UI
 * - Tiered pricing auto-applies (for "Single Unit" rows)
 * - PDF export via jsPDF (text-based for clarity)
 */

const $ = (sel) => document.querySelector(sel);

/** @typedef {{ min: number, max?: number, price: number, label: string }} Tier */
/** @typedef {{ id: string, name: string, unit: string, mode: "FBA"|"FBM", kind: "tiered"|"flat", price?: number, tiers?: Tier[], slider?: { min: number, max: number, step: number, marks: number[] }, note?: string }} Service */

/** @type {Service[]} */
const SERVICES = [
  // FBA
  {
    id: "fba_single_unit",
    name: "Single Unit",
    unit: "unit",
    mode: "FBA",
    kind: "tiered",
    tiers: [
      { min: 50, max: 500, price: 0.85, label: "50–500" },
      { min: 501, max: 1000, price: 0.6, label: "501–1000" },
      { min: 1001, price: 0.4, label: "1001+" },
    ],
    slider: { min: 0, max: 1500, step: 1, marks: [0, 50, 500, 1000, 1500] },
    note: "Includes Receiving, FNSKU, Box Label, Forwarding (Small Standard).",
  },
  { id: "fba_pack_2", name: "Pack of 2", unit: "pack", mode: "FBA", kind: "flat", price: 1.15, slider: { min: 0, max: 500, step: 1, marks: [0, 10, 50, 100, 500] } },
  { id: "fba_pack_3_5", name: "Pack of 3–5", unit: "pack", mode: "FBA", kind: "flat", price: 1.5, slider: { min: 0, max: 300, step: 1, marks: [0, 10, 25, 50, 300] } },
  { id: "fba_pack_6_10", name: "Pack of 6–10", unit: "pack", mode: "FBA", kind: "flat", price: 3, slider: { min: 0, max: 200, step: 1, marks: [0, 5, 10, 25, 200] } },
  { id: "fba_bubble_wrap", name: "Bubble Wrap", unit: "ft", mode: "FBA", kind: "flat", price: 0.35, slider: { min: 0, max: 1000, step: 1, marks: [0, 10, 50, 100, 1000] } },
  { id: "fba_monthly_storage_unit", name: "Monthly Storage", unit: "unit", mode: "FBA", kind: "flat", price: 0.35, slider: { min: 0, max: 5000, step: 1, marks: [0, 50, 500, 1000, 5000] } },

  // FBM
  {
    id: "fbm_single_unit",
    name: "Single Unit",
    unit: "unit",
    mode: "FBM",
    kind: "tiered",
    tiers: [
      { min: 1, max: 10, price: 2.25, label: "1–10" },
      { min: 11, max: 25, price: 1.75, label: "11–25" },
      { min: 26, price: 1.5, label: "26+" },
    ],
    slider: { min: 0, max: 500, step: 1, marks: [0, 10, 25, 50, 500] },
    note: "Small Standard (FBM).",
  },
  { id: "fbm_pack_2", name: "Pack of 2", unit: "pack", mode: "FBM", kind: "flat", price: 2, slider: { min: 0, max: 300, step: 1, marks: [0, 10, 25, 50, 300] } },
  { id: "fbm_pack_3_5", name: "Pack of 3–5", unit: "pack", mode: "FBM", kind: "flat", price: 3, slider: { min: 0, max: 200, step: 1, marks: [0, 10, 25, 50, 200] } },
  { id: "fbm_pack_6_10", name: "Pack of 6–10", unit: "pack", mode: "FBM", kind: "flat", price: 5, slider: { min: 0, max: 100, step: 1, marks: [0, 5, 10, 25, 100] } },
  { id: "fbm_monthly_storage_pallet", name: "Monthly Storage", unit: "pallet", mode: "FBM", kind: "flat", price: 40, slider: { min: 0, max: 50, step: 1, marks: [0, 1, 5, 10, 50] } },
  { id: "fbm_pallet_handling", name: "Pallet Handling", unit: "pallet", mode: "FBM", kind: "flat", price: 45, slider: { min: 0, max: 50, step: 1, marks: [0, 1, 5, 10, 50] } },
];

const DEFAULT_MODE = "FBA";

// Competitor comparison
// NOTE: Update these multipliers to match real competitor pricing.
// Example: 1.25 means "25% higher than PSF for the same items/tiers".
const COMPETITORS = [
  { key: "shiphype", name: "ShipHype", multiplier: 1.25 },
  { key: "instant_fulfillment", name: "Instant Fulfillment", multiplier: 1.2 },
  { key: "prepcenterla", name: "PrepCenterLA", multiplier: 1.3 },
];

/** @type {{ mode: "FBA"|"FBM", qty: Record<string, number>, detailsOpen: boolean }} */
const state = {
  mode: DEFAULT_MODE,
  qty: Object.fromEntries(SERVICES.map((s) => [s.id, 0])),
  detailsOpen: true,
};

function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? Math.trunc(n) : 0;
  return Math.min(max, Math.max(min, x));
}

function formatMoney(n) {
  return `$${n.toFixed(2)}`;
}

function getTierForQty(tiers, qty) {
  for (const t of tiers) {
    const maxOk = typeof t.max === "number" ? qty <= t.max : true;
    if (qty >= t.min && maxOk) return t;
  }
  return null;
}

function computeLine(service, qty) {
  let unitPrice = 0;
  let tierLabel = "";
  let warning = "";

  if (service.kind === "flat") {
    unitPrice = service.price ?? 0;
  } else {
    const t = getTierForQty(service.tiers ?? [], qty);
    if (!t) {
      unitPrice = 0;
      tierLabel = "Not in tier";
      warning = service.mode === "FBA" && qty > 0 ? "Below minimum (50+)" : "";
    } else {
      unitPrice = t.price;
      tierLabel = t.label;
      if (service.mode === "FBA" && qty > 0 && qty < 50) warning = "Below minimum (50+)";
    }
  }

  const subtotal = qty * unitPrice;
  return { unitPrice, tierLabel, subtotal, warning };
}

function currentServices() {
  return SERVICES.filter((s) => s.mode === state.mode);
}

function setMode(mode) {
  state.mode = mode;
  $("#tabFba").classList.toggle("isActive", mode === "FBA");
  $("#tabFbm").classList.toggle("isActive", mode === "FBM");
  $("#tabFba").setAttribute("aria-selected", String(mode === "FBA"));
  $("#tabFbm").setAttribute("aria-selected", String(mode === "FBM"));
  $("#panelFba").classList.toggle("isHidden", mode !== "FBA");
  $("#panelFbm").classList.toggle("isHidden", mode !== "FBM");
  $("#modeHint").textContent = `${mode} • Small Standard`;
  renderAll();
}

function renderItem(service) {
  const qty = state.qty[service.id] ?? 0;
  const { unitPrice, tierLabel, subtotal, warning } = computeLine(service, qty);
  const tierBase = service.kind === "tiered" ? (service.tiers?.[0]?.price ?? 0) : unitPrice;
  const displayUnitPrice = service.kind === "tiered" && qty === 0 ? tierBase : unitPrice;
  const priceText =
    service.kind === "tiered" && qty === 0
      ? `From ${formatMoney(displayUnitPrice)}/${service.unit}`
      : `${formatMoney(displayUnitPrice)}/${service.unit}`;

  const slider = service.slider ?? { min: 0, max: 1000, step: 1, marks: [0, 10, 50, 100, 500] };
  const marks = slider.marks ?? [];

  const row = document.createElement("div");
  row.className = "itemRow";
  row.dataset.serviceId = service.id;

  row.innerHTML = `
    <div class="itemMain">
      <div class="itemName">
        <span class="truncate">${escapeHtml(service.name)} <span class="badge">Small Std</span></span>
      </div>
      <div class="itemMeta">
        <span class="metaStrong">${escapeHtml(priceText)}</span>
        ${service.kind === "tiered" ? `<span>Tier: <span class="metaStrong">${escapeHtml(qty === 0 ? "-" : tierLabel || "-")}</span></span>` : ""}
        ${warning ? `<span class="warn">${escapeHtml(warning)}</span>` : ""}
      </div>
    </div>

    <div class="sliderWrap" aria-label="${escapeHtml(service.name)} slider">
      <input
        type="range"
        min="${slider.min}"
        max="${slider.max}"
        step="${slider.step}"
        value="${qty}"
        data-role="slider"
        aria-label="${escapeHtml(service.name)} quantity"
      />
      <div class="marks" aria-hidden="true">
        ${marks.map((m) => `<span>${m}</span>`).join("")}
      </div>
    </div>

    <div class="qtyWrap" aria-label="${escapeHtml(service.name)} quantity controls">
      <button class="qtyBtn" type="button" data-role="dec" ${qty <= 0 ? "disabled" : ""} aria-label="Decrease ${escapeHtml(service.name)}">−</button>
      <input class="qtyInput" type="number" inputmode="numeric" min="0" max="${slider.max}" step="1" value="${qty}" data-role="qty" aria-label="${escapeHtml(service.name)} quantity input" />
      <button class="qtyBtn" type="button" data-role="inc" ${qty >= slider.max ? "disabled" : ""} aria-label="Increase ${escapeHtml(service.name)}">+</button>
    </div>

    <div class="money">
      <div>${formatMoney(subtotal)}</div>
      <div class="moneySub">${qty} × ${formatMoney(unitPrice)}</div>
    </div>
  `;

  // events
  const sliderEl = row.querySelector('[data-role="slider"]');
  const qtyEl = row.querySelector('[data-role="qty"]');
  const decBtn = row.querySelector('[data-role="dec"]');
  const incBtn = row.querySelector('[data-role="inc"]');

  sliderEl.addEventListener("input", () => {
    const next = clampInt(Number(sliderEl.value), 0, slider.max);
    state.qty[service.id] = next;
    renderAll();
  });

  qtyEl.addEventListener("input", () => {
    const next = clampInt(Number(qtyEl.value), 0, slider.max);
    state.qty[service.id] = next;
    renderAll();
  });

  decBtn.addEventListener("click", () => {
    state.qty[service.id] = clampInt(qty - 1, 0, slider.max);
    renderAll();
  });

  incBtn.addEventListener("click", () => {
    state.qty[service.id] = clampInt(qty + 1, 0, slider.max);
    renderAll();
  });

  return row;
}

function renderItems() {
  const container = state.mode === "FBA" ? $("#itemsFba") : $("#itemsFbm");
  container.innerHTML = "";
  for (const s of currentServices()) container.appendChild(renderItem(s));
}

function renderSummary() {
  const rowsEl = $("#summaryRows");
  rowsEl.innerHTML = "";

  const lines = [];
  for (const s of currentServices()) {
    const qty = state.qty[s.id] ?? 0;
    if (qty <= 0) continue;
    const { unitPrice, tierLabel, subtotal } = computeLine(s, qty);
    lines.push({ s, qty, unitPrice, tierLabel, subtotal });
  }

  let grand = 0;
  for (const l of lines) grand += l.subtotal;

  $("#grandTotal").textContent = formatMoney(grand);
  $("#downloadPdfBtn").disabled = grand <= 0;
  renderCompetitors(grand, lines);

  if (lines.length === 0) {
    const empty = document.createElement("div");
    empty.className = "finePrint";
    empty.style.padding = "10px 0";
    empty.textContent = "Add quantities to see a breakdown.";
    rowsEl.appendChild(empty);
    return;
  }

  for (const l of lines) {
    const row = document.createElement("div");
    row.className = "sumRow";
    const tierText = l.s.kind === "tiered" ? ` • Tier ${l.tierLabel || "-"}` : "";
    row.innerHTML = `
      <div class="sumName">
        <div class="sumTop">${escapeHtml(l.s.name)} <span class="badge">${escapeHtml(l.s.mode)}</span></div>
        <div class="sumBottom">${l.qty} × ${formatMoney(l.unitPrice)} / ${escapeHtml(l.s.unit)}${escapeHtml(tierText)}</div>
      </div>
      <div class="right money">${formatMoney(l.subtotal)}</div>
    `;
    rowsEl.appendChild(row);
  }
}

function computeCompetitorTotal(multiplier, lines) {
  let total = 0;
  for (const l of lines) {
    // Compare against the same tier/unit price PSF is using for the selected quantities.
    total += l.qty * l.unitPrice * multiplier;
  }
  return total;
}

function renderCompetitors(ourTotal, lines) {
  const wrap = $("#competitors");
  const rows = $("#competitorRows");
  if (!wrap || !rows) return;

  if (!lines.length || ourTotal <= 0) {
    wrap.classList.add("isHidden");
    rows.innerHTML = "";
    return;
  }

  wrap.classList.remove("isHidden");
  rows.innerHTML = "";

  for (const c of COMPETITORS) {
    const competitorTotal = computeCompetitorTotal(c.multiplier, lines);
    const savings = Math.max(0, competitorTotal - ourTotal);

    const row = document.createElement("div");
    row.className = "compareRow";
    row.innerHTML = `
      <div>
        <div class="compareName">${escapeHtml(c.name)}</div>
        <div class="compareSub">Competitor total: ${formatMoney(competitorTotal)}</div>
      </div>
      <div class="saveChip">You save ${formatMoney(savings)}</div>
    `;
    rows.appendChild(row);
  }
}

function renderAll() {
  renderItems();
  renderSummary();
}

function toggleDetails() {
  state.detailsOpen = !state.detailsOpen;
  $("#summaryDetails").style.display = state.detailsOpen ? "block" : "none";
  $("#toggleDetailsBtn").setAttribute("aria-expanded", String(state.detailsOpen));
  $("#toggleDetailsBtn").textContent = state.detailsOpen ? "Hide details" : "Show details";
}

function resetAll() {
  for (const k of Object.keys(state.qty)) state.qty[k] = 0;
  renderAll();
}

function buildPdfData() {
  const items = [];
  for (const s of currentServices()) {
    const qty = state.qty[s.id] ?? 0;
    if (qty <= 0) continue;
    const { unitPrice, tierLabel, subtotal, warning } = computeLine(s, qty);
    items.push({
      name: s.name,
      qty,
      unit: s.unit,
      unitPrice,
      tier: s.kind === "tiered" ? tierLabel : "",
      subtotal,
      warning,
    });
  }
  const total = items.reduce((acc, x) => acc + x.subtotal, 0);
  return { items, total };
}

async function downloadPdf() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert("PDF library not loaded yet. Please try again in a moment.");
    return;
  }

  const { items, total } = buildPdfData();
  if (items.length === 0) return;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const now = new Date();
  const dateStr = now.toLocaleString();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Prep Services FBA — Quote", margin, 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Mode: ${state.mode}  |  Size: Small Standard`, margin, 84);
  doc.text(`Generated: ${dateStr}`, margin, 98);

  let y = 128;

  // Table header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Item", margin, y);
  doc.text("Qty", pageW - margin - 220, y, { align: "right" });
  doc.text("Unit Price", pageW - margin - 140, y, { align: "right" });
  doc.text("Subtotal", pageW - margin, y, { align: "right" });

  doc.setDrawColor(200);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 8, pageW - margin, y + 8);
  y += 26;

  doc.setFont("helvetica", "normal");
  const rowH = 18;

  for (const it of items) {
    if (y > pageH - margin - 80) {
      doc.addPage();
      y = margin;
    }

    const leftText = it.tier ? `${it.name} (Tier ${it.tier})` : it.name;
    const unitPriceTxt = `$${it.unitPrice.toFixed(2)} / ${it.unit}`;
    const subtotalTxt = `$${it.subtotal.toFixed(2)}`;

    doc.text(leftText, margin, y);
    doc.text(String(it.qty), pageW - margin - 220, y, { align: "right" });
    doc.text(unitPriceTxt, pageW - margin - 140, y, { align: "right" });
    doc.text(subtotalTxt, pageW - margin, y, { align: "right" });
    y += rowH;

    if (it.warning) {
      doc.setTextColor(180, 60, 60);
      doc.setFontSize(9);
      doc.text(`Note: ${it.warning}`, margin, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      y += rowH - 2;
    }
  }

  doc.setDrawColor(200);
  doc.line(margin, y + 8, pageW - margin, y + 8);
  y += 30;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", pageW - margin - 140, y, { align: "right" });
  doc.text(`$${total.toFixed(2)}`, pageW - margin, y, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "This is an estimate. Final pricing may vary based on item condition, special handling, or custom requests.",
    margin,
    pageH - margin,
    { maxWidth: pageW - margin * 2 }
  );

  const safeMode = state.mode.toLowerCase();
  doc.save(`psf-quote-${safeMode}.pdf`);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function init() {
  $("#tabFba").addEventListener("click", () => setMode("FBA"));
  $("#tabFbm").addEventListener("click", () => setMode("FBM"));
  $("#toggleDetailsBtn").addEventListener("click", toggleDetails);
  $("#resetBtn").addEventListener("click", resetAll);
  $("#downloadPdfBtn").addEventListener("click", downloadPdf);

  // First render
  setMode(DEFAULT_MODE);
  $("#summaryDetails").style.display = state.detailsOpen ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", init);


