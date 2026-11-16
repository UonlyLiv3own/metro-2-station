"use strict";

const pages = {
  overview: "Tổng quan dự án",
  btgpmb: "Bồi thường & phát triển quỹ đất",
  finance: "Kế hoạch tài chính",
  detail: "Chi tiết hồ sơ",
  report: "Báo cáo giải ngân",
};
const groupNames = [
  "Bồi thường lần đầu",
  "Bồi thường bổ sung, NVTC",
  "Thưởng BGMB",
  "Tạm cư",
];
const statuses = [
  "Chưa thực hiện",
  "Đang xử lý",
  "Xác minh nguồn gốc",
  "Đang thẩm định",
  "Trình lãnh đạo chờ duyệt",
  "Đã duyệt / chờ chi",
  "Ngăn chặn",
];
const teams = ["Tổ 1", "Tổ 2"];
const dayMs = 86400000;
const page = document.body.dataset.page;
const params = new URLSearchParams(location.search);
const demo = params.get("demo") === "1";
const moneyFormat = new Intl.NumberFormat("vi-VN");
const compactFormat = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 3,
});
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const value = (data) =>
  data === null || data === undefined || data === "" ? "—" : escape(data);
const sum = (rows, get) =>
  rows.reduce((total, row) => total + (get(row) ?? 0), 0);
const ratio = (part, whole) => (whole > 0 ? (part / whole) * 100 : null);
const percent = (n) => (n === null ? "—" : compactFormat.format(n) + "%");
const money = (n) => (n == null ? "—" : moneyFormat.format(n) + " ₫");
const compact = (n) => (n == null ? "—" : compactFormat.format(n / 1e9));
const normalize = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .trim();
const isoDay = (time) => new Date(time).toISOString().slice(0, 10);
const localDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(new Date());
const dateParts = Object.fromEntries(
  localDate.map(({ type, value }) => [type, value]),
);
const today = [dateParts.year, dateParts.month, dateParts.day].join("-");
const dateLabel = (s) => s?.split("-").reverse().join("/") || "—";

function statusOf(raw) {
  const key = normalize(raw)
    .replace(/^\d+\.\s*/, "")
    .replace(/\s*\/\s*/g, "/");
  return (
    statuses.find(
      (label) => normalize(label).replace(/\s*\/\s*/g, "/") === key,
    ) ||
    (key === "tham dinh"
      ? statuses[3]
      : raw?.replace(/^\d+\.\s*/, "") || "Chưa cập nhật")
  );
}

function demoRecords() {
  return Array.from({ length: 72 }, (_, i) => {
    const id = i + 1;
    const team = teams[i % 2];
    const hasPaid = i < 35;
    const groups = groupNames.map((_, group) => {
      const applies = group === 0 || (i + group) % (group + 2) === 0;
      const estimate = applies
        ? (1 + (i % 8)) * [235e6, 19e6, 12e6, 4e6][group]
        : 0;
      const paid = hasPaid
        ? group === 0 && i % 4 === 0
          ? estimate / 2
          : estimate
        : 0;
      const offset = i < 12 ? i % 7 : 10 + i * 4;
      return [
        estimate,
        paid,
        estimate - paid,
        paid ? isoDay(Date.parse(today) - offset * dayMs) : null,
      ];
    });
    return {
      id: "MP-" + id,
      stt: id,
      name: "Hộ mô phỏng " + String(id).padStart(2, "0"),
      team,
      house: id,
      street: i % 2 ? "Tuyến minh họa B" : "Tuyến minh họa A",
      ward: i % 2 ? "Khu vực B" : "Khu vực A",
      officer: ["Cán bộ A", "Cán bộ B", "Cán bộ C"][i % 3],
      accountant: ["Kế toán A", "Kế toán B"][i % 2],
      status: hasPaid ? statuses[5] : statuses[i % statuses.length],
      plan: hasPaid ? "PA-MP-" + id : null,
      approval: hasPaid ? "QĐ-MP-" + id : null,
      enforcement: i % 19 === 0 ? "CC-MP-" + id : null,
      note: i % 11 === 0 ? "Vướng mắc minh họa" : null,
      handover: i < 24 ? "Đã bàn giao" : null,
      groups,
    };
  });
}

const rows = (demo ? demoRecords() : window.METRO_RECORDS).map((record) => ({
  ...record,
  stage: statusOf(record.status),
  address: [record.house, record.street, record.ward]
    .filter(Boolean)
    .join(", "),
  paid: sum(record.groups, (group) => group[1]),
}));

function href(target, extra = {}) {
  const query = new URLSearchParams({
    ...(demo ? { demo: "1" } : {}),
    ...extra,
  });
  return target + ".html" + (query.size ? "?" + query : "");
}

function measure(items, slot, index = null) {
  const data = items.flatMap((record) =>
    index === null ? record.groups : [record.groups[index]],
  );
  const known = data.filter((group) => group[slot] != null);
  return known.length ? sum(known, (group) => group[slot]) : null;
}

function kpi(label, amount, unit = "", tone = "purple", caption = "") {
  return `<article class="kpi ${tone}"><div>${label}</div><strong>${amount}</strong> <small>${unit}</small>${caption ? `<p>${caption}</p>` : ""}</article>`;
}

function cashKpis(items) {
  return [
    kpi("Dự toán", compact(measure(items, 0)), "tỷ đồng"),
    kpi("Đã chi", compact(measure(items, 1)), "tỷ đồng", "teal"),
    kpi("Chưa chi", compact(measure(items, 2)), "tỷ đồng", "orange"),
  ].join("");
}

function panel(title, body, caption = "", action = "") {
  return `<section class="panel"><header class="section-head"><div><h2>${title}</h2>${caption ? `<p>${caption}</p>` : ""}</div>${action}</header>${body}</section>`;
}

function table(headers, body, empty = "Không có hồ sơ phù hợp.") {
  return `<div class="table-wrap" tabindex="0" aria-label="Bảng dữ liệu"><table><thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join("")}</tr></thead><tbody>${body || `<tr><td class="empty" colspan="${headers.length}">${empty}</td></tr>`}</tbody></table></div>`;
}

function detailLink(record) {
  const from = page === "overview" ? "overview" : "btgpmb";
  return `<a class="record-link" href="${href("detail", { id: record.id, from })}">${escape(record.name)}</a>`;
}

function recordsTable(items) {
  return table(
    [
      "STT",
      "Hộ dân / PA",
      "Địa chỉ",
      "Tổ",
      "Dự toán",
      "Đã chi",
      "Chưa chi",
      "Trạng thái",
    ],
    items
      .map(
        (record) =>
          `<tr><td>${value(record.stt)}</td><td>${detailLink(record)}<small class="sub">${value(record.plan)}</small></td><td>${value(record.address)}</td><td>${value(record.team)}</td><td>${money(measure([record], 0))}</td><td>${money(record.paid)}</td><td>${money(measure([record], 2))}</td><td><span class="pill">${escape(record.stage)}</span></td></tr>`,
      )
      .join(""),
  );
}

function progress(label, n, display = percent(n), tone = "purple") {
  const width = Math.max(0, Math.min(100, n ?? 0));
  return `<div class="progress-row"><div><span>${label}</span><strong>${display}</strong></div><div class="track ${tone}" aria-hidden="true"><i style="width:${width}%"></i></div></div>`;
}

function overview() {
  const tasks = [
    ["Thông báo thu hồi đất", (r) => r.notice],
    ["Phê duyệt phương án", (r) => r.approval],
    ["Giải chi", (r) => r.paid > 0],
    [
      "Bàn giao mặt bằng",
      (r) => normalize(r.handover).replace(/^\d+\.\s*/, "") === "da ban giao",
    ],
  ];
  return (
    teams
      .map((team) => {
        const items = rows.filter((r) => r.team === team);
        return `<section class="team"><h2>${team} <small>${items.length} hồ sơ</small></h2><div class="grid three">${cashKpis(items)}</div></section>`;
      })
      .join("") +
    panel(
      "Tiến độ các nhiệm vụ trọng tâm",
      tasks
        .map(([label, test], i) => {
          const count = rows.filter(test).length;
          return progress(
            label,
            ratio(count, rows.length),
            `${count}/${rows.length} hồ sơ · ${percent(ratio(count, rows.length))}`,
            i % 2 ? "teal" : "purple",
          );
        })
        .join(""),
      "Các đầu việc minh họa được tính từ trường dữ liệu tương ứng.",
    ) +
    panel(
      "Danh sách hồ sơ chưa chi",
      teams
        .map((team) => {
          const items = rows.filter((r) => r.team === team && r.paid <= 0);
          return `<h3>${team} · ${items.length} hồ sơ</h3>${recordsTable(items.slice(0, 15))}`;
        })
        .join(""),
      "Hiển thị tối đa 15 hồ sơ mỗi tổ.",
      `<a class="button" href="${href("btgpmb")}#unpaid">Xem danh sách</a>`,
    )
  );
}

function optionList(list) {
  return list
    .map((item) => `<option value="${escape(item)}">${escape(item)}</option>`)
    .join("");
}

function listPage() {
  const people = (key) =>
    [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "vi"),
    );
  const cards = [1, 3, 4, 5, 6].map((index, i) =>
    kpi(
      statuses[index],
      rows.filter((r) => r.stage === statuses[index]).length,
      "hồ sơ",
      ["purple", "blue", "orange", "teal", "red"][i],
    ),
  );
  return (
    `<div class="grid five">${cards.join("")}</div>` +
    panel(
      "Tìm kiếm và lọc hồ sơ",
      `<form id="filters" class="filters">
    <label>Tìm hồ sơ<input name="search" type="search" placeholder="Họ tên, địa chỉ, PA, số quyết định"></label>
    <label>Nhóm chi<select name="group"><option value="">Tất cả nhóm chi</option>${groupNames.map((g, i) => `<option value="${i}">${g}</option>`).join("")}</select></label>
    <label>Kế toán chi<select name="accountant"><option value="">Tất cả kế toán</option>${optionList(people("accountant"))}</select></label>
    <label>Cán bộ thụ lý<select name="officer"><option value="">Tất cả cán bộ</option>${optionList(people("officer"))}</select></label>
    <label>Tổ công tác<select name="team"><option value="">Tất cả tổ</option>${optionList(teams)}</select></label>
    <label>Trạng thái<select name="status"><option value="">Tất cả trạng thái</option>${optionList([...new Set(rows.map((r) => r.stage))])}</select></label>
    <button class="button" type="reset">Xóa bộ lọc</button></form>`,
    ) +
    '<div id="lists"></div>'
  );
}

function setupList() {
  const form = document.querySelector("#filters");
  const lists = document.querySelector("#lists");
  const pages = { paid: 0, unpaid: 0 };
  const size = 15;
  const storageKey = "metro-filters-" + demo;
  let stored = {};
  if (params.get("restore") === "1") {
    try {
      stored = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
    } catch {}
    for (const [key, val] of Object.entries(stored.filters || {})) {
      if (form.elements.namedItem(key))
        form.elements.namedItem(key).value = val;
    }
    Object.assign(pages, stored.pages);
  }
  function update() {
    const filters = Object.fromEntries(new FormData(form));
    const matches = rows.filter((record) => {
      const text = [
        record.name,
        record.address,
        record.plan,
        record.approval,
        record.recovery,
        record.notice,
        record.enforcement,
      ].join(" ");
      const group =
        filters.group === "" ? null : record.groups[Number(filters.group)];
      return (
        normalize(text).includes(normalize(filters.search)) &&
        (!group || group.slice(0, 3).some((n) => n > 0)) &&
        ["accountant", "officer", "team"].every(
          (key) => !filters[key] || record[key] === filters[key],
        ) &&
        (!filters.status || record.stage === filters.status)
      );
    });
    lists.innerHTML = ["paid", "unpaid"]
      .map((key) => {
        const items = matches.filter((r) =>
          key === "paid" ? r.paid > 0 : r.paid <= 0,
        );
        const last = Math.max(0, Math.ceil(items.length / size) - 1);
        pages[key] = Math.min(last, pages[key]);
        const current = pages[key];
        const nav =
          items.length > size
            ? `<div class="pagination"><button class="button" data-list="${key}" data-step="-1" ${current === 0 ? "disabled" : ""}>Trước</button><span>Trang ${current + 1}/${last + 1}</span><button class="button" data-list="${key}" data-step="1" ${current === last ? "disabled" : ""}>Sau</button></div>`
            : "";
        return `<div id="${key}">${panel(key === "paid" ? "Danh sách hồ sơ đã chi" : "Danh sách hồ sơ chưa chi", recordsTable(items.slice(current * size, (current + 1) * size)) + nav, `${items.length} hồ sơ`)}</div>`;
      })
      .join("");
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ filters, pages }));
    } catch {}
  }
  const resetPages = () => {
    pages.paid = 0;
    pages.unpaid = 0;
    update();
  };
  form.addEventListener("input", resetPages);
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("reset", () => setTimeout(resetPages));
  lists.addEventListener("click", (event) => {
    const button = event.target.closest("[data-step]");
    if (!button) return;
    pages[button.dataset.list] += Number(button.dataset.step);
    update();
    document
      .getElementById(button.dataset.list)
      .scrollIntoView({ block: "nearest" });
  });
  update();
  if (["#paid", "#unpaid"].includes(location.hash))
    document.getElementById(location.hash.slice(1)).scrollIntoView();
}

const payments = rows.flatMap((record) =>
  record.groups.flatMap((group, index) =>
    group[1] > 0
      ? [
          {
            id: record.id,
            group: index,
            amount: group[1],
            date: /^\d{4}-\d{2}-\d{2}$/.test(group[3] || "") ? group[3] : null,
          },
        ]
      : [],
  ),
);
const start = isoDay(Date.parse(today) - 6 * dayMs);
const week = payments.filter((p) => p.date >= start && p.date <= today);
const gaps = payments.filter((p) => !p.date || p.date > today);
const uniqueCases = (entries) => new Set(entries.map((p) => p.id)).size;

function datedNote() {
  if (!payments.length)
    return '<p class="source-note">Nguồn hiện chưa có khoản chi hoặc ngày chi.</p>';
  if (!gaps.length) return "";
  return `<p class="source-note">${gaps.length} khoản chi thiếu ngày hoặc nằm sau ngày báo cáo được loại khỏi số theo kỳ.</p>`;
}

function chart(entries, specs) {
  const maxima = specs.map((_, i) =>
    Math.max(1, ...entries.map((entry) => entry.data[i])),
  );
  return `<div class="legend">${specs.map((s) => `<span class="${s.tone}">${s.label}</span>`).join("")}</div>
  <div class="chart" style="--columns:${entries.length}">${entries.map((entry) => `<div class="chart-item"><div class="bars">${entry.data.map((d, i) => `<div class="bar-slot ${specs[i].tone}"><small>${specs[i].format(d)}</small><i style="height:${(d / maxima[i]) * 100}%"></i></div>`).join("")}</div><b>${entry.label}</b></div>`).join("")}</div>`;
}

function finance() {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = isoDay(Date.parse(start) + i * dayMs);
    const items = week.filter((p) => p.date === date);
    return {
      label: dateLabel(date).slice(0, 5),
      data: [sum(items, (p) => p.amount), uniqueCases(items)],
    };
  });
  const weekly = chart(days, [
    { label: "Đã chi (tỷ đồng)", tone: "purple", format: compact },
    { label: "Hồ sơ đã chi (hồ sơ)", tone: "teal", format: moneyFormat.format },
  ]);
  const groupRates = groupNames
    .map((g, i) => progress(g, ratio(measure(rows, 1, i), measure(rows, 0, i))))
    .join("");
  return `<div class="grid four">${cashKpis(rows)}${kpi("Tỷ lệ giải chi", percent(ratio(measure(rows, 1, 0) + measure(rows, 1, 2), measure(rows, 0))), "", "blue", "Bồi thường và thưởng BGMB có cột dự toán")}</div>
  <div class="finance-grid">${panel("Lịch giải ngân 7 ngày gần nhất", weekly + datedNote(), `${dateLabel(start)} – ${dateLabel(today)} · ${uniqueCases(week)} hồ sơ trong kỳ · Mỗi chỉ tiêu dùng thang riêng.`)}
  ${panel("Tỷ lệ giải ngân các nhóm chi", groupRates, "Đã chi / Dự toán. Dấu — hiển thị khi thiếu dự toán hoặc dự toán bằng 0.")}</div>`;
}

function detail() {
  const record = rows.find((r) => r.id === params.get("id"));
  if (!record)
    return panel(
      "Chưa có hồ sơ để hiển thị",
      `<p class="empty">Chọn một hồ sơ trong danh sách để xem chi tiết.</p><a class="button" href="${href("btgpmb")}">Mở danh sách hồ sơ</a>`,
    );
  const from =
    params.get("from") === "overview"
      ? href("overview")
      : href("btgpmb", { restore: "1" }) +
        (record.paid > 0 ? "#paid" : "#unpaid");
  const fields = [
    ["Tổ công tác", record.team],
    ["Phường", record.ward],
    ["Địa chỉ giải tỏa", record.address],
    [
      "Số tờ / số thửa",
      [record.map, record.parcel].filter((v) => v != null).join(" / "),
    ],
    ["Diện tích (m²)", record.area],
    ["Kế toán chi", record.accountant],
    ["Cán bộ thụ lý", record.officer],
    ["Số phương án", record.plan],
    ["Thông báo thu hồi đất", record.notice],
    ["QĐ phê duyệt phương án", record.approval],
    ["QĐ thu hồi đất", record.recovery],
    ["QĐ cưỡng chế", record.enforcement],
    ["QĐ chi tiền tạm cư", record.temporaryDecision],
    ["Bàn giao mặt bằng", record.handover],
    ["Trạng thái hồ sơ", record.stage],
  ];
  return (
    panel(
      escape(record.name),
      `<dl class="case-fields">${fields.map(([label, data]) => `<div><dt>${label}</dt><dd>${value(data)}</dd></div>`).join("")}</dl>`,
      record.id,
      `<a class="button" href="${from}">← Quay về danh sách</a>`,
    ) +
    panel(
      "Tiến độ giải chi hồ sơ",
      table(
        [
          "Nhóm chi trả",
          "Dự toán",
          "Đã chi",
          "Chưa chi",
          "Tỷ lệ",
          "Lý do chưa chi",
        ],
        record.groups
          .map(
            (g, i) =>
              `<tr><td>${groupNames[i]}</td><td>${money(g[0])}</td><td>${money(g[1])}</td><td>${money(g[2])}</td><td>${progress("", ratio(g[1], g[0]))}</td><td>${value(record.note)}</td></tr>`,
          )
          .join(""),
      ),
      "Lý do hiển thị theo ghi chú giải chi của hồ sơ.",
    )
  );
}

function report() {
  const paid = rows.filter((r) => r.paid > 0).length;
  const date = new Date(today + "T00:00:00Z");
  const months = Array.from({ length: 6 }, (_, i) => {
    const month = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 5 + i, 1),
    );
    const prefix = month.toISOString().slice(0, 7);
    const entries = payments.filter(
      (p) => p.date?.startsWith(prefix) && p.date <= today,
    );
    const fullyPaid = rows.filter((r) => {
      const estimate = measure([r], 0);
      const balance = measure([r], 2);
      const dates = payments.filter((p) => p.id === r.id);
      return (
        estimate > 0 &&
        balance === 0 &&
        dates.length &&
        dates.every((p) => p.date && p.date <= today) &&
        dates
          .map((p) => p.date)
          .sort()
          .at(-1)
          .startsWith(prefix)
      );
    });
    return {
      label: prefix.slice(5) + "/" + prefix.slice(0, 4),
      data: [fullyPaid.length, sum(entries, (p) => p.amount)],
    };
  });
  const financial = [0, 1, 2];
  const max = Math.max(
    1,
    ...groupNames.flatMap((_, i) =>
      financial.map((slot) => measure(rows, slot, i) ?? 0),
    ),
  );
  const grouped = groupNames
    .map(
      (g, i) =>
        `<div class="group-bars"><h3>${g}</h3>${financial
          .map((slot, j) => {
            const amount = measure(rows, slot, i);
            return progress(
              ["Dự toán", "Đã chi", "Chưa chi"][j],
              ratio(amount, max),
              money(amount),
              ["purple", "teal", "orange"][j],
            );
          })
          .join("")}</div>`,
    )
    .join("");
  const periods = groupNames
    .map((g, i) => {
      const before = sum(
        payments.filter((p) => p.group === i && p.date && p.date < start),
        (p) => p.amount,
      );
      const during = sum(
        week.filter((p) => p.group === i),
        (p) => p.amount,
      );
      return `<tr><td>${g}</td><td>${money(before)}</td><td>${money(during)}</td><td>${money(before + during)}</td></tr>`;
    })
    .join("");
  return (
    `<section class="report-cover panel"><p>BÁO CÁO TÌNH HÌNH CHI TIỀN GIẢI PHÓNG MẶT BẰNG</p><h2>Dự án Đường sắt đô thị · Ga Metro 2</h2><p>Kỳ hiển thị 7 ngày · ${dateLabel(start)} – ${dateLabel(today)}</p>${demo ? "<p>DỮ LIỆU MÔ PHỎNG</p>" : "<p>Dữ liệu tạm từ Excel</p>"}</section>
    <div class="grid three">${kpi("Tổng số hồ sơ", rows.length, "hồ sơ")}${kpi("Hồ sơ đã chi", paid, "hồ sơ", "teal")}${kpi("Hồ sơ chưa chi", rows.length - paid, "hồ sơ", "orange")}</div>
    <div class="grid three spaced">${cashKpis(rows)}</div>` +
    panel(
      "Tiến độ hoàn thành và giải chi theo tháng",
      chart(months, [
        {
          label: "Hồ sơ hoàn tất giải chi",
          tone: "teal",
          format: moneyFormat.format,
        },
        { label: "Đã chi (tỷ đồng)", tone: "purple", format: compact },
      ]) + datedNote(),
      "6 tháng đến ngày hiển thị. Hồ sơ hoàn tất khi có dự toán, số còn chi bằng 0 và xác định được ngày chi cuối. Mỗi chỉ tiêu dùng thang riêng.",
    ) +
    panel(
      "Giải ngân theo nhóm",
      grouped +
        table(
          ["Nhóm chi trả", "Đã chi đầu kỳ", "Chi trong tuần", "Lũy kế đã chi"],
          periods,
        ) +
        datedNote(),
      "Bảng theo kỳ tính từ các khoản có ngày chi hợp lệ.",
    ) +
    panel(
      "Nội dung cần theo dõi",
      `<div class="grid three">${kpi("Hồ sơ vướng mắc", rows.filter((r) => normalize(r.note).includes("vuong mac")).length, "hồ sơ", "orange", "Theo ghi chú chứa “vướng mắc”")}${kpi("Hồ sơ cưỡng chế", rows.filter((r) => r.enforcement && !["0", "-", "—"].includes(String(r.enforcement).trim())).length, "hồ sơ", "red", "Theo số quyết định cưỡng chế")}${kpi("Hồ sơ ngăn chặn", rows.filter((r) => r.stage === statuses[6]).length, "hồ sơ", "blue", "Theo trạng thái hồ sơ")}</div>`,
    )
  );
}

const views = { overview, btgpmb: listPage, finance, detail, report };
const titles = {
  overview: "Bồi thường, hỗ trợ và giải phóng mặt bằng",
  btgpmb: "Theo dõi tình trạng xử lý và chi trả hồ sơ",
  finance: "Theo dõi dự toán và tiến độ giải chi",
  detail: "Thông tin pháp lý và chi trả",
  report: "Tổng hợp số liệu phục vụ báo cáo",
};
const toggleParams = new URLSearchParams();
if (!demo) toggleParams.set("demo", "1");
const toggle = page + ".html" + (toggleParams.size ? "?" + toggleParams : "");
document.querySelector("#app").innerHTML = `
  <aside class="sidebar">
    <a class="brand brand-metro" href="../index.html">
      <span class="brand-icon" aria-hidden="true">
        <i class="fa-solid fa-train-subway"></i>
      </span>
      <span>
        <strong>Đường Sắt Đô Thị</strong>
        <small>Ga Metro 2</small>
      </span>
    </a>
    <nav aria-label="Điều hướng chính">${Object.entries(pages)
      .map(
        ([key, label], i) =>
          `<a href="${href(key)}" ${page === key ? 'aria-current="page"' : ""}><span aria-hidden="true">${["▦", "▤", "▥", "▧", "▣"][i]}</span>${label}</a>`,
      )
      .join("")}</nav>
    <div class="sidebar-footer">DỰ ÁN GA METRO 2</div>
  </aside>
  <main><div class="topbar"><a href="../index.html">Trang chủ</a><span>/</span><span>${pages[page]}</span></div>
    <div class="content"><header class="page-head"><div><p class="subtitle">${titles[page]}</p><h1>${pages[page]}</h1></div>
    <div class="head-actions">${page === "report" ? '<button class="button" id="print">In / Lưu PDF</button>' : ""}<a class="button mode" href="${toggle}">${demo ? "Dùng dữ liệu Excel" : "Xem mô phỏng"}</a></div></header>
    <div class="data-banner ${demo ? "demo" : ""}"><span><i></i><strong>${demo ? "Dữ liệu mô phỏng" : "Dữ liệu tạm từ Excel"}</strong></span><span>${demo ? "Dùng để xem thử giao diện và tương tác." : "DATA_LOOKER · " + rows.length + " hồ sơ · Ngày hiển thị " + dateLabel(today)}</span></div>
    ${views[page]()}</div>
  </main>`;
if (page === "btgpmb") setupList();
if (page === "report")
  document
    .querySelector("#print")
    .addEventListener("click", () => window.print());
