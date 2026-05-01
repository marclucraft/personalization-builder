function renderSettingsUi() {
  document.getElementById("setting-app-id").value = settings.appId || "";
  document.getElementById("setting-api-key").value = settings.apiKey || "";
  document.getElementById("setting-external-id").value = settings.externalId || "";
  document.getElementById("setting-template-id").value = settings.templateId || "";
  const status = document.getElementById("settings-status");
  if (settingsConfigured()) {
    status.textContent = "✓ Connected";
    status.classList.add("connected");
  } else {
    status.textContent = "Not configured";
    status.classList.remove("connected");
  }
}

function wireSettings() {
  const bind = (id, key) => {
    document.getElementById(id).addEventListener("input", e => {
      settings[key] = e.target.value.trim();
      saveSettings(); renderSettingsUi(); renderOutput();
    });
  };
  bind("setting-app-id", "appId");
  bind("setting-api-key", "apiKey");
  bind("setting-external-id", "externalId");
  bind("setting-template-id", "templateId");
  document.getElementById("settings-clear-btn").addEventListener("click", () => {
    if (!confirm("Clear all settings from this browser?")) return;
    clearSettings(); renderSettingsUi(); renderOutput();
  });
}

function wireTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.querySelector(`.tab-content[data-tab="${tab.dataset.tab}"]`).classList.add("active");
    });
  });
}

function renderAll() {
  ensureValid();
  renderChannelOptions();
  renderSourceOptions();
  renderSourceConfig();
  renderSectionsList();
  renderOutput();
}

document.getElementById("add-section-btn").addEventListener("click", () => { addSection(); renderAll(); });

loadSettings();
renderSettingsUi();
wireSettings();
wireTabs();
renderScenarios();
renderAll();
