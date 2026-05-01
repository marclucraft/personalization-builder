let _sectionId = 1;
function newSectionId() { return _sectionId++; }

const state = {
  channel: "email",
  source: "dynamic_content",
  csvName: "personalisation",
  lookupExpr: "subscription.external_id",
  multiLang: false,
  feedAlias: "rewards",
  eventName: "order_shipped",
  sections: [
    { id: newSectionId(), section: "reply_to", field: "reply_to", fallback: "support@yourdomain.com", sampleValue: "agent.alice@yourdomain.com" },
    { id: newSectionId(), section: "subject", field: "subject", fallback: "Welcome to your account", sampleValue: "Welcome, Alice!" },
    { id: newSectionId(), section: "body", field: "body", fallback: "Hi there, thanks for being a customer.", sampleValue: "Hi Alice, thanks for being a customer." },
  ],
  sampleIdentity: { external_id: "user_123", language: "en" },
};

const SETTINGS_KEY = "onesignal_personalization_builder_settings";
const settings = {
  appId: "",
  apiKey: "",
  externalId: "",
  templateId: "",
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    Object.assign(settings, JSON.parse(raw));
  } catch { }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { }
}

function clearSettings() {
  settings.appId = settings.apiKey = settings.externalId = settings.templateId = "";
  try { localStorage.removeItem(SETTINGS_KEY); } catch { }
}

function settingsConfigured() {
  return !!(settings.appId && settings.apiKey);
}

function effectiveExternalId() {
  return settings.externalId || state.sampleIdentity.external_id || "user_123";
}
