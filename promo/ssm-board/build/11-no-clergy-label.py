import re, os
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, '../dash/index.html'), encoding='utf-8').read()
def rep(old, new):
    global s
    c = s.count(old); assert c == 1, (c, old[:90]); s = s.replace(old, new)
# Owner, Oct 8: "Remove the clergy check notification." The label goes from the voice list and from Today's pick, and
# the "Clergy check" lines go from the What to say text shown under each idea. The ideas keep their clergy flag in the
# store, unshown, so this is one line to undo.
rep('          if (r.clergy) tags.appendChild(mk("span", "pill warn", "Clergy check first"));\n', '')
rep('say.appendChild(mk("p", "say", r.text.replace(/^\\u2b50\\ufe0f?\\s*/, "")));',
    'say.appendChild(mk("p", "say", r.text.replace(/^\\u2b50\\ufe0f?\\s*/, "").replace(/(^|\\s)[^.!?]*\\bclergy check\\b[^.!?]*\\.(?=\\s|$)/gi, "$1").replace(/\\s{2,}/g, " ").trim()));')
rep('    if (r.clergy) tags.appendChild(mk("span", "pill warn", "Clergy check first"));\n', '')
assert 'Clergy check first' not in s
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
open(os.path.join(HERE, 'test.html'), 'w', encoding='utf-8').write(SK[:SK.index('<body>') + 6] + '\n' + s + '</body></html>')
for n, js in enumerate(re.findall(r'<script>(.*?)</script>', s, flags=re.S)):
    open(os.path.join(HERE, f'js{n}.check.js'), 'w', encoding='utf-8').write(js)
print('ok', len(s))
