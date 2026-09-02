/**
 * utils.js - small formatting helpers shared by app.js and pdf-generator.js
 */
(function (global) {
  "use strict";

  // Bundled placeholder logo, used whenever no custom logo was uploaded in
  // Settings. Swap this file for the real company logo at any time -- no
  // code change needed, the app just reads whatever PNG is at this path.
  const DEFAULT_LOGO_URL = "assets/logo/MB.png";

  let defaultLogoBase64Cache = null;

  // Reads any same-origin image URL and resolves it to a base64 data URL.
  // Used to turn an uploaded file OR the bundled default logo into the
  // format jsPDF needs (addImage wants a base64 string, not a plain URL).
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function urlToBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return fileToBase64(blob);
  }

  // Cached so we only fetch/convert the bundled default logo once per
  // session, even if it's used both on-screen and in several PDFs.
  async function getDefaultLogoBase64() {
    if (defaultLogoBase64Cache) return defaultLogoBase64Cache;
    try {
      defaultLogoBase64Cache = await urlToBase64(DEFAULT_LOGO_URL);
    } catch (e) {
      // Happens when the app is opened directly from disk (file://) or the
      // asset otherwise fails to fetch -- fall back to the copy embedded
      // in js/logo-default.js so the PDF still gets a logo either way.
      console.warn("Utils: could not fetch default logo, using embedded fallback", e);
      defaultLogoBase64Cache = global.EMBEDDED_DEFAULT_LOGO_BASE64 || null;
    }
    return defaultLogoBase64Cache;
  }

  // jsPDF's addImage needs to know the image format ("PNG"/"JPEG"); it
  // doesn't reliably infer it from the data URL itself. SVG isn't
  // supported by addImage at all, so callers should skip embedding in
  // that case rather than pass a bogus format.
  function getImageFormatFromDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return null;
    const match = dataUrl.match(/^data:image\/(png|jpe?g);base64,/i);
    if (!match) return null;
    return match[1].toLowerCase().startsWith("jpe") ? "JPEG" : "PNG";
  }

  // Splits an item's free-text "details" field into renderable lines, both
  // for the on-screen detail view and the PDF. A line starting with "-" is
  // treated as a bold subsection heading (e.g. "- Materiales"); every
  // other non-empty line is a plain bullet point.
  function parseDetailLines(detailsText) {
    return (detailsText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        if (line.startsWith("-")) {
          return { type: "heading", text: line.replace(/^-+\s*/, "") };
        }
        return { type: "bullet", text: line.startsWith("•") ? line.slice(1).trim() : line };
      });
  }

  function formatMoney(value) {
    const n = Number(value) || 0;
    return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
  }

  function formatDate(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y}`;
  }

  function computeItemTotal(item) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return qty * price;
  }

  function computeGrandTotal(items) {
    return (items || []).reduce((sum, it) => sum + computeItemTotal(it), 0);
  }

  global.Utils = {
    formatMoney,
    formatDate,
    computeItemTotal,
    computeGrandTotal,
    DEFAULT_LOGO_URL,
    fileToBase64,
    urlToBase64,
    getDefaultLogoBase64,
    getImageFormatFromDataUrl,
    parseDetailLines
  };
})(window);
