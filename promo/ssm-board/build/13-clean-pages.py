import re, os
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, '../motion/index.html'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:100]); s = s.replace(old, new)
CSS = open(os.path.join(HERE, 'pages.css'), encoding='utf-8').read()
JS = open(os.path.join(HERE, 'pages.js'), encoding='utf-8').read()
rep('\n</style>', CSS + '</style>')
assert s.rstrip().endswith('</script>')
s = s.rstrip() + '\n<script>' + JS + '</script>\n\n'
for bad in ('—', '\x00'):
    assert bad not in CSS and bad not in JS, repr(bad)
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
open(os.path.join(HERE, 'test.html'), 'w', encoding='utf-8').write(SK[:SK.index('<body>') + 6] + '\n' + s + '</body></html>')
for k, js in enumerate(re.findall(r'<script>(.*?)</script>', s, flags=re.S)):
    open(os.path.join(HERE, f'js{k}.check.js'), 'w', encoding='utf-8').write(js)
print('ok', len(s))
