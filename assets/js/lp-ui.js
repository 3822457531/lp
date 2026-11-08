/* 兰瓶美业 · UI 工具（toast / modal / 分页 / 表格渲染）
 * 依赖 lp-store.js
 */
(function (global) {
  "use strict";
  var LP = global.LP = global.LP || {};
  var doc = global.document;

  var CSS = [
    ".lp-toast{position:fixed;left:50%;top:24px;transform:translateX(-50%) translateY(-16px);",
    "background:#1f2430;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;",
    "box-shadow:0 8px 24px rgba(0,0,0,.18);opacity:0;transition:.22s;z-index:9999;pointer-events:none;max-width:80vw;}",
    ".lp-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}",
    ".lp-toast.ok{background:#2f7d54;} .lp-toast.err{background:#c0392b;}",
    ".lp-mask{position:fixed;inset:0;background:rgba(20,22,28,.42);display:flex;align-items:center;",
    "justify-content:center;z-index:9998;opacity:0;transition:.18s;}",
    ".lp-mask.show{opacity:1;}",
    ".lp-modal{background:#fff;border-radius:14px;width:min(520px,92vw);max-height:86vh;overflow:auto;",
    "box-shadow:0 24px 60px rgba(0,0,0,.24);transform:translateY(8px);transition:.18s;}",
    ".lp-mask.show .lp-modal{transform:translateY(0);}",
    ".lp-modal h4{margin:0;padding:18px 20px 12px;font-size:16px;color:#1f2430;}",
    ".lp-modal .lp-body{padding:0 20px 4px;}",
    ".lp-modal .lp-foot{display:flex;justify-content:flex-end;gap:10px;padding:14px 20px 18px;}",
    ".lp-field{margin-bottom:12px;}",
    ".lp-field label{display:block;font-size:12.5px;color:#7a8290;margin-bottom:6px;}",
    ".lp-field input,.lp-field select,.lp-field textarea{width:100%;box-sizing:border-box;padding:9px 11px;",
    "border:1px solid #e2e5ec;border-radius:8px;font-size:13.5px;color:#1f2430;background:#fbfcfe;outline:none;}",
    ".lp-field input:focus,.lp-field select:focus{border-color:#9a7d6f;background:#fff;}",
    ".lp-btn{border:0;border-radius:8px;padding:9px 16px;font-size:13.5px;cursor:pointer;background:#f0f1f5;color:#3a4150;}",
    ".lp-btn.primary{background:#9a7d6f;color:#fff;}",
    ".lp-empty{padding:38px 0;text-align:center;color:#9ca3af;font-size:13.5px;}",
    ".lp-tag{display:inline-block;padding:2px 8px;border-radius:6px;font-size:12px;}",
    ".lp-pager{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;font-size:13px;color:#7a8290;}",
    ".lp-pager .pg{display:flex;gap:6px;}",
    ".lp-pager .pg span{min-width:30px;height:30px;line-height:30px;text-align:center;border-radius:8px;",
    "cursor:pointer;background:#f4f5f9;color:#4b5563;}",
    ".lp-pager .pg span.on{background:#9a7d6f;color:#fff;}",
    ".lp-pager .pg span.dis{opacity:.4;cursor:not-allowed;}"
  ].join("");

  function injectCSS() {
    if (!doc || doc.getElementById("lp-ui-css")) return;
    var st = doc.createElement("style");
    st.id = "lp-ui-css";
    st.textContent = CSS;
    doc.head.appendChild(st);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(msg, type) {
    injectCSS();
    var el = doc.createElement("div");
    el.className = "lp-toast " + (type || "ok");
    el.textContent = msg;
    doc.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.remove(); }, 260);
    }, 1900);
  }

  /* fields: [{key,label,type,options,value,placeholder,required}] */
  function modal(opt) {
    injectCSS();
    var mask = doc.createElement("div");
    mask.className = "lp-mask";
    var body = (opt.fields || []).map(function (f) {
      var v = opt.values && opt.values[f.key] != null ? opt.values[f.key] : (f.value != null ? f.value : "");
      var input;
      if (f.type === "select") {
        input = '<select data-k="' + f.key + '">' + (f.options || []).map(function (o) {
          var val = typeof o === "object" ? o.value : o;
          var lab = typeof o === "object" ? o.label : o;
          return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? " selected" : "") + ">" + esc(lab) + "</option>";
        }).join("") + "</select>";
      } else if (f.type === "textarea") {
        input = '<textarea data-k="' + f.key + '" rows="3" placeholder="' + esc(f.placeholder || "") + '">' + esc(v) + "</textarea>";
      } else {
        input = '<input data-k="' + f.key + '" type="' + (f.type || "text") + '" value="' + esc(v) +
          '" placeholder="' + esc(f.placeholder || "") + '" />';
      }
      return '<div class="lp-field"><label>' + esc(f.label) + "</label>" + input + "</div>";
    }).join("");

    mask.innerHTML =
      '<div class="lp-modal"><h4>' + esc(opt.title || "编辑") + '</h4>' +
      '<div class="lp-body">' + body + "</div>" +
      '<div class="lp-foot"><button class="lp-btn" data-act="cancel">取消</button>' +
      '<button class="lp-btn primary" data-act="ok">' + esc(opt.okText || "确定") + "</button></div></div>";
    doc.body.appendChild(mask);
    requestAnimationFrame(function () { mask.classList.add("show"); });

    function close() { mask.classList.remove("show"); setTimeout(function () { mask.remove(); }, 200); }

    mask.addEventListener("click", function (e) {
      var act = e.target.getAttribute && e.target.getAttribute("data-act");
      if (e.target === mask || act === "cancel") return close();
      if (act === "ok") {
        var out = {};
        mask.querySelectorAll("[data-k]").forEach(function (el) { out[el.getAttribute("data-k")] = el.value.trim(); });
        var miss = (opt.fields || []).filter(function (f) { return f.required && !out[f.key]; });
        if (miss.length) { toast("请填写：" + miss[0].label, "err"); return; }
        if (opt.onSubmit && opt.onSubmit(out) === false) return;
        close();
      }
    });
  }

  function pager(el, opt) {
    if (!el) return;
    var total = opt.total, size = opt.pageSize, page = opt.page;
    var pages = Math.max(1, Math.ceil(total / size));
    var nums = [];
    var from = Math.max(1, page - 2), to = Math.min(pages, from + 4);
    from = Math.max(1, to - 4);
    for (var i = from; i <= to; i++) nums.push(i);
    el.className = "lp-pager";
    el.innerHTML =
      "<span>共 " + total + " 条 · 第 " + page + " / " + pages + " 页</span>" +
      '<div class="pg">' +
      '<span class="' + (page <= 1 ? "dis" : "") + '" data-p="' + (page - 1) + '">‹</span>' +
      nums.map(function (n) { return '<span class="' + (n === page ? "on" : "") + '" data-p="' + n + '">' + n + "</span>"; }).join("") +
      '<span class="' + (page >= pages ? "dis" : "") + '" data-p="' + (page + 1) + '">›</span>' +
      "</div>";
    el.querySelectorAll("[data-p]").forEach(function (s) {
      s.addEventListener("click", function () {
        if (s.className.indexOf("dis") > -1) return;
        var p = parseInt(s.getAttribute("data-p"), 10);
        if (p >= 1 && p <= pages && p !== page) opt.onPage(p);
      });
    });
  }

  function emptyRow(cols, text) {
    return '<tr><td colspan="' + cols + '"><div class="lp-empty">' + esc(text || "暂无数据") + "</div></td></tr>";
  }

  LP.ui = { toast: toast, modal: modal, pager: pager, esc: esc, emptyRow: emptyRow, injectCSS: injectCSS };
})(typeof window !== "undefined" ? window : globalThis);
