import { mkdir, readFile, writeFile, copyFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(mobile, '..');
const out = path.join(mobile, 'www');
const production = process.env.BERUANG_BUILD_KIND === 'production';
if (out !== path.join(repo, 'mobile', 'www')) throw new Error('Invalid staging path');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// Presence uses an anonymous Realtime Database identifier that cannot be tied
// to an account-deletion request. It is intentionally absent from the store build.
const scripts = ['data','utils','firebase-config','storage','parser','sync','auth','dashboard','anomaly','pages','reports','hutang','goal','ai-advisor','recurring','telegram-link','onboarding','app'];
const manifest = [];
async function put(relative, data) {
  const target = path.join(out, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  manifest.push({ path: relative, sha256: createHash('sha256').update(data).digest('hex') });
}
async function copy(relative, source = path.join(repo, relative)) { await put(relative, await readFile(source)); }

for (const name of scripts) {
  let source = await readFile(path.join(repo, 'js', name + '.js'), 'utf8');
  // Native APK updates own the bundle: do not let the PWA service worker cache a different version.
  if (name === 'app') source = source.replaceAll("if ('serviceWorker' in navigator)", 'if (false /* Native bundle: no PWA service worker */)');
  if (name === 'sync') {
    const download = /    const url = URL\.createObjectURL\(new Blob\(\[JSON\.stringify\(backup, null, 2\)\][\s\S]*?    setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 60000\);/;
    if (!download.test(source)) throw new Error('Review native conflict-backup adapter after sync.js changes');
    source = source.replace(download, "    await window.saveNativeBackup(backup, 'beruang-pemulihan-' + Date.now() + '.json');");
  }
  source = source.replaceAll('assets/logo-berbisnis.png?v=3', 'assets/icons/beruang-wallet-192.png');
  await put('js/' + name + '.js', source);
}
let css = await readFile(path.join(repo, 'styles.css'), 'utf8');
css = css.replace(/@import url\('https:\/\/fonts\.googleapis\.com[^']*'\);/g, '');
await put('styles.css', css);
await copy('privacy.html');
for (const name of await readdir(path.join(repo, 'assets/icons'))) {
  if (/^beruang-wallet-\d+\.png$/.test(name)) await copy('assets/icons/' + name);
}

let html = await readFile(path.join(repo, 'app.html'), 'utf8');
html = html.replace(/<link\s+href="https:\/\/fonts\.googleapis\.com[\s\S]*?\/>/, '')
  .replace(/<link rel="manifest"[^>]+>/, '')
  .replace(/<script src="js\/admin\.js[^>]+><\/script>/, '')
  .replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
  .replace('</head>', '<link rel="stylesheet" href="mobile.css" />\n</head>')
  .replace('</body>', `${production ? '<script>window.__BERUANG_STORE_BUILD__=true</script>\n' : ''}<script src="mobile-runtime.js"></script>\n</body>`);
// Do not merely hide external digital-product promotions: remove them from the
// Play-distributed bundle so they cannot be exposed by CSS or accessibility APIs.
html = html.replace(/\s*<div id="affiliate-section"[\s\S]*?<\/div>\s*(?=<\/section>)/, '');
html = html.replace(/\s*<script src="js\/presence\.js[^>]*><\/script>/, '');
const vendors = [
  ['https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js', 'chart.js/dist/chart.umd.js'],
  ['https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js', 'chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.min.js'],
  ...['app','auth','firestore','database'].map(name => ['https://www.gstatic.com/firebasejs/12.6.0/firebase-' + name + '-compat.js', 'firebase/firebase-' + name + '-compat.js']),
];
for (const [url, source] of vendors) {
  const filename = 'vendor/' + path.basename(source);
  html = html.replace(url, filename);
  await copy(filename, path.join(mobile, 'node_modules', source));
}
// Website QRIS/transfer is excluded. The runtime supplies the Google Play UI.
html = html.replace(/  <!-- ============ PAYWALL[\s\S]*?(?=  <header)/, '<div id="paywall-screen" hidden></div>\n');
if (html.includes('id="payment-modal"')) throw new Error('Native bundle still contains payment form');
if (html.includes('id="affiliate-section"') || html.includes('js/presence.js')) throw new Error('Store bundle still contains excluded promotion or anonymous presence');
await put('index.html', html);
await copy('mobile-runtime.js', path.join(mobile, 'src/runtime.js'));
await copy('mobile.css', path.join(mobile, 'src/mobile.css'));
await put('bundle-manifest.json', JSON.stringify({ kind: production ? 'production-candidate' : 'test-only', firebaseProject:'ber-uang-735b3', source:'local working tree', files:manifest }, null, 2));
console.log('Staged ' + manifest.length + ' allowlisted assets from the local working tree.');
