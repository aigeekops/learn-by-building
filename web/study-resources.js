/* Study resources board: lists Agent / Robotics free learning materials and
   renders the markdown detail in-browser (zero dependency). */
let SR_FILTER = "all";
let SR_OPEN = null;

function renderMarkdown(src) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inline = s => esc(s)
    .replace(/\\\*/g, "*")
    .replace(/`([^`]+)`/g, (m, c) => "<code>" + c + "</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1 ↗</a>')
    .replace(/(^|[\s（(：、，。])(https?:\/\/[^\s)<>，。、）\]]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2 ↗</a>');
  const lines = String(src || "").replace(/\r\n/g, "\n").split("\n");
  const isSep = r => /^[|\s:.-]+$/.test(r) && r.includes("-");
  const parseRow = r => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(c => c.trim());
  let html = "", i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (t === "") { i++; continue; }
    if (/^---+$/.test(t)) { html += "<hr>"; i++; continue; }
    if (/^```/.test(t)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(esc(lines[i])); i++; }
      i++; html += '<pre class="md-pre"><code>' + buf.join("\n") + "</code></pre>"; continue;
    }
    const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (h) { const lv = h[1].length; html += "<h" + lv + ' class="md-h md-h' + lv + '">' + inline(h[2]) + "</h" + lv + ">"; i++; continue; }
    if (/^\s*>\s?/.test(line)) {
      const buf = []; while (i < lines.length && /^\s*>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      html += '<blockquote class="md-quote">' + inline(buf.join(" ")) + "</blockquote>"; continue;
    }
    if (t.startsWith("|") && t.indexOf("|", 1) !== -1) {
      const rows = []; while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(lines[i].trim()); i++; }
      const head = parseRow(rows[0]);
      const body = rows.slice(1).filter(r => !isSep(r)).map(parseRow);
      html += '<div class="md-table-wrap"><table class="md-table"><thead><tr>' + head.map(c => "<th>" + inline(c) + "</th>").join("") + "</tr></thead><tbody>" + body.map(r => "<tr>" + r.map(c => "<td>" + inline(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const buf = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\s*[-*]\s+/, "")); i++; }
      html += '<ul class="md-ul">' + buf.map(b => "<li>" + inline(b) + "</li>").join("") + "</ul>"; continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\s*\d+\.\s+/, "")); i++; }
      html += '<ol class="md-ol">' + buf.map(b => "<li>" + inline(b) + "</li>").join("") + "</ol>"; continue;
    }
    const buf = [line]; i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^\s*(#{1,6}\s|>\s?|\||[-*]\s|\d+\.\s|```)/.test(lines[i]) && !/^---+$/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
    html += '<p class="md-p">' + inline(buf.join(" ")) + "</p>";
  }
  return html;
}

function srTags(r) {
  const raw = r && r.tags;
  const list = Array.isArray(raw) ? raw : (typeof raw === "string" && raw.trim() ? raw.split(/[,，、]/) : []);
  const tags = list.map(t => String(t).trim()).filter(Boolean);
  return tags.length ? '<span class="sr-tags">' + tags.map(t => '<span class="sr-tag">' + esc(t) + "</span>").join("") + "</span>" : "";
}

function renderResourceDetail(r) {
  return heading("STUDY RESOURCES", "学习资料 · " + r.title, "",
      btn("← 返回列表", "sr-back", "", "small"))
    + '<article class="sr-detail">'
    + '<div class="sr-detail-meta"><span class="sr-badge ' + r.category + '">' + (r.category === "agent" ? "Agent 工程" : "机器人工程") + "</span>"
    + srTags(r)
    + '<span class="sr-date">' + esc(r.added || "") + "</span>"
    + (r.source_article ? '<span class="sr-src">来源：' + esc(r.source_article) + "</span>" : "")
    + "</div>"
    + renderMarkdown(r.content || "（暂无正文）")
    + "</article>";
}

function renderStudyResources() {
  const data = (typeof S !== "undefined" && S.study_resources) || { resources: [] };
  const list = data.resources || [];
  if (SR_OPEN) {
    const r = list.find(x => x.id === SR_OPEN);
    if (r) return renderResourceDetail(r);
  }
  if (!list.length) {
    return heading("STUDY RESOURCES", "学习资料", "公众号「极客行动」每篇文章附带的免费学习资料会集中在这里。", "")
      + empty("还没有资料", "用 scripts/transfer_study_resource.py 把章节地图、笔记或链接合集搬进来。");
  }
  const cats = [["all", "全部"], ["agent", "Agent 工程"], ["robotics", "机器人工程"]];
  const filtered = SR_FILTER === "all" ? list : list.filter(r => r.category === SR_FILTER);
  return heading("STUDY RESOURCES", "学习资料", "公众号「极客行动」每篇文章附带的免费学习资料，按方向分类。",
      cats.map(([k, l]) => btn(l, "sr-filter", k, "small" + (SR_FILTER === k ? " is-active" : ""))).join(""))
    + '<div class="sr-grid">'
    + filtered.map(r => '<article class="sr-card"><div class="sr-card-head"><span class="sr-badge ' + r.category + '">' + (r.category === "agent" ? "Agent 工程" : "机器人工程") + "</span>"
        + '<span class="sr-date">' + esc(r.added || "") + "</span></div>"
        + "<h3>" + esc(r.title) + "</h3>"
        + srTags(r)
        + '<p class="sr-note">' + esc(r.note || "") + "</p>"
        + '<div class="actions">' + btn("查看资料", "sr-open", r.id, "small primary") + "</div></article>").join("")
    + "</div>";
}

document.addEventListener("click", e => {
  const b = e.target.closest('[data-action^="sr-"]');
  if (!b) return;
  const action = b.dataset.action, id = b.dataset.id;
  if (action === "sr-open") { SR_OPEN = id; render(); window.scrollTo(0, 0); }
  else if (action === "sr-back") { SR_OPEN = null; render(); window.scrollTo(0, 0); }
  else if (action === "sr-filter") { SR_FILTER = id || "all"; render(); }
});
