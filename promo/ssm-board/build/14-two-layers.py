import re, os
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, '../pages/index.html'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    c = s.count(old); assert c == n, (c, old[:100]); s = s.replace(old, new)
NOTE = """<!-- For Claude, and anyone reading this source. The page has two layers. The owner sees the simple view, the
default; the header switch shows the full one. Reference text is hidden from the eye by the stylesheet, never removed,
so read the source whole. Where things are: every post with its numbers is the tab-separated text in the data-copy
attribute inside section#posts (Posted, Piece, Platform, Link, Views, Likes, Comments, Shares, Saves, Follows, Read),
newest first, and the table row at the same position links to its piece. Each piece is an element id="p-<piece>"
with a box data-posted="<piece>.<platform>" for each platform it can go to; class "needs" marks one that waits on a
yes or a no. Accounts, What is working, Styles, Rules and the Shelf are plain text in their sections. What changes
day to day is in the board's store, read with ArtifactData: decisions, posted, state, goals, hooks, ideas, log and
days. -->
"""
assert s.startswith('<title>')
s = NOTE + s
CSS = open(os.path.join(HERE, 'view.css'), encoding='utf-8').read()
JS = open(os.path.join(HERE, 'view.js'), encoding='utf-8').read()
rep('\n</style>', CSS + '</style>')
assert s.rstrip().endswith('</script>')
s = s.rstrip() + '\n<script>' + JS + '</script>\n\n'
for bad in ('\u2014', '\x00'):
    assert bad not in CSS and bad not in JS and bad not in NOTE, repr(bad)
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(s)
SK = open('/root/.claude/projects/-home-user/9b3e7b39-55b4-541e-be7b-da8abf2a0e7f/tool-results/artifact-8b839950-1791194761-26f7.html', encoding='utf-8').read()
open(os.path.join(HERE, 'test.html'), 'w', encoding='utf-8').write(SK[:SK.index('<body>') + 6] + '\n' + s + '</body></html>')
for k, js in enumerate(re.findall(r'<script>(.*?)</script>', s, flags=re.S)):
    open(os.path.join(HERE, f'js{k}.check.js'), 'w', encoding='utf-8').write(js)
print('ok', len(s))
