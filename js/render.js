function renderChannelOptions() {
  const root = document.getElementById("channel-options");
  root.innerHTML = "";
  for (const [key, ch] of Object.entries(CHANNELS)) {
    root.appendChild(el("button", {
      class: "pill" + (state.channel === key ? " selected" : ""),
      onclick: () => { state.channel = key; ensureValid(); loadExample(); renderChannelOptions(); renderSourceOptions(); renderOutput(); }
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
      onclick: () => { if (!supported) return; state.source = key; loadExample(); renderSourceOptions(); renderOutput(); }
    }, [el("span", {}, src.label), el("span", { class: "pill-sub" }, supported ? src.sub : "Not on " + CHANNELS[state.channel].label)]));
  }
  const src = SOURCES[state.source];
  const banner = document.getElementById("source-banner");
  banner.innerHTML = "";
  banner.appendChild(infoBanner(src.description));
  if (src.notesByChannel?.[state.channel]) banner.appendChild(warnBanner(src.notesByChannel[state.channel]));
  if (state.channel === "inapp" && CHANNELS[state.channel].note) banner.appendChild(warnBanner(CHANNELS[state.channel].note));
}

function buildExplanation() {
  const msgs = {
    tags: "Tag keys are referenced directly as {{ tag_name }}. Each field includes a default fallback so blank values never render.",
    custom_data: "Each section reads a key from the custom_data object on the Create Message API request. Requires a template_id.",
    dynamic_content: state.multiLang
      ? `Looks up each section's row in ${state.csvName}.csv, then picks the column matching ${state.lookupExpr}.`
      : `Looks up the row in ${state.csvName}.csv where the first column matches ${state.lookupExpr} for the recipient, then returns each section's column.`,
    data_feeds: `Each field reads from the JSON response your API returns at send time, accessed via the \`${state.feedAlias}\` Data Feed alias.`,
    custom_events: `Each section reads a property off the ${state.eventName} event that triggered the Journey.`,
  };
  return infoBanner(msgs[state.source]);
}

function labelForSection(channelKey, sectionValue) {
  const sec = CHANNELS[channelKey].sections.find(s => s.value === sectionValue);
  return sec ? sec.label : sectionValue;
}

function renderOutput() {
  const liquidRoot = document.getElementById("liquid-output");
  liquidRoot.innerHTML = "";
  for (const sec of state.sections) {
    liquidRoot.appendChild(codeBlock({
      label: `${CHANNELS[state.channel].label} → ${labelForSection(state.channel, sec.section)}`,
      code: liquidForSection(state, sec),
    }));
  }
  liquidRoot.appendChild(buildExplanation());

  const setupRoot = document.getElementById("setup-output");
  setupRoot.innerHTML = "";
  for (const block of generateSetup(state)) setupRoot.appendChild(codeBlock(block));

  const docRoot = document.getElementById("doc-links");
  docRoot.innerHTML = "";
  const links = [
    { label: "Personalization overview", url: "https://documentation.onesignal.com/docs/en/message-personalization" },
    { label: "Using Liquid syntax", url: "https://documentation.onesignal.com/docs/en/using-liquid-syntax" },
    ...SOURCES[state.source].docs,
  ];
  for (const lnk of links) docRoot.appendChild(el("a", { href: lnk.url, target: "_blank", class: "doc-link" }, lnk.label));
}

function ensureValid() {
  const src = SOURCES[state.source];
  if (!src.supportedChannels.includes(state.channel)) {
    state.source = Object.keys(SOURCES).find(k => SOURCES[k].supportedChannels.includes(state.channel)) || state.source;
  }
}
