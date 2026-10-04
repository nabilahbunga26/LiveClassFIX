import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDbA9LGnOMtlpt3Y8NHNOfZNoB82aMDFL4",
  authDomain: "liveclass-nabilahbunga26.firebaseapp.com",
  projectId: "liveclass-nabilahbunga26",
  storageBucket: "liveclass-nabilahbunga26.firebasestorage.app",
  messagingSenderId: "353645568401",
  appId: "1:353645568401:web:a2f05268034a7f48f17a30",
  measurementId: "G-PEPKMTRSMW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export default app;
