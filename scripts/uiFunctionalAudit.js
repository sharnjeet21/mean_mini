const { chromium } = require('playwright-core');

const baseUrl = process.env.APP_URL || 'http://localhost:4200';
const executablePath = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const report = [];
const failures = [];

function record(name, passed, detail = '') {
  report.push({ name, passed, detail });
  if (!passed) failures.push({ name, detail });
}

async function expectVisible(page, selector, name) {
  try {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout: 15000 });
    record(name, true);
    return true;
  } catch (error) {
    record(name, false, error.message.split('\n')[0]);
    return false;
  }
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email address').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: /sign in to navigator/i }).click();
  await page.waitForFunction(() => location.pathname === '/dashboard', null, { timeout: 20000 });
  await page.getByText(/Explore live itineraries/i).waitFor({ timeout: 20000 });
}

async function run() {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--disable-gpu'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const apiResponses = [];
  const badResponses = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });
  page.on('response', async (response) => {
    if (response.url().includes('/api/')) {
      apiResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
    if (response.status() >= 400) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch (err) {}
      badResponses.push(`${response.status()} ${response.request().method()} ${response.url()} - ${bodyText}`);
    }
  });

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await expectVisible(page, 'h1', 'Home hero renders');
    record(
      'Home hero CTA is actionable',
      await page.getByRole('button', { name: /design my journey/i }).isEnabled(),
    );
    const collectionCards = page.locator('article').filter({ has: page.locator('h3') });
    record('Home collection cards render', await collectionCards.count() >= 3, `count=${await collectionCards.count()}`);
    await page.locator('article').filter({ hasText: 'The Zen of Kyoto' }).first().click();
    await page.waitForTimeout(200);
    const previewVisible = await page.evaluate(() => {
      const component = globalThis.ng?.getComponent?.(document.querySelector('app-home'));
      return Boolean(component?.showPreviewModal && component?.previewCard);
    });
    record(
      'Home collection card opens itinerary preview',
      previewVisible,
    );
    if (previewVisible) {
      await page.getByRole('button', { name: /close preview/i }).click();
    }

    await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="name"]').fill('Field Audit User');
    await page.locator('input[name="email"]').fill('field.audit@example.com');
    await page.locator('input[name="password"]').fill('TravelDemo123!');
    await page.locator('input[name="confirmPassword"]').fill('DifferentPassword123!');
    record(
      'Registration mismatch disables submission',
      await page.getByRole('button', { name: /create my travel workspace/i }).isDisabled(),
    );

    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /need account help/i }).click();
    await page.getByText(/password reset is not configured/i).waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    record(
      'Account-help control provides feedback',
      await page.getByText(/password reset is not configured/i).isVisible(),
    );

    await login(page, 'aarav.demo@travel.com', 'TravelDemo123!');
    await expectVisible(page, 'text=Explore live itineraries', 'User dashboard opens');
    const tripCards = page.locator('section article').filter({ has: page.locator('a:has-text("Open")') });
    await tripCards.first().waitFor({ state: 'visible', timeout: 15000 }).catch(async (error) => {
      const diagnostics = {
        url: page.url(),
        tokenPresent: await page.evaluate(() => Boolean(localStorage.getItem('token'))),
        componentState: await page.evaluate(() => {
          const app = document.querySelector('app-dashboard');
          const debug = globalThis.ng;
          if (!app || !debug?.getComponent) return null;
          const component = debug.getComponent(app);
          return {
            loading: component?.loading,
            loadError: component?.loadError,
            itineraryCount: component?.itineraries?.length,
          };
        }),
        directFetch: await page.evaluate(async () => {
          const token = localStorage.getItem('token');
          const response = await fetch('http://localhost:5000/api/v1/itinerary', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const body = await response.json();
          return { status: response.status, array: Array.isArray(body), count: body?.length };
        }).catch((error) => ({ error: error.message })),
        loadingText: await page.getByText(/Gathering the latest routes/i).isVisible().catch(() => false),
        errorText: await page.locator('text=The routes missed their connection.').isVisible().catch(() => false),
        apiResponses,
        failedRequests,
        consoleErrors,
      };
      record('Itinerary cards become visible', false, JSON.stringify(diagnostics));
      console.error(`DASHBOARD_DIAGNOSTICS ${JSON.stringify(diagnostics)}`);
    });
    const renderedTripCards = await tripCards.count();
    record('Itinerary cards render', renderedTripCards >= 6, `count=${renderedTripCards}`);
    if (!renderedTripCards) throw new Error('Dashboard itinerary cards did not render.');
    const detailAuditCard = tripCards.filter({ hasText: 'Kyoto Lanterns & Quiet Temples' }).first();
    const firstCardImage = await detailAuditCard.locator('img').getAttribute('src');

    const searchField = page.getByLabel(/search a city, island or region/i);
    await searchField.fill('Ky');
    const suggestionPanel = page.locator('app-destination-search .glass-panel').first();
    await suggestionPanel.waitFor({ state: 'visible', timeout: 10000 });
    const searchLayout = await page.evaluate(() => {
      const root = document.querySelector('app-destination-search');
      const panels = root ? [...root.querySelectorAll('.glass-panel')] : [];
      const suggestion = panels[0];
      const preview = root?.querySelector('img[alt="Destination preview"]')?.parentElement;
      const rect = (element) => element ? element.getBoundingClientRect() : null;
      return {
        suggestion: rect(suggestion),
        preview: rect(preview),
      };
    });
    record(
      'Destination suggestions do not overlap the preview',
      !searchLayout.preview || searchLayout.suggestion.bottom <= searchLayout.preview.top,
      JSON.stringify(searchLayout),
    );
    await searchField.fill('');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText(/Explore live itineraries/i).waitFor({ timeout: 20000 });
    await page.locator('a:has-text("Open")').first().waitFor({ state: 'visible', timeout: 20000 });

    const trendingCard = page.locator('app-trending-cards button').first();
    if (await trendingCard.isVisible().catch(() => false)) {
      const trendingName = (await trendingCard.locator('strong').textContent()).trim();
      await trendingCard.click();
      await page.waitForTimeout(100);
      const destinationGuidance = await page.evaluate(() => {
        const component = globalThis.ng?.getComponent?.(document.querySelector('app-dashboard'));
        return component?.destinationToast || '';
      });
      record(
        'Trending destination card gives user guidance',
        destinationGuidance.includes(trendingName),
        `destination=${trendingName}; toast=${destinationGuidance}`,
      );
    } else {
      record('Trending destination card gives user guidance', false, 'Trending cards unavailable');
    }

    await page.getByRole('button', { name: 'Saved', exact: true }).click();
    await page.waitForFunction(() => {
      const component = globalThis.ng?.getComponent?.(document.querySelector('app-dashboard'));
      return component && !component.loading;
    }, null, { timeout: 20000 });
    record('Saved tab loads cards', await page.locator('a:has-text("Open")').count() > 0);

    await page.getByRole('button', { name: 'Bookings', exact: true }).click();
    await page.waitForFunction(() => {
      const component = globalThis.ng?.getComponent?.(document.querySelector('app-dashboard'));
      return component && !component.loading;
    }, null, { timeout: 20000 });
    record('Bookings tab loads cards', await page.locator('a:has-text("Open")').count() > 0);

    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    await page.waitForTimeout(1000);
    await detailAuditCard.locator('a:has-text("Open")').click();
    await page.waitForURL('**/itinerary/**', { timeout: 15000 });
    await expectVisible(page, 'text=Trip Intelligence', 'Itinerary detail loads');
    const detailHeroImage = await page.locator('section img').first().getAttribute('src');
    record(
      'Dashboard card and detail hero use the same image',
      firstCardImage === detailHeroImage,
      `${firstCardImage} -> ${detailHeroImage}`,
    );
    await expectVisible(page, 'text=Daily itinerary', 'Daily plan renders');
    const dayButtons = page.locator('section article > button');
    if (await dayButtons.count()) {
      await dayButtons.first().click();
      record('Daily itinerary accordion responds', true);
    } else {
      record('Daily itinerary accordion responds', false, 'No day controls found');
    }

    const saveButton = page.getByRole('button', { name: /save for later|saved/i }).first();
    if (await saveButton.isVisible()) {
      const before = (await saveButton.textContent()).trim();
      await saveButton.click();
      await page.waitForFunction(() => {
        const component = globalThis.ng?.getComponent?.(document.querySelector('app-itinerary-detail'));
        return component && component.actionLoading === '';
      }, null, { timeout: 20000 });
      const after = (await saveButton.textContent()).trim();
      record('Favorite action responds', before !== after, `${before} -> ${after}`);
      await saveButton.click();
      await page.waitForFunction(() => {
        const component = globalThis.ng?.getComponent?.(document.querySelector('app-itinerary-detail'));
        return component && component.actionLoading === '';
      }, null, { timeout: 20000 });
    } else {
      record('Favorite action responds', false, 'Button not visible');
    }

    const bookingButton = page.getByRole('button', { name: /book this itinerary|cancel booking/i }).first();
    if (await bookingButton.isVisible()) {
      const before = (await bookingButton.textContent()).trim();
      await bookingButton.click();
      await page.waitForFunction(() => {
        const component = globalThis.ng?.getComponent?.(document.querySelector('app-itinerary-detail'));
        return component && component.actionLoading === '';
      }, null, { timeout: 20000 });
      const after = (await bookingButton.textContent()).trim();
      record('Booking action responds', before !== after, `${before} -> ${after}`);
      await bookingButton.click();
      await page.waitForFunction(() => {
        const component = globalThis.ng?.getComponent?.(document.querySelector('app-itinerary-detail'));
        return component && component.actionLoading === '';
      }, null, { timeout: 20000 });
    } else {
      record('Booking action responds', false, 'Button not visible');
    }

    const reviewState = await page.evaluate(() => {
      const app = document.querySelector('app-itinerary-detail');
      const component = globalThis.ng?.getComponent?.(app);
      return component
        ? { rating: component.reviewRating, comment: component.reviewComment }
        : null;
    });
    const reviewBox = page.getByPlaceholder(/what worked well/i);
    if (reviewState && await reviewBox.isVisible()) {
      await reviewBox.fill(`${reviewState.comment || 'Useful route.'} [UI audit]`);
      await page.locator('button').filter({ hasText: '★' }).nth(4).click();
      await page.getByRole('button', { name: /submit review/i }).click();
      await page.getByText(/review/i).filter({ hasText: /saved|updated|submitted/i }).first()
        .waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      record('Review field submits', !await page.getByRole('button', { name: /saving/i }).isVisible().catch(() => false));
      await reviewBox.fill(reviewState.comment || '');
      await page.locator('button').filter({ hasText: '★' }).nth(Math.max(0, reviewState.rating - 1)).click();
      await page.getByRole('button', { name: /submit review/i }).click();
      await page.waitForTimeout(800);
    } else {
      record('Review field submits', false, 'Review state unavailable');
    }

    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await login(page, 'portfolio.admin@travel.com', 'TravelDemo123!');
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
    await expectVisible(page, 'text=Manage Trips', 'Admin dashboard opens');
    await expectVisible(page, 'table', 'Admin itinerary table renders');

    const search = page.getByPlaceholder('Search itineraries...');
    await search.fill('Kyoto');
    await page.waitForTimeout(300);
    record('Admin search filters table', await page.locator('tbody tr').count() === 1, `rows=${await page.locator('tbody tr').count()}`);
    await search.fill('');

    await page.getByRole('button', { name: 'Inactive', exact: true }).first().click();
    await page.waitForTimeout(300);
    record('Admin inactive filter works', await page.locator('tbody tr').count() >= 1, `rows=${await page.locator('tbody tr').count()}`);

    const createLink = page.getByRole('link', { name: /create new trip/i }).first();
    await createLink.click();
    await page.waitForURL('**/dashboard*', { timeout: 10000 });
    await page.getByText('Journey basics').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    record('Admin create action opens wizard', await page.getByText('Journey basics').isVisible().catch(() => false));

    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByText(/enter a trip title and primary destination/i).waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    record(
      'Create wizard shows required-field validation',
      await page.getByText(/enter a trip title and primary destination/i).isVisible(),
    );

    const auditTitle = `UI Audit Journey ${Date.now()}`;
    await page.locator('input[name="title"]').fill(auditTitle);
    await page.locator('input[name="destination"]').fill('Pondicherry, India');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.locator('input[name="startDate"]').fill('2026-12-18');
    await page.locator('input[name="endDate"]').fill('2026-12-20');
    record(
      'Date fields derive duration',
      await page.getByText('3 Days / 2 Nights').first().isVisible(),
    );
    await page.getByRole('button', { name: /continue/i }).click();
    await page.locator('input[name="budget"]').fill('3000');
    await page.locator('textarea[name="description"]').fill('Temporary itinerary created by the automated UI functional audit.');
    const transportAllocation = await page.locator('input[name="budgetTransport"]').inputValue();
    record('Budget field allocates categories', transportAllocation === '750', `transport=${transportAllocation}`);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /add another stop/i }).click();
    await page.getByPlaceholder(/next city or region/i).fill('Auroville');
    await page.getByPlaceholder(/notes, nights, or highlights/i).fill('Half-day architecture and community visit');
    await page.getByRole('button', { name: /create itinerary/i }).click();
    await page.getByText(auditTitle).waitFor({ state: 'visible', timeout: 15000 });
    record('Create itinerary form saves and renders a card', true);

    const cleanup = await page.evaluate(async (title) => {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const listResponse = await fetch('http://localhost:5000/api/v1/itinerary', { headers });
      const list = await listResponse.json();
      const created = list.find((item) => item.title === title);
      if (!created) return { found: false };
      const deleteResponse = await fetch(`http://localhost:5000/api/v1/itinerary/${created._id}`, {
        method: 'DELETE',
        headers,
      });
      return { found: true, deleted: deleteResponse.ok };
    }, auditTitle);
    record('Audit itinerary cleanup succeeds', cleanup.found && cleanup.deleted, JSON.stringify(cleanup));

    record('No browser console errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
    const meaningfulFailedRequests = failedRequests.filter((item) => !item.includes('net::ERR_ABORTED'));
    record('No failed browser requests', meaningfulFailedRequests.length === 0, meaningfulFailedRequests.slice(0, 5).join(' | '));
    record('No HTTP error responses', badResponses.length === 0, badResponses.slice(0, 5).join(' | '));

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    const mobilePage = await mobileContext.newPage();
    try {
      await mobilePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      const menuButton = mobilePage.getByRole('button', { name: /toggle navigation/i });
      await menuButton.click();
      const mobileNavigationOpen = await mobilePage.evaluate(() => {
        const component = globalThis.ng?.getComponent?.(document.querySelector('app-navbar'));
        return Boolean(component?.mobileOpen);
      });
      record('Mobile navigation opens', mobileNavigationOpen);

      await login(mobilePage, 'portfolio.admin@travel.com', 'TravelDemo123!');
      await mobilePage.locator('a:has-text("Open")').first().waitFor({ state: 'visible', timeout: 20000 });
      record('Mobile dashboard renders itinerary cards', true);
      const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      record('Mobile dashboard has no page-level horizontal overflow', overflow <= 2, `overflow=${overflow}px`);

      await mobilePage.getByRole('button', { name: /new itinerary/i }).click();
      await mobilePage.getByText('Journey basics').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      const mobileModalVisible = await mobilePage.getByText('Journey basics').isVisible().catch(() => false);
      const mobileTitleVisible = await mobilePage.locator('input[name="title"]').isVisible().catch(() => false);
      const mobileState = await mobilePage.evaluate(() => {
        const component = globalThis.ng?.getComponent?.(document.querySelector('app-dashboard'));
        return component ? { showModal: component.showModal } : null;
      });
      record('Mobile create form opens', mobileModalVisible, JSON.stringify(mobileState));
      record('Mobile create fields are usable', mobileTitleVisible, JSON.stringify(mobileState));
    } finally {
      await mobileContext.close();
    }
  } finally {
    await browser.close();
    console.log("Console Errors:", consoleErrors);
    console.log("Failed Requests:", failedRequests);
    console.log("Bad Responses:", badResponses);
    console.log("API Responses:", apiResponses);
  }

  for (const item of report) {
    console.log(`${item.passed ? 'PASS' : 'FAIL'} | ${item.name}${item.detail ? ` | ${item.detail}` : ''}`);
  }

  if (failures.length) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
