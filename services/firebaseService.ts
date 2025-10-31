import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { User } from 'firebase/auth';

// -----------------------------------------------------------------------------
// IMPORTANTE: As credenciais do seu projeto Firebase.
// -----------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCYaPNOGdSI3TKB2_pp3rl95eDXxrEJhuI",
  authDomain: "teste-arqnb.firebaseapp.com",
  projectId: "teste-arqnb",
  storageBucket: "teste-arqnb.firebasestorage.app",
  messagingSenderId: "424294968873",
  appId: "1:424294968873:web:cff5cf275f90463768b638"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Função para iniciar o login com o popup do Google
const signInWithGoogle = () => {
    return signInWithPopup(auth, provider);
};

export { 
    auth,
    db,
    signInWithGoogle, 
    signOut, 
    onAuthStateChanged 
};

// Exporta o tipo User para ser usado em outros lugares da aplicação
export type { User };