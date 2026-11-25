// Robot de ZGZ en vivo: abre la web en modo recolector, espera a que lea todas las agendas y RSS
// y guarda el resultado en datos.json (lo que luego leen los visitantes).
import { chromium } from 'playwright';
import fs from 'node:fs';

const WEB = process.env.WEB || 'https://zgzenvivo-pruebas.angelalbae.workers.dev/';
const MIN = 20; // si salen menos conciertos que esto, algo ha fallado y no se toca el archivo bueno

// --disable-web-security: deja al robot leer cada web directamente, sin pasar por el relé
// (así no le afectan los bloqueos a Cloudflare ni los de LaLiga)
const browser = await chromium.launch({ args: ['--disable-web-security'] });
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'es-ES,es;q=0.9' },
});
page.on('pageerror', e => console.log('Error en la página:', e.message));
await page.goto(WEB + (WEB.includes('?') ? '&' : '?') + 'recolector=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.ZGZ_DATOS, null, { timeout: 20 * 60 * 1000, polling: 2000 });
const d = await page.evaluate(() => window.ZGZ_DATOS);
await browser.close();

const n = (d.AG?.length || 0) + (d.RS?.length || 0);
console.log(`Agendas: ${d.AG.length} · RSS: ${d.RS.length} · estilos: ${Object.keys(d.ESTC || {}).length}`);
for (const s of [...d.STA, ...d.STR]) console.log(`  ${s.ok ? '✓' : '✕'} ${s.n}${s.c != null ? ' · ' + s.c : ''}`);
if (n < MIN) { console.error(`Solo ${n} conciertos: no se guarda, se queda el datos.json anterior.`); process.exit(1); }
fs.writeFileSync('datos.json', JSON.stringify(d));
console.log('datos.json guardado.');

