import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDjWSxTHLRLUK_xG7vu91YGfwoPHO0LU9M",
    authDomain: "fir-chat-813b9.firebaseapp.com",
    projectId: "fir-chat-813b9",
    storageBucket: "fir-chat-813b9.firebasestorage.app",
    messagingSenderId: "544001677849",
    appId: "1:544001677849:web:e07612768c022cf69ea888"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore };
