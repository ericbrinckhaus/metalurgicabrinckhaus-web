/**
 * pdf-generator.js
 * Builds a branded PDF from a quote, using jsPDF (loaded from CDN in index.html).
 * Layout is modeled after the company's existing "PRESUPUESTO" template:
 * logo + header block, a dark-blue title bar per item, a details block,
 * and a light footer bar with the item total.
 */
(function (global) {
  "use strict";

  const COLOR_PRIMARY = [18, 73, 107]; // #12496b
  const COLOR_PRIMARY_LIGHT_BG = [235, 241, 245];
  const COLOR_TEXT = [30, 40, 46];
  const COLOR_MUTED = [100, 115, 123];
  const PAGE_MARGIN = 40;

  async function buildQuotePDF(quote, settings) {
    const { jsPDF } = global.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - PAGE_MARGIN * 2;
    let y = PAGE_MARGIN;

    // ---- Header: logo + company info (left), title + meta (right) ----
    const headerTop = y;
    // Use the uploaded logo if there is one; otherwise fall back to the
    // bundled default PNG (converted to base64, since that's what
    // jsPDF.addImage needs).
    let logoDataUrl = settings.logoBase64;
    if (!logoDataUrl) {
      try {
        logoDataUrl = await Utils.getDefaultLogoBase64();
      } catch (e) {
        console.warn("PDF: could not load default logo", e);
      }
    }
    if (logoDataUrl) {
      const logoFormat = Utils.getImageFormatFromDataUrl(logoDataUrl);
      if (logoFormat) {
        try {
          doc.addImage(logoDataUrl, logoFormat, PAGE_MARGIN, headerTop, 64, 64, undefined, "FAST");
        } catch (e) {
          // If the base64 string isn't a valid image, silently skip it
          // rather than breaking PDF generation.
          console.warn("PDF: could not draw logo", e);
        }
      } else {
        console.warn("PDF: logo format not supported for embedding (only PNG/JPEG), skipping");
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text("PRESUPUESTO", pageWidth - PAGE_MARGIN, headerTop + 16, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_TEXT);
    let metaY = headerTop + 34;
    const metaLines = [];
    metaLines.push(`Fecha: ${Utils.formatDate(quote.date)}`);
    if (quote.quoteNumber) metaLines.push(`N°: ${quote.quoteNumber}`);
    if (settings.address) metaLines.push(settings.address);
    const contactBits = [settings.phone && `Cel.: ${settings.phone}`, settings.email].filter(Boolean);
    metaLines.push(...contactBits);
    metaLines.forEach((line) => {
      doc.text(line, pageWidth - PAGE_MARGIN, metaY, { align: "right" });
      metaY += 13;
    });

    y = Math.max(headerTop + 64, metaY) + 14;

    // Company name under logo (left column), if it doesn't fit next to the logo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(settings.name || "", PAGE_MARGIN, y);
    y += 16;

    // Divider
    doc.setDrawColor(...COLOR_PRIMARY);
    doc.setLineWidth(1.5);
    doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += 20;

    // ---- Client line ----
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_TEXT);
    doc.text(`Cliente: ${quote.clientName || "-"}`, PAGE_MARGIN, y);
    y += 22;

    // ---- Items ----
    (quote.items || []).forEach((item) => {
      y = ensureSpace(doc, y, 90, pageHeight);

      // Title bar
      doc.setFillColor(...COLOR_PRIMARY);
      doc.rect(PAGE_MARGIN, y, contentWidth, 26, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(255, 255, 255);
      doc.text((item.title || "").toUpperCase(), PAGE_MARGIN + 12, y + 17.5);
      y += 26;

      // Details block. Lines starting with "-" render as bold subsection
      // headings (e.g. "- Materiales" / "- Mano de obra"); every other
      // line renders as a bullet point.
      const detailLines = Utils.parseDetailLines(item.details);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_TEXT);
      let blockTop = y + 16;
      detailLines.forEach((line, idx) => {
        blockTop = ensureSpace(doc, blockTop, 16, pageHeight);
        if (line.type === "heading") {
          if (idx > 0) blockTop += 4; // a little breathing room above a new subsection
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          doc.setTextColor(...COLOR_PRIMARY);
          const wrapped = doc.splitTextToSize(line.text, contentWidth - 24);
          doc.text(wrapped, PAGE_MARGIN + 12, blockTop);
          blockTop += wrapped.length * 13.5;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(...COLOR_TEXT);
        } else {
          const wrapped = doc.splitTextToSize(`• ${line.text}`, contentWidth - 24);
          doc.text(wrapped, PAGE_MARGIN + 12, blockTop);
          blockTop += wrapped.length * 13;
        }
      });
      if (detailLines.length === 0) blockTop += 4;
      y = blockTop + 10;

      // Footer bar with total
      y = ensureSpace(doc, y, 30, pageHeight);
      doc.setFillColor(...COLOR_PRIMARY_LIGHT_BG);
      doc.rect(PAGE_MARGIN, y, contentWidth, 28, "F");
      const qty = Number(item.quantity) || 1;
      const total = Utils.computeItemTotal(item);
      const label = qty > 1 ? `TOTAL: ${Utils.formatMoney(total)} (${qty} x ${Utils.formatMoney(item.unitPrice)} c/u)` : `TOTAL: ${Utils.formatMoney(total)}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...COLOR_PRIMARY);
      doc.text(label, pageWidth - PAGE_MARGIN - 12, y + 18.5, { align: "right" });
      y += 28 + 16;
    });

    // ---- Grand total ----
    y = ensureSpace(doc, y, 40, pageHeight);
    doc.setDrawColor(...COLOR_PRIMARY);
    doc.setLineWidth(1.5);
    doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
    y += 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(`TOTAL DEL PRESUPUESTO: ${Utils.formatMoney(Utils.computeGrandTotal(quote.items))}`, pageWidth - PAGE_MARGIN, y, { align: "right" });
    y += 26;

    // ---- Notes ----
    if (quote.notes) {
      y = ensureSpace(doc, y, 40, pageHeight);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_MUTED);
      const wrappedNotes = doc.splitTextToSize(quote.notes, contentWidth);
      doc.text(wrappedNotes, PAGE_MARGIN, y);
    }

    return doc;
  }

  function ensureSpace(doc, y, needed, pageHeight) {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      return PAGE_MARGIN;
    }
    return y;
  }

  function fileNameFor(quote) {
    const safeClient = (quote.clientName || "presupuesto").replace(/[^a-z0-9]+/gi, "_");
    return `Presupuesto_${safeClient}.pdf`;
  }

  async function downloadQuotePDF(quote, settings) {
    const doc = await buildQuotePDF(quote, settings);
    doc.save(fileNameFor(quote));
  }

  async function getQuotePDFBlob(quote, settings) {
    const doc = await buildQuotePDF(quote, settings);
    return doc.output("blob");
  }

  global.PDFGenerator = { buildQuotePDF, downloadQuotePDF, getQuotePDFBlob, fileNameFor };
})(window);
