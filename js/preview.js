function buildPreviewScope(s) {
  const ext = effectiveExternalId();
  const lang = s.sampleIdentity.language || "en";
  const scope = {
    user: { tags: {}, external_id: ext, onesignal_id: "11112222-3333-4444-5555-666677778888", language: lang, first_name: "Alice" },
    subscription: { external_id: ext, email: "alice@example.com", phone_number: "+15555550100", language: lang },
    external_id: ext, language: lang, first_name: "Alice", email: "alice@example.com",
    message: { custom_data: {} }, journey: { event: {} }, data_feed: {}, dynamic_content: {},
  };
  for (const sec of s.sections) {
    switch (s.source) {
      case "tags":
        scope.user.tags[sec.field] = sec.sampleValue;
        scope[sec.field] = sec.sampleValue;
        break;
      case "custom_data":
        scope.message.custom_data[sec.field] = sec.sampleValue;
        break;
      case "data_feeds":
        scope.data_feed[s.feedAlias] = scope.data_feed[s.feedAlias] || { external_id: ext };
        scope.data_feed[s.feedAlias][sec.field] = sec.sampleValue;
        break;
      case "custom_events":
        scope.journey.event[s.eventName] = scope.journey.event[s.eventName] || { data: {} };
        scope.journey.event[s.eventName].data[sec.field] = sec.sampleValue;
        break;
      case "dynamic_content": {
        scope.dynamic_content[s.csvName] = scope.dynamic_content[s.csvName] || {};
        const file = scope.dynamic_content[s.csvName];
        if (s.multiLang) {
          file[sec.field] = file[sec.field] || {};
          file[sec.field][lang] = sec.sampleValue;
          file[sec.field]["en"] = file[sec.field]["en"] || sec.sampleValue;
        } else {
          file[ext] = file[ext] || {};
          file[ext][sec.field] = sec.sampleValue;
        }
        break;
      }
    }
  }
  return scope;
}

let liquidEngine = null;
try {
  if (typeof liquidjs !== "undefined") {
    liquidEngine = new liquidjs.Liquid({ strictFilters: false, strictVariables: false });
  }
} catch { }

async function renderLiquid(template, scope) {
  if (liquidEngine) {
    try { return await liquidEngine.parseAndRender(template, scope); }
    catch (e) { return `[render error: ${e.message}]`; }
  }
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expr) => {
    try { return String(evalSimpleExpr(expr, scope) ?? ""); } catch { return ""; }
  });
}

function evalSimpleExpr(expr, scope) {
  const def = expr.split("|").map(s => s.trim());
  const path = def[0];
  let fallback = null;
  for (const filt of def.slice(1)) {
    const m = filt.match(/^default:\s*("([^"]*)"|'([^']*)'|(\S+))/);
    if (m) fallback = m[2] ?? m[3] ?? m[4];
  }
  const parts = path.match(/[^.\[\]]+|\[[^\]]+\]/g) || [];
  let v = scope;
  for (let p of parts) {
    if (!v) break;
    if (p.startsWith("[")) {
      let key = p.slice(1, -1).trim();
      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
      else key = String(evalSimpleExpr(key, scope));
      v = v[key];
    } else { v = v[p]; }
  }
  return v == null ? fallback : v;
}

async function buildChannelPreview(s) {
  const scope = buildPreviewScope(s);
  const rendered = {};
  for (const sec of s.sections) {
    const tpl = liquidForSection(s, sec);
    rendered[sec.section] = (await renderLiquid(tpl, scope)).trim();
  }
  return { rendered };
}
