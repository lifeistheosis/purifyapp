import re
from urllib.parse import quote
SRC = '/tmp/claude-0/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/scratchpad/bw/index.html'
s = open(SRC, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    c = s.count(old); assert c == count, (c, old[:80]); s = s.replace(old, new)

# Platform marks: the app's own TikTok, Instagram and YouTube icons (components/ui/icons, SocialLinkIcon), plus a Shorts mark drawn to match.
NS = "xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'"
ST = "fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'"
SVG = {
 'tiktok': f"<svg {NS}><path fill='black' d='M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z'/></svg>",
 'instagram': f"<svg {NS} {ST}><rect x='3' y='3' width='18' height='18' rx='5'/><circle cx='12' cy='12' r='4.25'/><circle cx='17.25' cy='6.75' r='1.1' fill='black' stroke='none'/></svg>",
 'youtube': f"<svg {NS} {ST}><rect x='2.5' y='5.5' width='19' height='13' rx='4'/><path d='M10.5 9.5v5l4.2-2.5z' fill='black' stroke='none'/></svg>",
 'shorts': f"<svg {NS} {ST}><rect x='6' y='2' width='12' height='20' rx='4'/><path d='M10 8.6v6.8l5.4-3.4z' fill='black' stroke='none'/></svg>",
}
ICONS = '\n'.join(f'.ico-{k} {{ --ico: url("data:image/svg+xml,{quote(v, safe="")}"); }}' for k, v in SVG.items())
CSS_ADD = '''
/* Platform marks instead of platform names (owner, Oct 8). One colour, so they follow the ink. */
.ico { display: inline-block; width: 18px; height: 18px; flex: none; background: currentColor; -webkit-mask: var(--ico) center / contain no-repeat; mask: var(--ico) center / contain no-repeat; vertical-align: -3px; }
''' + ICONS + '''
.where.pf { display: inline-flex; align-items: center; border: 0; padding: 0 2px; color: var(--ink-2); }
.slot .stack { display: flex; align-items: center; gap: 8px; }
.btn .ico, .chip .ico, .pill .ico { width: 15px; height: 15px; vertical-align: -2px; }
.where.pf.on { color: var(--ink); }
.pfh { display: inline-flex; align-items: center; color: var(--ink); }
.pfh .ico { width: 20px; height: 20px; }
a.pfa { display: inline-flex; align-items: center; color: var(--ink); padding: 2px; }
th .ico { width: 17px; height: 17px; color: var(--ink); }
.pfi { display: inline-flex; align-items: center; color: var(--ink-2); padding: 0 1px; }
.vtags { align-items: center; }
/* One part of the board at a time (owner, Oct 8: "I want it all minimized"). Without the script every section shows. */
:root[data-tabs="1"]:not([data-deck="1"]) main > section:not(.on) { display: none; }
.jump a.on { color: var(--ink); background: var(--panel-2); font-weight: 600; }
header h1, header > div:nth-of-type(2), footer { display: none; }
main > header { margin-bottom: 12px; }
:root[data-tabs="1"] .say, :root[data-tabs="1"] .ask p, :root[data-tabs="1"] .why { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
:root[data-tabs="1"] .vt .say, :root[data-tabs="1"] .vnotes .say { display: block; -webkit-line-clamp: unset; overflow: visible; }
@media (min-width: 1100px) {
  :root[data-tabs="1"] .say, :root[data-tabs="1"] .ask p, :root[data-tabs="1"] .why { -webkit-line-clamp: 1; }
  :root[data-tabs="1"] .vt .say, :root[data-tabs="1"] .vnotes .say { -webkit-line-clamp: unset; }
  main > header { margin-bottom: 28px; }
}
'''
rep('\n</style>', CSS_ADD + '</style>')

P = '(TikTok|Instagram|YouTube)'
def ico(n): return f'<i class="ico ico-{n.lower()}"></i>'
def img(n, label=None): return f'role="img" aria-label="{label or n}" title="{label or n}"'
counts = {}
def sub(pat, fn, key):
    global s
    s, k = re.subn(pat, fn, s); counts[key] = k
sub(r'<span class="where on">✓ ' + P + '</span>', lambda m: f'<span class="where on pf" {img(m[1], "Posted on " + m[1])}>{ico(m[1])}</span>', 'where on')
sub(r'<span class="where\s*">' + P + '</span>', lambda m: f'<span class="where pf" {img(m[1])}>{ico(m[1])}</span>', 'where')
sub(r'<span class="pill violet">' + P + '</span>', lambda m: f'<span class="pfh" {img(m[1])}>{ico(m[1])}</span>', 'pill')
sub(r'<a((?:(?!class=|title=)[^>])*)>' + P + '</a>', lambda m: f'<a{m[1]} class="pfa" title="{m[2]}" aria-label="{m[2]}"><i class="ico ico-{m[2].lower()}" aria-hidden="true"></i></a>', 'a')
sub(r'<td>' + P + '</td>', lambda m: f'<td title="{m[1]}"><i class="ico ico-{m[1].lower()}" {img(m[1])}></i></td>', 'td')
sub(r'<th class="c">' + P + '</th>', lambda m: f'<th class="c" title="{m[1]}"><i class="ico ico-{m[1].lower()}" {img(m[1])}></i></th>', 'th')
def lead(m):
    if m[1].lower() == 'option': return m[0]
    return f'<{m[1]}{m[2]}><i class="ico ico-{m[3].lower()}" {img(m[3])}></i> '
sub(r'<(\w+)([^>]*)>(TikTok|Instagram|YouTube): ', lead, 'lead')
sub(r'>For (Instagram|YouTube|TikTok) (\d+)<', lambda m: f'>For <i class="ico ico-{m[1].lower()}" {img(m[1])}></i> {m[2]}<', 'for')
sub(r'>Next on (TikTok|Instagram|YouTube)<', lambda m: f'>Next on <i class="ico ico-{m[1].lower()}" {img(m[1])}></i><', 'next')
left = [m for m in re.findall(r'<(\w+)[^>]*>\s*(?:✓ )?' + P + r'\s*</\1>', s) if m[0] != 'option']
rep('<a href="#voice">Voice list</a>', '')

rep('    function mk(tag, cls, text) {', '''    var PFI = { TikTok: "tiktok", Instagram: "instagram", YouTube: "youtube", Shorts: "shorts" };
    function pfIcon(p) {
      if (!PFI[p]) return mk("span", "pill", p);
      var name = p === "Shorts" ? "YouTube Shorts" : p, w = mk("span", "pfi"), i = mk("i", "ico ico-" + PFI[p]);
      w.title = name; w.setAttribute("role", "img"); w.setAttribute("aria-label", name);
      w.appendChild(i);
      return w;
    }
    function mk(tag, cls, text) {''')
rep('r.pf.forEach(function (p) { tags.appendChild(mk("span", "pill", p)); });', 'r.pf.forEach(function (p) { tags.appendChild(pfIcon(p)); });')

TABS = '''<script>
// Tabs (Oct 8, owner: "I don't want to scroll down and see a bunch of titles and a bunch of text"). The
// sections list shows one part of the board at a time; any #link opens the part that holds its target.
// Without this script the page shows every section, as before. Port it into ssm/ with the voice list.
(function () {
  var root = document.documentElement, main = document.querySelector("main"), nav = document.querySelector(".jump");
  if (!main || !nav || !main.closest) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var tabs = links.map(function (a) { return a.getAttribute("href").slice(1); });
  var secs = Array.prototype.slice.call(main.children).filter(function (e) { return e.tagName === "SECTION"; });
  var JOIN = { audience: "accounts", "The funnel": "works", "What goes where": "works" };
  var last = tabs[0];
  secs.forEach(function (sec) {
    var h = sec.querySelector("h2"), name = h ? h.textContent.trim() : "";
    var tab = tabs.indexOf(sec.id) !== -1 ? sec.id : (JOIN[sec.id] || JOIN[name] || last);
    sec.setAttribute("data-tab", tab);
    if (tabs.indexOf(sec.id) !== -1) last = sec.id;
  });
  function show(tab, target) {
    if (tabs.indexOf(tab) === -1) tab = tabs[0];
    secs.forEach(function (s) { s.classList.toggle("on", s.getAttribute("data-tab") === tab); });
    links.forEach(function (a) {
      var on = a.getAttribute("href") === "#" + tab;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    try { window.localStorage.setItem("ssm.tab", tab); } catch (e) { /* a private window: the tab is not remembered */ }
    if (target) target.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
  }
  function home(el) { while (el && el.parentNode !== main) el = el.parentNode; return el && el.tagName === "SECTION" ? el : null; }
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute("href").slice(1), el = id && document.getElementById(id), sec = home(el);
    if (!sec) return;
    ev.preventDefault();
    show(sec.getAttribute("data-tab"), el === sec ? null : el);
  });
  all = null;
  Array.prototype.forEach.call(document.querySelectorAll(".say, .ask p, .why"), function (e) { if (!e.title) e.title = e.textContent.trim(); });
  root.setAttribute("data-tabs", "1");
  var id0 = window.location.hash.slice(1), el0 = id0 && document.getElementById(id0), sec0 = home(el0), kept = null;
  try { kept = window.localStorage.getItem("ssm.tab"); } catch (e) { kept = null; }
  show(sec0 ? sec0.getAttribute("data-tab") : (kept || tabs[0]), sec0 && el0 !== sec0 ? el0 : null);
})();
</script>'''
TABS = TABS.replace('  all = null;\n', '')
i = s.rindex('</script>') + len('</script>')
s = s[:i] + '\n' + TABS + s[i:]
assert '—' not in CSS_ADD + TABS and '\x00' not in s
open('index.html', 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
open('test.html', 'w', encoding='utf-8').write(SK[:SK.index('<body>') + 6] + '\n' + s + '</body></html>')
scripts = re.findall(r'<script>(.*?)</script>', s, flags=re.S)
for n, js in enumerate(scripts): open(f'js{n}.js', 'w', encoding='utf-8').write(js)
print('replaced', counts, '| labels left (not options):', left[:6], '| scripts', len(scripts))
