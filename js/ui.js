function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return e;
}

function codeBlock({ label, code }) {
  const wrap = el("div", { class: "code-wrapper" });
  if (label) wrap.appendChild(el("div", { class: "code-label" }, label));
  const pos = el("div", { class: "code-block-pos" });
  const pre = el("pre", { class: "code-block" });
  pre.textContent = code;
  const btn = el("button", { class: "copy-btn" }, "Copy");
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = "Copied"; btn.classList.add("copied");
      setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 1300);
    });
  });
  pos.appendChild(pre);
  pos.appendChild(btn);
  wrap.appendChild(pos);
  return wrap;
}

function infoBanner(msg) {
  return el("div", { class: "banner info" }, [el("span", { class: "banner-icon" }, "i"), el("span", {}, msg)]);
}
function warnBanner(msg) {
  return el("div", { class: "banner warning" }, [el("span", { class: "banner-icon" }, "!"), el("span", {}, msg)]);
}
