function buildTemplateBody(s, appId) {
  const body = { app_id: appId, name: `${s.csvName || "personalisation"} (via API)` };
  const findSec = name => s.sections.find(x => x.section === name);
  const liquidFor = name => {
    const sec = findSec(name);
    return sec ? liquidForSection(s, sec) : "";
  };
  switch (s.channel) {
    case "email": {
      body.isEmail = true;
      body.email_subject = liquidFor("subject") || "An update from us";
      const bodyL = liquidFor("body");
      const imgL = liquidFor("image_url");
      const btnL = liquidFor("button_url");
      let html = `<p>${bodyL || "Hi there, thanks for being a customer."}</p>`;
      if (imgL) html += `\n<img src="${imgL}" alt="" style="max-width:100%;" />`;
      if (btnL) html += `\n<p><a href="${btnL}">View</a></p>`;
      body.email_body = html;
      const replyL = liquidFor("reply_to");
      if (replyL) body.email_reply_to_address = replyL;
      const preL = liquidFor("preheader");
      if (preL) body.email_preheader = preL;
      break;
    }
    case "sms":
      body.isSMS = true;
      body.contents = { en: liquidFor("body") || "Update from us" };
      break;
    case "push": {
      const titleL = liquidFor("title");
      if (titleL) body.headings = { en: titleL };
      body.contents = { en: liquidFor("body") || "Update from us" };
      const subL = liquidFor("subtitle");
      if (subL) body.subtitle = { en: subL };
      const imgL = liquidFor("image_url");
      if (imgL) body.big_picture = imgL;
      const launchL = liquidFor("launch_url");
      if (launchL) body.url = launchL;
      break;
    }
  }
  return body;
}

function buildApiRequest() {
  const appId = settings.appId || "{app_id}";
  const apiKey = settings.apiKey || "{REST_API_KEY}";
  const ext = effectiveExternalId();
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Key ${apiKey}`,
  };

  switch (state.source) {
    case "tags": {
      const tags = {};
      for (const sec of state.sections) tags[sec.field] = sec.sampleValue;
      return {
        method: "PATCH",
        url: `https://api.onesignal.com/apps/${appId}/users/by/external_id/${ext}`,
        headers,
        body: { properties: { tags } },
        sendable: true,
        intent: `Set tags on user ${ext}`,
      };
    }
    case "custom_data": {
      const data = {};
      for (const sec of state.sections) data[sec.field] = sec.sampleValue;
      return {
        method: "POST",
        url: "https://api.onesignal.com/notifications",
        headers,
        body: {
          app_id: appId,
          template_id: settings.templateId || "{TEMPLATE_ID}",
          include_aliases: { external_id: [ext] },
          target_channel: state.channel === "sms" ? "sms" : (state.channel === "email" ? "email" : "push"),
          custom_data: data,
        },
        sendable: !!settings.templateId,
        sendableHelp: settings.templateId ? null : "Add a Template ID in Settings to enable Send.",
        intent: `Send ${state.channel} message to ${ext} via Create Message API`,
      };
    }
    case "custom_events": {
      const props = {};
      for (const sec of state.sections) props[sec.field] = sec.sampleValue;
      return {
        method: "POST",
        url: `https://api.onesignal.com/apps/${appId}/custom_events`,
        headers,
        body: { events: [{ name: state.eventName, external_id: ext, properties: props }] },
        sendable: true,
        intent: `Send "${state.eventName}" custom event for ${ext}`,
      };
    }
    case "dynamic_content": {
      const dc = buildDynamicContentObject(state);
      const tplBody = buildTemplateBody(state, appId);
      tplBody.dynamic_content = JSON.stringify(dc);
      const isUpdate = !!settings.templateId;
      return {
        method: isUpdate ? "PATCH" : "POST",
        url: isUpdate
          ? `https://api.onesignal.com/templates/${settings.templateId}?app_id=${appId}`
          : "https://api.onesignal.com/templates",
        headers,
        body: tplBody,
        sendable: true,
        intent: isUpdate
          ? `Update template ${settings.templateId} (PATCH /templates/{id}) with dynamic_content embedded — no CSV upload needed.`
          : `Create a new ${state.channel} template (POST /templates) with dynamic_content embedded — no CSV upload needed. Set a Template ID in Settings to switch to Update Template instead.`,
        downloadCsv: true,
        dashboardLink: "https://dashboard.onesignal.com",
        dashboardLabel: "Open dashboard (CSV upload alternative)",
      };
    }
    case "data_feeds":
      return {
        method: null, url: null, headers: null, body: null,
        sendable: false,
        intent: "Data Feeds are configured in the dashboard under Data > Data Feeds, then attached to an email template inside a Journey.",
        dashboardLink: "https://dashboard.onesignal.com",
        dashboardLabel: "Open dashboard to configure",
      };
  }
}

function buildCurl(req) {
  if (!req.method) return null;
  const lines = [`curl -X ${req.method} '${req.url}' \\`];
  for (const [k, v] of Object.entries(req.headers)) lines.push(`  -H '${k}: ${v}' \\`);
  lines.push(`  -d '${JSON.stringify(req.body, null, 2).replace(/'/g, "'\\''")}'`);
  return lines.join("\n");
}

async function sendApiRequest(req, statusEl) {
  if (!settingsConfigured()) {
    statusEl.replaceWith(errorBanner("Add your App ID and REST API Key in Settings before sending."));
    return;
  }
  if (!req.sendable) {
    statusEl.replaceWith(errorBanner(req.sendableHelp || "This request can't be sent directly from the page."));
    return;
  }
  statusEl.replaceWith(infoBanner(`Sending ${req.method} ${req.url} ...`));
  const newStatus = document.querySelector("#api-card .banner.info:last-of-type");
  try {
    const res = await fetch(req.url, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(req.body),
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (res.ok) {
      newStatus.replaceWith(successBanner(`HTTP ${res.status} OK. Response: ${JSON.stringify(json, null, 2)}`));
    } else {
      newStatus.replaceWith(errorBanner(`HTTP ${res.status}. Response: ${JSON.stringify(json, null, 2)}`));
    }
  } catch (e) {
    newStatus.replaceWith(errorBanner(
      `Request failed (${e.message}). This is usually browser CORS blocking direct calls. Copy the curl command and run it from a terminal instead.`
    ));
  }
}

function downloadCsv() {
  const csv = buildCsv(state);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${state.csvName || "personalisation"}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderApiSection() {
  const root = document.getElementById("api-body");
  root.innerHTML = "";

  const req = buildApiRequest();
  root.appendChild(infoBanner(req.intent));

  if (req.method) {
    root.appendChild(codeBlock({
      label: `${req.method} ${req.url} (curl)`,
      code: buildCurl(req),
    }));
  }

  const actions = el("div", { class: "actions-row" });

  if (req.method) {
    const sendBtn = el("button", { class: "action-btn primary" }, "Send to OneSignal");
    sendBtn.disabled = !settingsConfigured() || !req.sendable;
    sendBtn.addEventListener("click", () => {
      const placeholder = el("div");
      root.appendChild(placeholder);
      sendApiRequest(req, placeholder);
    });
    actions.appendChild(sendBtn);
    if (!settingsConfigured()) {
      actions.appendChild(el("span", { class: "action-btn-help" }, "Add App ID + REST API Key in Settings to enable"));
    } else if (!req.sendable && req.sendableHelp) {
      actions.appendChild(el("span", { class: "action-btn-help" }, req.sendableHelp));
    }
  }

  if (state.source === "dynamic_content") {
    const csvBtn = el("button", { class: "action-btn" }, "Download CSV");
    csvBtn.addEventListener("click", downloadCsv);
    actions.appendChild(csvBtn);
  }

  if (req.dashboardLink) {
    actions.appendChild(el("a", {
      class: "action-btn", href: req.dashboardLink, target: "_blank",
      style: "text-decoration:none;"
    }, req.dashboardLabel || "Open dashboard"));
  }

  root.appendChild(actions);
}
