function renderChannelOptions() {
  const root = document.getElementById("channel-options");
  root.innerHTML = "";
  for (const [key, ch] of Object.entries(CHANNELS)) {
    root.appendChild(el("button", {
      class: "pill" + (state.channel === key ? " selected" : ""),
      onclick: () => { state.channel = key; ensureValid(); renderAll(); }
    }, [el("span", {}, ch.label), el("span", { class: "pill-sub" }, ch.sub)]));
  }
}

function renderSourceOptions() {
  const root = document.getElementById("source-options");
  root.innerHTML = "";
  for (const [key, src] of Object.entries(SOURCES)) {
    const supported = src.supportedChannels.includes(state.channel);
    const cls = "pill" + (state.source === key ? " selected" : "") + (!supported ? " disabled" : "");
    root.appendChild(el("button", {
      class: cls,
      onclick: () => { if (!supported) return; state.source = key; ensureValid(); renderAll(); }
    }, [el("span", {}, src.label), el("span", { class: "pill-sub" }, supported ? src.sub : "Not on " + CHANNELS[state.channel].label)]));
  }
  const src = SOURCES[state.source];
  const banner = document.getElementById("source-banner");
  banner.innerHTML = "";
  banner.appendChild(infoBanner(src.description));
  if (src.notesByChannel && src.notesByChannel[state.channel]) banner.appendChild(warnBanner(src.notesByChannel[state.channel]));
  if (CHANNELS[state.channel].note && state.channel === "inapp") banner.appendChild(warnBanner(CHANNELS[state.channel].note));
}

function renderSourceConfig() {
  const root = document.getElementById("source-config");
  root.innerHTML = "";
  const make = (label, key, opts = {}) => {
    const wrap = el("label", { class: "field" }, [el("span", {}, label)]);
    const input = el("input", { type: "text", value: state[key] != null ? state[key] : "", placeholder: opts.placeholder || "" });
    input.addEventListener("input", e => { state[key] = e.target.value; renderOutput(); });
    wrap.appendChild(input);
    if (opts.help) wrap.appendChild(el("div", { class: "help" }, opts.help));
    return wrap;
  };
  switch (state.source) {
    case "tags":
      root.appendChild(infoBanner("Each section reads its own tag from the recipient's user record. Add one section per tag."));
      break;
    case "custom_data":
      root.appendChild(infoBanner("custom_data requires a template_id and is sent in the Create Message API request body. All sections share one custom_data object."));
      break;
    case "dynamic_content": {
      root.appendChild(make("CSV file name (without .csv)", "csvName", { placeholder: "personalisation" }));
      root.appendChild(make("Lookup expression", "lookupExpr", {
        placeholder: "subscription.external_id",
        help: "How to identify each recipient. Built-in properties need the dotted form (subscription.external_id, user.external_id, user.language). Tags can use the bare key (e.g. campaign_id) or user.tags.campaign_id."
      }));
      const ml = el("label", { class: "field" }, [el("span", {}, "Layout")]);
      const sel = el("select");
      [["false", "Lookup-key first column (most common)"], ["true", "Multi-language (sections in rows, languages in columns)"]].forEach(([v, l]) => {
        const o = el("option", { value: v }, l);
        if (String(state.multiLang) === v) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", e => {
        state.multiLang = e.target.value === "true";
        if (state.multiLang) {
          state.csvName = "translations"; state.lookupExpr = "user.language";
          state.sections = [
            { id: newSectionId(), section: "subject", field: "section_subject", fallback: "An update from us", sampleValue: "Welcome, Alice!" },
            { id: newSectionId(), section: "body", field: "section_body", fallback: "Thanks for being a customer.", sampleValue: "Hi Alice, thanks for being a customer." },
          ];
        } else {
          state.csvName = "personalisation"; state.lookupExpr = "subscription.external_id";
        }
        renderAll();
      });
      ml.appendChild(sel);
      root.appendChild(ml);
      root.appendChild(infoBanner("external_id is a user property, not a tag. Reference it as subscription.external_id or user.external_id. Bare keys like campaign_id only work when the value is a tag."));
      break;
    }
    case "data_feeds":
      root.appendChild(make("Data Feed alias", "feedAlias", { placeholder: "rewards", help: "Set when you create the Data Feed under Data > Data Feeds." }));
      root.appendChild(warnBanner("Data Feeds are email-only and only available inside Journeys."));
      break;
    case "custom_events":
      root.appendChild(make("Event name", "eventName", { placeholder: "order_shipped" }));
      root.appendChild(infoBanner("The event must trigger Journey entry (or a Wait Until) for properties to be available in the template."));
      break;
  }
}

function renderSectionsList() {
  const root = document.getElementById("sections-list");
  root.innerHTML = "";
  document.getElementById("section-count").textContent = String(state.sections.length);
  const sectionOpts = CHANNELS[state.channel].sections;

  for (const sec of state.sections) {
    const row = el("div", { class: "section-row" });
    const head = el("div", { class: "section-row-head" });

    const sel = el("select");
    const usedByOthers = new Set(state.sections.filter(x => x.id !== sec.id).map(x => x.section));
    for (const opt of sectionOpts) {
      if (usedByOthers.has(opt.value) && opt.value !== sec.section) continue;
      const o = el("option", { value: opt.value }, opt.label);
      if (sec.section === opt.value) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", e => {
      const oldSection = sec.section;
      sec.section = e.target.value;
      if (!sec.field || sec.field === oldSection) sec.field = sec.section;
      renderOutput(); renderSectionsList();
    });
    head.appendChild(sel);

    if (state.sections.length > 1) {
      const rm = el("button", { class: "icon-btn", title: "Remove section" }, "×");
      rm.addEventListener("click", () => {
        state.sections = state.sections.filter(x => x.id !== sec.id);
        renderAll();
      });
      head.appendChild(rm);
    }
    row.appendChild(head);

    const grid = el("div", { class: "section-row-grid" });
    const autoDefault = DEFAULT_FALLBACKS[sec.section] || "—";
    grid.appendChild(fieldInput("Field name (data key)", sec, "field", fieldPlaceholderFor(sec)));
    grid.appendChild(fieldInput("Default fallback (always included)", sec, "fallback", autoDefault,
      `Auto-defaults to "${autoDefault}" if blank, so the message never renders empty.`));
    grid.appendChild(fieldInput("Sample value (for preview)", sec, "sampleValue", "Alice"));
    row.appendChild(grid);

    root.appendChild(row);
  }

  const addBtn = document.getElementById("add-section-btn");
  const used = new Set(state.sections.map(s => s.section));
  const allUsed = sectionOpts.every(o => used.has(o.value));
  if (allUsed) {
    addBtn.disabled = true;
    addBtn.textContent = "All sections for this channel are already added";
    addBtn.style.opacity = "0.5"; addBtn.style.cursor = "not-allowed";
  } else {
    addBtn.disabled = false;
    addBtn.textContent = "+ Add another section";
    addBtn.style.opacity = ""; addBtn.style.cursor = "";
  }
}

function fieldPlaceholderFor(sec) {
  const map = {
    subject: "subject", reply_to: "reply_to", body: "body", title: "title",
    image_url: "image_url", button_url: "button_url", launch_url: "launch_url"
  };
  return map[sec.section] || sec.section;
}

function fieldInput(label, obj, key, placeholder, helpText) {
  const wrap = el("label", { class: "field" }, [el("span", {}, label)]);
  const input = el("input", { type: "text", value: obj[key] != null ? obj[key] : "", placeholder });
  input.addEventListener("input", e => { obj[key] = e.target.value; renderOutput(); });
  wrap.appendChild(input);
  if (helpText) wrap.appendChild(el("div", { class: "help" }, helpText));
  return wrap;
}

function renderScenarios() {
  const root = document.getElementById("scenarios");
  root.innerHTML = "";
  for (const sc of SCENARIOS) {
    root.appendChild(el("button", {
      class: "scenario-btn",
      onclick: () => { sc.apply(state); renderAll(); }
    }, sc.label));
  }
}

function labelForSection(channelKey, sectionValue) {
  const sec = CHANNELS[channelKey].sections.find(s => s.value === sectionValue);
  return sec ? sec.label : sectionValue;
}

function buildExplanation() {
  let msg;
  switch (state.source) {
    case "tags": msg = "user.tags.<key> reads the tag from the user receiving the message. Each section ships with a default fallback so blank values never render."; break;
    case "custom_data": msg = "Each section reads a key from the custom_data object on the Create Message API request. Requires a template_id."; break;
    case "dynamic_content": msg = state.multiLang
      ? `Looks up each section's row in ${state.csvName}.csv, then picks the column matching ${state.lookupExpr}.`
      : `Looks up the row in ${state.csvName}.csv where the first column matches ${state.lookupExpr} for the recipient, then returns each section's column. ${state.lookupExpr} is a built-in user property, not a tag.`;
      break;
    case "data_feeds": msg = `data_feed.${state.feedAlias} is the alias on your Data Feed. Each section reads a field off the JSON response.`; break;
    case "custom_events": msg = `Each section reads a property off the ${state.eventName} event that triggered the Journey.`; break;
  }
  return infoBanner(msg);
}

function metaRow(label, value) {
  return el("div", { class: "preview-meta-row" }, [
    el("div", { class: "preview-meta-label" }, label),
    el("div", { class: "preview-meta-value" }, value),
  ]);
}

function renderPreviewWidget(rendered) {
  switch (state.channel) {
    case "email": {
      const get = (k, fb) => rendered[k] != null ? rendered[k] : fb;
      const box = el("div", { class: "preview-box email" });
      const meta = el("div", { class: "preview-meta" });
      meta.appendChild(metaRow("From", "sender@yourdomain.com"));
      meta.appendChild(metaRow("Reply-to", get("reply_to", "support@yourdomain.com")));
      meta.appendChild(metaRow("Subject", get("subject", "(no subject)")));
      if (rendered.preheader) meta.appendChild(metaRow("Preheader", rendered.preheader));
      box.appendChild(meta);
      const body = el("div", { class: "preview-body" });
      body.textContent = get("body", "(no body)");
      if (rendered.image_url) body.appendChild(el("div", { class: "help" }, `[Image src] ${rendered.image_url}`));
      if (rendered.button_url) body.appendChild(el("div", { class: "help" }, `[Button href] ${rendered.button_url}`));
      box.appendChild(body);
      return box;
    }
    case "push": {
      const box = el("div", { class: "preview-box" });
      box.appendChild(el("div", { html: `<strong>${escapeHtml(rendered.title || "(no title)")}</strong>` }));
      if (rendered.subtitle) box.appendChild(el("div", { html: `<span style="color:#667085">${escapeHtml(rendered.subtitle)}</span>` }));
      box.appendChild(el("div", {}, rendered.body || "(no body)"));
      if (rendered.image_url) box.appendChild(el("div", { class: "help" }, `[Image] ${rendered.image_url}`));
      if (rendered.launch_url) box.appendChild(el("div", { class: "help" }, `[Launch URL] ${rendered.launch_url}`));
      return box;
    }
    case "sms": {
      const box = el("div", { class: "preview-box" });
      box.textContent = rendered.body || "(no body)";
      return box;
    }
    case "inapp":
    case "live": {
      const box = el("div", { class: "preview-box" });
      for (const [k, v] of Object.entries(rendered)) {
        box.appendChild(el("div", { class: "help" }, `[${k}]`));
        box.appendChild(el("div", {}, v));
      }
      return box;
    }
  }
  return el("div", {}, "");
}

async function renderOutput() {
  const liquidRoot = document.getElementById("liquid-output");
  liquidRoot.innerHTML = "";
  for (const sec of state.sections) {
    const tpl = liquidForSection(state, sec);
    liquidRoot.appendChild(codeBlock({
      label: `${CHANNELS[state.channel].label} → ${labelForSection(state.channel, sec.section)}`,
      code: tpl,
    }));
  }
  if (state.sections.length > 1) {
    const combined = state.sections.map(sec =>
      `// ${labelForSection(state.channel, sec.section)}\n${liquidForSection(state, sec)}`
    ).join("\n\n");
    liquidRoot.appendChild(codeBlock({ label: "All sections (combined)", code: combined }));
  }
  liquidRoot.appendChild(buildExplanation());

  const setupRoot = document.getElementById("setup-output");
  setupRoot.innerHTML = "";
  for (const block of generateSetup(state)) setupRoot.appendChild(codeBlock(block));

  const previewRoot = document.getElementById("preview-output");
  previewRoot.innerHTML = "";
  const { rendered } = await buildChannelPreview(state);
  previewRoot.appendChild(renderPreviewWidget(rendered));

  const docRoot = document.getElementById("doc-links");
  docRoot.innerHTML = "";
  const links = [
    { label: "Personalization overview", url: "https://documentation.onesignal.com/docs/en/message-personalization" },
    { label: "Using Liquid syntax", url: "https://documentation.onesignal.com/docs/en/using-liquid-syntax" },
    ...SOURCES[state.source].docs,
  ];
  for (const lnk of links) docRoot.appendChild(el("a", { href: lnk.url, target: "_blank", class: "doc-link" }, lnk.label));

  renderApiSection();
}

function ensureValid() {
  const src = SOURCES[state.source];
  if (!src.supportedChannels.includes(state.channel)) {
    state.source = Object.keys(SOURCES).find(k => SOURCES[k].supportedChannels.includes(state.channel)) || state.source;
  }
  const validSections = CHANNELS[state.channel].sections.map(s => s.value);
  for (const sec of state.sections) {
    if (!validSections.includes(sec.section)) sec.section = validSections[0];
  }
  if (state.sections.length === 0) addSection();
}

function addSection() {
  const validSections = CHANNELS[state.channel].sections.map(s => s.value);
  const used = new Set(state.sections.map(s => s.section));
  const sectionType = validSections.find(v => !used.has(v));
  if (!sectionType) return;
  state.sections.push({
    id: newSectionId(), section: sectionType, field: sectionType,
    fallback: DEFAULT_FALLBACKS[sectionType] || "", sampleValue: "Sample value"
  });
}
