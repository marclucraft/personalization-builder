function loadExample() {
  const key = `${state.channel}+${state.source}`;
  const ex = EXAMPLES[key];
  if (!ex) return;
  state.csvName = ex.csvName || "personalisation";
  state.lookupExpr = ex.lookupExpr || "subscription.external_id";
  state.multiLang = ex.multiLang || false;
  state.feedAlias = ex.feedAlias || "rewards";
  state.eventName = ex.eventName || "order_shipped";
  state.sections = ex.sections.map(s => ({ ...s, id: newSectionId() }));
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
  loadExample();
  renderChannelOptions();
  renderSourceOptions();
  renderOutput();
}

wireTabs();
renderAll();
