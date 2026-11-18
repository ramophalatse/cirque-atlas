import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const browser=await chromium.launch({headless:true,...(process.env.CIRQUE_BROWSER_CHANNEL?{channel:process.env.CIRQUE_BROWSER_CHANNEL}:{})});
try{
 const page=await browser.newPage();
 await page.goto('https://www.cirquedusoleil.com/shows',{waitUntil:'domcontentloaded',timeout:90000});
 const collector=await readFile(new URL('./collect-browser.js',import.meta.url),'utf8');
 const raw=await page.evaluate('('+collector+')()');
 if(!raw.shows?.length)throw Error('Empty collection');
 await mkdir('.cache',{recursive:true});
 await writeFile('.cache/collected.json',JSON.stringify(raw));
 const result=spawnSync('python3',['scripts/normalize.py','.cache/collected.json','site/data.json'],{stdio:'inherit'});
 if(result.status!==0)throw Error('Snapshot validation failed');
}finally{await browser.close();}
