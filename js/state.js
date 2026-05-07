let _sectionId = 1;
function newSectionId() { return _sectionId++; }

const state = {
  channel: "email",
  source: "tags",
  csvName: "personalisation",
  lookupExpr: "subscription.external_id",
  multiLang: false,
  feedAlias: "rewards",
  eventName: "order_shipped",
  sections: [],
};

function effectiveExternalId() {
  return "user_123";
}
