const CHANNELS = {
  email: {
    label: "Email", sub: "Subject, body, links",
    sections: [
      { value: "subject", label: "Subject" },
      { value: "reply_to", label: "Reply-to" },
      { value: "preheader", label: "Pre-header" },
      { value: "body", label: "Message body" },
      { value: "image_url", label: "Image URL" },
      { value: "button_url", label: "Button / link URL" },
    ],
  },
  push: {
    label: "Push", sub: "Title, body, image, URL",
    sections: [
      { value: "title", label: "Title (heading)" },
      { value: "subtitle", label: "Subtitle" },
      { value: "body", label: "Body (contents)" },
      { value: "image_url", label: "Image URL" },
      { value: "launch_url", label: "Launch URL" },
    ],
    note: "The additional `data` field on a push payload does not support Liquid.",
  },
  sms: { label: "SMS", sub: "Message body only", sections: [{ value: "body", label: "Message body" }] },
  inapp: {
    label: "In-App", sub: "Tags only",
    sections: [
      { value: "text", label: "Text block" },
      { value: "button", label: "Button block / URL" },
      { value: "image", label: "Image block / src" },
    ],
    note: "Only Tags work in In-App. Tags must be set before the user opens the app to start a new session.",
  },
  live: {
    label: "Live Activities", sub: "iOS Live Activity updates",
    sections: [
      { value: "headings", label: "headings" },
      { value: "contents", label: "contents" },
      { value: "event_updates", label: "event_updates fields" },
    ],
  },
};

const SOURCES = {
  tags: {
    label: "Properties / Tags", sub: "Persistent on the user",
    description: "Persistent values stored on the user record. Tags can be referenced as bare keys (e.g. `{{ first_name }}`); built-in user properties need their full path (e.g. `{{ user.external_id }}`).",
    docs: [
      { label: "Personalize with properties", url: "https://documentation.onesignal.com/docs/en/personalization-properties-and-tags" },
      { label: "Tags overview", url: "https://documentation.onesignal.com/docs/en/add-user-data-tags" },
    ],
    supportedChannels: ["email", "push", "sms", "inapp", "live"],
  },
  custom_data: {
    label: "API custom_data", sub: "Per-message, transient",
    description: "Message-specific values passed in the Create Message API. Not stored. Requires a template_id. Best for OTPs, cart items, and backend-triggered messages.",
    docs: [
      { label: "Personalize with custom_data", url: "https://documentation.onesignal.com/docs/en/personalization-api-custom-data" },
      { label: "Create Message API", url: "https://documentation.onesignal.com/reference/create-message" },
    ],
    supportedChannels: ["email", "push", "sms", "live"],
    notesByChannel: { inapp: "custom_data is not supported in In-App messages." },
  },
  dynamic_content: {
    label: "Dynamic Content (CSV)", sub: "Bulk per-recipient via CSV",
    description: "Upload a CSV in the dashboard and reference its values in Liquid. Add as many columns as you have sections to personalize.",
    docs: [{ label: "Dynamic Content with CSV", url: "https://documentation.onesignal.com/docs/en/dynamic-content" }],
    supportedChannels: ["email", "push", "sms"],
    notesByChannel: {
      inapp: "Dynamic Content with CSV is not supported in In-App.",
      live: "Dynamic Content with CSV is not supported for Live Activities.",
    },
  },
  data_feeds: {
    label: "Data Feeds", sub: "Live API call at send time",
    description: "OneSignal calls your API at send time and renders the response into the message. Currently email + Journeys only.",
    docs: [{ label: "Data Feeds", url: "https://documentation.onesignal.com/docs/en/data-feeds" }],
    supportedChannels: ["email"],
    notesByChannel: {
      email: "Data Feeds are available only for email messages sent through Journeys.",
      push: "Data Feeds are not available for Push.",
      sms: "Data Feeds are not available for SMS.",
      inapp: "Data Feeds are not available for In-App.",
      live: "Data Feeds are not available for Live Activities.",
    },
  },
  custom_events: {
    label: "Custom Events", sub: "Inside Journeys",
    description: "Event properties captured when a user enters a Journey or matches a Wait Until. Reference via journey.event.<event_name>.data.<property>.",
    docs: [
      { label: "Custom Events personalization", url: "https://documentation.onesignal.com/docs/en/personalization-custom-event" },
      { label: "Custom events", url: "https://documentation.onesignal.com/docs/en/custom-events" },
    ],
    supportedChannels: ["email", "push", "sms"],
    notesByChannel: {
      email: "Custom Event personalization works inside Journeys triggered by the event.",
      push: "Custom Event personalization works inside Journeys triggered by the event.",
      sms: "Custom Event personalization works inside Journeys triggered by the event.",
      inapp: "Custom Events are not supported as a personalization source for In-App.",
      live: "Custom Events are not supported as a personalization source for Live Activities.",
    },
  },
};

const DEFAULT_FALLBACKS = {
  subject: "An update from us", reply_to: "support@yourdomain.com",
  preheader: "A quick update from us", body: "Hi there, thanks for being a customer.",
  image_url: "https://yourdomain.com/default.png", button_url: "https://yourdomain.com",
  title: "We have an update for you", subtitle: "", launch_url: "https://yourdomain.com",
  text: "Welcome", button: "Tap to continue", image: "https://yourdomain.com/default.png",
  headings: "Update", contents: "Tap to view", event_updates: "—",
};

const SCENARIOS = [
  {
    label: "Reply-to + Subject + Body (Dynamic Content)",
    apply(state) {
      state.channel = "email"; state.source = "dynamic_content";
      state.csvName = "personalisation"; state.lookupExpr = "subscription.external_id"; state.multiLang = false;
      state.sections = [
        { id: newSectionId(), section: "reply_to", field: "reply_to", fallback: "support@yourdomain.com", sampleValue: "agent.alice@yourdomain.com" },
        { id: newSectionId(), section: "subject", field: "subject", fallback: "An update from us", sampleValue: "Welcome, Alice!" },
        { id: newSectionId(), section: "body", field: "body", fallback: "Hi there, thanks for being a customer.", sampleValue: "Hi Alice, thanks for being a customer." },
      ];
    }
  },
  {
    label: "First name + level (Tags)",
    apply(state) {
      state.channel = "email"; state.source = "tags";
      state.sections = [
        { id: newSectionId(), section: "subject", field: "first_name", fallback: "Hi there", sampleValue: "Sarah" },
        { id: newSectionId(), section: "body", field: "level", fallback: "1", sampleValue: "5" },
      ];
    }
  },
  {
    label: "OTP code (custom_data)",
    apply(state) {
      state.channel = "sms"; state.source = "custom_data";
      state.sections = [
        { id: newSectionId(), section: "body", field: "otp", fallback: "Your verification code expired. Please request a new one.", sampleValue: "482913" },
      ];
    }
  },
  {
    label: "Multi-language (subject + body)",
    apply(state) {
      state.channel = "email"; state.source = "dynamic_content";
      state.multiLang = true; state.csvName = "translations"; state.lookupExpr = "user.language";
      state.sections = [
        { id: newSectionId(), section: "subject", field: "section_subject", fallback: "An update from us", sampleValue: "Welcome, Alice!" },
        { id: newSectionId(), section: "body", field: "section_body", fallback: "Thanks for being a customer.", sampleValue: "Hi Alice, thanks for being a customer." },
      ];
    }
  },
  {
    label: "Reward points + status (Data Feed)",
    apply(state) {
      state.channel = "email"; state.source = "data_feeds"; state.feedAlias = "rewards";
      state.sections = [
        { id: newSectionId(), section: "subject", field: "status_level", fallback: "Member", sampleValue: "Gold" },
        { id: newSectionId(), section: "body", field: "points", fallback: "0", sampleValue: "193" },
      ];
    }
  },
  {
    label: "Order shipped (Custom Event)",
    apply(state) {
      state.channel = "email"; state.source = "custom_events"; state.eventName = "order_shipped";
      state.sections = [
        { id: newSectionId(), section: "subject", field: "carrier", fallback: "Your carrier", sampleValue: "UPS" },
        { id: newSectionId(), section: "body", field: "tracking_number", fallback: "(pending)", sampleValue: "1Z999AA10123456784" },
      ];
    }
  },
];
