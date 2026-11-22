import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
async function list(dir) {
  const entries = await readdir(dir, {withFileTypes:true})
  const groups = await Promise.all(entries.map(e => e.isDirectory() ? list(path.join(dir,e.name)) : path.join(dir,e.name)))
  return groups.flat()
}
const files = (await list('dist')).filter(f=> !f.endsWith('sw.js') && !path.basename(f).startsWith('.')).sort()
const hash = createHash('sha256')
for(const f of files) hash.update(await readFile(f))
const version = 'yukimiru-shell-' + hash.digest('hex').slice(0,16)
const urls = files.map(f=>'./'+path.relative('dist',f).split(path.sep).join('/'))
const worker = `
const scope = self.registration.scope;
const prefix = 'yukimiru:' + scope + ':';
const cacheName = prefix + ${JSON.stringify(version)};
const urls = ${JSON.stringify(urls)}.map(p=>new URL(p,scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(urls)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(prefix)&&k!==cacheName).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||!req.url.startsWith(scope))return;
  const key=req.mode==='navigate'?new URL('index.html',scope).href:req.url;
  if(!urls.includes(key))return;
  event.respondWith(caches.open(cacheName).then(async cache=>(await cache.match(key))||fetch(req)));
});`
await writeFile('dist/sw.js',worker)
