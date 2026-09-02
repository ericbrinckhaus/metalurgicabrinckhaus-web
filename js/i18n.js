/**
 * i18n.js
 * Very small translation helper. Spanish is the default and only language
 * exposed in the main UI. English is kept for a possible future toggle
 * (see the low-key button in the Settings view).
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "lbq_lang";

  const dictionaries = {
    es: {
      app_title: "Presupuestos",
      search_placeholder: "Buscar por cliente o N°...",
      empty_state: "Todavía no creaste ningún presupuesto. Tocá el botón + para empezar.",
      new_quote_title: "Nuevo presupuesto",
      edit_quote_title: "Editar presupuesto",
      quote_number: "N° de presupuesto",
      date: "Fecha",
      client_name: "Cliente",
      client_phone: "Teléfono del cliente",
      client_email: "Email del cliente",
      items: "Ítems del presupuesto",
      add_item: "+ Agregar ítem",
      item_title: "Descripción del ítem",
      item_title_ph: "Ej: Rejilla 40x40 cm",
      item_details: "Detalle (materiales, mano de obra, etc.)",
      item_details_ph: "Una línea por punto. Si una línea empieza con guion (-) se muestra como subtítulo en negrita, ej:\n- Materiales\nÁngulo de 1 pulgada x 1/8\nHierro redondo de 5/16\n- Mano de obra\nCorte y armado\nPintura al horno",
      quantity: "Cantidad",
      unit_price: "Precio unitario",
      item_total: "Total del ítem",
      grand_total: "Total del presupuesto",
      notes: "Notas / condiciones de pago",
      cancel: "Cancelar",
      save: "Guardar",
      quote_detail: "Presupuesto",
      edit: "Editar",
      download_pdf: "Descargar PDF",
      share: "Compartir",
      delete: "Eliminar",
      settings: "Ajustes de la empresa",
      company_name: "Nombre de la empresa",
      company_address: "Dirección",
      company_phone: "Teléfono",
      company_email: "Email",
      company_logo: "Logo de la empresa",
      use_default_logo: "Usar logo por defecto",
      confirm_delete: "¿Eliminar este presupuesto? Esta acción no se puede deshacer.",
      toast_saved: "Presupuesto guardado",
      toast_deleted: "Presupuesto eliminado",
      toast_settings_saved: "Ajustes guardados",
      toast_logo_error: "No se pudo leer el archivo de imagen",
      toast_client_required: "Ingresá el nombre del cliente",
      toast_item_required: "Agregá al menos un ítem con descripción",
      share_fallback_text: "Presupuesto para",
      share_no_support: "No se pudo compartir directamente. Se descargó el PDF, podés adjuntarlo manualmente.",
      each: "c/u"
    },
    en: {
      app_title: "Quotes",
      search_placeholder: "Search by client or #...",
      empty_state: "You haven't created any quotes yet. Tap + to start.",
      new_quote_title: "New quote",
      edit_quote_title: "Edit quote",
      quote_number: "Quote #",
      date: "Date",
      client_name: "Client",
      client_phone: "Client phone",
      client_email: "Client email",
      items: "Quote items",
      add_item: "+ Add item",
      item_title: "Item description",
      item_title_ph: "E.g: 40x40 cm grille",
      item_details: "Details (materials, labor, etc.)",
      item_details_ph: "One line per point. A line starting with a dash (-) becomes a bold subheading, e.g:\n- Materials\n1-inch x 1/8 angle iron\n5/16 round bar\n- Labor\nCutting and assembly\nOven-baked paint",
      quantity: "Quantity",
      unit_price: "Unit price",
      item_total: "Item total",
      grand_total: "Quote total",
      notes: "Notes / payment terms",
      cancel: "Cancel",
      save: "Save",
      quote_detail: "Quote",
      edit: "Edit",
      download_pdf: "Download PDF",
      share: "Share",
      delete: "Delete",
      settings: "Company settings",
      company_name: "Company name",
      company_address: "Address",
      company_phone: "Phone",
      company_email: "Email",
      company_logo: "Company logo",
      use_default_logo: "Use default logo",
      confirm_delete: "Delete this quote? This cannot be undone.",
      toast_saved: "Quote saved",
      toast_deleted: "Quote deleted",
      toast_settings_saved: "Settings saved",
      toast_logo_error: "Couldn't read the image file",
      toast_client_required: "Enter the client's name",
      toast_item_required: "Add at least one item with a description",
      share_fallback_text: "Quote for",
      share_no_support: "Couldn't share directly. The PDF was downloaded, you can attach it manually.",
      each: "each"
    }
  };

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || "es";
  }

  function setLang(lang) {
    if (!dictionaries[lang]) lang = "es";
    localStorage.setItem(STORAGE_KEY, lang);
    applyTranslations();
    document.documentElement.setAttribute("lang", lang);
  }

  function t(key) {
    const lang = getLang();
    return (dictionaries[lang] && dictionaries[lang][key]) || dictionaries.es[key] || key;
  }

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
  }

  global.I18n = { t, getLang, setLang, applyTranslations };
})(window);
