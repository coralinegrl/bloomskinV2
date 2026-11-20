const fs = require('fs'), os = require('os'), path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const fixturePath=path.join(os.tmpdir(),'bloomskin-flow-sandbox-fixture.json');
const fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
const action=process.argv[2] || 'open';
(async()=>{
  assert.equal(new URL(fixture.payment.url).hostname,'sandbox.flow.cl','Only Sandbox checkout is allowed');
  const context=await chromium.launchPersistentContext(path.join(fixture.outputDir,'browser-profile'),{
    executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    viewport:{width:390,height:844},headless:true,
  });
  try {
    const page=context.pages()[0] || await context.newPage();
    await page.goto(['open','webpay','pay','reject','return'].includes(action)?fixture.payment.url:fixture.browserUrl || fixture.payment.url,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(2000);
    if(['webpay','pay','reject'].includes(action)) { await page.locator('input[type=radio]').first().check(); await page.locator('#pagar').click(); }
    if(['pay','reject'].includes(action)) {
      assert.equal(new URL(page.url()).hostname,'sandbox.flow.cl');
      await page.locator('#accion').selectOption({label:action==='reject'?'Quiero rechazar el pago de la orden':'Quiero pagar la orden'});
      await page.locator('#pagar').click();
      await page.waitForURL(url=>url.origin===fixture.publicUrl,{timeout:45000}).catch(()=>{});
    }
    if(action==='return') {
      assert.equal(new URL(page.url()).hostname,'sandbox.flow.cl');
      await page.evaluate(({url,token})=>{
        const form=document.createElement('form');form.method='POST';form.action=url;
        const field=document.createElement('input');field.name='token';field.value=token;form.append(field);document.body.append(form);form.submit();
      },{url:fixture.publicUrl+'/api/flow/return',token:new URL(fixture.payment.url).searchParams.get('token')});
      await page.waitForURL(url=>url.origin===fixture.publicUrl,{timeout:45000});
      await page.waitForTimeout(3000);
    }
    if(action==='continue') await page.getByRole('button',{name:/pagar|continuar/i}).first().click();
    await page.waitForTimeout(2000);
    fixture.browserUrl=page.url();fs.writeFileSync(fixturePath,JSON.stringify(fixture));
    await page.screenshot({path:path.join(fixture.outputDir,`flow-${action}-${fixture.order.id}.png`),fullPage:true});
    const info=await page.evaluate(()=>({text:document.body.innerText.slice(0,11000),inputs:[...document.querySelectorAll('input,select,button')].map(e=>({tag:e.tagName,type:e.type,name:e.name,id:e.id,text:e.tagName==='BUTTON'?e.innerText:undefined,placeholder:e.placeholder}))}));
    const url=new URL(page.url());console.log(JSON.stringify({location:url.origin+url.pathname,...info},null,2));
  } finally {await context.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
