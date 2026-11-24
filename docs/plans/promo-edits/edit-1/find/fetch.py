# Fetches working copies from Wikimedia Commons at a standard width, with the licence each page states.
# A line is  name|File:Title|width   or   ?name|search words   (the first four hits, small, into cand/).
import json, sys, os, time, urllib.request, urllib.parse, urllib.error
UA={'User-Agent':'promo-storyboard-script/1.0 (public-domain picture research)'}
API='https://commons.wikimedia.org/w/api.php?format=json&'
def raw(u):
    for k in range(8):
        try: return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=90).read()
        except urllib.error.HTTPError as e:
            if e.code!=429: raise
            time.sleep(int(e.headers.get('Retry-After','20'))+2)
    raise SystemExit('still limited')
R=json.load(open('find/fetched.json')) if os.path.exists('find/fetched.json') else {}
def info(ii): 
    em=ii['extmetadata']; g=lambda k:(em.get(k,{}).get('value') or '')[:160]
    return {'page':ii['descriptionurl'],'licence':g('LicenseShortName'),'artist':g('Artist'),'credit':g('Credit'),'w':ii['width'],'h':ii['height'],'thumb':ii['thumburl'],'tw':ii['thumbwidth']}
for line in sys.argv[1:]:
    if line.startswith('?'):
        name,q=line[1:].split('|')
        r=json.loads(raw(API+'action=query&generator=search&gsrnamespace=6&gsrlimit=5&gsrsearch='+urllib.parse.quote(q+' filetype:bitmap')+'&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=330'))
        for k,p in enumerate(sorted((r.get('query') or {}).get('pages',{}).values(),key=lambda p:p.get('index',0))):
            d=info(p['imageinfo'][0]); d['title']=p['title']; R[f'{name}{k}']=d
            if 'thumb.wikimedia.org' not in d['thumb']: continue   # a page of a scanned book: its host turns scripts away
            time.sleep(1.5); open(f'cand/{name}{k}.jpg','wb').write(raw(d['thumb'])); print(f'{name}{k}',d['licence'],f"{d['w']}x{d['h']}",p['title'][:80])
    elif line.startswith('!'):
        # !name|search words|a word its title must hold : the largest picture among the first hits, at 1920 or the step under it
        name,q,must=line[1:].split('|')
        if os.path.exists(f'raw/{name}.jpg') and name in R: continue
        r=json.loads(raw(API+'action=query&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch='+urllib.parse.quote(q+' filetype:bitmap')+'&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1920'))
        yes=[m for m in must.lower().split(',') if not m.startswith('-')]; no=[m[1:] for m in must.lower().split(',') if m.startswith('-')]
        ps=[p for p in (r.get('query') or {}).get('pages',{}).values() if all(m in p['title'].lower() for m in yes) and not any(m in p['title'].lower() for m in no)]
        if not ps: print(name,'NOTHING FOUND'); continue
        p=max(ps,key=lambda p:p['imageinfo'][0]['width'])
        for w in (1280,960,500,330):   # a file under 1920 wide: the widest standard step under its own width
            if 'thumb.wikimedia.org' in p['imageinfo'][0]['thumburl']: break
            time.sleep(1.5)
            p=list(json.loads(raw(API+'action=query&titles='+urllib.parse.quote(p['title'])+f'&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth={w}'))['query']['pages'].values())[0]
        if 'thumb.wikimedia.org' not in p['imageinfo'][0]['thumburl']: print(name,'TOO SMALL',p['title'][:70]); continue
        d=info(p['imageinfo'][0]); d['title']=p['title']; R[name]=d
        time.sleep(1.5); open(f'raw/{name}.jpg','wb').write(raw(d['thumb'])); print(name,d['licence'],f"{d['w']}x{d['h']} at {d['tw']}",p['title'][:90])
    else:
        name,title,width=line.split('|')
        if os.path.exists(f'raw/{name}.jpg') and name in R: continue
        # A width at or over the original's is answered with the original itself, from a host that turns scripts away;
        # so the widest standard step under the original's width is asked for.
        for w in [s for s in (3840,1920,1280,960,500,330) if s<=int(width)]:
            r=json.loads(raw(API+'action=query&titles='+urllib.parse.quote(title)+f'&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth={w}'))
            p=list(r['query']['pages'].values())[0]
            if 'imageinfo' not in p or 'thumb.wikimedia.org' in p['imageinfo'][0]['thumburl']: break
            time.sleep(1.5)
        if 'imageinfo' not in p: print(name,'NO SUCH FILE',title); continue
        d=info(p['imageinfo'][0]); d['title']=p['title']; R[name]=d
        time.sleep(1.5); open(f'raw/{name}.jpg','wb').write(raw(d['thumb'])); print(name,d['licence'],f"{d['w']}x{d['h']} at {d['tw']}",p['title'][:70])
    json.dump(R,open('find/fetched.json','w'),indent=1); time.sleep(1.5)
