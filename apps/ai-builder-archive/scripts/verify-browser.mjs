import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = Number(process.env.CDP_PORT ?? 9239);
const userDataDir = await mkdtemp(join(tmpdir(), "ai-builder-archive-cdp-"));

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--window-size=1440,1000",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  url,
]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWebSocketUrl() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      const pages = await response.json();
      const page = pages.find((entry) => entry.type === "page");
      if (page?.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      await delay(150);
    }
  }

  throw new Error("Chrome DevTools endpoint did not become available.");
}

function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (payload.id && pending.has(payload.id)) {
      const { resolve, reject } = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) {
        reject(new Error(payload.error.message));
      } else {
        resolve(payload.result);
      }
    }
  });

  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          id += 1;
          socket.send(
            JSON.stringify({
              id,
              method,
              params,
            }),
          );
          return new Promise((sendResolve, sendReject) => {
            pending.set(id, { resolve: sendResolve, reject: sendReject });
          });
        },
        evaluate(expression) {
          id += 1;
          socket.send(
            JSON.stringify({
              id,
              method: "Runtime.evaluate",
              params: {
                expression,
                awaitPromise: true,
                returnByValue: true,
              },
            }),
          );
          return new Promise((evalResolve, evalReject) => {
            pending.set(id, { resolve: evalResolve, reject: evalReject });
          });
        },
        close() {
          socket.close();
        },
      });
    });
    socket.addEventListener("error", reject);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  const client = await connect(await getWebSocketUrl());
  await delay(600);
  await client.evaluate(`new Promise((resolve) => {
    if (document.querySelectorAll('.insight-card').length) resolve(true);
    const start = Date.now();
    const timer = setInterval(() => {
      if (document.querySelectorAll('.insight-card').length || Date.now() - start > 5000) {
        clearInterval(timer);
        resolve(true);
      }
    }, 100);
  })`);

  const initial = await client.evaluate(`({
    cards: document.querySelectorAll('.insight-card').length,
    link: document.querySelector('.insight-card .source-link')?.href ?? '',
    linkTarget: document.querySelector('.insight-card .source-link')?.target ?? '',
    linkLabel: document.querySelector('.insight-card .source-link')?.textContent.trim() ?? '',
    linkAriaLabel: document.querySelector('.insight-card .source-link .sr-only')?.textContent.trim() ?? '',
    linkInHeader: Boolean(document.querySelector('.insight-card .card-meta .source-link')),
    footerLinks: document.querySelectorAll('.insight-card .card-footer a').length,
    xKickerCount: document.querySelectorAll('.insight-card--x .card-kicker').length,
    timestampText: document.querySelector('.insight-card .source-timestamp')?.textContent.trim() ?? '',
    timestampDateTime: document.querySelector('.insight-card .source-timestamp')?.getAttribute('datetime') ?? '',
    timestampFontSize: document.querySelector('.insight-card .source-timestamp')
      ? Math.round(parseFloat(getComputedStyle(document.querySelector('.insight-card .source-timestamp')).fontSize))
      : 0,
    filters: [...document.querySelectorAll('.segment-control button')].map((button) => ({
      label: button.querySelector('.filter-label')?.textContent.trim() ?? '',
      count: button.querySelector('.filter-count')?.textContent.trim() ?? ''
    }))
  })`);
  assert(initial.result.value.cards > 0, "Expected at least one insight card.");
  assert(/^https?:\/\//.test(initial.result.value.link), "Expected source link.");
  const issueHeadingResult = await client.evaluate(
    `document.querySelector('.issue-heading h2')?.textContent ?? ''`,
  );
  const issueCountLabelResult = await client.evaluate(
    `document.querySelector('.issue-heading > p:last-child')?.textContent ?? ''`,
  );
  assert(
    issueHeadingResult.result.value.endsWith(" Digest"),
    "Expected day headings to include Digest after the date.",
  );
  assert(
    issueCountLabelResult.result.value.includes("visible insight"),
    "Expected issue count labels to use insight terminology.",
  );
  const issueHeadingLayout = await client.evaluate(`(() => {
    const heading = document.querySelector('.issue-heading h2');
    if (!heading) return { singleLine: false, overflowX: true };
    const style = getComputedStyle(heading);
    return {
      singleLine: Math.ceil(heading.getBoundingClientRect().height) <=
        Math.ceil(parseFloat(style.lineHeight) * 1.15),
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
      whiteSpace: style.whiteSpace
    };
  })()`);
  assert(
    issueHeadingLayout.result.value.whiteSpace === "nowrap",
    "Expected issue heading to prevent wrapping.",
  );
  assert(
    issueHeadingLayout.result.value.singleLine === true,
    "Expected issue heading to stay on one line.",
  );
  assert(
    issueHeadingLayout.result.value.overflowX === false,
    "Expected issue heading not to create horizontal overflow.",
  );
  assert(
    initial.result.value.linkTarget !== "_blank",
    "Expected source link to navigate in the current browser surface.",
  );
  assert(
    initial.result.value.linkLabel !== "Open source",
    "Expected source link to use an icon button instead of visible text.",
  );
  assert(
    initial.result.value.linkAriaLabel === "Open source",
    "Expected icon source link to keep an accessible label.",
  );
  assert(
    initial.result.value.linkInHeader === true,
    "Expected source link to sit in the card header next to the star action.",
  );
  assert(
    initial.result.value.footerLinks === 0,
    "Expected source links to be removed from card footers.",
  );
  assert(
    initial.result.value.xKickerCount === 0,
    "Expected X post cards not to repeat the builder as a body kicker.",
  );
  assert(
    initial.result.value.timestampText.length > 0,
    "Expected cards to show a subtle publish date/time.",
  );
  assert(
    initial.result.value.timestampDateTime.length > 0,
    "Expected card timestamp to expose a datetime value.",
  );
  assert(
    initial.result.value.timestampFontSize < 14,
    "Expected card timestamp to be visually subtle.",
  );
  const cardTitleTypeResult = await client.evaluate(`(() => {
    const title = document.querySelector('.insight-card h3');
    return title ? Math.round(parseFloat(getComputedStyle(title).fontSize)) : 0;
  })()`);
  assert(
    cardTitleTypeResult.result.value === 40,
    "Expected desktop card title size to be 40px.",
  );
  const cardMeasureResult = await client.evaluate(`(() => {
    const stack = document.querySelector('.snippet-stack');
    const cards = [...document.querySelectorAll('.insight-card')];
    const card = cards[0];
    const secondCard = cards[1];
    const stackWidth = stack?.getBoundingClientRect().width ?? 0;
    const cardWidth = card?.getBoundingClientRect().width ?? 0;
    const cardLeft = card?.getBoundingClientRect().left ?? 0;
    const stackLeft = stack?.getBoundingClientRect().left ?? 0;
    return {
      stackWidth,
      cardWidth,
      cardLeft,
      stackLeft,
      firstTop: Math.round(card?.getBoundingClientRect().top ?? 0),
      secondTop: Math.round(secondCard?.getBoundingClientRect().top ?? -1),
      firstHeight: Math.round(card?.getBoundingClientRect().height ?? 0),
      secondHeight: Math.round(secondCard?.getBoundingClientRect().height ?? -1),
      firstTitleTop: Math.round(card?.querySelector('h3')?.getBoundingClientRect().top ?? 0),
      secondTitleTop: Math.round(secondCard?.querySelector('h3')?.getBoundingClientRect().top ?? -1),
      cardCount: cards.length
    };
  })()`);
  assert(
    cardMeasureResult.result.value.cardWidth < cardMeasureResult.result.value.stackWidth,
    "Expected cards to hug content instead of stretching across the full stack.",
  );
  assert(
    cardMeasureResult.result.value.cardCount < 2 ||
      cardMeasureResult.result.value.firstTop ===
        cardMeasureResult.result.value.secondTop,
    "Expected desktop cards to support more than one card per row.",
  );
  assert(
    cardMeasureResult.result.value.cardCount < 2 ||
      Math.abs(
        cardMeasureResult.result.value.firstHeight -
          cardMeasureResult.result.value.secondHeight,
      ) <= 2,
    "Expected cards in the same row to share the same container height.",
  );
  assert(
    cardMeasureResult.result.value.cardCount < 2 ||
      Math.abs(
        cardMeasureResult.result.value.firstTitleTop -
          cardMeasureResult.result.value.secondTitleTop,
      ) <= 2,
    "Expected first-row card titles to start at the same vertical position.",
  );
  assert(
    Math.abs(
      cardMeasureResult.result.value.cardLeft -
        cardMeasureResult.result.value.stackLeft,
    ) <= 1,
    "Expected narrower cards to stay left-aligned with the reading column.",
  );
  assert(
    initial.result.value.filters.some(
      (filter) => filter.label === "Blogs" && filter.count.length > 0,
    ),
    "Expected Blogs filter to be present.",
  );
  assert(
    initial.result.value.filters.every((filter) => /^\d+$/.test(filter.count)),
    "Expected every source filter option to include a count chip.",
  );
  const filterPlacement = await client.evaluate(`({
    inHeader: Boolean(document.querySelector('.filter-panel .segment-control')),
    beforeContent: (() => {
      const filter = document.querySelector('.source-filter-row');
      const content = document.querySelector('.snippet-stack, .empty-state');
      if (!filter || !content) return false;
      return Boolean(filter.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING);
    })(),
    compact: (() => {
      const filter = document.querySelector('.source-filter-row .segment-control');
      const card = document.querySelector('.insight-card');
      if (!filter || !card) return false;
      return filter.getBoundingClientRect().width < card.getBoundingClientRect().width * 0.8;
    })()
  })`);
  assert(
    filterPlacement.result.value.inHeader === false,
    "Expected source filter to be outside the sticky header.",
  );
  assert(
    filterPlacement.result.value.beforeContent === true,
    "Expected source filter to sit above insights or empty state.",
  );
  assert(
    filterPlacement.result.value.compact === true,
    "Expected source filter to be more compact than the card column.",
  );
  const sourceIdentityResult = await client.evaluate(`(() => {
    const card = document.querySelector('.insight-card--podcast');
    const metaSource = card?.querySelector('.source-name')?.textContent?.trim() ?? '';
    const kicker = card?.querySelector('.card-kicker')?.textContent?.trim() ?? '';
    return { metaSource, kicker };
  })()`);
  assert(
    sourceIdentityResult.result.value.kicker !==
      sourceIdentityResult.result.value.metaSource,
    "Expected card body kicker not to repeat the source name.",
  );

  const globalSearchResult = await client.evaluate(`(async () => {
    const input = document.querySelector('input[type="search"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'swyx');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
    const result = {
      cards: document.querySelectorAll('.insight-card').length,
      heading: document.querySelector('.issue-heading h2')?.textContent ?? '',
      firstTitle: document.querySelector('.insight-card h3')?.textContent ?? '',
      xSourceNameCount: document.querySelectorAll('.insight-card--x .source-name').length
    };
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
    return result;
  })()`);
  assert(
    globalSearchResult.result.value.cards >= 2,
    "Expected nav search to return results across all archive days.",
  );
  assert(
    globalSearchResult.result.value.heading === "Search results",
    "Expected nav search to switch the main pane into search results.",
  );
  assert(
    globalSearchResult.result.value.firstTitle.toLowerCase().includes("swyx"),
    "Expected global search to include older Swyx archive insights.",
  );
  assert(
    globalSearchResult.result.value.xSourceNameCount === 0,
    "Expected X post cards not to repeat the platform name after the source pill.",
  );

  const stickyResult = await client.evaluate(`(async () => {
    window.scrollTo(0, 420);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const panel = document.querySelector('.filter-panel');
    const rect = panel.getBoundingClientRect();
    const styles = getComputedStyle(panel);
    return {
      top: Math.round(rect.top),
      position: styles.position,
      zIndex: Number(styles.zIndex)
    };
  })()`);
  assert(stickyResult.result.value.position === "sticky", "Expected sticky issue header.");
  assert(stickyResult.result.value.top === 0, "Expected issue header to stick to top.");
  assert(stickyResult.result.value.zIndex >= 5, "Expected sticky issue header above cards.");

  const railResult = await client.evaluate(`(async () => {
    const toggle = document.querySelector('.rail-toggle');
    const rail = document.querySelector('.archive-rail');
    const content = document.querySelector('.rail-content');
    const expandedWidth = Math.round(rail.getBoundingClientRect().width);
    toggle.click();
    await new Promise((resolve) => setTimeout(resolve, 220));
    const collapsedWidth = Math.round(rail.getBoundingClientRect().width);
    const collapsed = {
      shell: document.querySelector('.app-shell').className,
      contentDisplay: getComputedStyle(content).display,
      ariaHidden: content.getAttribute('aria-hidden'),
      label: toggle.getAttribute('aria-label')
    };
    toggle.click();
    await new Promise((resolve) => setTimeout(resolve, 220));
    return {
      expandedWidth,
      collapsedWidth,
      collapsed,
      expandedAgain: {
        shell: document.querySelector('.app-shell').className,
        contentDisplay: getComputedStyle(content).display,
        ariaHidden: content.getAttribute('aria-hidden'),
        label: toggle.getAttribute('aria-label')
      }
    };
  })()`);
  assert(
    railResult.result.value.collapsedWidth < railResult.result.value.expandedWidth,
    "Expected collapsed rail to become narrower.",
  );
  assert(
    railResult.result.value.collapsed.contentDisplay === "none",
    "Expected collapsed rail content to hide.",
  );
  assert(
    railResult.result.value.collapsed.ariaHidden === "true",
    "Expected collapsed rail content to be hidden from assistive tech.",
  );
  assert(
    railResult.result.value.collapsed.label === "Expand archive navigation",
    "Expected collapsed rail toggle to expose expand action.",
  );
  assert(
    railResult.result.value.expandedAgain.contentDisplay !== "none",
    "Expected rail content to return after expanding.",
  );

  const starResult = await client.evaluate(`(async () => {
    const button = document.querySelector('.star-button');
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const saved = JSON.parse(localStorage.getItem('ai-builder-archive.starred.v1'));
    return {
      savedCount: saved.length,
      pressed: document.querySelector('.star-button')?.getAttribute('aria-pressed')
    };
  })()`);
  assert(starResult.result.value.savedCount === 1, "Expected one saved star.");
  assert(starResult.result.value.pressed === "true", "Expected active star state.");

  await client.send("Page.reload", { ignoreCache: true }).catch(() => {});
  await delay(900);

  let reloadResult;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      reloadResult = await client.evaluate(`new Promise((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const button = document.querySelector('.star-button');
      if (button || Date.now() - start > 5000) {
        clearInterval(timer);
        resolve(button?.getAttribute('aria-pressed') ?? null);
      }
    }, 100);
  })`);
      break;
    } catch (error) {
      if (attempt === 9) {
        throw error;
      }
      await delay(300);
    }
  }
  assert(
    reloadResult?.result.value === "true",
    "Expected star state to persist after reload.",
  );

  const searchResult = await client.evaluate(`(async () => {
    const input = document.querySelector('input[type="search"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'enterprise');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 150));
    return document.querySelectorAll('.insight-card').length;
  })()`);
  assert(searchResult.result.value > 0, "Expected search to find an insight.");

  const filterResult = await client.evaluate(`(async () => {
    const input = document.querySelector('input[type="search"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 150));
    const sourceMap = {
      X: 'insight-card--x',
      Podcasts: 'insight-card--podcast',
      Blogs: 'insight-card--blog'
    };
    const sourceButton = [...document.querySelectorAll('.segment-control button')].find((button) => {
      const label = button.querySelector('.filter-label')?.textContent.trim() ?? '';
      const count = Number(button.querySelector('.filter-count')?.textContent.trim() ?? '0');
      return label !== 'All' && count > 0;
    });
    sourceButton.click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const label = sourceButton.querySelector('.filter-label')?.textContent.trim() ?? '';
    const expectedClass = sourceMap[label];
    const cards = [...document.querySelectorAll('.insight-card')];
    return {
      label,
      cards: cards.length,
      matchingCards: cards.filter((card) => card.classList.contains(expectedClass)).length,
      empty: document.querySelector('.empty-state h2')?.textContent ?? ''
    };
  })()`);
  assert(
    filterResult.result.value.cards > 0,
    "Expected source filter to show at least one matching insight.",
  );
  assert(
    filterResult.result.value.cards === filterResult.result.value.matchingCards,
    "Expected source filter to only show cards from the selected source.",
  );

  client.close();
  console.log("Browser verification passed.");
} finally {
  chrome.kill();
  await delay(300);
  await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
}
