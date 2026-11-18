import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runState,filterRuns,promotion,priceInfo,groupLocations} from '../site/model.mjs';
const data=JSON.parse(readFileSync(new URL('../site/data.json',import.meta.url)));
const day='2026-11-18';
const fixtures=[
 {id:'14427',name:'LUZIA',city:'Vancouver',country:'CA',venue:'Big Top',kind:'tour',start:'2026-11-04',end:'2027-01-10',isPlaying:true,offers:[]},
 {id:'14585',name:'LE LO LAI',city:'San Juan',country:'US',venue:'Music Hall',kind:'tour',start:'2027-02-12',end:'2027-04-04',isPlaying:false,offers:[]},
 {id:'14332',name:'LUDÕ',city:'Nuevo Vallarta',country:'MX',venue:'Theatre',kind:'resident',isPlaying:true,offers:[]},
 ...['14421','14422','14423','14424'].map((id,i)=>({id,name:['Mystère','KÀ','O','ONE'][i],city:'Las Vegas',country:'US',venue:'Theatre',kind:'resident',isPlaying:true,price:'From $69 USD / ticket',priceNote:'Starting price',bookingUrl:'https://www.cirquedusoleil.com/ka',offers:[{title:'Black Friday Offer',description:'Save up to 40%',promotion:true,groupOnly:false,upgrade:false}]})),
 {id:'14524',name:'FINDING UTOPIA',city:'Montreal',country:'CA',venue:'Big Top',kind:'tour',start:'2027-04-22',end:'2027-08-22',isPlaying:false,offers:[]},
 {id:'14483',name:'JOYÀ',city:'Riviera Maya',country:'MX',venue:'Theatre',kind:'resident',isPlaying:true,offers:[{title:'Black Friday Offer',description:'Save up to 30%. Code: BF30.',promotion:true}]}
];
fixtures.find(r=>r.id==='14421').supplement={price:'USD 59–193',note:'Standard categories',source:'https://treasureisland.com',validUntil:'2026-12-02'};
fixtures.find(r=>r.id==='14421').price='';
const get=id=>fixtures.find(r=>r.id===id);
test('snapshot contains complete valid venues and source links',()=>{
 assert.ok(data.catalogueCount>=15);assert.ok(data.runs.length>=50);
 assert.equal(new Set(data.runs.map(r=>r.id)).size,data.runs.length);
 assert.ok(Number.isFinite(Date.parse(data.checkedAt)));
 for(const r of data.runs){
  assert.ok(Math.abs(r.lat)<=90&&Math.abs(r.lng)<=180,r.id);
  assert.ok(r.name&&r.city&&r.venue&&r.country,r.id);
  assert.ok(r.bookingUrl.startsWith('https://www.cirquedusoleil.com/'),r.id);
  if(r.kind!=='resident'&&!r.comingSoon)assert.ok(r.start&&r.end,r.id);
  if(r.start&&r.end)assert.ok(r.start<=r.end,r.id);
  for(const o of r.offers)assert.ok(o.url.startsWith('https://'),o.title);
 }
});
test('run boundaries include opening and closing dates, then expire',()=>{
 const r=get('14427');assert.equal(runState(r,'2026-11-03'),'upcoming');assert.equal(runState(r,'2026-11-04'),'current');assert.equal(runState(r,'2027-01-10'),'current');assert.equal(runState(r,'2027-01-11'),'ended');
});
test('future resident-style engagement is not incorrectly current',()=>{
 assert.equal(runState(get('14585'),day),'upcoming');assert.equal(runState(get('14585'),'2027-04-05'),'ended');
 assert.equal(runState(get('14332'),day),'current');assert.equal(get('14332').kind,'resident');
});
test('current and upcoming filters exclude ended stops',()=>{
 assert.equal(filterRuns(fixtures,{day,period:'now'}).length,7);
 assert.equal(filterRuns(fixtures,{day,period:'all'}).length,9);
 assert.ok(filterRuns(fixtures,{day:'2027-11-01',period:'all'}).every(r=>r.kind==='resident'));
 assert.equal(filterRuns(fixtures,{day,period:'upcoming',search:'Montreal'}).length,1);
});
test('city clusters retain all four Las Vegas shows',()=>{
 const rs=filterRuns(fixtures,{day,search:'Las Vegas'});assert.equal(rs.length,4);assert.equal(groupLocations(rs).length,1);
});
test('accent search and country filters combine without losing group offers',()=>{
 assert.equal(filterRuns(fixtures,{day,search:'mystere',country:'US',deals:true})[0].id,'14421');
 assert.equal(filterRuns(fixtures,{day,search:'mystere',country:'CA'}).length,0);
 assert.ok(filterRuns(fixtures,{day,deals:true}).every(promotion));
});
test('promotional percentages never become fabricated monetary prices',()=>{
 const r=get('14422');assert.match(promotion(r).description,/40%/);assert.match(priceInfo(r,day).price,/69/);assert.doesNotMatch(priceInfo(r,day).price,/41\.4/);
 assert.equal(promotion(get('14483')).description,'Save up to 30%. Code: BF30.');
});
test('manually verified venue prices expire independently from automatic data',()=>{
 assert.equal(priceInfo(get('14421'),day).price,'USD 59–193');assert.equal(priceInfo(get('14421'),'2026-12-03').price,'Check ticket calendar');
});
