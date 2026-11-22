
const scope = self.registration.scope;
const prefix = 'yukimiru:' + scope + ':';
const cacheName = prefix + "yukimiru-shell-6fb86fb948be56f4";
const urls = ["./assets/index-BiQT9XCa.js","./assets/index-DCGwLbfn.css","./data/japan-land.geojson","./data/resorts.jp.json","./icons/apple-touch-icon.png","./icons/favicon.svg","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./index.html","./manifest.webmanifest"].map(p=>new URL(p,scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(urls)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(prefix)&&k!==cacheName).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||!req.url.startsWith(scope))return;
  const key=req.mode==='navigate'?new URL('index.html',scope).href:req.url;
  if(!urls.includes(key))return;
  event.respondWith(caches.open(cacheName).then(async cache=>(await cache.match(key))||fetch(req)));
});