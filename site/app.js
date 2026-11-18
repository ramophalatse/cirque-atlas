import {utcDay,runState,promotion,priceInfo,filterRuns,groupLocations} from './model.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>{try{const v=new URL(u);return v.protocol==='https:'?esc(v.href):'#';}catch{return '#';}};
const link=(u,text,cls='')=>`<a class="${cls}" href="${safeUrl(u)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
const countryName=code=>{try{return new Intl.DisplayNames(['en'],{type:'region'}).of(code==='UK'?'GB':code);}catch{return code;}};
const colors={resident:'#f2e7bb',tour:'#dca85d',seasonal:'#d4a1ed'};
let dataset,visible=[],selected,markers=[],layer,map;
const opts=()=>({period:$('period').value,country:$('country').value,search:$('search').value.trim(),deals:$('deals')?.checked||false});
const form=$('filters');
const query=new URLSearchParams(location.search);if(query.get('embed')==='1')document.body.classList.add('embedded');
$('period').value=['now','upcoming','all'].includes(query.get('period'))?query.get('period'):'now';
function dateText(r){if(r.kind==='resident')return r.dates.trim().toLowerCase().startsWith('performing')?r.dates:'Resident production · check performance calendar';return r.dates;}
function promoText(o){return (o.description||o.text||o.title).replace(/\s+/g,' ').slice(0,180);}
function detail(r){
 const p=priceInfo(r),offer=promotion(r),isBlack=offer&&/black friday/i.test(offer.title),s=runState(r);
 const offerRows=r.offers.filter(o=>o.title.toLowerCase()!=='regular tickets'&&!/accessible/i.test(o.title));
 $('detail').innerHTML=`<div class="detail-art"><img src="${safeUrl(r.image)}" alt="${esc(r.imageAlt)}"><span class="badge">${s==='current'?'Current run':r.comingSoon?'Coming soon':'Upcoming'} · ${r.kind==='tour'?'Touring':r.kind==='resident'?'Resident':'Seasonal'}</span></div><div class="detail-body"><h2 id="selectedTitle">${esc(r.name)}</h2><p class="location">${esc(r.city)}</p><p class="venue">${esc(r.venue)}</p><p class="dates">◷ &nbsp;${esc(dateText(r))}</p><div class="price-label">${p.price.startsWith('From')?'Tickets from':'Ticket price range'}</div><div class="price-line">${esc(p.price.replace(/^From /,'').replace(' / ticket',''))}</div><p class="price-note">${esc(p.note)}${p.checkedAt?` Checked ${esc(p.checkedAt)}.`:''}</p>${offer?`<div class="promo"><div class="promo-heading">${isBlack?'Black Friday':offer.groupOnly?'Group offer':offer.upgrade?'Upgrade offer':'Special offer'}</div><div>${esc(promoText(offer))}</div><small>${offer.groupOnly?'Group size restrictions apply. ':''}${offer.upgrade?'Upgrade; show admission may be separate. ':''}Select dates and seats. See conditions below.</small>${link(offer.url,'View this offer ↗')}</div>`:''}${link(r.bookingUrl,`${r.comingSoon?'View availability':'Show dates & tickets'} <span aria-hidden="true">↗</span>`,'book')}${link(p.source,'Price source ↗','source-link')}${offerRows.length?`<details class="offer-details"><summary>All offers & conditions (${offerRows.length})</summary>${offerRows.map(o=>`<div class="offer-item"><div class="offer-kind">${esc(o.category)}${o.groupOnly?' · Group booking':''}${o.upgrade?' · Upgrade':''}</div><strong>${esc(o.title)}</strong><p>${esc(o.description)}</p>${o.price?`<p>${esc(o.price)}</p>`:''}${o.text?`<p>${esc(o.text)}</p>`:''}${o.conditions.length?`<p>${esc(o.conditions.join(' · '))}</p>`:''}${o.dateNote?`<p>${esc(o.dateNote)}</p>`:''}${o.terms?`<p>${esc(o.terms)}</p>`:''}${link(o.url,'Official offer & terms ↗')}</div>`).join('')}</details>`:''}${link(r.showUrl,'Explore the show ↗','source-link')}</div>`;
 $('detail').scrollTop=0;
}
function selectRun(id,{pan=false,scroll=false}={}){
 const r=visible.find(x=>x.id===String(id));if(!r)return;
 selected=r.id;detail(r);
 for(const c of document.querySelectorAll('.show-card')){const on=c.dataset.id===r.id;c.classList.toggle('active',on);c.querySelector('button').setAttribute('aria-pressed',String(on));}
 for(const [m,ids] of markers){m.getElement()?.classList.toggle('selected',ids.includes(r.id));}
 if(pan&&map){map.flyTo([r.lat,r.lng],Math.max(map.getZoom(),r.city.startsWith('Las Vegas')?11:5),{duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:.65});}
 if(scroll&&innerWidth<761)$('detail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 const url=new URL(location);url.searchParams.set('show',r.id);url.searchParams.set('period',$('period').value);history.replaceState(null,'',url);
}
function fit(){if(!map||!visible.length)return;const bounds=L.latLngBounds(visible.map(r=>[r.lat,r.lng]));map.stop();map.fitBounds(bounds,{padding:innerWidth<761?[30,75]:[65,95],maxZoom:visible.length===1?8:4,animate:false});}
function render(){
 visible=filterRuns(dataset.runs,opts()).sort((a,b)=>a.city.localeCompare(b.city)||a.name.localeCompare(b.name));
 $('count').textContent=`${visible.length} ${visible.length===1?'engagement':'engagements'} · ${groupLocations(visible).length} locations`;
 $('resultTitle').textContent=$('period').value==='now'?'On stage around the world':$('period').value==='upcoming'?'Coming to a city near you':'A world of performances';
 $('cards').innerHTML=visible.length?visible.map(r=>{const p=priceInfo(r),o=promotion(r);return `<article class="show-card" data-id="${esc(r.id)}"><button type="button" aria-pressed="false" aria-label="Explore ${esc(r.name)} in ${esc(r.city)}"><img class="card-img" src="${safeUrl(r.image)}" alt="" loading="lazy"><span class="card-copy"><span class="card-city">${esc(r.city)} · ${runState(r)==='current'?'Current run':'Upcoming'}</span><span class="card-name" style="display:block">${esc(r.name)}</span><span class="card-price">${esc(p.price.replace(' / ticket',''))}</span>${o?`<span class="card-promo" style="display:block">${/black friday/i.test(o.title)?'✧ Black Friday offer':o.groupOnly?'✧ Group discount':o.upgrade?'✧ Upgrade offer':'✧ Special offer'}</span>`:''}</span></button></article>`;}).join(''):'<div class="no-results">No shows match these filters. Try another city, switch to upcoming stops, or reset the filters.</div>';
 $('cards').querySelectorAll('.show-card').forEach(c=>c.querySelector('button').addEventListener('click',()=>selectRun(c.dataset.id,{pan:true,scroll:true})));
 if(layer){layer.clearLayers();markers=[];for(const rs of groupLocations(visible)){
  const r=rs[0],m=L.marker([r.lat,r.lng],{title:`${r.city}: ${rs.map(r=>r.name).join(', ')}`,icon:L.divIcon({className:'location-icon',html:`<span class="pin" style="--pin:${colors[r.kind]}">${rs.length>1?rs.length:'✧'}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).addTo(layer);
  m.bindTooltip(esc(`${r.city} · ${rs.length>1?rs.length+' shows':r.name}`),{direction:'top',offset:[0,-16]});
  if(rs.length===1)m.on('click',()=>selectRun(r.id,{scroll:true}));
  else{
   const content=document.createElement('div');content.innerHTML=`<div class="popup-title">${esc(r.city)}</div>${rs.map(r=>`<button class="popup-show" data-id="${esc(r.id)}">${esc(r.name)}<small>${esc(priceInfo(r).price)}</small></button>`).join('')}`;
   content.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{selectRun(b.dataset.id,{scroll:true});map.closePopup();}));m.bindPopup(content);
  }
  markers.push([m,rs.map(r=>r.id)]);
 }}
 if(visible.length){selectRun(visible.some(r=>r.id===selected)?selected:visible[0].id);fit();}
 else{$('detail').innerHTML='<p class="detail-empty">Your next extraordinary is out there. Adjust the filters to discover more shows.</p>';}
}
try{
 const response=await fetch('./data.json',{cache:'no-cache'});if(!response.ok)throw Error('Show data unavailable');dataset=await response.json();
 const checked=new Date(dataset.checkedAt),daysOld=(Date.now()-checked.getTime())/86400000;
 $('checked').textContent=`Checked ${checked.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;
 $('coverage').textContent=`${dataset.catalogueCount} productions · ${dataset.runs.length} listed engagements`;
 $('sourceInfo').textContent=`Latest successful collection: ${checked.toLocaleString('en-GB')} (${Intl.DateTimeFormat().resolvedOptions().timeZone}). ${dataset.catalogueCount} productions and ${dataset.runs.length} engagements. Sources: official catalogue, tour plans, booking pages and offer API; venue price sources are linked individually.`;
 if(daysOld>2){$('freshness').hidden=false;$('freshness').textContent=`This snapshot is ${Math.floor(daysOld)} days old. Recheck show dates and offers with the official seller before planning.`;}
 [...new Set(dataset.runs.map(r=>r.country))].sort((a,b)=>countryName(a).localeCompare(countryName(b))).forEach(code=>{const o=new Option(countryName(code),code);$('country').add(o);});
 if(window.L){
  map=L.map('map',{zoomControl:true,minZoom:0,zoomSnap:.25,zoomDelta:.5,maxZoom:16,worldCopyJump:false,maxBounds:[[-70,-190],[85,190]],maxBoundsViscosity:.8,scrollWheelZoom:false});
  let tileErrors=0,tilesLoaded=0;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,noWrap:true,bounds:[[-85,-180],[85,180]],attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).on('tileerror',()=>{if(++tileErrors>6&&!tilesLoaded)$('mapFallback').hidden=false;}).on('tileload',()=>{tilesLoaded++;$('mapFallback').hidden=true;}).addTo(map);
  layer=L.layerGroup().addTo(map);
  new ResizeObserver(()=>{map.invalidateSize();fit();}).observe($('map'));
 }else{$('mapFallback').hidden=false;}
 selected=query.get('show')||'14421';render();
 form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',render);form.addEventListener('reset',e=>{e.preventDefault();$('search').value='';$('period').value='now';$('country').value='';$('deals').checked=false;selected=null;render();});$('fit').addEventListener('click',fit);
}catch(error){$('checked').textContent='Show data could not load';$('freshness').hidden=false;$('freshness').textContent='Please reload or visit the official show catalogue. The data could not be loaded.';$('cards').innerHTML='<p>Visit <a href="https://www.cirquedusoleil.com/shows">Cirque du Soleil’s official catalogue</a>.</p>';console.error(error);}
$('footerAbout').addEventListener('click',()=>$('about').showModal());
$('aboutButton').addEventListener('click',()=>$('about').showModal());$('closeAbout').addEventListener('click',()=>$('about').close());$('about').addEventListener('click',e=>{if(e.target===$('about')){const b=$('about').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('about').close();}});
