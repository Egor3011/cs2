const assert = require('node:assert/strict');
const { chromium } = require('/Users/egoraksenov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Карточка 2',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.carousel-dots button:last-child').getAttribute('aria-pressed')==='true');
 await page.waitForFunction(()=>Math.round(document.querySelector('.participation-cards').scrollLeft)===265);
 await page.getByRole('button',{name:'Подать заявку',exact:true}).click();
 await page.getByRole('textbox',{name:'Название команды'}).fill('Design Check');
 await page.getByRole('textbox',{name:'Имя капитана'}).fill('Captain');
 await page.getByRole('textbox',{name:'Email'}).fill('captain@example.com');
 await page.getByRole('textbox',{name:'Discord / Telegram'}).fill('@captain');
 await page.getByRole('checkbox').check();
 await page.route('**/api/registrations',route=>route.request().method()==='POST' ? route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Проверка ошибки отправки'})}):route.continue());
 await page.getByRole('button',{name:'Отправить заявку',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Проверка ошибки отправки'}).waitFor();
 assert.equal(await page.getByRole('textbox',{name:'Название команды'}).inputValue(),'Design Check');
 await page.unroute('**/api/registrations');
 await page.route('**/api/registrations',async route=>{
  if(route.request().method()==='POST') {
   assert.deepEqual(route.request().postDataJSON(),{teamName:'Design Check',captainName:'Captain',email:'captain@example.com',contact:'@captain',players:5});
   await route.fulfill({status:201,contentType:'application/json',body:'{}'});
  } else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:'test-team',teamName:'Design Check',players:5,status:'pending',createdAt:'2026-10-01T17:00:00Z'}])});
 });
 await page.getByRole('button',{name:'Отправить заявку',exact:true}).click();
 await page.getByRole('heading',{name:'ЗАЯВКА ПРИНЯТА'}).waitFor();
 await page.getByRole('button',{name:'Список команд',exact:true}).click();
 await page.locator('.teams-list__row').filter({hasText:'Design Check'}).waitFor();
 await page.getByRole('button',{name:'Заявка',exact:true}).click();
 await page.getByRole('button',{name:'Отправить ещё одну заявку',exact:true}).click();
 assert.equal(await page.getByRole('textbox',{name:'Название команды'}).inputValue(),'');
 await page.screenshot({path:'tmp/design-reference/site-form-mobile.png',fullPage:true});
 await page.locator('summary').filter({hasText:'Когда проходят матчи?'}).click();
 assert.equal(await page.locator('details[open]').count(),1);
 await page.getByRole('button',{name:'Сетка',exact:true}).click();
 await page.getByRole('button',{name:'Нижняя сетка',exact:true}).click();
 assert.equal(await page.locator('.tb-stage:visible').count(),1);
 for(const width of [320,390,768,1512]) {
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
 }
 await page.goto('http://127.0.0.1:5174/matches/final',{waitUntil:'networkidle'});
 assert.equal(await page.locator('h1').textContent(),'Финал верхней сетки');
 assert.equal(await page.locator('.scoreboard > span').textContent(),'2 : 1');
 await page.getByRole('button',{name:'Трансляция',exact:true}).click();
 assert.ok((await page.locator('iframe').getAttribute('src')).includes('channel=anarabdullaev'));
 await page.goto('http://127.0.0.1:5174/matches/missing',{waitUntil:'networkidle'});
 await page.getByRole('alert').filter({hasText:'Матч не найден'}).waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: carousel, registration validation/error/success/reset, teams, FAQ, bracket filters, responsive widths 320/390/768/1512, API match data, Twitch, missing match. No JavaScript errors. Registration submission mocked: no test data saved.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
