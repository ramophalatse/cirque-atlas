export const utcDay = () => new Date().toISOString().slice(0,10);
export function runState(r,day=utcDay()) {
 if(r.end && r.end<day) return 'ended';
 if(r.start && r.start>day) return 'upcoming';
 if(r.start && r.end && r.start<=day && r.end>=day) return 'current';
 return r.isPlaying ? 'current' : 'upcoming';
}
export function promotion(r) {
 const ps=r.offers.filter(o=>o.promotion);
 return ps.find(o=>/black friday/i.test(o.title)&&!o.groupOnly&&!o.upgrade)||ps.find(o=>!o.groupOnly&&!o.upgrade)||ps[0]||null;
}
export function priceInfo(r,day=utcDay()) {
 const s=r.supplement;
 if(s && s.validUntil>=day) return {price:s.price,note:s.note,source:s.source,checkedAt:s.checkedAt};
 return {price:r.price||'Check ticket calendar',note:r.priceNote,source:r.bookingUrl};
}
export function filterRuns(runs,{period='now',country='',search='',deals=false,day=utcDay()}={}) {
 const needle=search.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return runs.filter(r=>{
  const state=runState(r,day);
  if(state==='ended')return false;
  if(period==='now'&&state!=='current')return false;
  if(period==='upcoming'&&state!=='upcoming')return false;
  if(country&&r.country!==country)return false;
  if(deals&&!promotion(r))return false;
  return [r.name,r.city,r.venue,r.country].join(' ').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(needle);
 });
}
export function groupLocations(runs) {
 const groups=new Map();
 for(const r of runs){const k=r.city; if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
 return [...groups.values()];
}
