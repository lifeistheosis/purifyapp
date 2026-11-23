# For each Met object, finds the same Open Access photograph on Wikimedia Commons (the Met's own image number is in
# the file's name there), and reads the licence the Commons page states. Fetches a small copy for the contact sheet.
import json, sys, os, time, urllib.request, urllib.parse, urllib.error
UA={'User-Agent':'promo-storyboard-script/1.0 (public-domain picture research)'}
API='https://commons.wikimedia.org/w/api.php?format=json&'
def raw(u):
    # Wikimedia asks a script to slow down with 429 and Retry-After; this waits as asked.
    for k in range(6):
        try:
            return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code!=429: raise
            time.sleep(int(e.headers.get('Retry-After','20'))+2)
    raise SystemExit('still limited')
def get(u):
    return json.loads(raw(u))
seen=json.load(open('find/met.json'))
C=json.load(open('find/commons.json')) if os.path.exists('find/commons.json') else {}
for i in sys.argv[1:]:
    if i in C and C[i].get('thumb_ok'): continue
    code=os.path.splitext(os.path.basename(seen[i]['primaryImage']))[0]
    r=get(API+'action=query&generator=search&gsrnamespace=6&gsrlimit=3&gsrsearch='+urllib.parse.quote(f'"{code}"')+'&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=320')
    pages=list((r.get('query') or {}).get('pages',{}).values())
    pages=[p for p in pages if code.lower() in p['title'].lower()]
    if not pages: print(i,code,'NOT ON COMMONS'); C[i]={'code':code,'found':False}; continue
    p=pages[0]; ii=p['imageinfo'][0]; em=ii['extmetadata']
    C[i]={'code':code,'found':True,'title':p['title'],'page':ii['descriptionurl'],'licence':em.get('LicenseShortName',{}).get('value'),'w':ii['width'],'h':ii['height'],'thumb':ii['thumburl']}
    try:
        time.sleep(1.5); open(f'find/img/{i}.jpg','wb').write(raw(ii['thumburl'])); C[i]['thumb_ok']=True
    except Exception as e: print(i,'thumb fail',e)
    print(i,C[i]['licence'],f"{ii['width']}x{ii['height']}",p['title'][:70]); time.sleep(1.5); json.dump(C,open('find/commons.json','w'),indent=1)
json.dump(C,open('find/commons.json','w'),indent=1)
