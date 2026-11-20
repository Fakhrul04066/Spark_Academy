import {chromium,firefox,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
mkdirSync('test-results/branding',{recursive:true});
const choices=[{name:'Chrome',engine:chromium,options:{channel:'chrome'}},{name:'Edge',engine:chromium,options:{channel:'msedge'}},{name:'Firefox',engine:firefox,options:{}}];
for(const choice of choices.filter(c=>process.argv.length<3||process.argv.slice(2).includes(c.name.toLowerCase()))){
 console.log('Checking '+choice.name);
 const browser=await choice.engine.launch(choice.options);
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.goto('http://127.0.0.1:3000/login',{waitUntil:'commit'});
  const logo=page.locator('.auth-form .sa-logo');const content=logo.locator('.sa-logo__content');
  await logo.waitFor({state:'visible',timeout:60000});await expect(content).toHaveAttribute('data-paused','false',{timeout:60000});
  await expect(logo).toHaveAccessibleName('Spark Academy');
  await expect(logo.locator('.sa-logo__spark')).toHaveText('SPARK');await expect(logo.locator('.sa-logo__academy')).toHaveText('ACADEMY');
  await expect(logo.locator('.sa-logo__icon')).toBeVisible();
  expect(await logo.locator('.sa-icon__cloud').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('sa-cloud-drift');
  expect(await logo.evaluate(node=>{const original=node.className;const widths={};for(const size of ['small','medium','large']){node.classList.remove('sa-logo--small','sa-logo--medium','sa-logo--large');node.classList.add('sa-logo--'+size);widths[size]=getComputedStyle(node.querySelector('.sa-logo__icon-frame')).width;}node.className=original;return widths;})).toEqual({small:'36px',medium:'46px',large:'92px'});
  const pulse=await content.evaluate(node=>{
   node.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));
   return {striking:node.dataset.striking,spark:getComputedStyle(node.querySelector('.sa-logo__spark')).animationName,academy:getComputedStyle(node.querySelector('.sa-logo__academy')).animationName};
  });
  expect(pulse).toEqual({striking:'true',spark:'sa-word-strike',academy:'sa-academy-strike'});
  await page.waitForFunction(()=>!document.querySelector('.auth-form .sa-logo__content').dataset.striking);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(content).toHaveAttribute('data-paused','true');
  expect(await logo.locator('.sa-icon__cloud').first().evaluate(e=>getComputedStyle(e).animationPlayState)).toBe('paused');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(content).toHaveAttribute('data-paused','false');
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await logo.locator('.sa-logo__spark .sa-logo__letter').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3000/',{waitUntil:'commit'});
  await expect(page.locator('header .sa-logo').first()).toBeVisible({timeout:60000});
  await expect(page.locator('footer .sa-logo')).toHaveAttribute('data-logo-variant','footer');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('.nav-actions a[href="/login"]').click({noWaitAfter:true});await expect(page).toHaveURL(/\/login$/,{timeout:60000});await page.locator('.auth-form .sa-logo').waitFor({state:'visible',timeout:60000});
  expect(errors).toEqual([]);console.log(JSON.stringify({browser:choice.name,checks:'icon and synchronized wordmark, hover, visibility pause, reduced motion, light/dark login, mobile, footer, routing',pageErrors:errors}));
 }finally{await browser.close();}
}
