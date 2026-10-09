import re, os
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, '../noclergy/index.html'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:100]); s = s.replace(old, new)
# 1. The old Today motion (transitions out of .pre, and its own reduced-motion block) gives way to motion.css.
i = s.index('/* Motion, on this section only: numbers count up')
j = s.index('  .dpanel.pre .grow, .dpanel.pre .rise, .pre .dot, .lede-t.wait { opacity: 1; transform: none; filter: none; }\n}\n', i)
s = s[:i] + s[j + len('  .dpanel.pre .grow, .dpanel.pre .rise, .pre .dot, .lede-t.wait { opacity: 1; transform: none; filter: none; }\n}\n'):]
for old, new in [
    ('.lede-t.in { animation: lede-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }\n', ''),
    ('.lede-t.out { animation: lede-out 0.22s cubic-bezier(0.7, 0, 0.84, 0) both; }\n', ''),
    ('@keyframes lede-in { from { opacity: 0; transform: translateY(12px); filter: blur(4px); } }\n', ''),
    ('@keyframes lede-out { to { opacity: 0; transform: translateY(-8px); filter: blur(3px); } }\n', ''),
    ('.pick-b.in { animation: lede-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }\n', ''),
    ('.axt { position: absolute; top: 22px; bottom: 0; border-left: 1px dashed var(--line-2); }', '.axt { position: absolute; top: 22px; bottom: 0; }'),
    ('.axt.one { border-left: 1px solid var(--ink-2); }\n', ''),
    ('transform: scale(0.82); transition: transform 1.1s cubic-bezier(0.16, 1, 0.3, 1) var(--d, 0s), opacity 0.5s ease-out var(--d, 0s); }', 'transform: scale(0.82); }'),
    ('.pre .dot { opacity: 0; transform: translateX(var(--dx, 0px)) scale(0.4); }\n', ''),
    ('.settled .dot { transition: transform 0.18s ease-out; }\n', ''),
]:
    rep(old, new)
# 2. Reduced motion now follows the board's own switch: each @media (prefers-reduced-motion) block becomes rules under
#    :root[data-motion="off"] (or :root:not([data-motion="off"]) for the no-preference one).
def convert(m):
    kind, body = m.group(1), m.group(2)
    pre = ':root[data-motion="off"] ' if kind == 'reduce' else ':root:not([data-motion="off"]) '
    out = []
    for rm in re.finditer(r'([^{}]+)\{([^{}]*)\}', body):
        sels = ', '.join(pre + x.strip() for x in rm.group(1).split(','))
        out.append(sels + ' {' + rm.group(2) + '}')
    return '\n'.join(out)
s, n = re.subn(r'@media \(prefers-reduced-motion: (reduce|no-preference)\)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}', convert, s)
print('media blocks converted', n)
assert 'prefers-reduced-motion' not in re.search(r'<style>(.*?)</style>', s, flags=re.S).group(1)
CSS = open(os.path.join(HERE, 'motion.css'), encoding='utf-8').read()
rep('\n</style>', CSS + '</style>')
# 3. The ticker and the pop-up read the switch instead of the device setting.
rep('''  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!still && frames.length > 1) setTimeout(next, 3600);''', '''  function still() { return document.documentElement.getAttribute("data-motion") === "off"; }
  if (frames.length > 1) setTimeout(next, 3600);''')
rep('    if (paused || document.hidden) { setTimeout(next, 700); return; }', '    if (paused || document.hidden || still()) { setTimeout(next, 700); return; }')
rep('// voice list, so it stays true after each sync. It pauses under the pointer and in a hidden tab, and holds still\n// for anyone who asked their device for reduced motion.',
    '// voice list, so it stays true after each sync. It pauses under the pointer and in a hidden tab, and holds still\n// while the board\'s Animations switch is off.')
rep('  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;\n', '  function still() { return document.documentElement.getAttribute("data-motion") === "off"; }\n')
rep('    if (still) { then(); return; }', '    if (still()) { then(); return; }')
rep('    if (still) { dlg.close(); return; }', '    if (still()) { dlg.close(); return; }')
# 4. Today's script, reworked; the switch and its gate first; the board-wide motion last.
scripts = list(re.finditer(r'<script>(.*?)</script>', s, flags=re.S))
assert len(scripts) == 5, len(scripts)
js4 = scripts[4]
assert 'Today, the daily brief' in js4.group(1)
NEW4 = open(os.path.join(HERE, 'js4.js'), encoding='utf-8').read()
PREF = open(os.path.join(HERE, 'pref.js'), encoding='utf-8').read()
MOT = open(os.path.join(HERE, 'motion.js'), encoding='utf-8').read()
s = s[:js4.start()] + '<script>' + NEW4 + '</script>\n<script>' + MOT + '</script>' + s[js4.end():]
first = s.index('<script>')
s = s[:first] + '<script>' + PREF + '</script>\n' + s[first:]
for bad in ('—', '\x00'):
    assert bad not in CSS and bad not in NEW4 and bad not in PREF and bad not in MOT, repr(bad)
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
open(os.path.join(HERE, 'test.html'), 'w', encoding='utf-8').write(SK[:SK.index('<body>') + 6] + '\n' + s + '</body></html>')
for k, js in enumerate(re.findall(r'<script>(.*?)</script>', s, flags=re.S)):
    open(os.path.join(HERE, f'js{k}.check.js'), 'w', encoding='utf-8').write(js)
print('ok', len(s))
