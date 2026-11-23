# Cleveland Museum of Art, Open Access (CC0): the record and a web-size copy of each object asked for.
import json, sys, os, urllib.request
UA={'User-Agent':'promo-storyboard-script/1.0 (public-domain picture research)'}
D=json.load(open('find/cma.json')) if os.path.exists('find/cma.json') else {}
for i in sys.argv[1:]:
    if i in D: continue
    d=json.load(urllib.request.urlopen(urllib.request.Request(f'https://openaccess-api.clevelandart.org/api/artworks/{i}',headers=UA),timeout=40))['data']
    D[i]={k:d.get(k) for k in ('id','accession_number','title','creation_date','culture','type','share_license_status','url')}
    D[i]['web']=d['images']['web']['url']; D[i]['print']=d['images'].get('print',{}).get('url')
    open(f'find/img/c{i}.jpg','wb').write(urllib.request.urlopen(urllib.request.Request(D[i]['web'],headers=UA),timeout=60).read())
    print(i,D[i]['share_license_status'],D[i]['title'][:60])
json.dump(D,open('find/cma.json','w'),indent=1)
