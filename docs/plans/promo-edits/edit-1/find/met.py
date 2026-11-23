# Searches The Met's open collection for public-domain (Open Access, CC0) pictures of the old world's idols.
import json, sys, urllib.request, urllib.parse, time, os
API='https://collectionapi.metmuseum.org/public/collection/v1/'
def get(u):
    for k in range(3):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=30))
        except Exception as e:
            err=e; time.sleep(1.5)
    return {'error':str(err)}
Q=sys.argv[1:]
seen=json.load(open('find/met.json')) if os.path.exists('find/met.json') else {}
for q in Q:
    r=get(API.replace('/v1/','/v1.1/')+'search?hasImages=true&limit=16&q='+urllib.parse.quote(q))
    ids=(r.get('objectIDs') or [])[:14]
    n=0
    for i in ids:
        if str(i) in seen: o=seen[str(i)]
        else:
            o=get(API+f'objects/{i}')
            if 'error' in o or 'objectID' not in o: continue
            o={k:o.get(k) for k in ('objectID','isPublicDomain','title','objectDate','culture','period','medium','department','classification','primaryImage','primaryImageSmall','objectURL','repository')}
            seen[str(i)]=o
        if not o['isPublicDomain'] or not o['primaryImageSmall']: continue
        if o['department'] not in ('Egyptian Art','Greek and Roman Art','Ancient Near Eastern Art','Ancient West Asian Art','Medieval Art','Drawings and Prints','European Sculpture and Decorative Arts','Arms and Armor'): continue
        print(f"{q:22.22} | {o['objectID']} | {o['title'][:70]} | {o['objectDate'][:28]} | {(o['culture'] or '')[:18]} | {o['classification'][:20] if o['classification'] else ''}")
        n+=1
        if n>=4: break
    if 'error' in r: print(q,'ERR',r['error'])
json.dump(seen,open('find/met.json','w'))
