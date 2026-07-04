import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACJGg6OZiZ16aEBOTFaUq9kqQmLxV6OU0",
  authDomain: "doghotel-eca69.firebaseapp.com",
  projectId: "doghotel-eca69",
  storageBucket: "doghotel-eca69.firebasestorage.app",
  messagingSenderId: "845677452140",
  appId: "1:845677452140:web:eb3d58618809c16dccf149"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "artifacts", "doghotel-production", "public", "data", "clients"), limit(5));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(data.dogName, "photos:", data.photos, "vaccines:", data.vaccineDocs);
  });
}
run();
