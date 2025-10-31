import { initializeApp } from "firebase/app";
import { 
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
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

// Função para criar um novo usuário com email, senha e nome de exibição
const signUpWithEmailPassword = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Após criar o usuário, atualiza o perfil para incluir o nome de exibição
    await updateProfile(userCredential.user, { displayName });
    return userCredential;
};

// Função para fazer login com email e senha
const signInWithEmailPassword = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export { 
    auth,
    db,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    signOut, 
    onAuthStateChanged 
};

// Exporta o tipo User para ser usado em outros lugares da aplicação
export type { User };