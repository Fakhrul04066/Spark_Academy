import {test,expect} from "@playwright/test";

test("landing lists four supported features and matches the course animation",async({page})=>{
 await page.route("https://fonts.googleapis.com/**",r=>r.fulfill({contentType:"text/css",body:""}));
 await page.emulateMedia({reducedMotion:"reduce"});
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("/");
 const features=page.locator('.storm-feature-tile');
 await expect(features).toHaveCount(4);await expect(page.locator('#features .feature')).toHaveCount(6);
 await expect(page.locator('#home')).not.toContainText(/attendance|private\s+(teacher\s+)?feedback|উপস্থিতি|ফিডব্যাক/i);
 await expect(page.locator('#features h3')).toHaveText(['Exam & Ranking','Progress Analytics','Anonymous Photo, Voice & Text Q&A','Smart Attendance','Private Teacher Feedback','Smart Revision Tracker']);
 await expect(features.locator('.storm-feature-index')).toHaveText(['01','02','03','04']);
 await expect(features.last()).toContainText('Smart Revision Tracker');
 await expect(page.locator('.stat-grid strong')).toHaveText(['6–12','3','24/7','100%']);
 await expect(page.locator('.stat-grid p')).toHaveText(['Class Coverage','Student · Teacher · Admin','Result Access','Digital Progress View']);
 await expect(page.locator('.storm-join')).toHaveAttribute('href','#courses');
 await expect(page.locator('.storm-explore')).toHaveAttribute('href','#courses');
 await expect(page.locator('.storm-join-text')).toHaveText('JOIN SPARK');
 await expect(page.locator('.storm-explore')).toHaveText('Explore all courses');
 const mobile=(page.viewportSize()?.width||1440)<=1120;
 if(!mobile){
  const course=page.locator('.storm-course-stack'),feature=page.locator('.storm-feature-stack');
  const transforms=(root:Element)=>[...root.children].map(e=>(e as HTMLElement).style.transform);
  await expect(course).toHaveAttribute('data-orbit-speed','0.12');
  await expect(feature).toHaveAttribute('data-orbit-speed','0.12');
  expect(await course.evaluate(transforms)).toEqual(await feature.evaluate(transforms));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.mouse.move(0,0);
  await course.scrollIntoViewIfNeeded();await page.waitForTimeout(500);
  const pair=await page.evaluate(()=>['.storm-course-stack','.storm-feature-stack'].map(s=>[...document.querySelector(s)!.children].map(e=>(e as HTMLElement).style.transform)));
  expect(pair[0]).toEqual(pair[1]);
 }else{
  await expect(page.locator('.storm-feature-stack')).toHaveAttribute('data-carousel-mode','swipe');
  await page.locator('.storm-feature-stack').focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('.storm-feature-stack .is-mobile-current')).toHaveAttribute('data-feature','1');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(errors).toEqual([]);
});
