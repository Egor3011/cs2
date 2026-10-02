const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('/Users/egoraksenov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base='http://127.0.0.1:5174';
const fixture=JSON.parse(fs.readFileSync('backend/data/tournament.json','utf8'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
 const page=await browser.newPage({viewport:{width:1512,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 assert.ok(await page.locator('.hero-section').evaluate(e=>e.getBoundingClientRect().top)<180);
 assert.equal(await page.locator('.live-notice .live-label').textContent(),'В эфире');
 console.log('desktop hero top:',await page.locator('.hero-section').evaluate(e=>e.getBoundingClientRect().top));
 await page.screenshot({path:'tmp/design-reference/ux-desktop-first-screen.png'});
 async function revealAll(){
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  for(const el of await page.locator('.reveal-pending').all()) {
   await el.scrollIntoViewIfNeeded();
   await el.evaluate(e=>new Promise(resolve=>{const check=()=>{if(Number(getComputedStyle(e).opacity)===1)resolve();else requestAnimationFrame(check)};check()}));
  }
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 }
 await revealAll();await page.screenshot({path:'tmp/design-reference/ux-desktop.png',fullPage:true});
 for(const width of [320,375,390,700,768,1024,1512]) {
  await page.setViewportSize({width,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,`overflow at ${width}`);
  assert.ok(await page.locator('.site-header').evaluate(e=>e.getBoundingClientRect().height)<180);
 }
 await page.setViewportSize({width:844,height:390});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),844);
 await page.setViewportSize({width:390,height:844});await revealAll();
 await page.screenshot({path:'tmp/design-reference/ux-mobile.png',fullPage:true});
 await page.screenshot({path:'tmp/design-reference/ux-mobile-first-screen.png'});
 await page.getByRole('button',{name:/^Подать заявку/}).first().click();
 await page.getByRole('textbox',{name:'Название команды'}).waitFor();
 assert.equal(await page.locator('input[name=teamName]').evaluate(e=>document.activeElement===e),true);
 await page.getByRole('textbox',{name:'Название команды'}).fill('UX Check');
 await page.getByRole('textbox',{name:'Имя капитана'}).fill('Captain');
 await page.getByRole('textbox',{name:'Email'}).fill('captain@example.com');
 await page.getByRole('textbox',{name:/Discord \/ Telegram/}).fill('@captain');
 await page.getByRole('checkbox').check();
 await page.route('**/api/registrations',route=>route.request().method()==='POST'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Ошибка отправки для проверки'})}):route.continue());
 await page.getByRole('button',{name:'Отправить заявку',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Ошибка отправки для проверки'}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'Название команды'}).inputValue(),'UX Check');
 await page.unroute('**/api/registrations');
 await page.route('**/api/registrations',route=>route.fulfill({status:route.request().method()==='POST'?201:200,contentType:'application/json',body:route.request().method()==='POST'?'{}':JSON.stringify([{id:'ux-check',teamName:'UX Check',players:5,status:'pending',createdAt:'2026-10-01T17:00:00Z'}])}));
 await page.getByRole('button',{name:'Отправить заявку',exact:true}).click();
 await page.getByRole('heading',{name:'ЗАЯВКА ПРИНЯТА'}).waitFor();
 await page.getByRole('button',{name:'Список команд',exact:true}).click();
 await page.locator('.teams-list__row').filter({hasText:'UX Check'}).waitFor();
 await page.getByRole('button',{name:'Заявка',exact:true}).click();
 await page.getByRole('button',{name:'Отправить ещё одну заявку',exact:true}).click();
 assert.equal(await page.getByRole('textbox',{name:'Название команды'}).inputValue(),'');
 await page.locator('summary').filter({hasText:'Когда проходят матчи?'}).click();
 assert.equal(await page.locator('details[open]').count(),1);
 await page.goto(`${base}/#registration`,{waitUntil:'networkidle'});
 await page.getByRole('textbox',{name:'Название команды'}).waitFor();
 await page.getByRole('button',{name:'Команды',exact:true}).click();
 await page.locator('.site-nav__apply').click();
 await page.getByRole('textbox',{name:'Название команды'}).waitFor();
 await page.getByRole('button',{name:'Смотреть эфир'}).click();
 await page.locator('iframe').waitFor();
 assert.ok((await page.locator('iframe').getAttribute('src')).includes('anarabdullaev'));
 await page.getByRole('button',{name:'Сетка',exact:true}).click();
 await page.getByRole('button',{name:'Нижняя сетка',exact:true}).click();
 assert.equal(await page.locator('.tb-stage:visible').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 await page.goto(`${base}/matches/final`,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.scoreboard > span').textContent(),'2 : 1');
 assert.equal(await page.locator('.match-intro .live-label').textContent(),'В эфире');
 await revealAll();await page.screenshot({path:'tmp/design-reference/ux-match-mobile.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(base,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.reveal-pending').count(),0);
 assert.equal(await page.locator('.hero-section').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(await page.locator('.live-label i').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.route('**/api/tournament',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...fixture,matches:{final:{...fixture.matches.final,status:'scheduled',scores:undefined}},results:{}})}));
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('.live-notice').count(),0);
 assert.equal(await page.locator('.schedule-match .live-label').count(),0);
 await page.unroute('**/api/tournament');
 await page.route('**/api/tournament',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('alert').filter({hasText:'Не удалось загрузить турнир'}).waitFor();
 await page.getByRole('button',{name:/^Подать заявку/}).first().click();
 await page.getByRole('textbox',{name:'Название команды'}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: compact header, real live status, seven responsive widths and landscape, reveal animation, reduced motion, CTA/focus, registration error/success/reset, teams, repeated hash links, FAQ, stream, bracket, match data, no-live and API-error states. No test registrations saved. No JavaScript errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
