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
  loginAtaConPin: (pin: string) => boolean;
  logout: () => Promise<void>;
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

    // 2. Ascolta lo stato di autenticazione con controllo severo e Firestore in tempo reale
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeoutSafety);
      if (!isMounted) return;

      if (user && user.email) {
        setCurrentUser(user);
        const email = user.email.toLowerCase().trim();
        const dominio = email.split('@')[1] || '';

        // Recupera le impostazioni scuola direttamente da Firestore per sicurezza assoluta
        let dominiConsentiti = SCUOLA_DEFAULT.dominiAutorizzati.map(d => d.toLowerCase().trim());
        let emailViceConsentite = SCUOLA_DEFAULT.emailVicepresidenza.map(e => e.toLowerCase().trim());

        try {
          const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_DEFAULT.id);
          const snap = await getDoc(scuolaDocRef);
          if (snap.exists()) {
            const data = snap.data();
            const impostazioni = data.impostazioniScuola;
            if (impostazioni) {
              if (impostazioni.dominiAutorizzatiGoogle && Array.isArray(impostazioni.dominiAutorizzatiGoogle)) {
                dominiConsentiti = impostazioni.dominiAutorizzatiGoogle.map((d: string) => d.toLowerCase().trim()).filter(Boolean);
              }
              if (impostazioni.emailVicepresidenzaGoogle && Array.isArray(impostazioni.emailVicepresidenzaGoogle)) {
                emailViceConsentite = impostazioni.emailVicepresidenzaGoogle.map((e: string) => e.toLowerCase().trim()).filter(Boolean);
              }
            }
          }
        } catch (e) {
          console.error('Errore lettura impostazioni scuola da Firestore per autorizzazione:', e);
          // Fallback a localStorage
          try {
            const savedScuola = localStorage.getItem('scuola_impostazioni_generali');
            if (savedScuola) {
              const parsed = JSON.parse(savedScuola);
              if (parsed.dominiAutorizzatiGoogle && parsed.dominiAutorizzatiGoogle.length > 0) {
                dominiConsentiti = parsed.dominiAutorizzatiGoogle.map((d: string) => d.toLowerCase().trim()).filter(Boolean);
              }
              if (parsed.emailVicepresidenzaGoogle && parsed.emailVicepresidenzaGoogle.length > 0) {
                emailViceConsentite = parsed.emailVicepresidenzaGoogle.map((e: string) => e.toLowerCase().trim()).filter(Boolean);
              }
            }
          } catch (err) {}
        }

        // 1. Verifica se l'account appartiene a un dominio autorizzato o è un'email esplicitamente autorizzata
        const isDominioValido = dominiConsentiti.some(d => d === dominio) || 
                                emailViceConsentite.some(e => e === email) ||
                                email === 'cravero.anita@gmail.com';

        if (!isDominioValido) {
          setErroreAuth(`Accesso negato: l'account "${email}" non appartiene a un dominio autorizzato dalla scuola (${dominiConsentiti.join(', ')}).`);
          setUtenteInfo(null);
          setIsLoadingAuth(false);
          return;
        }

        // 2. Controllo SEVERO del Ruolo VICEPRESIDENZA:
        // L'accesso a Vicepresidenza è concesso SOLO ED ESCLUSIVAMENTE se l'indirizzo email esatto
        // compare nella lista delle email autorizzate configurate nelle Impostazioni Scuola (oppure è l'admin principale cravero.anita@gmail.com).
        const isVice = email === 'cravero.anita@gmail.com' ||
                       emailViceConsentite.some(e => e === email);
        
        const info: UtenteAutenticato = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || undefined,
          ruolo: isVice ? 'VICEPRESIDENZA' : 'DOCENTE',
          scuolaId: SCUOLA_DEFAULT.id
        };

        setUtenteInfo(info);
      } else {
        setCurrentUser(null);
        if (sessionStorage.getItem('auth_ata_logged') !== 'true') {
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
  }, []);

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

  const [isAtaLogged, setIsAtaLogged] = useState<boolean>(() => {
    return sessionStorage.getItem('auth_ata_logged') === 'true';
  });

  const loginAtaConPin = (pin: string): boolean => {
    let pinValido = '1234';
    try {
      const saved = localStorage.getItem('scuola_impostazioni_generali');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pinPersonaleAta) pinValido = parsed.pinPersonaleAta;
      }
    } catch (e) {}

    if (pin.trim() === pinValido.trim()) {
      sessionStorage.setItem('auth_ata_logged', 'true');
      setIsAtaLogged(true);
      setUtenteInfo({
        uid: 'ata-pin-user',
        email: 'ata@scuola.local',
        displayName: 'Personale ATA / Segreteria',
        ruolo: 'PERSONALE_ATA',
        scuolaId: SCUOLA_DEFAULT.id
      });
      setErroreAuth(null);
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem('auth_ata_logged');
      setCurrentUser(null);
      setUtenteInfo(null);
      setIsAtaLogged(false);
      setErroreAuth(null);
    } catch (err) {
      console.error('Errore logout:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      utenteInfo,
      scuolaCorrente,
      isLoadingAuth,
      erroreAuth,
      loginConGoogle,
      loginAtaConPin,
      logout
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
