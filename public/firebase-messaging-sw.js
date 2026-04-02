importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

// This is a placeholder. In a real app, you would inject the config here.
// For this applet, we'll use a generic initialization if possible, 
// but FCM SW usually needs the specific config.
// Since we can't easily inject the config into a static file in this environment,
// we'll assume the browser's default behavior or the user will update this.

firebase.initializeApp({
  apiKey: "AIzaSyD5o-qN9zvYa7lkGpgJxHEsBp6l-yct4xc",
  authDomain: "gen-lang-client-0189255898.firebaseapp.com",
  projectId: "gen-lang-client-0189255898",
  storageBucket: "gen-lang-client-0189255898.firebasestorage.app",
  messagingSenderId: "173016823100",
  appId: "1:173016823100:web:29436c724fcb525ecc1a39"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
