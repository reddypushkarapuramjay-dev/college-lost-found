/*
College Lost & Found Management System
File: firebase-config.js
*/

// Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyCaw40Kgb3xDJ55042Ta3qwY0zmr28iar4",
  authDomain: "college-lost-found-f661a.firebaseapp.com",
  projectId: "college-lost-found-f661a",
  storageBucket: "college-lost-found-f661a.firebasestorage.app",
  messagingSenderId: "358703478677",
  appId: "1:358703478677:web:e37a8027de104bc990e89c",
  measurementId: "G-ESP6GM3G5E"
};

// Global Firebase instances
let db = null;
let auth = null;
let isFirebaseConfigured = false;

try {
  if (typeof firebase !== "undefined") {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();
    auth = firebase.auth();
    isFirebaseConfigured = true;

    console.log("Firebase initialized for project:", firebaseConfig.projectId);

  } else {
    console.warn("Firebase SDK scripts not detected.");
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}