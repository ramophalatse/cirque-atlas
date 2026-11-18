async () => {
 const base='https://www.cirquedusoleil.com';
 const parse=html=>new DOMParser().parseFromString(html,'text/html');
 const unpack=v=>[v,...(v['@graph']||[]).flatMap(unpack),...(v.mainEntity?[v.mainEntity].flat().flatMap(unpack):[])];
 const getHTML=async path=>{const r=await fetch(new URL(path,base));if(!r.ok)throw Error(`${path}: ${r.status}`);return parse(await r.text());};
 const catalog=await getHTML('/shows');
 const slugs=[...new Set([...catalog.querySelectorAll('default-card[link]')].map(x=>x.getAttribute('link').slice(1)))];
 if(slugs.length<15)throw Error('Incomplete catalogue');
 const shows=[];
 for(const slug of slugs){
  const doc=await getHTML('/'+slug),api=doc.querySelector('tour-plan-api');
  if(!api)throw Error('Missing tour API '+slug);
  const key=api.getAttribute('api-key'),headers={apikey:key,accept:'application/json'};
  const tr=await fetch(api.getAttribute('api-url'),{headers});if(!tr.ok)throw Error('Tour API '+slug+' '+tr.status);
  const tour=await tr.json();
  const graphs=[...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap(x=>{try{return unpack(JSON.parse(x.textContent));}catch{return [];}});
  const offers={};
  for(const show of tour.content||[])for(const group of show.tourData||[])for(const run of group.schedule||[]){
   if(!run.conversionHubToken)continue;
   const p=btoa('och=1&aqty=1&'+atob(run.conversionHubToken)+'&udt='+new Date().toISOString().slice(0,19)).replace(/=+$/,'');
   const r=await fetch('/cds/api/shows/tickets/v1.0/Get?p='+encodeURIComponent(p),{headers});
   if(!r.ok)throw Error('Offer API '+slug+' '+run.runId+' '+r.status);
   const body=await r.json(); const c=body.content||{};
   offers[run.runId]={...c,saleOfferTypes:(c.saleOfferTypes||[]).map(g=>({type:g.type,label:g.label,saleOffers:g.saleOffers.map(o=>Object.fromEntries(Object.entries(o).filter(([k])=>!k.toLowerCase().includes('tracking'))))}))};
  }
  const banner=doc.querySelector('offer-banner');
  const offerBanner=banner?JSON.parse(banner.getAttribute(':banner-data')):null;
  const ticketDocs={};
  // Detail pages supply complete dates/coordinates for seasonal casts missing from the show graph.
  for(const show of tour.content||[])for(const group of show.tourData||[])for(const run of group.schedule||[]){
   const d=await getHTML(run.runCityCta.link);
   ticketDocs[run.runId]=[...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(x=>{try{return unpack(JSON.parse(x.textContent));}catch{return [];}});
  }
  shows.push({slug,tour,graphs,offerBanner,offers,ticketDocs});
 }
 return {checkedAt:new Date().toISOString(),catalogueCount:slugs.length,shows};
}
