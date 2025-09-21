const CACHE_NAME = 'tindahan-ko-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Dancing+Script:wght@400;600&family=Poppins:wght@300;400;500;600;700&display=swap'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch Event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background Sync for offline sales
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-sales') {
    event.waitUntil(syncSales());
  }
});

async function getSales() {
  try {
    return JSON.parse(localStorage.getItem('sales') || '[]');
  } catch (error) {
    console.error('Error getting sales:', error);
    return [];
  }
}

// Sync offline sales when back online
async function syncSales() {
  try {
    const offlineSales = JSON.parse(localStorage.getItem('offlineSales') || '[]');
    
    if (offlineSales.length > 0) {
      // Process offline sales
      const sales = await getSales();
      sales.push(...offlineSales);
      localStorage.setItem('sales', JSON.stringify(sales));
      
      // Clear offline sales
      localStorage.removeItem('offlineSales');
      
      // Show notification
      self.registration.showNotification('Tindahan Ko', {
        body: `${offlineSales.length} offline na benta na-sync na! 🎉`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'sync-complete'
      });
    }
  } catch (error) {
    console.error('Error syncing offline sales:', error);
  }
}

// Push notifications for low stock alerts
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'May mga produktong maubos na ang stock! 📦',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'Tingnan ang Inventory',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'I-dismiss',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Tindahan Ko - Low Stock Alert', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app to inventory page
    event.waitUntil(
      clients.openWindow('/?page=tindahan')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Periodic background sync for cleanup
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'quarterly-cleanup') {
    event.waitUntil(performQuarterlyCleanup());
  }
});

async function performQuarterlyCleanup() {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // Clean old sales data
    const sales = await getSales();
    const recentSales = sales.filter(sale => new Date(sale.timestamp) > threeMonthsAgo);
    
    if (sales.length !== recentSales.length) {
      localStorage.setItem('sales', JSON.stringify(recentSales));
      
      // Show cleanup notification
      self.registration.showNotification('Tindahan Ko - Quarterly Cleanup', {
        body: `Na-clean na ang ${sales.length - recentSales.length} lumang records! 🧹`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png'
      });
    }
  } catch (error) {
    console.error('Error during quarterly cleanup:', error);
  }
}
