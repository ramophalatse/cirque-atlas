"""Convert official catalogue, tour and offer responses into the public snapshot."""
import json, re, sys
from datetime import datetime
from pathlib import Path
from html import unescape

def clean(s):
    return re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ',unescape(str(s or '')))).strip()

def normalize(raw, supplements=None):
    rows=[]
    if len(raw['shows'])!=raw['catalogueCount']:raise ValueError('Incomplete catalogue')
    for item in raw['shows']:
        slug=item['slug']
        if not item['tour'].get('content'):raise ValueError(f'Missing tour data {slug}')
        for show in item['tour'].get('content',[]):
            for group in show.get('tourData',[]):
                for run in group.get('schedule',[]):
                    rid=str(run['runId']); url=run['runCityCta']['link']
                    graphs=item.get('ticketDocs',{}).get(rid,[])+item['graphs']
                    city=run['runCityCta']['label'].split(',')[0]
                    events=[e for e in graphs if e.get('@type') in ('Event','PerformingArtsEvent') and e.get('location',{}).get('address',{}).get('addressLocality','').casefold()==city.casefold()]
                    if not events: raise ValueError(f'Missing venue for {slug}/{rid}/{city}')
                    ev=events[0];loc=ev['location'];geo=loc.get('geo',{})
                    if not geo:raise ValueError(f'Missing coordinates {slug}/{rid}')
                    offerData=item.get('offers',{}).get(rid,{})
                    currency='';starting=None
                    tracking=run.get('tracking',{}).get('tourplanPlanMyEvent',{}).get('ga4',[{}])[0].get('show',{})
                    currency=tracking.get('starting_price_currency','').upper()
                    value=tracking.get('starting_price','')
                    if value and float(value)>0:starting=float(value)
                    for e in events:
                        of=e.get('offers',{})
                        if of.get('price') and float(of['price'])>0:
                            starting=starting or float(of['price']);currency=currency or of.get('priceCurrency','')
                    offers=[]
                    for g in offerData.get('saleOfferTypes',[]):
                        for o in g.get('saleOffers',[]):
                            if o.get('isHidden'):continue
                            title=clean(o['title']);description=clean(o.get('description'))
                            conditions=[clean(c['label']) for c in (o.get('offerConditions') or {}).get('conditions',[]) if not c.get('isHidden')]
                            offer={'title':title,'description':description,'category':clean(g['label']),'price':clean(o.get('price')),'text':clean(o.get('offerText')),'terms':clean(o.get('popoverContent')),'conditions':conditions,'url':o.get('primaryCtaLink') or url,'dateNote':clean(o.get('secondaryOfferDateText'))}
                            # This is an advertised discount, never a derived promotional ticket amount.
                            if not offer['url'].startswith('https://'):offer['url']=url
                            offer['promotion']=bool(re.search(r'black friday|save|discount|%|kids ticket|family|special.*offer',title+' '+description,re.I))
                            offer['groupOnly']=g['label'].lower()=='groups' or bool(re.search(r'group offer',title,re.I))
                            offer['upgrade']=bool(re.search(r'upgrade|wristband|meet our artists|backstage.*tour',title+' '+description,re.I))
                            offers.append(offer)
                    regular=next((o for o in offers if o['title'].lower()=='regular tickets'),{})
                    aggregate=next((e.get('offers') for e in events if e.get('offers',{}).get('lowPrice') and e.get('offers',{}).get('highPrice')),None)
                    price=regular.get('price') or (f'From {starting:g} {currency}' if starting else '')
                    if aggregate:
                        price=f"{aggregate.get('priceCurrency',currency)} {aggregate['lowPrice']}–{aggregate['highPrice']}"
                    if not currency:
                        currency={'US':'USD','CA':'CAD','MX':'MXN','AU':'AUD','JP':'JPY','UK':'GBP','BR':'BRL','CL':'CLP','CH':'CHF','HU':'HUF'}.get(loc['address']['addressCountry'],'EUR')
                    kind='resident' if show.get('showType')=='RSD' or slug in ('joya','ludo') else ('seasonal' if slug=='twas-the-night-before' else 'tour')
                    row={'id':rid,'slug':slug,'name':clean(show['showName']).replace('Cirque du Soleil ',''),'city':run['runCityCta']['label'],'country':loc['address']['addressCountry'],'venue':clean(run['runFacilityCta']['label']),'address':clean(loc['address'].get('streetAddress')),'lat':float(geo['latitude']),'lng':float(geo['longitude']),'kind':kind,'start':ev.get('startDate') or None,'end':ev.get('endDate') or None,'dates':run['runDateRange'],'status':run['showStatus'],'isPlaying':run['isPlaying'],'comingSoon':run['isComingSoon'],'currency':currency,'startingPrice':starting,'price':price,'priceNote':'Advertised starting price; upper range unpublished. Select a date and seats for the total.' if price else 'Price range is not published in the show feed. Check the official ticket calendar.','bookingUrl':url,'showUrl':show['showPage'],'image':offerData.get('showThumbnailSrc') or show.get('showThumbnailSrc'),'imageAlt':offerData.get('showThumbnailAltText') or show.get('showThumbnailAltText') or show['showName'],'offers':offers}
                    # A dated engagement with no dates in structured data (new resident/seasonal cast).
                    if not row['start'] and kind!='resident':
                        match=re.fullmatch(r'([A-Za-z]{3} \d{1,2}) - ([A-Za-z]{3} \d{1,2}), (\d{4})',run['runDateRange'])
                        if match:
                            row['start']=datetime.strptime(match[1]+' '+match[3],'%b %d %Y').date().isoformat()
                            row['end']=datetime.strptime(match[2]+' '+match[3],'%b %d %Y').date().isoformat()
                        elif not run['isComingSoon']:raise ValueError(f'Missing dates {slug}/{rid}')
                    sup=(supplements or {}).get(rid)
                    if sup:row['supplement']=sup
                    rows.append(row)
    if len(rows)<50:raise ValueError('Suspiciously small snapshot')
    if len({r['id'] for r in rows})!=len(rows):raise ValueError('Duplicate runs')
    return {'checkedAt':raw['checkedAt'],'catalogueCount':raw['catalogueCount'],'sources':['https://www.cirquedusoleil.com/shows','https://www.cirquedusoleil.com/campaign/black-friday'],'runs':rows}

if __name__=='__main__':
    raw=json.loads(Path(sys.argv[1]).read_text())
    supplements=json.loads(Path(__file__).with_name('supplements.json').read_text())
    out=normalize(raw,supplements)
    target=Path(sys.argv[2]);temp=target.with_suffix('.tmp');temp.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');temp.replace(target)
    print(f"Validated {len(out['runs'])} runs from {out['catalogueCount']} shows")
