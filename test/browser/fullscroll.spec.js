import { expect, test } from '@playwright/test';

async function openFixture(page) {
  await page.goto('/test/browser/fixture.html');
  await expect(page.locator('[fs]')).toHaveAttribute('fs-ready', '');
  await page.waitForFunction(() => window.fullscroll?.state?.active === true);
  await expect(page.locator('[fs]')).toHaveAttribute('fs-view', 'one');
}

test('moves exactly one route per wheel gesture', async ({ page }) => {
  await openFixture(page);

  await page.mouse.move(512, 360);
  await page.mouse.wheel(0, 160);
  await expect(page.locator('[fs]')).toHaveAttribute('fs-view', 'two');

  // 같은 제스처가 이어지는 동안의 추가 휠은 무시된다.
  await page.mouse.wheel(0, 160);
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(200);
  await expect(page.locator('[fs]')).toHaveAttribute('fs-view', 'two');

  // 유휴 시간이 지나면 다음 제스처는 정확히 한 칸만 이동한다.
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, 160);
  await expect(page.locator('[fs]')).toHaveAttribute('fs-view', 'scroll');
  await page.waitForTimeout(700);
  await expect(page.locator('[fs]')).toHaveAttribute('fs-view', 'scroll');
});

test('scrolls an fs-scroll area before leaving the route', async ({ page }) => {
  await openFixture(page);

  await page.evaluate(() => window.fullscroll.moveTo('scroll'));
  await expect(page.locator('[fs]')).toHaveAttribute('fs-view', 'scroll');

  const scrollPage = page.locator('#page-scroll');
  const box = await scrollPage.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  expect(await scrollPage.evaluate((element) => element.scrollTop)).toBe(0);

  await page.mouse.wheel(0, 200);
  await expect
    .poll(() => scrollPage.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await expect(page.locator('[fs]')).toHaveAttribute('fs-view', 'scroll');

  // 안쪽 스크롤 끝에서 새 제스처를 시작해야 다음 경로로 넘어간다.
  await page.evaluate(() => {
    const element = document.querySelector('#page-scroll');
    element.scrollTop = element.scrollHeight;
  });
  await page.waitForTimeout(700);
  await page.mouse.wheel(0, 200);
  await expect(page.locator('[fs]')).toHaveAttribute('fs-view', 'four');
});

test('keeps keyboard movement inside the fs root', async ({ page }) => {
  await openFixture(page);

  await page.evaluate(() => {
    document.getElementById('outside-modal').hidden = false;
    document.getElementById('outside-panel').focus();
  });
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);

  await expect(page.locator('[fs]')).toHaveAttribute('fs-view', 'one');
  expect(await page.evaluate(() => window.__lastKeydown)).toMatchObject({
    key: 'ArrowDown',
    prevented: false,
    target: 'outside-panel',
  });

  // 루트 내부의 비대화형 요소에서 시작한 키보드 입력은 기존대로 이동한다.
  await page.evaluate(() => {
    document.getElementById('outside-modal').hidden = true;
    document.getElementById('page-one').focus();
  });
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[fs]')).toHaveAttribute('fs-view', 'two');

  expect(await page.evaluate(() => window.__lastKeydown)).toMatchObject({
    key: 'ArrowDown',
    prevented: true,
    target: 'page-one',
  });
});
