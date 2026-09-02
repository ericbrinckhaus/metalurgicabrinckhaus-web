/**
 * storage.js
 * All persistence for the prototype lives in localStorage as JSON.
 * Swap this module for real API calls later (see README "next steps") --
 * every other module only talks to Storage.*, never to localStorage directly.
 */
(function (global) {
  "use strict";

  const QUOTES_KEY = "lbq_quotes";
  const SETTINGS_KEY = "lbq_settings";

  const DEFAULT_SETTINGS = {
    name: "Metalúrgica Brinckhaus",
    address: "",
    phone: "",
    email: "",
    // Empty on purpose: the app falls back to the bundled default logo at
    // assets/logo/MB.png until the user uploads a real one in Settings.
    // Once uploaded, this holds a base64 data URL.
    logoBase64: ""
  };

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    // Fallback RFC4122-ish v4 generator for older WebViews
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function safeParse(json, fallback) {
    try {
      const parsed = JSON.parse(json);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      console.error("Storage: failed to parse JSON", e);
      return fallback;
    }
  }

  function getQuotes() {
    const raw = localStorage.getItem(QUOTES_KEY);
    if (!raw) return [];
    return safeParse(raw, []);
  }

  function saveQuotes(list) {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(list));
  }

  function getQuote(id) {
    return getQuotes().find((q) => q.id === id) || null;
  }

  function upsertQuote(quote) {
    const list = getQuotes();
    const idx = list.findIndex((q) => q.id === quote.id);
    quote.updatedAt = new Date().toISOString();
    if (idx === -1) {
      quote.id = quote.id || uuid();
      quote.createdAt = quote.createdAt || quote.updatedAt;
      list.unshift(quote);
    } else {
      list[idx] = quote;
    }
    saveQuotes(list);
    return quote;
  }

  function deleteQuote(id) {
    const list = getQuotes().filter((q) => q.id !== id);
    saveQuotes(list);
  }

  function getSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...safeParse(raw, {}) };
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  global.Storage = {
    uuid,
    getQuotes,
    saveQuotes,
    getQuote,
    upsertQuote,
    deleteQuote,
    getSettings,
    saveSettings
  };
})(window);
