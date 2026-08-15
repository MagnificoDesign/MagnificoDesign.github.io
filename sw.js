/* Dodger Scouting offline cache */
var CACHE = 'dodger-scouting-v45';
var CORE = ['./', 'index.html', 'dodger-stitch-icon.png'];

/* This worker registers at ORIGIN scope, so it sees requests for every project
   hosted on magnificodesign.github.io — not just Dodger Stitch. Anything that
   lives in a subdirectory (Historical-Football-League, etc.) must be left to
   the network, or one failed fetch serves Dodger Stitch's shell in its place
   and the other app looks broken. */
function isOurs(url){
  try {
    var u = new URL(url);
    if (u.origin !== self.location.origin) return false;
    var base = self.location.pathname.replace(/[^/]*$/, '');   // scope directory
    if (u.pathname.indexOf(base) !== 0) return false;
    return u.pathname.slice(base.length).indexOf('/') === -1;  // no subdirectory
  } catch(e) { return false; }
}

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
  if(!isOurs(req.url)) return;            /* other projects: straight to the network */
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
