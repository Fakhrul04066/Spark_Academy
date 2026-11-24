import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { landingMarkup } from "../../src/components/reference-markup";
test.use({reducedMotion:"reduce"});
test("both sides keep the original compact circular animation and sizing",async({page})=>{
 await page.route("https://fonts.googleapis.com/**",r=>r.fulfill({contentType:"text/css",body:""}));
 await page.goto("/");
 const reference=await page.context().newPage();
 const styles=readFileSync(new URL("../fixtures/github-landing/reference-landing.css",import.meta.url),"utf8");
 const script=readFileSync(new URL("../fixtures/github-landing/reference-interactions.js",import.meta.url),"utf8").replace("export const ORBIT_SPEED","const ORBIT_SPEED").replace("export function mountReferenceLanding","function mountReferenceLanding");
 await reference.setContent(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}body{font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6}*{box-sizing:border-box}${styles}</style></head><body><div id="reference-root">${landingMarkup}</div><script>${script};mountReferenceLanding(document.getElementById('reference-root'));document.querySelectorAll('.ring-instruction').forEach(e=>e.remove());</script></body></html>`);
 const desktop=(page.viewportSize()?.width||1440)>1120;
 await expect(page.locator(".storm-course-stack")).toHaveAttribute(desktop?"data-orbit-speed":"data-carousel-mode",desktop?"0.12":"swipe");
 await page.waitForTimeout(150);await reference.waitForTimeout(150);
 for(const selector of [".storm-course-stack",".storm-feature-stack"]){
  const snapshot=(root:Element)=>({
   width:(root as HTMLElement).clientWidth,height:(root as HTMLElement).clientHeight,
   cards:[...root.children].map(el=>{const card=el as HTMLElement,raw=getComputedStyle(card).transform,matrix=raw==="none"?new DOMMatrix():new DOMMatrix(raw);return {width:card.offsetWidth,height:card.offsetHeight,x:matrix.m41,y:matrix.m42,z:matrix.m43,scale:matrix.m11,opacity:card.style.opacity};})
  });
  const current=await page.locator(selector).evaluate(snapshot),original=await reference.locator(selector).evaluate(snapshot);
  expect({width:current.width,height:current.height}).toEqual({width:original.width,height:original.height});
  current.cards.forEach((card,i)=>{
   const {x,y,...rest}=card,{x:originalX,y:originalY,...originalRest}=original.cards[i];
   expect(rest).toEqual(originalRest);
   const drop=y-originalY;
   expect(x).toBe(originalX);
   if(desktop){expect(drop).toBeGreaterThanOrEqual(-.01);expect(drop).toBeLessThanOrEqual(16.01);if(i===0)expect(drop).toBeCloseTo(16,2);}
    else expect(drop).toBe(0);
  });
 }
 await expect(page.locator(".orbit-arrow,.ring-control,.storm-intro,.storm-brand-prefix,.storm-headline")).toHaveCount(0);
 const type=(el:Element)=>{const s=getComputedStyle(el);return {size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,spacing:s.letterSpacing};};
 for(const selector of ['.stat-grid strong','.stat-grid p','.section-head h2','.storm-join-text']){
  expect(await page.locator(selector).first().evaluate(type)).toEqual(await reference.locator(selector).first().evaluate(type));
 }
 await reference.close();
});

