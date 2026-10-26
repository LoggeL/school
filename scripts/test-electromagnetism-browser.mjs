/**
 * Browser regression checks for the six physics chapters.
 * Run a local server first: python3 -m http.server 8769 --directory site
 * Requires Playwright + Chromium. Optional environment variables:
 *   BASE_URL, SCREENSHOT_DIR, PLAYWRIGHT_MODULE (module file),
 *   BROWSER_EXECUTABLE, TOPICS (comma-separated slugs).
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleName = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(moduleName ? pathToFileURL(path.resolve(moduleName)).href : 'playwright');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8769';
const output = path.resolve(process.env.SCREENSHOT_DIR || 'work/browser-tests');
const viewNames = {
  generator: ['overview', 'coil', 'sliprings', 'meter'],
  induktion: ['overview', 'field', 'coil', 'meter'],
  'magnetfeld-eisenkern': ['overview', 'inside', 'field'],
  transformator: ['overview', 'core', 'secondary'],
  hochspannungsleitungen: ['overview', 'line', 'substation', 'village'],
};
const topics = process.env.TOPICS?.split(',') || [...Object.keys(viewNames), 'spule-elektromagnet'];
const report = [];
await mkdir(output, {recursive: true});
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function controlValues(page) {
  return page.locator('#em-controls').evaluate(form => Object.fromEntries(
    [...form.querySelectorAll('input[name]')].map(input => [input.name, input.type === 'checkbox' ? input.checked : Number(input.value)]),
  ));
}
async function assertWebGL(page, selector) {
  const result = await page.locator(`${selector} canvas`).evaluate(canvas => {
    const gl = canvas.getContext('webgl2');
    return {width: canvas.width, height: canvas.height, webgl: !!gl, lost: gl?.isContextLost()};
  });
  assert.ok(result.webgl && !result.lost && result.width > 100 && result.height > 100, JSON.stringify(result));
}
async function assertLayout(page) {
  const layout = await page.evaluate(() => ({width: innerWidth, content: document.documentElement.scrollWidth}));
  assert.ok(layout.content <= layout.width + 1, `Horizontal overflow: ${JSON.stringify(layout)}`);
}
async function assertLabels(page, selector) {
  await page.locator(`${selector} canvas`).screenshot();
  const failures = await page.locator(selector).evaluate(host => {
    const bounds = host.getBoundingClientRect();
    const visible = [...host.querySelectorAll('.em-label')].filter(label => {
      const style = getComputedStyle(label);
      return style.display !== 'none' && style.visibility !== 'hidden' && label.getBoundingClientRect().width > 0;
    }).map(label => ({text: label.textContent, rect: label.getBoundingClientRect()}));
    const errors = [];
    if (!visible.length) errors.push('No visible model labels');
    for (const {text, rect} of visible) {
      if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) errors.push(`Clipped label: ${text}`);
    }
    for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i], b = visible[j];
      if (Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left) > 1 && Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top) > 1) errors.push(`Overlapping labels: ${a.text} / ${b.text}`);
    }
    return errors;
  });
  assert.deepEqual(failures, [], 'Model labels fit without overlap');
}
async function checkContract(page, topic) {
  const contract = await page.evaluate(async topic => {
    const THREE = await import('/assets/vendor/three.module.js');
    const {createKit} = await import('/assets/em-kit.js');
    const module = await import(`/assets/experiments/${topic}.js`);
    const group = new THREE.Group();
    const kit = createKit(THREE, group);
    const scene = module.createExperiment({THREE, group, kit});
    const result = {views: scene.views, camera: scene.camera};
    group.traverse(object => {
      object.geometry?.dispose();
      for (const material of [object.material].flat().filter(Boolean)) material.dispose();
    });
    return result;
  }, topic);
  assert.ok(contract.camera && Number.isFinite(contract.camera.distance), `${topic}: camera contract`);
  for (const name of viewNames[topic]) {
    const view = contract.views?.[name];
    assert.ok(view, `${topic}: missing view ${name}`);
    assert.ok(view.target?.length === 3 && view.target.every(Number.isFinite), `${topic}: invalid target ${name}`);
  }
}
async function captureLab(page, selector, topic, size) {
  const filename = path.join(output, `${topic}-${size}.png`);
  // Remove only the sticky positioning for the standalone laboratory capture.
  const style = '.em-toc { position: static !important; }';
  if (size === 'desktop') {
    await page.locator(selector).evaluate(element => element.scrollIntoView({block: 'start'}));
    await page.screenshot({path: filename, style});
  } else {
    await page.locator(selector).screenshot({path: filename, style});
  }
}
async function checkExperiment(page, topic, size) {
  await page.waitForFunction(() => document.querySelector('#em-viewport')?.dataset.status === 'ready');
  await page.locator('#em-viewport').scrollIntoViewIfNeeded();
  await assertWebGL(page, '#em-viewport');
  const defaults = await controlValues(page);
  if (size === 'desktop') await checkContract(page, topic);
  assert.equal(await page.locator('#em-pause').getAttribute('aria-pressed'), 'true', 'Reduced motion starts paused');
  assert.equal(await page.locator('#em-step').isEnabled(), true);

  const buttons = page.locator('[data-preset], [data-view]');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const preset = JSON.parse(await button.getAttribute('data-preset') || '{}');
    const view = await button.getAttribute('data-view');
    if (view) assert.ok(viewNames[topic].includes(view), `${topic}: unknown requested view ${view}`);
    await button.click();
    const actual = await controlValues(page);
    for (const [key, value] of Object.entries(preset)) assert.equal(actual[key], value, `${topic}: preset ${i}, ${key}`);
    assert.equal(await page.locator('#em-viewport').getAttribute('data-status'), 'ready');
    if (view) assert.equal(await page.locator('#em-viewport').getAttribute('data-view'), view, 'Requested view is selected');
  }

  // Boundary values exercise geometry rebuilding and zero-current/zero-field states.
  const ranges = page.locator('#em-controls input[type="range"]');
  for (let i = 0; i < await ranges.count(); i++) {
    for (const boundary of ['min', 'max']) {
      await ranges.nth(i).fill(await ranges.nth(i).getAttribute(boundary));
      assert.doesNotMatch(await page.locator('#em-metrics').textContent(), /NaN|Infinity|undefined/);
    }
  }
  await page.locator('#em-reset').click();
  assert.deepEqual(await controlValues(page), defaults, 'Reset restores controls');
  await page.locator('#em-viewport').scrollIntoViewIfNeeded();
  const initial = await page.locator('#em-viewport canvas').screenshot();
  const cameraButton = page.locator('[data-view]:not([data-view="overview"])').first();
  if (await cameraButton.count()) {
    await cameraButton.click();
    await page.locator('#em-viewport').scrollIntoViewIfNeeded();
    const detail = await page.locator('#em-viewport canvas').screenshot();
    assert.notDeepEqual(detail, initial, 'Detail button changes the rendered view');
    const selectedView = await cameraButton.getAttribute('data-view');
    const originalSize = page.viewportSize();
    await page.setViewportSize({...originalSize, width: originalSize.width + 20});
    await page.locator('#em-viewport canvas').screenshot();
    assert.equal(await page.locator('#em-viewport').getAttribute('data-view'), selectedView, 'Resize retains selected camera view');
    await page.setViewportSize(originalSize);
    await assertLayout(page);
  }
  await page.locator('#em-reset').click();
  await page.locator('#em-viewport').scrollIntoViewIfNeeded();
  const keyboardStart = await page.locator('#em-viewport canvas').screenshot();
  await page.locator('#em-viewport canvas').press('ArrowRight');
  const keyboardEnd = await page.locator('#em-viewport canvas').screenshot();
  assert.notDeepEqual(keyboardEnd, keyboardStart, 'Arrow key rotates the camera');
  await page.locator('#em-viewport canvas').press('Home');
  assert.equal(await page.locator('#em-viewport').getAttribute('data-view'), 'overview');
  const before = await page.locator('#em-viewport canvas').screenshot();
  await page.locator('#em-step').click();
  const after = await page.locator('#em-viewport canvas').screenshot();
  assert.notDeepEqual(after, before, 'Single step advances the model');
  await page.locator('#em-pause').click();
  assert.equal(await page.locator('#em-pause').getAttribute('aria-pressed'), 'false');
  assert.equal(await page.locator('#em-step').isDisabled(), true);
  await page.locator('#em-pause').click();
  assert.equal(await page.locator('#em-pause').getAttribute('aria-pressed'), 'true');
  await page.locator('#em-reset').click();
  await assertLayout(page);
  await assertLabels(page, '#em-viewport');
  await captureLab(page, '#experiment', topic, size);
  return {presets: count, views: viewNames[topic]};
}
async function checkCoil(page, size) {
  await page.waitForFunction(() => document.querySelector('#model canvas') && !document.querySelector('#model').hidden);
  await page.locator('#model').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#model').dataset.geometry === 'blender');
  await assertWebGL(page, '#model');
  assert.equal(await page.locator('#pause').isChecked(), true, 'Reduced motion starts paused');
  await page.locator('#core').check();
  assert.match(await page.locator('#field-value').textContent(), /Kern/);
  await page.locator('#reverse').check();
  assert.match(await page.locator('#model-description').textContent(), /links ist der Nordpol/);
  await page.locator('#current').fill('0');
  assert.match(await page.locator('#field-value').textContent(), /Kein Spulenfeld/);
  await page.locator('#current').fill('1');
  await page.locator('#turns').fill('800');
  assert.match(await page.locator('#model-description').textContent(), /800 Windungen/);
  await page.locator('#view-2d').click();
  assert.equal(await page.locator('#model').isHidden(), true);
  assert.equal(await page.locator('#cross-section').isVisible(), true);
  await page.locator('#view-3d').click();
  assert.equal(await page.locator('#model').isVisible(), true);
  await page.locator('#core').uncheck();
  await page.locator('#reverse').uncheck();
  await page.locator('#current').fill('0.5');
  await page.locator('#turns').fill('400');
  await page.locator('#model').scrollIntoViewIfNeeded();
  const pausedFrame = await page.locator('#model canvas').screenshot();
  await page.locator('#pause').uncheck();
  // Allow a short, intentional interval of model time to test explicit playback.
  await page.waitForTimeout(250);
  const playingFrame = await page.locator('#model canvas').screenshot();
  assert.notDeepEqual(playingFrame, pausedFrame, 'Explicit start overrides the reduced-motion initial pause');
  await page.locator('#pause').check();
  const stoppedFrame = await page.locator('#model canvas').screenshot();
  await page.waitForTimeout(250);
  assert.deepEqual(await page.locator('#model canvas').screenshot(), stoppedFrame, 'Pause freezes the coil animation');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.locator('#pause').uncheck();
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.waitForFunction(() => document.querySelector('#pause').checked);
  assert.equal(await page.locator('#pause').isChecked(), true, 'A new reduced-motion preference pauses playback');
  await assertLayout(page);
  await assertLabels(page, '#model');
  await captureLab(page, '#spulenlabor', 'spule-elektromagnet', size);
  return {controls: 5, views: ['3d', '2d']};
}

try {
  for (const [size, viewport] of [['desktop', {width: 1440, height: 1000}], ['mobile', {width: 390, height: 844}]]) {
    for (const topic of topics) {
      const context = await browser.newContext({viewport, deviceScaleFactor: 1, isMobile: size === 'mobile', hasTouch: size === 'mobile', reducedMotion: 'reduce'});
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.stack || error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(baseURL)) errors.push(`${response.status()} ${response.url()}`); });
      const entry = {topic, size};
      try {
        const response = await page.goto(`${baseURL}/physik/${topic}/`, {waitUntil: 'networkidle'});
        assert.equal(response.status(), 200);
        await assertLayout(page);
        Object.assign(entry, topic === 'spule-elektromagnet' ? await checkCoil(page, size) : await checkExperiment(page, topic, size));
        assert.deepEqual(errors, [], 'Browser errors');
        entry.passed = true;
        console.log(`PASS ${size}: ${topic}`);
      } catch (error) {
        entry.passed = false;
        entry.error = error.stack || String(error);
        entry.browserErrors = errors;
        console.error(`FAIL ${size}: ${topic}: ${error.message}`);
        await page.screenshot({path: path.join(output, `${topic}-${size}-failure.png`)}).catch(() => {});
      } finally {
        report.push(entry);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  let savedReport = report;
  if (process.env.TOPICS) {
    // A focused rerun replaces only those scenarios in the previous full report.
    try {
      const previous = JSON.parse(await readFile(path.join(output, 'browser-report.json'), 'utf8'));
      const merged = new Map(previous.map(entry => [`${entry.size}/${entry.topic}`, entry]));
      for (const entry of report) merged.set(`${entry.size}/${entry.topic}`, entry);
      savedReport = [...merged.values()];
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  await writeFile(path.join(output, 'browser-report.json'), JSON.stringify(savedReport, null, 2) + '\n');
}
assert.ok(report.every(entry => entry.passed), `${report.filter(entry => !entry.passed).length} browser scenario(s) failed. See ${output}/browser-report.json`);
console.log(`${report.length} browser scenarios passed; screenshots: ${output}`);
