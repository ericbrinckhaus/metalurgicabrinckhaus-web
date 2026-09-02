/**
 * app.js
 * Main UI controller. Talks to Storage for persistence, PDFGenerator for
 * PDF export, and I18n for text. No framework / build step on purpose so
 * this can be served as-is from GitHub Pages or Cloudflare Pages.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  let editingQuoteId = null; // null => creating a new quote
  let detailQuoteId = null;
  let pendingDeleteId = null;
  let itemRowSeq = 0;
  // Logo currently selected in the Settings form, held in memory until the
  // form is submitted. null means "use the bundled default logo".
  let pendingLogoBase64 = null;

  // ---------------------------------------------------------------------
  // Element refs
  // ---------------------------------------------------------------------
  const el = {
    views: {
      list: document.getElementById("view-list"),
      form: document.getElementById("view-form"),
      detail: document.getElementById("view-detail"),
      settings: document.getElementById("view-settings")
    },
    headerLogo: document.getElementById("header-logo"),
    btnSettings: document.getElementById("btn-settings"),

    searchInput: document.getElementById("search-input"),
    quotesList: document.getElementById("quotes-list"),
    emptyState: document.getElementById("empty-state"),
    btnNewQuote: document.getElementById("btn-new-quote"),

    formTitle: document.getElementById("form-title"),
    quoteForm: document.getElementById("quote-form"),
    fQuoteNumber: document.getElementById("f-quote-number"),
    fDate: document.getElementById("f-date"),
    fClientName: document.getElementById("f-client-name"),
    fClientPhone: document.getElementById("f-client-phone"),
    fClientEmail: document.getElementById("f-client-email"),
    itemsContainer: document.getElementById("items-container"),
    btnAddItem: document.getElementById("btn-add-item"),
    grandTotalDisplay: document.getElementById("grand-total-display"),
    fNotes: document.getElementById("f-notes"),
    btnFormBack: document.getElementById("btn-form-back"),
    btnCancelForm: document.getElementById("btn-cancel-form"),

    detailContent: document.getElementById("detail-content"),
    btnDetailBack: document.getElementById("btn-detail-back"),
    btnDetailEdit: document.getElementById("btn-detail-edit"),
    btnDetailPdf: document.getElementById("btn-detail-pdf"),
    btnDetailShare: document.getElementById("btn-detail-share"),
    btnDetailDelete: document.getElementById("btn-detail-delete"),

    settingsForm: document.getElementById("settings-form"),
    sCompanyName: document.getElementById("s-company-name"),
    sCompanyAddress: document.getElementById("s-company-address"),
    sCompanyPhone: document.getElementById("s-company-phone"),
    sCompanyEmail: document.getElementById("s-company-email"),
    sCompanyLogoFile: document.getElementById("s-company-logo-file"),
    btnRemoveLogo: document.getElementById("btn-remove-logo"),
    logoPreviewWrap: document.getElementById("logo-preview-wrap"),
    logoPreview: document.getElementById("logo-preview"),
    btnSettingsBack: document.getElementById("btn-settings-back"),
    btnLangToggle: document.getElementById("btn-lang-toggle"),

    toast: document.getElementById("toast"),
    confirmModal: document.getElementById("confirm-modal"),
    confirmOk: document.getElementById("confirm-ok"),
    confirmCancel: document.getElementById("confirm-cancel")
  };

  // ---------------------------------------------------------------------
  // View routing
  // ---------------------------------------------------------------------
  function showView(name) {
    Object.entries(el.views).forEach(([key, node]) => {
      node.classList.toggle("active", key === name);
    });
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------
  let toastTimer = null;
  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2600);
  }

  // ---------------------------------------------------------------------
  // Header logo (reflects settings everywhere)
  // ---------------------------------------------------------------------
  function refreshHeaderLogo() {
    const settings = Storage.getSettings();
    el.headerLogo.onerror = () => {
      el.headerLogo.hidden = true;
    };
    el.headerLogo.src = settings.logoBase64 || Utils.DEFAULT_LOGO_URL;
    el.headerLogo.hidden = false;
  }

  // ---------------------------------------------------------------------
  // List view
  // ---------------------------------------------------------------------
  function renderList(filterText) {
    const quotes = Storage.getQuotes();
    const filter = (filterText || "").trim().toLowerCase();
    const filtered = filter
      ? quotes.filter((q) => {
          const haystack = `${q.clientName || ""} ${q.quoteNumber || ""}`.toLowerCase();
          return haystack.includes(filter);
        })
      : quotes;

    el.quotesList.innerHTML = "";
    el.emptyState.hidden = quotes.length > 0;

    if (filtered.length === 0 && quotes.length > 0) {
      const p = document.createElement("p");
      p.className = "empty-state";
      p.textContent = I18n.t("empty_state");
      p.hidden = false;
      el.quotesList.appendChild(p);
      return;
    }

    filtered.forEach((q) => {
      const card = document.createElement("div");
      card.className = "quote-card";
      card.addEventListener("click", () => openDetail(q.id));

      const main = document.createElement("div");
      main.className = "qc-main";
      const clientEl = document.createElement("div");
      clientEl.className = "qc-client";
      clientEl.textContent = q.clientName || "(sin nombre)";
      const metaEl = document.createElement("div");
      metaEl.className = "qc-meta";
      const num = q.quoteNumber ? `N° ${q.quoteNumber} · ` : "";
      metaEl.textContent = `${num}${Utils.formatDate(q.date)}`;
      main.appendChild(clientEl);
      main.appendChild(metaEl);

      const totalEl = document.createElement("div");
      totalEl.className = "qc-total";
      totalEl.textContent = Utils.formatMoney(Utils.computeGrandTotal(q.items));

      card.appendChild(main);
      card.appendChild(totalEl);
      el.quotesList.appendChild(card);
    });
  }

  el.searchInput.addEventListener("input", (e) => renderList(e.target.value));

  // ---------------------------------------------------------------------
  // Item rows (form)
  // ---------------------------------------------------------------------
  function addItemRow(item) {
    itemRowSeq += 1;
    const rowId = `item-${itemRowSeq}`;
    const wrap = document.createElement("div");
    wrap.className = "item-card";
    wrap.dataset.rowId = rowId;

    wrap.innerHTML = `
      <button type="button" class="btn-remove-item" aria-label="Quitar ítem">&times;</button>
      <label class="field">
        <span>${I18n.t("item_title")}</span>
        <input type="text" class="item-title" placeholder="${I18n.t("item_title_ph")}" />
      </label>
      <label class="field">
        <span>${I18n.t("item_details")}</span>
        <textarea class="item-details" rows="3" placeholder="${I18n.t("item_details_ph")}"></textarea>
      </label>
      <div class="item-row">
        <label class="field">
          <span>${I18n.t("quantity")}</span>
          <input type="number" class="item-qty" min="0" step="1" value="1" />
        </label>
        <label class="field">
          <span>${I18n.t("unit_price")}</span>
          <input type="number" class="item-price" min="0" step="1" value="0" />
        </label>
      </div>
      <div class="item-total">${I18n.t("item_total")}: <span class="item-total-value">$0</span></div>
    `;

    const titleInput = wrap.querySelector(".item-title");
    const detailsInput = wrap.querySelector(".item-details");
    const qtyInput = wrap.querySelector(".item-qty");
    const priceInput = wrap.querySelector(".item-price");

    if (item) {
      titleInput.value = item.title || "";
      detailsInput.value = item.details || "";
      qtyInput.value = item.quantity != null ? item.quantity : 1;
      priceInput.value = item.unitPrice != null ? item.unitPrice : 0;
    }

    wrap.querySelector(".btn-remove-item").addEventListener("click", () => {
      wrap.remove();
      updateGrandTotalDisplay();
    });

    [qtyInput, priceInput].forEach((input) => {
      input.addEventListener("input", () => updateItemRowTotal(wrap));
    });

    el.itemsContainer.appendChild(wrap);
    updateItemRowTotal(wrap);
  }

  function updateItemRowTotal(rowEl) {
    const qty = Number(rowEl.querySelector(".item-qty").value) || 0;
    const price = Number(rowEl.querySelector(".item-price").value) || 0;
    rowEl.querySelector(".item-total-value").textContent = Utils.formatMoney(qty * price);
    updateGrandTotalDisplay();
  }

  function updateGrandTotalDisplay() {
    const items = collectItemsFromForm();
    el.grandTotalDisplay.textContent = Utils.formatMoney(Utils.computeGrandTotal(items));
  }

  function collectItemsFromForm() {
    return Array.from(el.itemsContainer.querySelectorAll(".item-card")).map((rowEl) => ({
      title: rowEl.querySelector(".item-title").value.trim(),
      details: rowEl.querySelector(".item-details").value.trim(),
      quantity: Number(rowEl.querySelector(".item-qty").value) || 0,
      unitPrice: Number(rowEl.querySelector(".item-price").value) || 0
    }));
  }

  el.btnAddItem.addEventListener("click", () => addItemRow());

  // ---------------------------------------------------------------------
  // Form view (create / edit)
  // ---------------------------------------------------------------------
  function openForm(quoteId) {
    editingQuoteId = quoteId || null;
    el.itemsContainer.innerHTML = "";

    if (editingQuoteId) {
      const quote = Storage.getQuote(editingQuoteId);
      el.formTitle.textContent = I18n.t("edit_quote_title");
      el.fQuoteNumber.value = quote.quoteNumber || "";
      el.fDate.value = quote.date || todayISO();
      el.fClientName.value = quote.clientName || "";
      el.fClientPhone.value = quote.clientPhone || "";
      el.fClientEmail.value = quote.clientEmail || "";
      el.fNotes.value = quote.notes || "";
      (quote.items || []).forEach((it) => addItemRow(it));
      if ((quote.items || []).length === 0) addItemRow();
    } else {
      el.formTitle.textContent = I18n.t("new_quote_title");
      el.fQuoteNumber.value = nextQuoteNumber();
      el.fDate.value = todayISO();
      el.fClientName.value = "";
      el.fClientPhone.value = "";
      el.fClientEmail.value = "";
      el.fNotes.value = "";
      addItemRow();
    }

    updateGrandTotalDisplay();
    showView("form");
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function nextQuoteNumber() {
    const quotes = Storage.getQuotes();
    const nums = quotes
      .map((q) => parseInt(q.quoteNumber, 10))
      .filter((n) => !Number.isNaN(n));
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return String(next);
  }

  el.btnNewQuote.addEventListener("click", () => openForm(null));
  el.btnFormBack.addEventListener("click", () => showView("list"));
  el.btnCancelForm.addEventListener("click", () => showView("list"));

  el.quoteForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const clientName = el.fClientName.value.trim();
    if (!clientName) {
      toast(I18n.t("toast_client_required"));
      el.fClientName.focus();
      return;
    }

    const items = collectItemsFromForm().filter((it) => it.title);
    if (items.length === 0) {
      toast(I18n.t("toast_item_required"));
      return;
    }

    const quote = {
      id: editingQuoteId || Storage.uuid(),
      quoteNumber: el.fQuoteNumber.value.trim(),
      date: el.fDate.value || todayISO(),
      clientName,
      clientPhone: el.fClientPhone.value.trim(),
      clientEmail: el.fClientEmail.value.trim(),
      items,
      notes: el.fNotes.value.trim()
    };
    if (editingQuoteId) {
      const existing = Storage.getQuote(editingQuoteId);
      quote.createdAt = existing ? existing.createdAt : undefined;
    }

    Storage.upsertQuote(quote);
    toast(I18n.t("toast_saved"));
    renderList(el.searchInput.value);
    openDetail(quote.id);
  });

  // ---------------------------------------------------------------------
  // Detail view
  // ---------------------------------------------------------------------
  function openDetail(id) {
    detailQuoteId = id;
    const quote = Storage.getQuote(id);
    if (!quote) {
      showView("list");
      return;
    }

    const grandTotal = Utils.computeGrandTotal(quote.items);
    const itemsHtml = (quote.items || [])
      .map((it) => {
        const total = Utils.computeItemTotal(it);
        const qtyNote = Number(it.quantity) > 1 ? ` (${it.quantity} x ${Utils.formatMoney(it.unitPrice)} ${I18n.t("each")})` : "";
        const detailsHtml = renderDetailLinesHtml(it.details);
        return `
          <div class="detail-item">
            <div class="detail-item-title">${escapeHtml(it.title)}</div>
            ${detailsHtml}
            <div class="detail-item-total">${Utils.formatMoney(total)}${qtyNote}</div>
          </div>
        `;
      })
      .join("");

    el.detailContent.innerHTML = `
      <h3>${escapeHtml(quote.clientName)}</h3>
      <div class="qc-meta">${quote.quoteNumber ? `N° ${escapeHtml(quote.quoteNumber)} · ` : ""}${Utils.formatDate(quote.date)}</div>
      ${itemsHtml}
      <div class="detail-grand-total"><span>${I18n.t("grand_total")}</span><span>${Utils.formatMoney(grandTotal)}</span></div>
      ${quote.notes ? `<div class="detail-item-details" style="margin-top:14px">${escapeHtml(quote.notes)}</div>` : ""}
    `;

    showView("detail");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  // Renders an item's free-text "details" field as HTML: lines starting
  // with "-" become bold subsection headings, everything else becomes a
  // bullet line. Mirrors the logic in pdf-generator.js so the on-screen
  // detail view matches the PDF.
  function renderDetailLinesHtml(detailsText) {
    const lines = Utils.parseDetailLines(detailsText);
    if (lines.length === 0) return "";
    const rows = lines
      .map((line) =>
        line.type === "heading"
          ? `<div class="detail-subsection-title">${escapeHtml(line.text)}</div>`
          : `<div class="detail-bullet-line">• ${escapeHtml(line.text)}</div>`
      )
      .join("");
    return `<div class="detail-item-details">${rows}</div>`;
  }

  el.btnDetailBack.addEventListener("click", () => showView("list"));
  el.btnDetailEdit.addEventListener("click", () => openForm(detailQuoteId));

  el.btnDetailPdf.addEventListener("click", async () => {
    const quote = Storage.getQuote(detailQuoteId);
    const settings = Storage.getSettings();
    await PDFGenerator.downloadQuotePDF(quote, settings);
  });

  el.btnDetailShare.addEventListener("click", async () => {
    const quote = Storage.getQuote(detailQuoteId);
    const settings = Storage.getSettings();
    const blob = await PDFGenerator.getQuotePDFBlob(quote, settings);
    const fileName = PDFGenerator.fileNameFor(quote);
    const shareText = `${I18n.t("share_fallback_text")} ${quote.clientName} - ${Utils.formatMoney(Utils.computeGrandTotal(quote.items))}`;

    try {
      const file = new File([blob], fileName, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: shareText
        });
        return;
      }
    } catch (err) {
      // User cancelled the native share sheet -- not an error worth reporting.
      if (err && err.name === "AbortError") return;
      console.warn("Share failed, falling back to download", err);
    }

    // Fallback: download the PDF and open WhatsApp Web / email with the
    // summary text pre-filled (native file attachment isn't possible from
    // a plain web link, only through the Web Share API above).
    await PDFGenerator.downloadQuotePDF(quote, settings);
    toast(I18n.t("share_no_support"));
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  });

  el.btnDetailDelete.addEventListener("click", () => {
    pendingDeleteId = detailQuoteId;
    el.confirmModal.classList.remove("hidden");
  });

  el.confirmCancel.addEventListener("click", () => {
    pendingDeleteId = null;
    el.confirmModal.classList.add("hidden");
  });

  el.confirmOk.addEventListener("click", () => {
    if (pendingDeleteId) {
      Storage.deleteQuote(pendingDeleteId);
      toast(I18n.t("toast_deleted"));
    }
    pendingDeleteId = null;
    el.confirmModal.classList.add("hidden");
    renderList(el.searchInput.value);
    showView("list");
  });

  // ---------------------------------------------------------------------
  // Settings view
  // ---------------------------------------------------------------------
  function openSettings() {
    const settings = Storage.getSettings();
    el.sCompanyName.value = settings.name || "";
    el.sCompanyAddress.value = settings.address || "";
    el.sCompanyPhone.value = settings.phone || "";
    el.sCompanyEmail.value = settings.email || "";
    el.sCompanyLogoFile.value = "";
    pendingLogoBase64 = settings.logoBase64 || null;
    updateLogoPreview();
    showView("settings");
  }

  // Preview always shows something: the custom logo if one is set/picked,
  // otherwise the bundled default (assets/logo/MB.png).
  function updateLogoPreview() {
    el.logoPreview.src = pendingLogoBase64 || Utils.DEFAULT_LOGO_URL;
    el.btnRemoveLogo.hidden = !pendingLogoBase64;
  }

  el.sCompanyLogoFile.addEventListener("change", async () => {
    const file = el.sCompanyLogoFile.files && el.sCompanyLogoFile.files[0];
    if (!file) return;
    try {
      pendingLogoBase64 = await Utils.fileToBase64(file);
      updateLogoPreview();
    } catch (err) {
      console.error("Could not read logo file", err);
      toast(I18n.t("toast_logo_error"));
    }
  });

  el.btnRemoveLogo.addEventListener("click", () => {
    pendingLogoBase64 = null;
    el.sCompanyLogoFile.value = "";
    updateLogoPreview();
  });

  el.btnSettings.addEventListener("click", openSettings);
  el.btnSettingsBack.addEventListener("click", () => showView("list"));

  el.settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    Storage.saveSettings({
      name: el.sCompanyName.value.trim(),
      address: el.sCompanyAddress.value.trim(),
      phone: el.sCompanyPhone.value.trim(),
      email: el.sCompanyEmail.value.trim(),
      // Empty string means "no custom logo" -- the rest of the app then
      // falls back to the bundled assets/logo/MB.png automatically.
      logoBase64: pendingLogoBase64 || ""
    });
    toast(I18n.t("toast_settings_saved"));
    refreshHeaderLogo();
    showView("list");
  });

  // Low-key language toggle, intentionally tucked away in Settings.
  el.btnLangToggle.addEventListener("click", () => {
    const next = I18n.getLang() === "es" ? "en" : "es";
    I18n.setLang(next);
    renderList(el.searchInput.value);
  });

  // ---------------------------------------------------------------------
  // Service worker registration (installability + offline shell)
  // ---------------------------------------------------------------------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.warn("Service worker registration failed", err);
      });
    });
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------
  I18n.applyTranslations();
  refreshHeaderLogo();
  renderList("");
  showView("list");
})();
