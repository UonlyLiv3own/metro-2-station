"""Bundle existing dashboard sources into one Apps Script HTML-service file."""
from base64 import b64encode
from pathlib import Path

root = Path(__file__).resolve().parents[1]

landing_css = "\n".join(
    (root / "css" / name).read_text(encoding="utf-8")
    for name in ("style.css", "landing.css")
)
dashboard_css = (root / "css" / "metro.css").read_text(encoding="utf-8")
app = (root / "js" / "app.js").read_text(encoding="utf-8")
logo = b64encode((root / "assets" / "metro-reference.png").read_bytes()).decode("ascii")
landing = (
    (root / "index.html")
    .read_text(encoding="utf-8")
    .split('<body data-page="landing">', 1)[1]
    .split("</body>", 1)[0]
)
landing = landing.replace(
    'href="pages/overview.html"', 'href="<?= JSON.parse(context).url ?>?page=overview"'
)
landing = landing.replace(
    'href="pages/report.html"', 'href="<?= JSON.parse(context).url ?>?page=report"'
)

template = """<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<base target="_top">
<style>
<? if (JSON.parse(context).page === 'landing') {{ ?>
{landing_css}
<? }} else {{ ?>
{dashboard_css}
<? }} ?>
</style>
</head>
<body data-page="<?= JSON.parse(context).page ?>" data-context="<?= context ?>">
<? if (JSON.parse(context).page === 'landing') {{ ?>
{landing}
<? }} else {{ ?>
<div id="app"><p class="empty" role="status">Đang đọc dữ liệu Google Sheets…</p></div>
<script>
"use strict";
const context = JSON.parse(document.body.dataset.context);
window.METRO_LIVE = {{...context, logo:"data:image/png;base64,{logo}"}};
function renderMetro(payload) {{
  window.METRO_LIVE.payload = payload;
  window.METRO_RECORDS = payload.records;
  {app}
}}
function showReadError(error) {{
  const app = document.querySelector("#app");
  const message = document.createElement("p");
  message.className = "empty";
  message.textContent = "Không tải được Google Sheets. Kiểm tra quyền mở file hoặc cấu trúc hàng tiêu đề. " + (error?.message || "");
  const retry = document.createElement("a");
  retry.className = "button";
  retry.href = context.url + "?page=" + encodeURIComponent(context.page) + "&" + new URLSearchParams(context.params);
  retry.textContent = "Tải lại";
  app.replaceChildren(message, retry);
}}
if (context.params.demo === "1") {{
  renderMetro({{records:[], pendingHeaders:[], invalidAmounts:[]}});
}} else {{
  google.script.run.withSuccessHandler(renderMetro).withFailureHandler(showReadError).readMetroData();
}}
</script>
<? }} ?>
</body>
</html>
"""
(root / "apps-script" / "Dashboard.html").write_text(
    template.format(
        landing_css=landing_css,
        dashboard_css=dashboard_css,
        landing=landing,
        logo=logo,
        app=app,
    ),
    encoding="utf-8",
)
