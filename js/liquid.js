function fallbackFor(sectionKey, userValue) {
  return (userValue && userValue.trim() !== "")
    ? userValue
    : (DEFAULT_FALLBACKS[sectionKey] !== undefined ? DEFAULT_FALLBACKS[sectionKey] : "—");
}

function withDefault(snippet, fallback) {
  const m = snippet.match(/^\{\{\s*([\s\S]+?)\s*\}\}$/);
  const expr = m ? m[1] : snippet;
  return `{{ ${expr} | default: ${JSON.stringify(fallback)} }}`;
}

function liquidForSection(s, sec) {
  const fb = fallbackFor(sec.section, sec.fallback);
  switch (s.source) {
    case "tags":
      return withDefault(`{{ user.tags.${sec.field} }}`, fb);
    case "custom_data":
      return withDefault(`{{ message.custom_data.${sec.field} }}`, fb);
    case "dynamic_content":
      if (s.multiLang) return withDefault(`{{ dynamic_content.${s.csvName}.${sec.field}[${s.lookupExpr}] }}`, fb);
      return withDefault(`{{ dynamic_content.${s.csvName}[${s.lookupExpr}].${sec.field} }}`, fb);
    case "data_feeds":
      return withDefault(`{{ data_feed.${s.feedAlias}.${sec.field} }}`, fb);
    case "custom_events":
      return withDefault(`{{ journey.event.${s.eventName}.data.${sec.field} }}`, fb);
  }
  return "";
}

function buildDynamicContentObject(s) {
  const file = {};
  if (s.multiLang) {
    for (const sec of s.sections) {
      file[sec.field] = {
        en: sec.sampleValue,
        es: `[${sec.sampleValue} - es]`,
        fr: `[${sec.sampleValue} - fr]`,
      };
    }
  } else {
    const ext = effectiveExternalId();
    file[ext] = {};
    for (const sec of s.sections) file[ext][sec.field] = sec.sampleValue;
    file["user_456"] = {};
    for (const sec of s.sections) file["user_456"][sec.field] = deriveOther(sec.sampleValue);
  }
  return { [s.csvName]: file };
}

function deriveOther(v) {
  if (typeof v !== "string") return v;
  return v.replace(/alice/gi, "Bob").replace(/Alice/g, "Bob") || `${v} (other)`;
}

function csvFromRows(headers, rows) {
  const escape = (v) => {
    const sv = (v == null ? "" : String(v));
    return /[",\n]/.test(sv) ? `"${sv.replace(/"/g, '""')}"` : sv;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(",")),
  ].join("\n");
}

function buildRow(headers, identityValue, sections, valueFn) {
  const row = { [headers[0]]: identityValue };
  sections.forEach((sec, i) => row[headers[i + 1]] = valueFn(sec));
  return row;
}

function buildCsv(s) {
  if (s.multiLang) {
    const langs = ["en", "es", "fr"];
    const headers = ["", ...langs];
    const rows = s.sections.map(sec => {
      const row = { "": sec.field };
      row[langs[0]] = sec.sampleValue;
      row[langs[1]] = `[${sec.sampleValue} - es]`;
      row[langs[2]] = `[${sec.sampleValue} - fr]`;
      return row;
    });
    return csvFromRows(headers, rows);
  } else {
    const headers = ["external_id"].concat(s.sections.map(sec => sec.field));
    const rows = [
      buildRow(headers, effectiveExternalId(), s.sections, sec => sec.sampleValue),
      buildRow(headers, "user_456", s.sections, sec => deriveOther(sec.sampleValue)),
    ];
    return csvFromRows(headers, rows);
  }
}

function generateSetup(s) {
  const blocks = [];
  switch (s.source) {
    case "tags": {
      const tagObj = {};
      for (const sec of s.sections) tagObj[sec.field] = sec.sampleValue;
      blocks.push({
        label: "Set the tags on the user (REST API)",
        code:
          `PATCH https://api.onesignal.com/apps/{app_id}/users/by/external_id/${effectiveExternalId()}
Content-Type: application/json

${JSON.stringify({ properties: { tags: tagObj } }, null, 2)}`
      });
      const sdk = s.sections.map(sec => `OneSignal.User.addTag("${sec.field}", "${sec.sampleValue}");`).join("\n");
      blocks.push({ label: "Or via SDK (mobile / web)", code: sdk });
      break;
    }
    case "custom_data": {
      const payload = {};
      for (const sec of s.sections) payload[sec.field] = sec.sampleValue;
      blocks.push({
        label: "Create Message API request body",
        code: JSON.stringify({
          app_id: settings.appId || "YOUR_APP_ID",
          template_id: settings.templateId || "YOUR_TEMPLATE_ID",
          include_aliases: { external_id: [effectiveExternalId()] },
          target_channel: s.channel === "email" ? "email" : (s.channel === "sms" ? "sms" : "push"),
          custom_data: payload,
        }, null, 2)
      });
      break;
    }
    case "dynamic_content": {
      blocks.push({
        label: `${s.csvName}.csv (option A — upload via dashboard, or click "Download CSV" below)`,
        code: buildCsv(s),
      });
      blocks.push({
        label: `dynamic_content JSON (option B — embed via Create or Update Template API)`,
        code: JSON.stringify(buildDynamicContentObject(s), null, 2)
      });
      blocks.push({
        label: "How the lookup resolves",
        code: s.multiLang
          ? `Outer key = ${s.csvName} (the file name / template namespace).
Middle keys = section names (rows).
Inner keys = ${s.lookupExpr} values (e.g. language codes).

Each Liquid snippet picks the column matching ${s.lookupExpr}.`
          : `Outer key = ${s.csvName} (the file name / template namespace).
Middle keys = ${s.lookupExpr} values (one per recipient).
Inner keys = the personalized fields you reference in Liquid.

Tip: ${s.lookupExpr} is a built-in user property. Bare keys
(like \`campaign_id\`) only work when the value is a tag.

Either upload the CSV in the dashboard, or call POST /templates
(Create Template) or PATCH /templates/{id} (Update Template) with
the dynamic_content JSON above. Both API calls are sendable from the
"API & actions" card below.`
      });
      break;
    }
    case "data_feeds": {
      const sample = { external_id: effectiveExternalId() };
      for (const sec of s.sections) sample[sec.field] = sec.sampleValue;
      blocks.push({
        label: "Data Feed configuration (Data > Data Feeds)",
        code:
          `Name:    Customer Rewards API
Alias:   ${s.feedAlias}
Method:  GET
URL:     https://api.example.com/customers/{{ subscription.external_id }}/rewards
Headers: Authorization: Bearer YOUR_API_TOKEN

Attach this Data Feed to the email template under
Personalization > Data Feeds, then activate it.`
      });
      blocks.push({ label: "Sample API response", code: JSON.stringify(sample, null, 2) });
      break;
    }
    case "custom_events": {
      const props = {};
      for (const sec of s.sections) props[sec.field] = sec.sampleValue;
      blocks.push({
        label: "Send the custom event (Custom Events API)",
        code:
          `POST https://api.onesignal.com/apps/${settings.appId || "{app_id}"}/custom_events
Content-Type: application/json

${JSON.stringify({
            events: [{
              name: s.eventName,
              external_id: effectiveExternalId(),
              properties: props,
            }]
          }, null, 2)}`
      });
      blocks.push({
        label: "Journey wiring",
        code:
          `1. Create a Journey with entry trigger = ${s.eventName} custom event.
2. Inside the Journey, send your message (template).
3. Reference event properties using:
   {{ journey.event.${s.eventName}.data.<property> | default: "..." }}`
      });
      break;
    }
  }
  return blocks;
}
