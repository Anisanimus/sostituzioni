import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UtenteAutenticato, IstitutoScolastico, Docente } from '../types';

interface AuthContextType {
  currentUser: User | null;
  utenteInfo: UtenteAutenticato | null;
  scuolaCorrente: IstitutoScolastico | null;
  isLoadingAuth: boolean;
  erroreAuth: string | null;
  loginConGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  bypassDemoLogin: (ruolo: 'VICEPRESIDENZA' | 'DOCENTE' | 'PERSONALE_ATA', docenteId?: string) => void;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Scuola predefinita di default (Anna Frank)
export const SCUOLA_DEFAULT: IstitutoScolastico = {
  id: 'IC_ANNA_FRANK',
  nomeScuola: 'I.C. Anna Frank',
  dominiAutorizzati: ['gmail.com', 'icannafrank.edu.it', 'scuola.edu.it'],
  emailVicepresidenza: ['cravero.anita@gmail.com', 'vicepresidenza@icannafrank.edu.it', 'admin@scuola.edu.it'],
  attiva: true
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [utenteInfo, setUtenteInfo] = useState<UtenteAutenticato | null>(null);
  const [scuolaCorrente, setScuolaCorrente] = useState<IstitutoScolastico | null>(SCUOLA_DEFAULT);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [erroreAuth, setErroreAuth] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // Timeout di sicurezza massimo 2.5s per evitare spinner infinito
    const timeoutSafety = setTimeout(() => {
      if (isMounted) {
        setIsLoadingAuth(false);
      }
    }, 2500);

    // 1. Gestione ritorno da Google Redirect
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user && isMounted) {
          setCurrentUser(res.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect result info:', err);
      });

    // 2. Ascolta lo stato di autenticazione
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeoutSafety);
      if (!isMounted) return;

      if (user && user.email) {
        setCurrentUser(user);
        const email = user.email.toLowerCase();
        const dominio = email.split('@')[1] || '';

        // Recupera impostazioni scuola
        let dominiConsentiti = SCUOLA_DEFAULT.dominiAutorizzati;
        let emailViceConsentite = [...SCUOLA_DEFAULT.emailVicepresidenza, 'cravero.anita@gmail.com'];

        try {
          const savedScuola = localStorage.getItem('scuola_impostazioni_generali');
          if (savedScuola) {
            const parsed = JSON.parse(savedScuola);
            if (parsed.dominiAutorizzatiGoogle && parsed.dominiAutorizzatiGoogle.length > 0) {
              dominiConsentiti = [...dominiConsentiti, ...parsed.dominiAutorizzatiGoogle];
            }
            if (parsed.emailVicepresidenzaGoogle && parsed.emailVicepresidenzaGoogle.length > 0) {
              emailViceConsentite = [...emailViceConsentite, ...parsed.emailVicepresidenzaGoogle];
            }
          }
        } catch (e) {
          console.error('Errore lettura impostazioni scuola da localStorage', e);
        }

        // 1. Verifica appartenenza dominio o admin
        const isDominioValido = dominiConsentiti.some(d => d.toLowerCase() === dominio.toLowerCase()) || 
                                emailViceConsentite.some(e => e.toLowerCase() === email) ||
                                email.includes('cravero') ||
                                email.includes('anita');

        if (!isDominioValido) {
          setErroreAuth(`Accesso negato: l'account ${email} non risulta registrato tra gli utenti autorizzati.`);
          setUtenteInfo(null);
          setIsLoadingAuth(false);
          return;
        }

        // 2. Determina Ruolo (cravero.anita@gmail.com o email in lista o vice/admin)
        const isVice = email.includes('cravero') ||
                       email.includes('anita') ||
                       email === 'cravero.anita@gmail.com' ||
                       emailViceConsentite.some(e => e.toLowerCase().trim() === email.trim()) || 
                       email.includes('vice') || 
                       email.includes('admin');
        
        const info: UtenteAutenticato = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || undefined,
          ruolo: isVice ? 'VICEPRESIDENZA' : 'DOCENTE',
          scuolaId: SCUOLA_DEFAULT.id
        };

        setUtenteInfo(info);
        setIsDemoMode(false);
      } else {
        setCurrentUser(null);
        if (!isDemoMode) {
          setUtenteInfo(null);
        }
      }
      setIsLoadingAuth(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutSafety);
      unsubscribe();
    };
  }, [isDemoMode]);

  const loginConGoogle = async () => {
    try {
      setErroreAuth(null);
      setIsLoadingAuth(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Errore login Google Popup:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setErroreAuth(redirectErr.message || 'Errore durante l\'autenticazione con Google.');
        }
      } else {
        setErroreAuth(err.message || 'Errore durante l\'autenticazione.');
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUtenteInfo(null);
      setIsDemoMode(false);
      setErroreAuth(null);
    } catch (err) {
      console.error('Errore logout:', err);
    }
  };

  const bypassDemoLogin = (ruolo: 'VICEPRESIDENZA' | 'DOCENTE' | 'PERSONALE_ATA', docenteId?: string) => {
    setIsDemoMode(true);
    setUtenteInfo({
      uid: 'demo-local-user',
      email: ruolo === 'VICEPRESIDENZA' ? 'vicepresidenza@icannafrank.edu.it' : 'docente@icannafrank.edu.it',
      displayName: ruolo === 'VICEPRESIDENZA' ? 'Vicepresidenza (Demo)' : (docenteId || 'Docente Demo'),
      ruolo,
      scuolaId: SCUOLA_DEFAULT.id,
      docenteCollegatoId: docenteId
    });
    setErroreAuth(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      utenteInfo,
      scuolaCorrente,
      isLoadingAuth,
      erroreAuth,
      loginConGoogle,
      logout,
      bypassDemoLogin,
      isDemoMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere utilizzato all\'interno di un AuthProvider');
  }
  return context;
};
