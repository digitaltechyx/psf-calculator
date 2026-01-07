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
      { min: 0, max: 50, price: 0.99, label: "0–50" },
      { min: 51, max: 500, price: 0.84, label: "51–500" },
      { min: 501, max: 1000, price: 0.6, label: "501–1000" },
      { min: 1001, price: 0.49, label: "1001+" },
    ],
    slider: { min: 0, max: 1000, step: 1, marks: [0, 1000] },
    note: "Includes Receiving, FNSKU, Box Label, Forwarding (Small Standard).",
  },
  {
    id: "fba_number_of_packs",
    name: "Number of Packs",
    unit: "pack",
    mode: "FBA",
    kind: "tiered",
    tiers: [
      { min: 0, max: 0, price: 0, label: "0" },
      { min: 1, max: 1, price: 0, label: "1" },
      { min: 2, max: 3, price: 0.25, label: "2–3" },
      { min: 4, max: 5, price: 0.50, label: "4–5" },
      { min: 6, max: 7, price: 1.25, label: "6–7" },
      { min: 8, max: 9, price: 1.50, label: "8–9" },
      { min: 10, max: 11, price: 2.50, label: "10–11" },
      { min: 12, price: 2.50, label: "12+" },
    ],
    slider: { min: 0, max: 12, step: 1, marks: [0, 12] },
  },
  { id: "fba_bubble_wrap", name: "Bubble Wrap", unit: "ft", mode: "FBA", kind: "flat", price: 0.35, slider: { min: 0, max: 1000, step: 1, marks: [0, 1000] } },
  { id: "fba_monthly_storage_unit", name: "Monthly Storage", unit: "unit", mode: "FBA", kind: "flat", price: 0.35, slider: { min: 0, max: 5000, step: 1, marks: [0, 5000] } },
  { id: "fba_monthly_storage_pallet", name: "Monthly Storage", unit: "pallet", mode: "FBA", kind: "flat", price: 40, slider: { min: 0, max: 50, step: 1, marks: [0, 50] } },
  { id: "fba_sticker_removal", name: "Sticker Removal", unit: "unit", mode: "FBA", kind: "flat", price: 0.15, slider: { min: 0, max: 1000, step: 1, marks: [0, 1000] } },
  { id: "fba_warning_label", name: "Warning Label", unit: "label", mode: "FBA", kind: "flat", price: 0.15, slider: { min: 0, max: 1000, step: 1, marks: [0, 1000] } },

  // FBM
  {
    id: "fbm_single_unit",
    name: "Single Unit",
    unit: "unit",
    mode: "FBM",
    kind: "tiered",
    tiers: [
      { min: 0, max: 15, price: 2.25, label: "0–15" },
      { min: 16, max: 25, price: 2.00, label: "16–25" },
      { min: 26, max: 50, price: 1.75, label: "26–50" },
      { min: 51, price: 1.65, label: "51+" },
    ],
    slider: { min: 0, max: 100, step: 1, marks: [0, 100] },
    note: "Small Standard (FBM).",
  },
  {
    id: "fbm_number_of_packs",
    name: "Number of Packs",
    unit: "pack",
    mode: "FBM",
    kind: "tiered",
    tiers: [
      { min: 0, max: 0, price: 0, label: "0" },
      { min: 1, max: 1, price: 0, label: "1" },
      { min: 2, max: 3, price: 0.25, label: "2–3" },
      { min: 4, max: 5, price: 0.50, label: "4–5" },
      { min: 6, max: 7, price: 1.25, label: "6–7" },
      { min: 8, max: 9, price: 1.50, label: "8–9" },
      { min: 10, max: 11, price: 2.50, label: "10–11" },
      { min: 12, price: 2.50, label: "12+" },
    ],
    slider: { min: 0, max: 12, step: 1, marks: [0, 12] },
  },
  { id: "fbm_monthly_storage_pallet", name: "Monthly Storage", unit: "pallet", mode: "FBM", kind: "flat", price: 40, slider: { min: 0, max: 50, step: 1, marks: [0, 50] } },
  { id: "fbm_storage_per_unit", name: "Monthly Storage", unit: "unit", mode: "FBM", kind: "flat", price: 0.35, slider: { min: 0, max: 5000, step: 1, marks: [0, 5000] } },
  { id: "fbm_pallet_handling", name: "Pallet Handling", unit: "pallet", mode: "FBM", kind: "flat", price: 45, slider: { min: 0, max: 50, step: 1, marks: [0, 50] } },
  { id: "fbm_sticker_removal", name: "Sticker Removal", unit: "unit", mode: "FBM", kind: "flat", price: 0.15, slider: { min: 0, max: 1000, step: 1, marks: [0, 1000] } },
  { id: "fbm_warning_label", name: "Warning Label", unit: "label", mode: "FBM", kind: "flat", price: 0.15, slider: { min: 0, max: 1000, step: 1, marks: [0, 1000] } },
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
  qty: Object.fromEntries(SERVICES.map((s) => {
    if (s.kind === "progressive") {
      return [s.id, s.slider?.min ?? 1];
    }
    // For other services, use slider min if defined, otherwise 0
    return [s.id, s.slider?.min ?? 0];
  })),
  detailsOpen: true,
};

function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? Math.round(n) : 0;
  return Math.min(max, Math.max(min, x));
}

function formatMoney(n) {
  return `$${n.toFixed(2)}`;
}

function getTierForQty(tiers, qty) {
  // Check tiers in order - each tier has exclusive boundaries
  // 0-50, 51-500, 501-1000, 1001+
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
  } else if (service.kind === "progressive") {
    // Progressive pricing: 
    // Pack 1: $0.00
    // Pack 2: $0.25
    // Pack 3: $0.50
    // Pack n: $0.25 × (n - 1)
    if (qty > 0) {
      const increment = service.increment ?? 0.25;
      // Price of the last pack (pack qty)
      // Pack 1 = $0, Pack 2 = $0.25, Pack 3 = $0.50, etc.
      unitPrice = qty === 1 ? 0 : increment * (qty - 1);
      tierLabel = `${qty} pack${qty > 1 ? 's' : ''}`;
    } else {
      unitPrice = 0;
    }
  } else {
    const t = getTierForQty(service.tiers ?? [], qty);
    const isNumberOfPacks = service.id === "fba_number_of_packs" || service.id === "fbm_number_of_packs";
    if (!t) {
      // For FBA, if below minimum (0), still charge the first tier price but show warning
      if (service.mode === "FBA" && qty > 0 && qty < 50 && !isNumberOfPacks) {
        const firstTier = service.tiers?.[0];
        if (firstTier) {
          unitPrice = firstTier.price;
          tierLabel = firstTier.label;
          warning = "Below minimum (50+)";
        } else {
          unitPrice = 0;
          tierLabel = "Not in tier";
          warning = "Below minimum (50+)";
        }
      } else {
        unitPrice = 0;
        tierLabel = "Not in tier";
        warning = "";
      }
    } else {
      unitPrice = t.price;
      tierLabel = t.label;
      if (service.mode === "FBA" && qty > 0 && qty < 50 && !isNumberOfPacks) warning = "Below minimum (50+)";
    }
  }

  let subtotal = 0;
  const isNumberOfPacks = service.id === "fba_number_of_packs" || service.id === "fbm_number_of_packs";
  
  if (isNumberOfPacks && qty > 0) {
    // Special calculation for Number of Packs
    const singleUnitId = service.mode === "FBA" ? "fba_single_unit" : "fbm_single_unit";
    const singleUnitQty = Math.round(state.qty[singleUnitId] ?? 0);
    
    if (singleUnitQty > 0) {
      // Calculate number of complete packs: floor(singleUnitQty / numberOfPacksQty)
      const numberOfCompletePacks = Math.floor(singleUnitQty / qty);
      // Get price per pack for the selected number of packs tier
      const t = getTierForQty(service.tiers ?? [], qty);
      const pricePerPack = t ? t.price : 0;
      // Total = number of complete packs × price per pack
      subtotal = numberOfCompletePacks * pricePerPack;
    } else {
      subtotal = 0;
    }
  } else if (service.kind === "progressive" && qty > 0) {
    // Calculate actual total for progressive pricing
    // Total = 0 + 0.25 + 0.50 + ... + 0.25 × (n - 1)
    // Total = 0.25 × (0 + 1 + 2 + ... + (n - 1))
    // Total = 0.25 × (n - 1) × n / 2
    const increment = service.increment ?? 0.25;
    subtotal = increment * (qty - 1) * qty / 2;
  } else {
    subtotal = qty * unitPrice;
  }
  
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
  // Get current quantity from state
  let qty = state.qty[service.id];
  if (typeof qty !== 'number' || !Number.isFinite(qty)) {
    if (service.kind === "progressive") {
      qty = service.slider?.min ?? 1;
    } else {
      // For other services, use slider min if defined, otherwise 0
      qty = service.slider?.min ?? 0;
    }
    state.qty[service.id] = qty;
  }
  qty = Math.round(qty);
  
  const { unitPrice, tierLabel, subtotal, warning } = computeLine(service, qty);
  
  let displayUnitPrice = unitPrice;
  let priceText = "";
  
  if (service.kind === "tiered") {
    const tierBase = service.tiers?.[0]?.price ?? 0;
    displayUnitPrice = qty === 0 ? tierBase : unitPrice;
    priceText = qty === 0
      ? `From ${formatMoney(displayUnitPrice)}/${service.unit}`
      : `${formatMoney(displayUnitPrice)}/${service.unit}`;
  } else if (service.kind === "progressive") {
    const increment = service.increment ?? 0.25;
    if (qty === 0) {
      priceText = `From $0.00/${service.unit}`;
    } else if (qty === 1) {
      priceText = `$0.00/${service.unit}`;
    } else {
      priceText = `${formatMoney(unitPrice)}/${service.unit}`;
    }
  } else {
    priceText = `${formatMoney(displayUnitPrice)}/${service.unit}`;
  }

  const slider = service.slider ?? { min: 0, max: 1000, step: 1 };
  const sliderMin = slider.min;
  const sliderMax = slider.max;
  const sliderStep = slider.step ?? 1;
  const sliderValue = clampInt(qty, sliderMin, sliderMax);
  const marks = slider.marks ?? [];

  const row = document.createElement("div");
  row.className = "itemRow";
  row.dataset.serviceId = service.id;

  row.innerHTML = `
    <div class="itemMain">
      <div class="itemName">
        <span class="truncate">${escapeHtml(service.name)}</span>
      </div>
      <div class="itemMeta">
        <span class="metaStrong">${escapeHtml(priceText)}</span>
        ${service.kind === "tiered" ? `<span>Tier: <span class="metaStrong">${escapeHtml(qty === 0 ? "-" : tierLabel || "-")}</span></span>` : ""}
        ${warning ? `<span class="warn">${escapeHtml(warning)}</span>` : ""}
      </div>
    </div>

    <div class="sliderWrap" aria-label="${escapeHtml(service.name)} slider">
      <div class="qtyControls">
        <button
          type="button"
          class="qtyBtn"
          data-role="qty-decrease"
          data-service-id="${service.id}"
          aria-label="Decrease ${escapeHtml(service.name)} quantity"
          ${qty <= sliderMin ? 'disabled' : ''}
        >−</button>
        <div class="qtySlider">
          <input
            type="range"
            min="${sliderMin}"
            max="${sliderMax}"
            step="${sliderStep}"
            value="${sliderValue}"
            data-role="slider"
            data-service-id="${service.id}"
            aria-label="${escapeHtml(service.name)} quantity"
          />
        </div>
        <button
          type="button"
          class="qtyBtn"
          data-role="qty-increase"
          data-service-id="${service.id}"
          aria-label="Increase ${escapeHtml(service.name)} quantity"
          ${qty >= sliderMax ? 'disabled' : ''}
        >+</button>
      </div>
      ${marks.length > 0 ? `<div class="marks" aria-hidden="true">
        ${marks.map((m) => `<span>${m}</span>`).join("")}
      </div>` : ""}
    </div>
  `;

  const sliderEl = row.querySelector('[data-role="slider"]');
  const decreaseBtn = row.querySelector('[data-role="qty-decrease"]');
  const increaseBtn = row.querySelector('[data-role="qty-increase"]');
  
  // Handle slider input (during drag)
  sliderEl.addEventListener("input", (e) => {
    e.stopPropagation();
    let rawValue = Number(e.target.value);
    
    if (!Number.isFinite(rawValue)) {
      rawValue = sliderValue;
    }
    
    const actualQty = clampInt(Math.round(rawValue), sliderMin, sliderMax);
    
    // Update state with the actual quantity
    state.qty[service.id] = actualQty;
    
    // Update button disabled states
    decreaseBtn.disabled = actualQty <= sliderMin;
    increaseBtn.disabled = actualQty >= sliderMax;
    
    // Only update summary during drag to avoid recreating sliders
    renderSummary();
  });

  // Handle slider change (on release)
  sliderEl.addEventListener("change", (e) => {
    e.stopPropagation();
    let rawValue = Number(e.target.value);
    
    if (!Number.isFinite(rawValue)) {
      rawValue = sliderValue;
    }
    
    const actualQty = clampInt(Math.round(rawValue), sliderMin, sliderMax);
    
    // Update state with the actual quantity
    state.qty[service.id] = actualQty;
    
    // Render everything to update all displays
    renderAll();
  });

  // Plus/Minus button event listeners
  decreaseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    let currentQty = state.qty[service.id] ?? sliderMin;
    currentQty = Math.max(sliderMin, currentQty - sliderStep);
    state.qty[service.id] = currentQty;
    renderAll();
  });

  increaseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    let currentQty = state.qty[service.id] ?? sliderMin;
    currentQty = Math.min(sliderMax, currentQty + sliderStep);
    state.qty[service.id] = currentQty;
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
    // Ensure we're reading the exact value from state
    let qty = state.qty[s.id];
    if (typeof qty !== 'number' || !Number.isFinite(qty)) {
      qty = 0;
    }
    qty = Math.round(qty);
    // Skip items with no quantity (progressive services start at 1, so qty >= 1 is valid)
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
    let detailText = "";
    const isNumberOfPacks = l.s.id === "fba_number_of_packs" || l.s.id === "fbm_number_of_packs";
    
    if (isNumberOfPacks && l.qty > 0) {
      // Special display for Number of Packs
      const singleUnitId = l.s.mode === "FBA" ? "fba_single_unit" : "fbm_single_unit";
      const singleUnitQty = Math.round(state.qty[singleUnitId] ?? 0);
      const selectedPackSize = l.qty; // The selected number of packs from the slider
      if (singleUnitQty > 0) {
        const numberOfCompletePacks = Math.floor(singleUnitQty / l.qty);
        const pricePerPack = l.unitPrice;
        detailText = `${numberOfCompletePacks} packs (pack size: ${selectedPackSize}) × ${formatMoney(pricePerPack)} = ${formatMoney(l.subtotal)}`;
      } else {
        detailText = `Pack size: ${selectedPackSize} selected`;
      }
    } else if (l.s.kind === "tiered") {
      detailText = `${l.qty} × ${formatMoney(l.unitPrice)} / ${escapeHtml(l.s.unit)} • Tier ${l.tierLabel || "-"}`;
    } else if (l.s.kind === "progressive") {
      // For progressive, show simple calculation
      detailText = `${l.qty} pack${l.qty > 1 ? 's' : ''}`;
    } else {
      detailText = `${l.qty} × ${formatMoney(l.unitPrice)} / ${escapeHtml(l.s.unit)}`;
    }
    row.innerHTML = `
      <div class="sumName">
        <div class="sumTop">${escapeHtml(l.s.name)} <span class="badge">${escapeHtml(l.s.mode)}</span></div>
        <div class="sumBottom">${detailText}</div>
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
      <div class="compareName">${escapeHtml(c.name)}</div>
      <div class="compareSub">${formatMoney(competitorTotal)}</div>
      <div class="saveChip">Save ${formatMoney(savings)}</div>
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
  for (const s of SERVICES) {
    if (s.kind === "progressive") {
      state.qty[s.id] = s.slider?.min ?? 1;
    } else {
      // For other services, use slider min if defined, otherwise 0
      state.qty[s.id] = s.slider?.min ?? 0;
    }
  }
  renderAll();
}

function buildPdfData() {
  const items = [];
  for (const s of currentServices()) {
    const qty = state.qty[s.id] ?? 0;
    if (qty <= 0) continue;
    const { unitPrice, tierLabel, subtotal, warning } = computeLine(s, qty);
    const isNumberOfPacks = s.id === "fba_number_of_packs" || s.id === "fbm_number_of_packs";
    
    let displayQty = qty;
    if (isNumberOfPacks) {
      // For Number of Packs, show the number of complete packs calculated
      const singleUnitId = s.mode === "FBA" ? "fba_single_unit" : "fbm_single_unit";
      const singleUnitQty = Math.round(state.qty[singleUnitId] ?? 0);
      if (singleUnitQty > 0) {
        displayQty = Math.floor(singleUnitQty / qty);
      }
    }
    
    items.push({
      name: s.name,
      qty: displayQty,
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


