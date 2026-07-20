/* Dodger Scouting offline cache */
var CACHE = 'dodger-scouting-v15';
var CORE = ['./', 'index.html', 'dodger-stitch-icon.png'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).catch(function(){})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var isPage = req.mode === 'navigate' || req.url.indexOf('index.html') >= 0;
  if(isPage){
    /* network-first: fresh updates when online, cached app when offline */
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(m){
          return m || caches.match('index.html') || caches.match('./');
        });
      })
    );
  } else {
    /* cache-first for icon, fonts, everything else */
    e.respondWith(
      caches.match(req).then(function(m){
        if(m) return m;
        return fetch(req).then(function(res){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
          return res;
        });
      })
    );
  }
});
