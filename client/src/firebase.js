// client/src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBa1XzzdPZ-WodtSCEw1NvCuAYUAH1xyEU",
  authDomain: "shifty-backend.firebaseapp.com",
  projectId: "shifty-backend",
  storageBucket: "shifty-backend.firebasestorage.app",
  messagingSenderId: "344526058135",
  appId: "1:344526058135:web:356bce668107b26331efd2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);