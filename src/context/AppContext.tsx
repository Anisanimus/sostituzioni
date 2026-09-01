import React, { createContext, useContext, useState, useEffect } from 'react';
import { Docente, OrarioDocente, AssenzaDocente, UscitaClasse, SostituzioneAssegnata, MovimentoDebito, ImpostazioniPriorita, ImpostazioniScuola, CategoriaSostituto, NotificaDocente, RichiestaAccessoDocente, NominaSupplente } from '../types';
import { DOCENTI_PRECARICATI, ORARI_DOCENTI_PRECARICATI } from '../data/initialData';
import { getDocentiCollegatiIds, getOrarioUnificatoDocente, getBaseNomeDocente, formatDataItaliana } from '../utils/docentiHelper';
import { db, auth } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

const CURRENT_TIMETABLE_VERSION = 'v17_pdf_marchi_pellegrino_compresenza_fix';
const SCUOLA_FIRESTORE_ID = 'IC_ANNA_FRANK';

export const DEFAULT_IMPOSTAZIONI_SCUOLA: ImpostazioniScuola = {
  nomeScuola: 'I.C. Anna Frank',
  tettoMaxPermessiBreviAnno: 12,
  tettoMaxAssembleeSindacaliAnno: 10,
  vistaTabellonePredefinita: 'GRUPPI_ORA',
  nascondiWeekendCalendario: true,
  giorniFestivi: [],
  pinPersonaleAta: '1234',
  dominiAutorizzatiGoogle: ['gmail.com', 'scuola.edu.it', 'icannafrank.edu.it', 'icginostrada.it'],
  emailVicepresidenzaGoogle: ['cravero.anita@gmail.com', 'vicepresidenza@scuola.edu.it', 'admin@scuola.edu.it'],
  notificheEmailGruppo: {
    abilitato: false,
    emailGruppo: '',
    orarioInvio: '07:45',
    oggetto: '🔔 Avviso Supplenze del Giorno - Presa Visione Richiesta',
    corpoMessaggio: `Gentili docenti,\n\nvi informiamo che sono presenti sostituzioni e variazioni orarie per la giornata odierna.\n\nVi invitiamo a collegarvi al Portale Docenti per prendere visione e firmare le vostre supplenze:\nhttps://sostituzioni-smart.web.app\n\nCordiali saluti,\nLa Vicepresidenza`
  }
};

export const DEFAULT_PRIORITA_ASSENZE: CategoriaSostituto[] = [
  'COMPRESENTE_CLASSE',
  'RECUPERO_STESSA_CLASSE',
  'POTENZIAMENTO',
  'SOSTEGNO',
  'RECUPERO_GENERICO',
  'STRAORDINARIO_D'
];

export const DEFAULT_PRIORITA_GITE: CategoriaSostituto[] = [
  'COMPRESENTE_CLASSE',
  'LIBERATO_STESSA_CLASSE',
  'LIBERATO_STESSA_MATERIA',
  'LIBERATO_ALTRA_CLASSE',
  'RECUPERO_STESSA_CLASSE',
  'POTENZIAMENTO',
  'SOSTEGNO',
  'STRAORDINARIO_D'
];

export const DEFAULT_IMPOSTAZIONI_PRIORITA: ImpostazioniPriorita = {
  prioritaAssenze: DEFAULT_PRIORITA_ASSENZE,
  prioritaGite: DEFAULT_PRIORITA_GITE
};

interface AppContextType {
  docenti: Docente[];
  setDocenti: React.Dispatch<React.SetStateAction<Docente[]>>;
  orariDocenti: OrarioDocente[];
  setOrariDocenti: React.Dispatch<React.SetStateAction<OrarioDocente[]>>;
  assenze: AssenzaDocente[];
  setAssenze: React.Dispatch<React.SetStateAction<AssenzaDocente[]>>;
  uscite: UscitaClasse[];
  setUscite: React.Dispatch<React.SetStateAction<UscitaClasse[]>>;
  sostituzioni: SostituzioneAssegnata[];
  setSostituzioni: React.Dispatch<React.SetStateAction<SostituzioneAssegnata[]>>;
  movimentiDebito: MovimentoDebito[];
  setMovimentiDebito: React.Dispatch<React.SetStateAction<MovimentoDebito[]>>;
  notifiche: NotificaDocente[];
  setNotifiche: React.Dispatch<React.SetStateAction<NotificaDocente[]>>;
  impostazioniPriorita: ImpostazioniPriorita;
  setImpostazioniPriorita: React.Dispatch<React.SetStateAction<ImpostazioniPriorita>>;
  updateImpostazioniPriorita: (nuove: ImpostazioniPriorita) => void;
  resetImpostazioniPrioritaPredefinite: () => void;

  impostazioniScuola: ImpostazioniScuola;
  setImpostazioniScuola: React.Dispatch<React.SetStateAction<ImpostazioniScuola>>;
  updateImpostazioniScuola: (nuove: Partial<ImpostazioniScuola>) => void;
  
  richiesteAccessoDocenti: RichiestaAccessoDocente[];
  setRichiesteAccessoDocenti: React.Dispatch<React.SetStateAction<RichiestaAccessoDocente[]>>;
  associaEmailDocente: (docenteId: string, email: string) => Promise<void>;
  creaRichiestaAccessoDocente: (richiesta: Omit<RichiestaAccessoDocente, 'id' | 'dataRichiesta' | 'stato'>) => Promise<void>;
  approvaRichiestaAccesso: (richiestaId: string, docenteIdScelto: string) => Promise<void>;
  rifiutaRichiestaAccesso: (richiestaId: string) => Promise<void>;

  nomineSupplenti: NominaSupplente[];
  setNomineSupplenti: React.Dispatch<React.SetStateAction<NominaSupplente[]>>;
  addNominaSupplente: (nomina: Omit<NominaSupplente, 'id' | 'creataIl'>) => Promise<void>;
  rimuoviNominaSupplente: (nominaId: string) => Promise<void>;
  prorogaNominaSupplente: (nominaId: string, nuovaDataFine: string) => Promise<void>;

  addAssenza: (assenza: Omit<AssenzaDocente, 'id' | 'createdAt'>) => void;
  removeAssenza: (id: string) => void;
  annullaAssenza: (id: string, motivo?: string) => void;
  eliminaDefinitivamenteAssenza: (id: string) => void;
  rimuoviSingolaOraAssenza: (docenteId: string, data: string, ora: number, classe?: string) => void;
  addUscitaConAccompagnatori: (uscita: Omit<UscitaClasse, 'id' | 'createdAt'>) => void;
  removeUscita: (id: string) => void;
  annullaUscita: (id: string) => void;
  assegnaSostituzione: (sostituzione: Omit<SostituzioneAssegnata, 'id'>) => void;
  rimuoviSostituzione: (id: string) => void;
  pubblicaTutteSostituzioniData: (data: string) => void;
  pubblicaSingolaSostituzione: (sostituzioneId: string) => void;
  firmaSostituzione: (sostituzioneId: string) => void;
  segnaNotificheLette: (docenteId: string) => void;
  rimuoviNotifica: (notificaId: string) => void;
  updateDocente: (docente: Docente) => void;
  updateOrarioDocente: (docenteId: string, nuoveOre: any[]) => void;
  modificaDebitoManuale: (docenteId: string, deltaOre: number, descrizione: string) => void;
  resetOrarioPredefinito: () => void;
  azzeraDocentiEOrario: () => void;
  importaNuovoOrarioCompleto: (nuoviDocenti: Docente[], nuoviOrari: OrarioDocente[]) => void;
  aggiornaOrarioSenzaCancellareStorico: (nuoviDocenti: Docente[], nuoviOrari: OrarioDocente[]) => void;
  ripristinaBackupCompleto: (datiBackup: any) => void;
  inviaMailPromemoriaGruppoManuale: (
    destinatarioOverride?: string, 
    oggettoOverride?: string, 
    corpoOverride?: string,
    webhookOverride?: string
  ) => Promise<{ successo: boolean; modalita: 'APPS_SCRIPT' | 'MAILTO'; messaggio: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [docenti, setDocenti] = useState<Docente[]>(() => {
    try {
      const saved = localStorage.getItem('scuola_docenti');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DOCENTI_PRECARICATI;
  });

  const [orariDocenti, setOrariDocenti] = useState<OrarioDocente[]>(() => {
    try {
      const saved = localStorage.getItem('scuola_orari');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return ORARI_DOCENTI_PRECARICATI;
  });

  const [assenze, setAssenze] = useState<AssenzaDocente[]>(() => {
    try {
      const saved = localStorage.getItem('scuola_assenze');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [uscite, setUscite] = useState<UscitaClasse[]>(() => {
    try {
      const saved = localStorage.getItem('scuola_uscite');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [sostituzioni, setSostituzioni] = useState<SostituzioneAssegnata[]>(() => {
    try {
      const saved = localStorage.getItem('scuola_sostituzioni');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [movimentiDebito, setMovimentiDebito] = useState<MovimentoDebito[]>(() => {
    try {
      const saved = localStorage.getItem('scuola_movimenti_debito');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [notifiche, setNotifiche] = useState<NotificaDocente[]>(() => {
    try {
      const saved = localStorage.getItem('scuola_notifiche');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [richiesteAccessoDocenti, setRichiesteAccessoDocenti] = useState<RichiestaAccessoDocente[]>(() => {
    try {
      const saved = localStorage.getItem('scuola_richieste_accesso_docenti');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [nomineSupplenti, setNomineSupplenti] = useState<NominaSupplente[]>(() => {
    try {
      const saved = localStorage.getItem('scuola_nomine_supplenti');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [impostazioniPriorita, setImpostazioniPriorita] = useState<ImpostazioniPriorita>(() => {
    try {
      const saved = localStorage.getItem('scuola_impostazioni_priorita');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.prioritaAssenze && parsed.prioritaGite) return parsed;
      }
    } catch (e) {}
    return {
      prioritaAssenze: DEFAULT_PRIORITA_ASSENZE,
      prioritaGite: DEFAULT_PRIORITA_GITE
    };
  });

  const updateImpostazioniPriorita = async (nuove: ImpostazioniPriorita) => {
    setImpostazioniPriorita(nuove);
    localStorage.setItem('scuola_impostazioni_priorita', JSON.stringify(nuove));
    try {
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      await setDoc(scuolaDocRef, { impostazioniPriorita: nuove }, { merge: true });
    } catch (e) {
      console.error('Errore salvataggio impostazioniPriorita su Cloud:', e);
    }
  };

  const resetImpostazioniPrioritaPredefinite = async () => {
    const defaultPrio = {
      prioritaAssenze: DEFAULT_PRIORITA_ASSENZE,
      prioritaGite: DEFAULT_PRIORITA_GITE
    };
    setImpostazioniPriorita(defaultPrio);
    localStorage.setItem('scuola_impostazioni_priorita', JSON.stringify(defaultPrio));
    try {
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      await setDoc(scuolaDocRef, { impostazioniPriorita: defaultPrio }, { merge: true });
    } catch (e) {
      console.error('Errore reset priorita su Cloud:', e);
    }
  };

  const [impostazioniScuola, setImpostazioniScuola] = useState<ImpostazioniScuola>(() => {
    try {
      const saved = localStorage.getItem('scuola_impostazioni_generali');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_IMPOSTAZIONI_SCUOLA, ...parsed };
      }
    } catch (e) {}
    return DEFAULT_IMPOSTAZIONI_SCUOLA;
  });

  const deepCleanUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return '';
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepCleanUndefined);
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = deepCleanUndefined(val);
      }
    }
    return cleaned;
  };

  const updateImpostazioniScuola = async (nuove: Partial<ImpostazioniScuola>) => {
    setImpostazioniScuola(prev => {
      const merged = { ...prev, ...nuove };
      const updated = deepCleanUndefined(merged);
      localStorage.setItem('scuola_impostazioni_generali', JSON.stringify(updated));
      // Salva DIRETTAMENTE e IMMEDIATAMENTE su Cloud Firestore (100% pulito da undefined)
      try {
        const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
        setDoc(scuolaDocRef, { impostazioniScuola: updated, ultimoAggiornamento: new Date().toISOString() }, { merge: true })
          .then(() => console.log('✅ Impostazioni scuola salvate su Cloud!'))
          .catch(err => console.error('Errore salvataggio impostazioni scuola su Cloud:', err));
      } catch (e) {
        console.error('Errore chiamata setDoc impostazioni:', e);
      }
      return updated;
    });
  };

  // ============================================================================
  // SINCRONIZZAZIONE REAL-TIME IN CLOUD (FIRESTORE DATABASE) TRA TUTTI I DISPOSITIVI
  // ============================================================================
  // 2. FUNZIONE DI SALVATAGGIO CENTRALIZZATA CON DEBOUNCE (Evita loop di scrittura infiniti)
  const isIncomingRemoteUpdate = React.useRef(false);
  const syncTimeoutRef = React.useRef<any>(null);

  // 1. ASCOLTATORE IN TEMPO REALE DA CLOUD FIRESTORE (OTTIMIZZATO PER SAFARI & CHROME)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupRealtimeSync = async () => {
      try {
        const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);

        // Inizializza l'insieme degli ID già noti all'avvio per NON notificare vecchie sostituzioni pregresse
        const knownSostituzioniIdsRef = new Set<string>();
        let isFirstSyncSnapshot = true;

        // 1. Fetch iniziale immediato per caricare subito lo stato reale
        const initialSnap = await getDoc(scuolaDocRef);
        if (initialSnap.exists()) {
          const cloudData = initialSnap.data();
          if (cloudData.docenti && Array.isArray(cloudData.docenti) && cloudData.docenti.length > 0) {
            setDocenti(cloudData.docenti);
            localStorage.setItem('scuola_docenti', JSON.stringify(cloudData.docenti));
          } else {
            // Se docenti vuoti sul Cloud, ripristina precaricati
            setDocenti(DOCENTI_PRECARICATI);
            setOrariDocenti(ORARI_DOCENTI_PRECARICATI);
            setDoc(scuolaDocRef, {
              docenti: DOCENTI_PRECARICATI,
              orariDocenti: ORARI_DOCENTI_PRECARICATI,
              ultimoAggiornamento: new Date().toISOString()
            }, { merge: true });
          }
          if (cloudData.orariDocenti && Array.isArray(cloudData.orariDocenti) && cloudData.orariDocenti.length > 0) {
            setOrariDocenti(cloudData.orariDocenti);
            localStorage.setItem('scuola_orari', JSON.stringify(cloudData.orariDocenti));
          }
          if (cloudData.assenze && Array.isArray(cloudData.assenze)) {
            setAssenze(cloudData.assenze);
            localStorage.setItem('scuola_assenze', JSON.stringify(cloudData.assenze));
          }
          if (cloudData.uscite && Array.isArray(cloudData.uscite)) {
            setUscite(cloudData.uscite);
            localStorage.setItem('scuola_uscite', JSON.stringify(cloudData.uscite));
          }
          if (cloudData.sostituzioni && Array.isArray(cloudData.sostituzioni)) {
            setSostituzioni(cloudData.sostituzioni);
            localStorage.setItem('scuola_sostituzioni', JSON.stringify(cloudData.sostituzioni));
            cloudData.sostituzioni.forEach((s: any) => knownSostituzioniIdsRef.add(s.id));
          }
          if (cloudData.movimentiDebito && Array.isArray(cloudData.movimentiDebito)) {
            setMovimentiDebito(cloudData.movimentiDebito);
            localStorage.setItem('scuola_movimenti_debito', JSON.stringify(cloudData.movimentiDebito));
          }
          if (cloudData.notifiche && Array.isArray(cloudData.notifiche)) {
            setNotifiche(cloudData.notifiche);
            localStorage.setItem('scuola_notifiche', JSON.stringify(cloudData.notifiche));
          }
          if (cloudData.richiesteAccessoDocenti && Array.isArray(cloudData.richiesteAccessoDocenti)) {
            setRichiesteAccessoDocenti(cloudData.richiesteAccessoDocenti);
            localStorage.setItem('scuola_richieste_accesso_docenti', JSON.stringify(cloudData.richiesteAccessoDocenti));
          }
          if (cloudData.nomineSupplenti && Array.isArray(cloudData.nomineSupplenti)) {
            setNomineSupplenti(cloudData.nomineSupplenti);
            localStorage.setItem('scuola_nomine_supplenti', JSON.stringify(cloudData.nomineSupplenti));
          }
          if (cloudData.impostazioniScuola) {
            setImpostazioniScuola(prev => ({ ...prev, ...cloudData.impostazioniScuola }));
            localStorage.setItem('scuola_impostazioni_generali', JSON.stringify(cloudData.impostazioniScuola));
          }
        }

        // 2. Ascolto in tempo reale continuo (Live Listener)
        unsubscribe = onSnapshot(scuolaDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const cloudData = docSnap.data();
            isIncomingRemoteUpdate.current = true;

            if (cloudData.docenti && Array.isArray(cloudData.docenti)) {
              setDocenti(cloudData.docenti);
              localStorage.setItem('scuola_docenti', JSON.stringify(cloudData.docenti));
            }
            if (cloudData.orariDocenti && Array.isArray(cloudData.orariDocenti)) {
              setOrariDocenti(cloudData.orariDocenti);
              localStorage.setItem('scuola_orari', JSON.stringify(cloudData.orariDocenti));
            }
            if (cloudData.assenze && Array.isArray(cloudData.assenze)) {
              setAssenze(cloudData.assenze);
              localStorage.setItem('scuola_assenze', JSON.stringify(cloudData.assenze));
            }
            if (cloudData.uscite && Array.isArray(cloudData.uscite)) {
              setUscite(cloudData.uscite);
              localStorage.setItem('scuola_uscite', JSON.stringify(cloudData.uscite));
            }
            if (cloudData.notifiche && Array.isArray(cloudData.notifiche)) {
              setNotifiche(cloudData.notifiche);
              localStorage.setItem('scuola_notifiche', JSON.stringify(cloudData.notifiche));
            }
            if (cloudData.richiesteAccessoDocenti && Array.isArray(cloudData.richiesteAccessoDocenti)) {
              setRichiesteAccessoDocenti(cloudData.richiesteAccessoDocenti);
              localStorage.setItem('scuola_richieste_accesso_docenti', JSON.stringify(cloudData.richiesteAccessoDocenti));
            }
            if (cloudData.nomineSupplenti && Array.isArray(cloudData.nomineSupplenti)) {
              setNomineSupplenti(cloudData.nomineSupplenti);
              localStorage.setItem('scuola_nomine_supplenti', JSON.stringify(cloudData.nomineSupplenti));
            }

            // Controlla se sono arrivate nuove sostituzioni pubblicate o annullate e invia notifica push di sistema SOLO AL DOCENTE INTERESSATO
            if (cloudData.sostituzioni && Array.isArray(cloudData.sostituzioni)) {
              const currentCloudSosts: SostituzioneAssegnata[] = cloudData.sostituzioni;
              const currentCloudIds = new Set(currentCloudSosts.map(s => s.id));

              if (!isFirstSyncSnapshot && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const docentiAttuali = cloudData.docenti || docenti;
                let loggedDocenteId = localStorage.getItem('portale_docente_loggato_id') || '';

                // Se non c'è in localStorage, cercalo per email dell'utente attualmente autenticato
                if (!loggedDocenteId) {
                  try {
                    const authUserEmail = auth?.currentUser?.email?.toLowerCase().trim();
                    if (authUserEmail) {
                      const matched = docentiAttuali.find((d: any) => d.email && d.email.toLowerCase().trim() === authUserEmail);
                      if (matched) {
                        loggedDocenteId = matched.id;
                        localStorage.setItem('portale_docente_loggato_id', matched.id);
                      }
                    }
                  } catch (e) {}
                }
                
                // NOTIFICA SOLO SE C'È UN DOCENTE EFFETTIVAMENTE LOGGATO
                if (loggedDocenteId) {
                  const loggedCollegatiIds = getDocentiCollegatiIds(loggedDocenteId, docentiAttuali);

                  const playNotificationAudio = () => {
                    try {
                      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const osc = audioCtx.createOscillator();
                      const gain = audioCtx.createGain();
                      osc.type = 'sine';
                      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
                      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
                      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
                      osc.connect(gain);
                      gain.connect(audioCtx.destination);
                      osc.start();
                      osc.stop(audioCtx.currentTime + 0.35);
                    } catch (e) {
                      console.log('Audio chime error:', e);
                    }
                  };

                  // 1. Nuove sostituzioni pubblicate appena arrivate (non erano nell'insieme dei noti)
                  const nuoveAppenaPubblicate = currentCloudSosts.filter(
                    s => s.pubblicata && !knownSostituzioniIdsRef.has(s.id) && s.docenteSostitutoId &&
                    loggedCollegatiIds.includes(s.docenteSostitutoId)
                  );

                  if (nuoveAppenaPubblicate.length > 0) {
                    playNotificationAudio();
                    nuoveAppenaPubblicate.forEach((s: SostituzioneAssegnata) => {
                      const docSostituto = docentiAttuali.find((d: any) => d.id === s.docenteSostitutoId);
                      const dataFmt = formatDataItaliana(s.data);
                      const msgBody = `Prof. ${docSostituto?.nome || ''}: Ti è stata assegnata una supplenza in ${s.classe} (${s.ora}ª ora) il ${dataFmt}.`;
                      const notifTag = `sost_${s.id}`;

                      try {
                        if ('serviceWorker' in navigator) {
                          navigator.serviceWorker.ready.then(reg => {
                            reg.showNotification('🔔 Nuova Sostituzione Assegnata!', {
                              body: msgBody,
                              icon: '/favicon.svg',
                              tag: notifTag,
                              renotify: true
                            } as any);
                          }).catch(() => {
                            new Notification('🔔 Nuova Sostituzione Assegnata!', {
                              body: msgBody,
                              icon: '/favicon.svg',
                              tag: notifTag
                            });
                          });
                        } else {
                          new Notification('🔔 Nuova Sostituzione Assegnata!', {
                            body: msgBody,
                            icon: '/favicon.svg',
                            tag: notifTag
                          });
                        }
                      } catch (err) {
                        console.warn('Errore trigger push notification:', err);
                      }
                    });
                  }

                  // 2. Sostituzioni rimosse o annullate (erano nell'insieme dei noti ma non ci sono più nel cloud)
                  const vecchieLocale = (sostituzioniRef.current || []).filter(s => s.pubblicata);
                  const annullate = vecchieLocale.filter(
                    s => !currentCloudIds.has(s.id) && s.docenteSostitutoId &&
                    loggedCollegatiIds.includes(s.docenteSostitutoId)
                  );

                  if (annullate.length > 0) {
                    playNotificationAudio();
                    annullate.forEach((s: SostituzioneAssegnata) => {
                      const docSostituto = docentiAttuali.find((d: any) => d.id === s.docenteSostitutoId);
                      const dataFmt = formatDataItaliana(s.data);
                      const msgBody = `Prof. ${docSostituto?.nome || ''}: La supplenza in ${s.classe} (${s.ora}ª ora) del ${dataFmt} è stata annullata dalla Vicepresidenza.`;
                      const notifTag = `canc_${s.id}`;

                      try {
                        if ('serviceWorker' in navigator) {
                          navigator.serviceWorker.ready.then(reg => {
                            reg.showNotification('⚠️ Supplenza Annullata', {
                              body: msgBody,
                              icon: '/favicon.svg',
                              tag: notifTag,
                              renotify: true
                            } as any);
                          }).catch(() => {
                            new Notification('⚠️ Supplenza Annullata', {
                              body: msgBody,
                              icon: '/favicon.svg',
                              tag: notifTag
                            });
                          });
                        } else {
                          new Notification('⚠️ Supplenza Annullata', {
                            body: msgBody,
                            icon: '/favicon.svg',
                            tag: notifTag
                          });
                        }
                      } catch (err) {
                        console.warn('Errore trigger push notification annullamento:', err);
                      }
                    });
                  }
                }
              }

              // Aggiorna l'insieme noto
              knownSostituzioniIdsRef.clear();
              currentCloudSosts.forEach(s => knownSostituzioniIdsRef.add(s.id));
              isFirstSyncSnapshot = false;
              setSostituzioni(currentCloudSosts);
            }

            if (cloudData.movimentiDebito && Array.isArray(cloudData.movimentiDebito)) {
              setMovimentiDebito(cloudData.movimentiDebito);
            }
            if (cloudData.richiesteAccessoDocenti && Array.isArray(cloudData.richiesteAccessoDocenti)) {
              setRichiesteAccessoDocenti(cloudData.richiesteAccessoDocenti);
            }
            if (cloudData.impostazioniScuola) {
              setImpostazioniScuola(prev => ({ ...prev, ...cloudData.impostazioniScuola }));
            }

            setTimeout(() => {
              isIncomingRemoteUpdate.current = false;
            }, 300);
          }
        }, (err) => {
          console.warn('Connessione Firestore in background:', err);
        });

      } catch (e) {
        console.warn('Errore inizializzazione realtime cloud:', e);
      }
    };

    setupRealtimeSync();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // =========================================================================
  // GESTORE INVIO AUTOMATICO / MANUALE EMAIL GRUPPO DOCENTI ALL'ORARIO IMPOSTATO
  // =========================================================================
  const componiMailtoGruppo = (destinatario: string, oggetto: string, corpo: string) => {
    const encodedSubject = encodeURIComponent(oggetto);
    const encodedBody = encodeURIComponent(corpo);
    return `mailto:${destinatario}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  const inviaMailPromemoriaGruppoManuale = async (
    destinatarioOverride?: string, 
    oggettoOverride?: string, 
    corpoOverride?: string,
    webhookOverride?: string
  ): Promise<{ successo: boolean; modalita: 'APPS_SCRIPT' | 'MAILTO'; messaggio: string }> => {
    const cfg = impostazioniScuola.notificheEmailGruppo;
    const dest = destinatarioOverride || cfg?.emailGruppo || '';
    const subj = oggettoOverride || cfg?.oggetto || '🔔 Avviso Supplenze del Giorno - Presa Visione Richiesta';
    const body = corpoOverride || cfg?.corpoMessaggio || `Gentili docenti,\n\nvi informiamo che sono presenti sostituzioni per la giornata odierna.\n\nVi invitiamo a collegarvi al Portale Docenti per prendere visione e firmare:\nhttps://sostituzioni-smart.web.app\n\nCordiali saluti,\nLa Vicepresidenza`;
    const webhookUrl = webhookOverride !== undefined ? webhookOverride : (cfg?.webhookAppScriptUrl || '');

    if (!dest) {
      alert("Nessun indirizzo email gruppo configurato. Inseriscilo nelle impostazioni.");
      return { successo: false, modalita: 'MAILTO', messaggio: 'Indirizzo email gruppo mancante' };
    }

    // SE È PRESENTE L'URL DI GOOGLE APPS SCRIPT: INVIO 100% DIRETTO E INVISIBILE DA SERVER GOOGLE
    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      try {
        await fetch(webhookUrl.trim(), {
          method: 'POST',
          mode: 'no-cors', // Apps Script web app standard CORS bypass
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            destinatario: dest,
            oggetto: subj,
            messaggio: body,
            timestamp: new Date().toISOString()
          })
        });
        return { successo: true, modalita: 'APPS_SCRIPT', messaggio: 'Email inviata direttamente in background tramite Google Apps Script!' };
      } catch (err: any) {
        console.warn('Errore invio via Google Apps Script, fallback su mailto:', err);
      }
    }

    // FALLBACK STANDARD: Apertura client di posta (Gmail / Outlook)
    const mailtoUrl = componiMailtoGruppo(dest, subj, body);
    window.open(mailtoUrl, '_blank');
    return { successo: true, modalita: 'MAILTO', messaggio: 'Apertura client di posta completata.' };
  };

  // Timer di verifica automatica dell'orario per invio email a gruppo (con ref per evitare loop di re-render)
  const isCheckingMailSchedule = React.useRef(false);

  useEffect(() => {
    const checkMailSchedule = async () => {
      if (isCheckingMailSchedule.current) return;
      const currentImpostazioni = impostazioniScuolaRef.current;
      const cfg = currentImpostazioni?.notificheEmailGruppo;
      if (!cfg || !cfg.abilitato || !cfg.emailGruppo || !cfg.orarioInvio) return;

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const ore = String(now.getHours()).padStart(2, '0');
      const minuti = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${ore}:${minuti}`;

      // Verifica se l'orario corrisponde e se per oggi non è ancora stata inviata
      if (currentTime === cfg.orarioInvio && cfg.ultimoInvioData !== todayStr) {
        const currentSost = sostituzioniRef.current || [];
        const currentAss = assenzeRef.current || [];
        const hasSostituzioniOggi = currentSost.some(s => s.data === todayStr && s.pubblicata);
        const hasAssenzeOggi = currentAss.some(a => a.data === todayStr && !a.annullata);

        if (hasSostituzioniOggi || hasAssenzeOggi) {
          isCheckingMailSchedule.current = true;
          try {
            const updatedImpostazioni: ImpostazioniScuola = {
              ...currentImpostazioni,
              notificheEmailGruppo: {
                ...cfg,
                ultimoInvioData: todayStr
              }
            };
            await updateImpostazioniScuola(updatedImpostazioni);
            await inviaMailPromemoriaGruppoManuale(cfg.emailGruppo, cfg.oggetto, cfg.corpoMessaggio, cfg.webhookAppScriptUrl);
          } catch (e) {
            console.error('Errore invio automatico programmato email gruppo:', e);
          } finally {
            isCheckingMailSchedule.current = false;
          }
        }
      }
    };

    const interval = setInterval(checkMailSchedule, 30000); // Controlla ogni 30 secondi
    return () => clearInterval(interval);
  }, []);

  // REFS PER EVITARE CLOSURE STALE IN TRIGGERCLOUDSYNC
  const docentiRef = React.useRef(docenti);
  docentiRef.current = docenti;
  const orariDocentiRef = React.useRef(orariDocenti);
  orariDocentiRef.current = orariDocenti;
  const assenzeRef = React.useRef(assenze);
  assenzeRef.current = assenze;
  const usciteRef = React.useRef(uscite);
  usciteRef.current = uscite;
  const sostituzioniRef = React.useRef(sostituzioni);
  sostituzioniRef.current = sostituzioni;
  const movimentiDebitoRef = React.useRef(movimentiDebito);
  movimentiDebitoRef.current = movimentiDebito;
  const notificheRef = React.useRef(notifiche);
  notificheRef.current = notifiche;
  const richiesteAccessoDocentiRef = React.useRef(richiesteAccessoDocenti);
  richiesteAccessoDocentiRef.current = richiesteAccessoDocenti;
  const nomineSupplentiRef = React.useRef(nomineSupplenti);
  nomineSupplentiRef.current = nomineSupplenti;
  const impostazioniScuolaRef = React.useRef(impostazioniScuola);
  impostazioniScuolaRef.current = impostazioniScuola;

  const triggerCloudSync = (override?: any) => {
    if (isIncomingRemoteUpdate.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = deepCleanUndefined({
          docenti: docentiRef.current,
          orariDocenti: orariDocentiRef.current,
          assenze: assenzeRef.current,
          uscite: usciteRef.current,
          sostituzioni: sostituzioniRef.current,
          movimentiDebito: movimentiDebitoRef.current,
          notifiche: notificheRef.current,
          richiesteAccessoDocenti: richiesteAccessoDocentiRef.current,
          nomineSupplenti: nomineSupplentiRef.current,
          impostazioniScuola: impostazioniScuolaRef.current,
          ultimoAggiornamento: new Date().toISOString(),
          ...override
        });
        const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
        await setDoc(scuolaDocRef, payload, { merge: true });
        console.log('☁️ Sincronizzato con successo su Firestore!');
      } catch (err) {
        console.error('Errore sincronizzazione Cloud:', err);
      }
    }, 150);
  };

  // Sincronizza localStorage passivamente solo per cache offline
  useEffect(() => {
    localStorage.setItem('scuola_impostazioni_generali', JSON.stringify(impostazioniScuola));
  }, [impostazioniScuola]);

  useEffect(() => {
    localStorage.setItem('scuola_impostazioni_priorita', JSON.stringify(impostazioniPriorita));
  }, [impostazioniPriorita]);

  useEffect(() => {
    if (docenti && docenti.length > 0) {
      localStorage.setItem('scuola_docenti', JSON.stringify(docenti));
    }
  }, [docenti]);

  useEffect(() => {
    if (orariDocenti && orariDocenti.length > 0) {
      localStorage.setItem('scuola_orari', JSON.stringify(orariDocenti));
    }
  }, [orariDocenti]);

  useEffect(() => {
    localStorage.setItem('scuola_assenze', JSON.stringify(assenze));
  }, [assenze]);

  useEffect(() => {
    localStorage.setItem('scuola_uscite', JSON.stringify(uscite));
  }, [uscite]);

  useEffect(() => {
    localStorage.setItem('scuola_sostituzioni', JSON.stringify(sostituzioni));
  }, [sostituzioni]);

  useEffect(() => {
    localStorage.setItem('scuola_movimenti_debito', JSON.stringify(movimentiDebito));
  }, [movimentiDebito]);

  // Aggiungi assenza registrando tutti gli ID collegati alla persona fisica
  const addAssenza = (nuovaAssenza: Omit<AssenzaDocente, 'id' | 'createdAt'>) => {
    // Trova tutti gli ID associati alla persona (es. sia cattedra che alternativa)
    const collegatiIds = getDocentiCollegatiIds(nuovaAssenza.docenteId, docenti);
    const orarioFuso = getOrarioUnificatoDocente(nuovaAssenza.docenteId, docenti, orariDocenti);

    // Calcola quante ore di reale lezione/servizio/potenziamento ricadono nell'assenza
    let oreLezioneCoinvolte = 0;
    nuovaAssenza.oreInteressate.forEach(ora => {
      const cella = orarioFuso.find(c => c.giorno === nuovaAssenza.giorno && c.ora === ora);
      const val = (cella?.valore || '').trim().toUpperCase();
      if (val && val !== 'D') {
        oreLezioneCoinvolte++;
      }
    });

    const isOraria = nuovaAssenza.isOraria || nuovaAssenza.motivo === 'Oraria' || (nuovaAssenza.oreInteressate.length < 5);
    const oreDebito = (isOraria && (nuovaAssenza.motivo === 'Oraria' || nuovaAssenza.motivo === 'Assenza') && oreLezioneCoinvolte > 0) ? oreLezioneCoinvolte : 0;
    const assenzaId = 'ass_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    // Salva un singolo record di assenza con l'ID selezionato (il motore e il tabellone recuperano già l'orario fuso tramite docentiHelper)
    const assenza: AssenzaDocente = {
      ...nuovaAssenza,
      id: assenzaId,
      isOraria,
      oreDebitoGenerate: oreDebito,
      annullata: false,
      createdAt: new Date().toISOString()
    };

    // Se genera debito, incrementa debito docente e registra movimento
    if (oreDebito > 0) {
      setDocenti(prev => prev.map(d => {
        if (collegatiIds.includes(d.id)) {
          return { ...d, oreDebitoPermesso: (d.oreDebitoPermesso || 0) + oreDebito };
        }
        return d;
      }));

      const mov: MovimentoDebito = {
        id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        docenteId: nuovaAssenza.docenteId,
        data: nuovaAssenza.data,
        giorno: nuovaAssenza.giorno,
        tipo: 'DEBITO_GENERATO',
        deltaOre: -oreDebito,
        descrizione: `Assenza oraria del ${nuovaAssenza.data} (${nuovaAssenza.oreInteressate.join('ª, ')}ª ora) - ${oreDebito} ore di lezione da recuperare`,
        createdAt: new Date().toISOString()
      };
      setMovimentiDebito(prev => [mov, ...prev]);
    }

    // Se questo docente era stato assegnato come SOSTITUTO in quelle ore, rimuovi la sua sostituzione
    // e se la sostituzione consumava debito orario, ripristina il debito (storno)
    setSostituzioni(prev => {
      const daRimuovere = prev.filter(s => 
        s.data === nuovaAssenza.data &&
        collegatiIds.includes(s.docenteSostitutoId) &&
        nuovaAssenza.oreInteressate.includes(s.ora)
      );

      daRimuovere.forEach(sostRimov => {
        if (sostRimov.consumaDebito) {
          setDocenti(docPrev => docPrev.map(d => {
            if (collegatiIds.includes(d.id)) {
              return { ...d, oreDebitoPermesso: (d.oreDebitoPermesso || 0) + 1 };
            }
            return d;
          }));

          const mov: MovimentoDebito = {
            id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            docenteId: nuovaAssenza.docenteId,
            data: nuovaAssenza.data,
            giorno: nuovaAssenza.giorno,
            tipo: 'MODIFICA_MANUALE',
            deltaOre: -1,
            descrizione: `Storno recupero: docente assente in ${sostRimov.ora}ª ora (era assegnato in ${sostRimov.classe})`,
            createdAt: new Date().toISOString()
          };
          setMovimentiDebito(mPrev => [mov, ...mPrev]);
        }
      });

      return prev.filter(s => 
        !(s.data === nuovaAssenza.data &&
          collegatiIds.includes(s.docenteSostitutoId) &&
          nuovaAssenza.oreInteressate.includes(s.ora))
      );
    });

    setAssenze(prev => {
      const updated = [assenza, ...prev];
      triggerCloudSync({ assenze: updated });
      return updated;
    });
  };

  // Annulla Assenza (annulla tutti i record associati alla stessa persona per quella data/ora)
  const annullaAssenza = (id: string) => {
    const assenza = assenze.find(a => a.id === id);
    if (!assenza) return;

    const collegatiIds = getDocentiCollegatiIds(assenza.docenteId, docenti);
    const docenteAssente = docenti.find(d => d.id === assenza.docenteId);
    const docenteAssenteNome = docenteAssente ? getBaseNomeDocente(docenteAssente.nome) : 'Docente';

    // 1. Identifica le sostituzioni che verranno rimosse e genera le relative notifiche ai sostituti
    const nuoveNotifiche: NotificaDocente[] = [];
    sostituzioni.forEach(s => {
      if (s.data === assenza.data && (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === assenza.docenteId) && (assenza.oreInteressate || []).includes(s.ora)) {
        if ((s.pubblicata || s.firmata) && s.docenteSostitutoId && s.categoria !== 'NON_SOSTITUIRE') {
          nuoveNotifiche.push({
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            docenteId: s.docenteSostitutoId,
            data: s.data,
            ora: s.ora,
            classe: s.classe,
            tipo: 'SOSTITUZIONE_ANNULLATA',
            titolo: 'Supplenza Annullata',
            messaggio: `L'assenza del Prof. ${docenteAssenteNome} è stata revocata. La tua supplenza del ${s.data} (${s.ora}ª ora in ${s.classe}) è stata quindi annullata.`,
            letta: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    if (nuoveNotifiche.length > 0) {
      setNotifiche(prev => {
        const updatedNotifiche = [...nuoveNotifiche, ...prev];
        triggerCloudSync({ notifiche: updatedNotifiche });
        return updatedNotifiche;
      });
    }

    // 2. Rimuovi le sostituzioni collegate e sincronizza
    setSostituzioni(prev => {
      const updatedSostituzioni = prev.filter(s => 
        !(s.data === assenza.data && (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === assenza.docenteId) && (assenza.oreInteressate || []).includes(s.ora))
      );
      triggerCloudSync({ sostituzioni: updatedSostituzioni });
      return updatedSostituzioni;
    });

    // 3. Se aveva generato debito, storna il debito
    if (assenza.oreDebitoGenerate && assenza.oreDebitoGenerate > 0 && !assenza.annullata) {
      setDocenti(prev => {
        const updated = prev.map(d => {
          if (collegatiIds.includes(d.id)) {
            return { ...d, oreDebitoPermesso: Math.max(0, (d.oreDebitoPermesso || 0) - assenza.oreDebitoGenerate!) };
          }
          return d;
        });
        triggerCloudSync({ docenti: updated });
        return updated;
      });

      const mov: MovimentoDebito = {
        id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        docenteId: assenza.docenteId,
        data: assenza.data,
        giorno: assenza.giorno,
        tipo: 'MODIFICA_MANUALE',
        deltaOre: assenza.oreDebitoGenerate,
        descrizione: `Storno ${assenza.oreDebitoGenerate}h debito per annullamento assenza del ${assenza.data}`,
        createdAt: new Date().toISOString()
      };
      setMovimentiDebito(prev => {
        const updated = [mov, ...prev];
        triggerCloudSync({ movimentiDebito: updated });
        return updated;
      });
    }

    // 4. Rimuovi fisicamente l'assenza
    setAssenze(prev => {
      const updated = prev.filter(a => a.id !== id);
      triggerCloudSync({ assenze: updated });
      return updated;
    });
  };

  // Elimina Definitivamente Assenza (cancella fisicamente la riga dallo storico e stornando debiti/sostituzioni)
  const eliminaDefinitivamenteAssenza = (id: string) => {
    const assenza = assenze.find(a => a.id === id);
    
    // Se non la trova per id, rimuovi comunque per id se presente
    if (!assenza) {
      setAssenze(prev => prev.filter(a => a.id !== id));
      return;
    }

    const collegatiIds = getDocentiCollegatiIds(assenza.docenteId, docenti);
    const docenteAssente = docenti.find(d => d.id === assenza.docenteId);
    const docenteAssenteNome = docenteAssente ? getBaseNomeDocente(docenteAssente.nome) : 'Docente';

    // 1. Identifica le sostituzioni che verranno rimosse e genera le relative notifiche ai sostituti
    const nuoveNotifiche: NotificaDocente[] = [];
    sostituzioni.forEach(s => {
      if (s.data === assenza.data && (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === assenza.docenteId) && (assenza.oreInteressate || []).includes(s.ora)) {
        if ((s.pubblicata || s.firmata) && s.docenteSostitutoId && s.categoria !== 'NON_SOSTITUIRE') {
          nuoveNotifiche.push({
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            docenteId: s.docenteSostitutoId,
            data: s.data,
            ora: s.ora,
            classe: s.classe,
            tipo: 'SOSTITUZIONE_ANNULLATA',
            titolo: 'Supplenza Annullata',
            messaggio: `L'assenza del Prof. ${docenteAssenteNome} è stata cancellata. La tua supplenza del ${s.data} (${s.ora}ª ora in ${s.classe}) è stata revocata.`,
            letta: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    if (nuoveNotifiche.length > 0) {
      setNotifiche(prev => {
        const updatedNotifiche = [...nuoveNotifiche, ...prev];
        triggerCloudSync({ notifiche: updatedNotifiche });
        return updatedNotifiche;
      });
    }

    // 2. Rimuovi eventuali sostituzioni collegate
    setSostituzioni(prev => {
      const updatedSost = prev.filter(s => 
        !(s.data === assenza.data && (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === assenza.docenteId) && (assenza.oreInteressate || []).includes(s.ora))
      );
      triggerCloudSync({ sostituzioni: updatedSost });
      return updatedSost;
    });

    // Se non era ancora stata annullata e aveva debito, storna il debito
    if (assenza.oreDebitoGenerate && assenza.oreDebitoGenerate > 0 && !assenza.annullata) {
      setDocenti(prev => prev.map(d => {
        if (collegatiIds.includes(d.id) || d.id === assenza.docenteId) {
          return { ...d, oreDebitoPermesso: Math.max(0, (d.oreDebitoPermesso || 0) - assenza.oreDebitoGenerate!) };
        }
        return d;
      }));

      const mov: MovimentoDebito = {
        id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        docenteId: assenza.docenteId,
        data: assenza.data,
        giorno: assenza.giorno,
        tipo: 'MODIFICA_MANUALE',
        deltaOre: assenza.oreDebitoGenerate,
        descrizione: `Cancellazione riga assenza del ${assenza.data}`,
        createdAt: new Date().toISOString()
      };
      setMovimentiDebito(prev => [mov, ...prev]);
    }

    // Rimuovi fisicamente tutti i record dell'assenza per quel docente/persona in quel giorno
    const targetDocenteBase = docenti.find(d => d.id === assenza.docenteId);
    const targetBaseNome = targetDocenteBase ? getBaseNomeDocente(targetDocenteBase.nome) : assenza.docenteId.toUpperCase();

    setAssenze(prev => {
      const updated = prev.filter(a => {
        if (a.id === id) return false;
        const currentDoc = docenti.find(d => d.id === a.docenteId);
        const currentBaseNome = currentDoc ? getBaseNomeDocente(currentDoc.nome) : a.docenteId.toUpperCase();
        if (a.data === assenza.data && (collegatiIds.includes(a.docenteId) || a.docenteId === assenza.docenteId || currentBaseNome === targetBaseNome)) {
          return false;
        }
        return true;
      });
      triggerCloudSync({ assenze: updated });
      return updated;
    });
  };

  // Rimuovi o escludi una singola ora da un'assenza o da un'uscita (senza cancellare l'intero blocco del giorno se ci sono altre ore)
  const rimuoviSingolaOraAssenza = (docenteId: string, data: string, ora: number, classe?: string) => {
    const collegatiIds = getDocentiCollegatiIds(docenteId, docenti);

    // 1. Rimuovi eventuale sostituzione assegnata per quell'ora/classe
    const sostEsistente = sostituzioni.find(s => 
      s.data === data && 
      s.ora === ora && 
      (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === docenteId) &&
      (!classe || s.classe === classe)
    );

    if (sostEsistente) {
      rimuoviSostituzione(sostEsistente.id);
    }

    // 2. Modifica le assenze del docente per quella data: rimuovi l'ora dalla lista oreInteressate
    setAssenze(prev => {
      const updated = prev.map(a => {
        if (a.data === data && (collegatiIds.includes(a.docenteId) || a.docenteId === docenteId)) {
          const nuoveOre = a.oreInteressate.filter(o => o !== ora);
          // Se aveva debito ed era oraria, ricalcola/storna 1 ora di debito
          if (a.oreDebitoGenerate && a.oreDebitoGenerate > 0 && a.oreInteressate.includes(ora)) {
            setDocenti(prevDocs => {
              const updatedDocs = prevDocs.map(d => {
                if (collegatiIds.includes(d.id)) {
                  return { ...d, oreDebitoPermesso: Math.max(0, (d.oreDebitoPermesso || 0) - 1) };
                }
                return d;
              });
              triggerCloudSync({ docenti: updatedDocs });
              return updatedDocs;
            });

            const mov: MovimentoDebito = {
              id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              docenteId: a.docenteId,
              data: a.data,
              giorno: a.giorno,
              tipo: 'MODIFICA_MANUALE',
              deltaOre: 1,
              descrizione: `Storno 1h debito per rimozione ${ora}ª ora assenza del ${a.data}`,
              createdAt: new Date().toISOString()
            };
            setMovimentiDebito(prevMovs => {
              const updatedMovs = [mov, ...prevMovs];
              triggerCloudSync({ movimentiDebito: updatedMovs });
              return updatedMovs;
            });
          }

          if (nuoveOre.length === 0) {
            return { ...a, annullata: true, annullataIl: new Date().toISOString(), oreInteressate: [] };
          }
          return {
            ...a,
            oreInteressate: nuoveOre,
            oreDebitoGenerate: Math.max(0, (a.oreDebitoGenerate || 0) - 1)
          };
        }
        return a;
      }).filter(a => !(a.annullata && a.oreInteressate.length === 0));

      triggerCloudSync({ assenze: updated });
      return updated;
    });

    // 3. Se l'assenza derivava da un'uscita/gita per cui il docente era accompagnatore, rimuovi l'ora o aggiorna
    setUscite(prev => {
      const updated = prev.map(u => {
        if (u.data === data && u.docentiAccompagnatoriIds.some(dId => collegatiIds.includes(dId))) {
          const nuoveOre = u.ore.filter(o => o !== ora);
          if (nuoveOre.length === 0) {
            return { ...u, annullata: true, annullataIl: new Date().toISOString(), ore: [] };
          }
          return { ...u, ore: nuoveOre };
        }
        return u;
      });
      triggerCloudSync({ uscite: updated });
      return updated;
    });
  };

  const removeAssenza = (id: string) => {
    annullaAssenza(id);
  };

  const addUscitaConAccompagnatori = (nuovaUscita: Omit<UscitaClasse, 'id' | 'createdAt'>) => {
    const uscitaId = 'usc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const uscita: UscitaClasse = {
      ...nuovaUscita,
      id: uscitaId,
      annullata: false,
      createdAt: new Date().toISOString()
    };

    const assenzeAccompagnatori: AssenzaDocente[] = [];
    nuovaUscita.docentiAccompagnatoriIds.forEach(docId => {
      const collegatiIds = getDocentiCollegatiIds(docId, docenti);
      collegatiIds.forEach(cId => {
        assenzeAccompagnatori.push({
          id: 'ass_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          data: nuovaUscita.data,
          giorno: nuovaUscita.giorno,
          docenteId: cId,
          oreInteressate: nuovaUscita.ore,
          motivo: 'Uscita',
          annullata: false,
          dettagliUscita: {
            uscitaId,
            titoloMeta: nuovaUscita.titoloMeta,
            classiInUscita: nuovaUscita.classi,
            isAccompagnatore: true
          },
          note: `Accompagnatore: ${nuovaUscita.titoloMeta}`,
          createdAt: new Date().toISOString()
        });
      });
    });

    setUscite(prev => {
      const updatedUscite = [uscita, ...prev];
      setAssenze(prevAss => {
        const updatedAssenze = [...assenzeAccompagnatori, ...prevAss];
        triggerCloudSync({ uscite: updatedUscite, assenze: updatedAssenze });
        return updatedAssenze;
      });
      return updatedUscite;
    });
  };

  const annullaUscita = (id: string) => {
    const uscita = uscite.find(u => u.id === id);
    if (!uscita) {
      // Rimuovi comunque se presente per id
      setUscite(prev => {
        const updatedUscite = prev.filter(u => u.id !== id);
        triggerCloudSync({ uscite: updatedUscite });
        return updatedUscite;
      });
      return;
    }

    const tuttiAccompagnatoriIds = (uscita.docentiAccompagnatoriIds || []).flatMap(docId => getDocentiCollegatiIds(docId, docenti));

    setAssenze(prevAss => {
      const updatedAssenze = prevAss.filter(a => !(a.data === uscita.data && (a.dettagliUscita?.uscitaId === id || (tuttiAccompagnatoriIds.includes(a.docenteId) && a.motivo === 'Uscita'))));
      
      setSostituzioni(prevSost => {
        const updatedSostituzioni = prevSost.filter(s => 
          !(s.data === uscita.data && tuttiAccompagnatoriIds.includes(s.docenteAssenteId) && (uscita.ore || []).includes(s.ora))
        );

        setUscite(prevUsc => {
          const updatedUscite = prevUsc.filter(u => u.id !== id);
          triggerCloudSync({
            uscite: updatedUscite,
            assenze: updatedAssenze,
            sostituzioni: updatedSostituzioni
          });
          return updatedUscite;
        });

        return updatedSostituzioni;
      });

      return updatedAssenze;
    });
  };

  const removeUscita = (id: string) => {
    annullaUscita(id);
  };

  const assegnaSostituzione = (nuovaSostituzione: Omit<SostituzioneAssegnata, 'id'>) => {
    setSostituzioni(prev => {
      // Se si assegna NON_SOSTITUIRE, sostituisce qualsiasi assegnazione pregressa per quell'ora/classe.
      // Se si assegna un docente, rimuove l'eventuale 'NON_SOSTITUIRE' o la sostituzione dello stesso docente, ma MANTIENE altri docenti aggiunti come co-sostituti.
      const filtrate = prev.filter(s => {
        const isStessoSlot = s.data === nuovaSostituzione.data && s.ora === nuovaSostituzione.ora && s.classe === nuovaSostituzione.classe;
        if (!isStessoSlot) return true;
        if (nuovaSostituzione.categoria === 'NON_SOSTITUIRE') return false; // sovrascrive tutto
        if (s.categoria === 'NON_SOSTITUIRE') return false; // rimpiazza il non sostituire
        return s.docenteSostitutoId !== nuovaSostituzione.docenteSostitutoId; // permette più docenti diversi
      });

      const sost: SostituzioneAssegnata = {
        ...nuovaSostituzione,
        id: 'sost_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
      };
      const updatedSost = [...filtrate, sost];
      triggerCloudSync({ sostituzioni: updatedSost });
      return updatedSost;
    });

    // Se la sostituzione consuma debito, scala 1 ora da tutti gli account della persona fisica
    if (nuovaSostituzione.consumaDebito) {
      const collegatiIds = getDocentiCollegatiIds(nuovaSostituzione.docenteSostitutoId, docenti);

      setDocenti(prev => {
        const updatedDoc = prev.map(d => {
          if (collegatiIds.includes(d.id)) {
            return { ...d, oreDebitoPermesso: Math.max(0, (d.oreDebitoPermesso || 0) - 1) };
          }
          return d;
        });
        triggerCloudSync({ docenti: updatedDoc });
        return updatedDoc;
      });

      const mov: MovimentoDebito = {
        id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        docenteId: nuovaSostituzione.docenteSostitutoId,
        data: nuovaSostituzione.data,
        giorno: nuovaSostituzione.giorno,
        tipo: 'DEBITO_RECUPERATO',
        deltaOre: 1,
        descrizione: `Recupero debito con supplenza in ${nuovaSostituzione.classe} alla ${nuovaSostituzione.ora}ª ora`,
        createdAt: new Date().toISOString()
      };
      setMovimentiDebito(prev => {
        const updatedMov = [mov, ...prev];
        triggerCloudSync({ movimentiDebito: updatedMov });
        return updatedMov;
      });
    }
  };

  useEffect(() => {
    localStorage.setItem('scuola_notifiche', JSON.stringify(notifiche));
  }, [notifiche]);

  const rimuoviSostituzione = (id: string) => {
    const sost = sostituzioni.find(s => s.id === id);
    if (!sost) return;

    // Se era già pubblicata o firmata, avvisa il sostituto con una notifica di annullamento (se assegnata a un docente reale)
    if ((sost.pubblicata || sost.firmata) && sost.docenteSostitutoId && sost.categoria !== 'NON_SOSTITUIRE') {
      const docenteAssente = docenti.find(d => d.id === sost.docenteAssenteId);
      const docenteAssenteNome = docenteAssente ? docenteAssente.nome : sost.docenteAssenteId;
      const nuovaNotifica: NotificaDocente = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        docenteId: sost.docenteSostitutoId,
        data: sost.data,
        ora: sost.ora,
        classe: sost.classe,
        tipo: 'SOSTITUZIONE_ANNULLATA',
        titolo: 'Supplenza Annullata',
        messaggio: `L'ora di sostituzione del ${formatDataItaliana(sost.data)} (${sost.ora}ª ora in ${sost.classe} per ${docenteAssenteNome}) è stata annullata dalla Vicepresidenza.`,
        letta: false,
        createdAt: new Date().toISOString()
      };
      setNotifiche(prev => [nuovaNotifica, ...prev]);
    }

    if (sost.consumaDebito) {
      const collegatiIds = getDocentiCollegatiIds(sost.docenteSostitutoId, docenti);

      setDocenti(prev => {
        const updated = prev.map(d => {
          if (collegatiIds.includes(d.id)) {
            return { ...d, oreDebitoPermesso: (d.oreDebitoPermesso || 0) + 1 };
          }
          return d;
        });
        triggerCloudSync({ docenti: updated });
        return updated;
      });

      const mov: MovimentoDebito = {
        id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        docenteId: sost.docenteSostitutoId,
        data: sost.data,
        giorno: sost.giorno,
        tipo: 'MODIFICA_MANUALE',
        deltaOre: -1,
        descrizione: `Ripristino ora di debito per cancellazione supplenza del ${sost.data}`,
        createdAt: new Date().toISOString()
      };
      setMovimentiDebito(prev => {
        const updated = [mov, ...prev];
        triggerCloudSync({ movimentiDebito: updated });
        return updated;
      });
    }

    setSostituzioni(prev => {
      const updated = prev.filter(s => s.id !== id);
      triggerCloudSync({ sostituzioni: updated });
      return updated;
    });
  };

  const modificaDebitoManuale = (docenteId: string, deltaOre: number, descrizione: string) => {
    const collegatiIds = getDocentiCollegatiIds(docenteId, docenti);

    setDocenti(prev => {
      const updated = prev.map(d => {
        if (collegatiIds.includes(d.id)) {
          const nuovoVal = Math.max(0, (d.oreDebitoPermesso || 0) + deltaOre);
          return { ...d, oreDebitoPermesso: nuovoVal };
        }
        return d;
      });
      triggerCloudSync({ docenti: updated });
      return updated;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const mov: MovimentoDebito = {
      id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      docenteId,
      data: todayStr,
      giorno: 'Lunedì',
      tipo: 'MODIFICA_MANUALE',
      deltaOre: -deltaOre,
      descrizione: descrizione || 'Modifica manuale debito ore',
      createdAt: new Date().toISOString()
    };
    setMovimentiDebito(prev => {
      const updated = [mov, ...prev];
      triggerCloudSync({ movimentiDebito: updated });
      return updated;
    });
  };

  const pubblicaTutteSostituzioniData = (data: string) => {
    setSostituzioni(prev => {
      const updated = prev.map(s => {
        if (s.data === data) {
          return { ...s, pubblicata: true };
        }
        return s;
      });
      triggerCloudSync({ sostituzioni: updated });
      return updated;
    });
  };

  const pubblicaSingolaSostituzione = (sostituzioneId: string) => {
    setSostituzioni(prev => {
      const updated = prev.map(s => {
        if (s.id === sostituzioneId) {
          return { ...s, pubblicata: true };
        }
        return s;
      });
      triggerCloudSync({ sostituzioni: updated });
      return updated;
    });
  };

  const firmaSostituzione = (sostituzioneId: string) => {
    setSostituzioni(prev => {
      const updated = prev.map(s => {
        if (s.id === sostituzioneId) {
          return { ...s, firmata: true, dataFirma: new Date().toISOString() };
        }
        return s;
      });
      triggerCloudSync({ sostituzioni: updated });
      return updated;
    });
  };

  const segnaNotificheLette = (docenteId: string) => {
    const collegatiIds = getDocentiCollegatiIds(docenteId, docenti);
    setNotifiche(prev => {
      // Rimuove o segna come lette le notifiche per quel docente e sincronizza su Cloud
      const updated = prev.filter(n => !collegatiIds.includes(n.docenteId));
      triggerCloudSync({ notifiche: updated });
      return updated;
    });
  };

  const rimuoviNotifica = (notificaId: string) => {
    setNotifiche(prev => {
      const updated = prev.filter(n => n.id !== notificaId);
      triggerCloudSync({ notifiche: updated });
      return updated;
    });
  };

  const associaEmailDocente = async (docenteId: string, email: string) => {
    const collegatiIds = getDocentiCollegatiIds(docenteId, docenti);
    const emailPulita = email.trim().toLowerCase();

    setDocenti(prev => {
      const updated = prev.map(d => {
        if (collegatiIds.includes(d.id)) {
          return { ...d, email: emailPulita };
        }
        return d;
      });
      localStorage.setItem('scuola_docenti', JSON.stringify(updated));
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      setDoc(scuolaDocRef, { docenti: updated, ultimoAggiornamento: new Date().toISOString() }, { merge: true })
        .then(() => console.log('✅ Email associata al docente su Cloud!'))
        .catch(err => console.error('Errore associazione email docente:', err));
      return updated;
    });
  };

  const creaRichiestaAccessoDocente = async (richiesta: Omit<RichiestaAccessoDocente, 'id' | 'dataRichiesta' | 'stato'>) => {
    const nuovaRichiesta: RichiestaAccessoDocente = {
      id: 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      email: (richiesta.email || '').toLowerCase().trim(),
      displayName: richiesta.displayName || richiesta.email.split('@')[0],
      dataRichiesta: new Date().toISOString(),
      docenteSuggeritoId: richiesta.docenteSuggeritoId || '',
      docenteSuggeritoNome: richiesta.docenteSuggeritoNome || '',
      stato: 'IN_ATTESA'
    };

    const prevList = richiesteAccessoDocentiRef.current || [];
    const filtrate = prevList.filter(r => r.email.toLowerCase() !== nuovaRichiesta.email.toLowerCase() || r.stato !== 'IN_ATTESA');
    const updated = [nuovaRichiesta, ...filtrate];

    setRichiesteAccessoDocenti(updated);
    localStorage.setItem('scuola_richieste_accesso_docenti', JSON.stringify(updated));

    try {
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      const cleanData = JSON.parse(JSON.stringify(updated));
      await setDoc(scuolaDocRef, { 
        richiesteAccessoDocenti: cleanData, 
        ultimoAggiornamento: new Date().toISOString() 
      }, { merge: true });
      console.log('✅ Richiesta accesso docente registrata e confermata su Cloud Firestore!');
    } catch (err) {
      console.error('Errore salvataggio richiesta su Firestore:', err);
    }
  };

  const approvaRichiestaAccesso = async (richiestaId: string, docenteIdScelto: string) => {
    const req = richiesteAccessoDocenti.find(r => r.id === richiestaId);
    if (!req) return;

    // 1. Associa l'email al docente
    await associaEmailDocente(docenteIdScelto, req.email);

    // 2. Aggiorna lo stato della richiesta
    setRichiesteAccessoDocenti(prev => {
      const updated = prev.map(r => r.id === richiestaId ? { ...r, stato: 'APPROVATA' as const } : r);
      localStorage.setItem('scuola_richieste_accesso_docenti', JSON.stringify(updated));
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      setDoc(scuolaDocRef, { richiesteAccessoDocenti: updated, ultimoAggiornamento: new Date().toISOString() }, { merge: true });
      return updated;
    });
  };

  const rifiutaRichiestaAccesso = async (richiestaId: string) => {
    setRichiesteAccessoDocenti(prev => {
      const updated = prev.map(r => r.id === richiestaId ? { ...r, stato: 'RIFIUTATA' as const } : r);
      localStorage.setItem('scuola_richieste_accesso_docenti', JSON.stringify(updated));
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      setDoc(scuolaDocRef, { richiesteAccessoDocenti: updated, ultimoAggiornamento: new Date().toISOString() }, { merge: true });
      return updated;
    });
  };

  // =========================================================================
  // GESTIONE NOMINE SUPPLENTI & CATENE RICORSIVE SU CATTEDRA
  // =========================================================================
  const addNominaSupplente = async (nominaData: Omit<NominaSupplente, 'id' | 'creataIl'>) => {
    const nuovaNomina: NominaSupplente = {
      ...nominaData,
      id: 'nom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      creataIl: new Date().toISOString()
    };

    const prevNomine = nomineSupplentiRef.current || [];
    const updatedNomine = [nuovaNomina, ...prevNomine];
    setNomineSupplenti(updatedNomine);
    localStorage.setItem('scuola_nomine_supplenti', JSON.stringify(updatedNomine));

    // 1. CREAZIONE / AGGIORNAMENTO AUTOMATICO DEL PROFILO DOCENTE SUPPLENTE & EREDITARIETÀ ORARIO
    const supplenteBaseNome = getBaseNomeDocente(nuovaNomina.supplenteNome);
    const titolareDoc = docentiRef.current.find(d => d.id === nuovaNomina.docenteTitolareId) ||
                       docentiRef.current.find(d => getBaseNomeDocente(d.nome) === getBaseNomeDocente(nuovaNomina.docenteTitolareNome));

    // Trova l'orario del docente sostituito da ereditare
    const idDaCuiEreditare = nuovaNomina.docenteSostituitoDaNominaId || nuovaNomina.docenteTitolareId;
    const orarioDaEreditare = orariDocentiRef.current.find(o => o.docenteId === idDaCuiEreditare) ||
                             (titolareDoc ? orariDocentiRef.current.find(o => o.docenteId === titolareDoc.id) : undefined);

    let updatedDocenti = [...docentiRef.current];
    let updatedOrari = [...orariDocentiRef.current];

    // Cerca se esiste già un profilo per questo supplente
    let supplenteDoc = updatedDocenti.find(d => getBaseNomeDocente(d.nome) === supplenteBaseNome);
    let supplenteId = supplenteDoc ? supplenteDoc.id : `doc_suppl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    if (!supplenteDoc) {
      // Crea nuovo profilo Docente
      const nuovoDocenteSupplente: Docente = {
        id: supplenteId,
        nome: nuovaNomina.supplenteNome.trim().toUpperCase(),
        email: nuovaNomina.supplenteEmail ? nuovaNomina.supplenteEmail.trim().toLowerCase() : undefined,
        materia: titolareDoc?.materia || 'LETTERE',
        dettaglioMateria: titolareDoc?.dettaglioMateria,
        classeRiferimento: titolareDoc?.classeRiferimento,
        isSostegno: titolareDoc?.isSostegno || false,
        isCasoGraveSostegno: titolareDoc?.isCasoGraveSostegno || false,
        isEducatore: false,
        isPotenziamento: titolareDoc?.isPotenziamento || false,
        isAlternativa: titolareDoc?.isAlternativa || false,
        oreDebitoPermesso: 0
      };
      updatedDocenti = [nuovoDocenteSupplente, ...updatedDocenti];
    } else {
      // Aggiorna email o materia se presenti
      updatedDocenti = updatedDocenti.map(d => {
        if (d.id === supplenteDoc!.id) {
          return {
            ...d,
            email: nuovaNomina.supplenteEmail ? nuovaNomina.supplenteEmail.trim().toLowerCase() : d.email,
            materia: titolareDoc?.materia || d.materia
          };
        }
        return d;
      });
    }

    // Eredita o aggiorna l'orario settimanale del docente titolare sulla cattedra del supplente
    if (orarioDaEreditare && orarioDaEreditare.ore) {
      const orarioEsistenteIdx = updatedOrari.findIndex(o => o.docenteId === supplenteId);
      const orarioEreditato: OrarioDocente = {
        docenteId: supplenteId,
        ore: JSON.parse(JSON.stringify(orarioDaEreditare.ore))
      };

      if (orarioEsistenteIdx >= 0) {
        updatedOrari[orarioEsistenteIdx] = orarioEreditato;
      } else {
        updatedOrari.push(orarioEreditato);
      }
    }

    setDocenti(updatedDocenti);
    setOrariDocenti(updatedOrari);
    localStorage.setItem('scuola_docenti', JSON.stringify(updatedDocenti));
    localStorage.setItem('scuola_orari', JSON.stringify(updatedOrari));

    // 2. PULIZIA AUTOMATICA ASSENZE FUTURE DEL TITOLARE SOSTITUITO
    // Dalla data di presa di servizio (dataInizio) in poi, le assenze registrate sul titolare
    // vengono revocate / rimosse perché da quella data la cattedra è coperta dal nuovo supplente nominato.
    const dataPresaServizio = nuovaNomina.dataInizio.split('T')[0];
    const titolareBaseNome = getBaseNomeDocente(nuovaNomina.docenteTitolareNome);
    const titolareCollegatiIds = getDocentiCollegatiIds(nuovaNomina.docenteTitolareId, updatedDocenti);

    let puliteAssenze: AssenzaDocente[] = [];
    setAssenze(prevAssenze => {
      puliteAssenze = prevAssenze.filter(a => {
        const docAss = updatedDocenti.find(d => d.id === a.docenteId);
        const isStessoDoc = (docAss && getBaseNomeDocente(docAss.nome) === titolareBaseNome) ||
                            titolareCollegatiIds.includes(a.docenteId) || 
                            a.docenteId === nuovaNomina.docenteTitolareId;
        if (!isStessoDoc) return true;
        const dataAss = a.data.split('T')[0];
        // Conserva le assenze antecedenti alla presa di servizio (PASSATO)
        // Rimuove quelle pari o successive (FUTURO coperto dal supplente)
        return dataAss < dataPresaServizio;
      });
      localStorage.setItem('scuola_assenze', JSON.stringify(puliteAssenze));
      return puliteAssenze;
    });

    // Salva immediatamente su Cloud Firestore
    try {
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      await setDoc(scuolaDocRef, {
        nomineSupplenti: JSON.parse(JSON.stringify(updatedNomine)),
        docenti: JSON.parse(JSON.stringify(updatedDocenti)),
        orariDocenti: JSON.parse(JSON.stringify(updatedOrari)),
        assenze: JSON.parse(JSON.stringify(puliteAssenze)),
        ultimoAggiornamento: new Date().toISOString()
      }, { merge: true });
      triggerCloudSync();
      console.log('✅ Nomina supplente salvata, profilo e orario creati su Firestore!');
    } catch (e) {
      console.error('Errore salvataggio nomina:', e);
    }
  };

  const rimuoviNominaSupplente = async (nominaId: string) => {
    const updated = (nomineSupplentiRef.current || []).filter(n => n.id !== nominaId);
    setNomineSupplenti(updated);
    localStorage.setItem('scuola_nomine_supplenti', JSON.stringify(updated));

    try {
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      await setDoc(scuolaDocRef, {
        nomineSupplenti: JSON.parse(JSON.stringify(updated)),
        ultimoAggiornamento: new Date().toISOString()
      }, { merge: true });
      triggerCloudSync();
    } catch (e) {
      console.error('Errore rimozione nomina:', e);
    }
  };

  const prorogaNominaSupplente = async (nominaId: string, nuovaDataFine: string) => {
    const updated = (nomineSupplentiRef.current || []).map(n => 
      n.id === nominaId ? { ...n, dataFine: nuovaDataFine } : n
    );
    setNomineSupplenti(updated);
    localStorage.setItem('scuola_nomine_supplenti', JSON.stringify(updated));

    try {
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      await setDoc(scuolaDocRef, {
        nomineSupplenti: JSON.parse(JSON.stringify(updated)),
        ultimoAggiornamento: new Date().toISOString()
      }, { merge: true });
      triggerCloudSync();
    } catch (e) {
      console.error('Errore proroga nomina:', e);
    }
  };

  const updateDocente = async (docenteAggiornato: Docente) => {
    setDocenti(prev => {
      const updated = prev.map(d => d.id === docenteAggiornato.id ? docenteAggiornato : d);
      // Salva DIRETTAMENTE e IMMEDIATAMENTE su Cloud Firestore
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      setDoc(scuolaDocRef, { docenti: updated, ultimoAggiornamento: new Date().toISOString() }, { merge: true })
        .then(() => console.log('✅ Docente aggiornato sul Cloud!'))
        .catch(err => console.error('Errore salvataggio docente su Cloud:', err));
      return updated;
    });
  };

  const updateOrarioDocente = async (docenteId: string, nuoveOre: any[]) => {
    setOrariDocenti(prev => {
      const index = prev.findIndex(o => o.docenteId === docenteId);
      let updated: OrarioDocente[];
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = { docenteId, ore: nuoveOre };
        updated = copy;
      } else {
        updated = [...prev, { docenteId, ore: nuoveOre }];
      }
      // Salva DIRETTAMENTE e IMMEDIATAMENTE su Cloud Firestore
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      setDoc(scuolaDocRef, { orariDocenti: updated, ultimoAggiornamento: new Date().toISOString() }, { merge: true })
        .then(() => console.log('✅ Orario docente aggiornato sul Cloud!'))
        .catch(err => console.error('Errore salvataggio orario docente su Cloud:', err));
      return updated;
    });
  };

  const resetOrarioPredefinito = async () => {
    setDocenti(DOCENTI_PRECARICATI);
    setOrariDocenti(ORARI_DOCENTI_PRECARICATI);
    setAssenze([]);
    setUscite([]);
    setSostituzioni([]);
    setMovimentiDebito([]);
    setNotifiche([]);
    setNomineSupplenti([]);
    localStorage.removeItem('scuola_docenti');
    localStorage.removeItem('scuola_orari');
    localStorage.removeItem('scuola_assenze');
    localStorage.removeItem('scuola_uscite');
    localStorage.removeItem('scuola_sostituzioni');
    localStorage.removeItem('scuola_movimenti_debito');
    localStorage.removeItem('scuola_notifiche');
    localStorage.removeItem('scuola_nomine_supplenti');
    localStorage.setItem('scuola_orario_version', CURRENT_TIMETABLE_VERSION);
    try {
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      await setDoc(scuolaDocRef, {
        docenti: DOCENTI_PRECARICATI,
        orariDocenti: ORARI_DOCENTI_PRECARICATI,
        assenze: [],
        uscite: [],
        sostituzioni: [],
        movimentiDebito: [],
        notifiche: [],
        nomineSupplenti: [],
        ultimoAggiornamento: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('Errore reset predefiniti su Cloud:', e);
    }
  };

  const azzeraDocentiEOrario = async () => {
    setDocenti([]);
    setOrariDocenti([]);
    setAssenze([]);
    setUscite([]);
    setSostituzioni([]);
    setMovimentiDebito([]);
    setNotifiche([]);
    setNomineSupplenti([]);
    try {
      localStorage.setItem('scuola_docenti', JSON.stringify([]));
      localStorage.setItem('scuola_orari', JSON.stringify([]));
      localStorage.setItem('scuola_assenze', JSON.stringify([]));
      localStorage.setItem('scuola_uscite', JSON.stringify([]));
      localStorage.setItem('scuola_sostituzioni', JSON.stringify([]));
      localStorage.setItem('scuola_movimenti_debito', JSON.stringify([]));
      localStorage.setItem('scuola_notifiche', JSON.stringify([]));
      localStorage.setItem('scuola_nomine_supplenti', JSON.stringify([]));
      localStorage.setItem('scuola_orario_version', 'empty_' + Date.now());
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      await setDoc(scuolaDocRef, {
        docenti: [],
        orariDocenti: [],
        assenze: [],
        uscite: [],
        sostituzioni: [],
        movimentiDebito: [],
        notifiche: [],
        nomineSupplenti: [],
        ultimoAggiornamento: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Database azzerato su Cloud Firestore!');
    } catch (e) {
      console.error('Errore durante l\'azzeramento in Cloud/localStorage:', e);
    }
  };

  const importaNuovoOrarioCompleto = async (nuoviDocenti: Docente[], nuoviOrari: OrarioDocente[]) => {
    // 1. Sovrascrive completamente gli stati in memoria
    setDocenti(nuoviDocenti);
    setOrariDocenti(nuoviOrari);
    setAssenze([]);
    setUscite([]);
    setSostituzioni([]);

    // 2. Sovrascrive immediatamente il localStorage per garantire persistenza assoluta
    try {
      localStorage.setItem('scuola_docenti', JSON.stringify(nuoviDocenti));
      localStorage.setItem('scuola_orari', JSON.stringify(nuoviOrari));
      localStorage.removeItem('scuola_assenze');
      localStorage.removeItem('scuola_uscite');
      localStorage.removeItem('scuola_sostituzioni');
      localStorage.setItem('scuola_orario_version', 'custom_' + Date.now());
    } catch (e) {
      console.error('Errore durante il salvataggio in localStorage:', e);
    }

    // 3. Salva DIRETTAMENTE e IMMEDIATAMENTE su Cloud Firestore (senza attendere debounce)
    try {
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      await setDoc(scuolaDocRef, {
        docenti: nuoviDocenti,
        orariDocenti: nuoviOrari,
        assenze: [],
        uscite: [],
        sostituzioni: [],
        ultimoAggiornamento: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Orario nuovo salvato con successo direttamente su Cloud Firestore!');
    } catch (cloudErr) {
      console.error('Errore salvataggio diretto Cloud:', cloudErr);
    }
  };

  const aggiornaOrarioSenzaCancellareStorico = async (nuoviDocenti: Docente[], nuoviOrari: OrarioDocente[]) => {
    // Mantiene lo storico dei debiti pregresso e le email già registrate per i docenti esistenti
    const docentiAggiornati = nuoviDocenti.map(nd => {
      const docEsistente = docenti.find(d => getBaseNomeDocente(d.nome) === getBaseNomeDocente(nd.nome));
      if (docEsistente) {
        return {
          ...nd,
          email: nd.email || docEsistente.email, // Usa nuova email se presente in Excel, altrimenti conserva quella già collegata
          oreDebitoPermesso: docEsistente.oreDebitoPermesso || 0,
          pinAccesso: docEsistente.pinAccesso || nd.pinAccesso
        };
      }
      return nd;
    });

    setDocenti(docentiAggiornati);
    setOrariDocenti(nuoviOrari);

    try {
      localStorage.setItem('scuola_docenti', JSON.stringify(docentiAggiornati));
      localStorage.setItem('scuola_orari', JSON.stringify(nuoviOrari));
      localStorage.setItem('scuola_orario_version', 'updated_' + Date.now());
    } catch (e) {
      console.error('Errore durante l\'aggiornamento orario in localStorage:', e);
    }

    // Salva DIRETTAMENTE su Cloud Firestore
    try {
      const scuolaDocRef = doc(db, 'scuole_dati', SCUOLA_FIRESTORE_ID);
      await setDoc(scuolaDocRef, {
        docenti: docentiAggiornati,
        orariDocenti: nuoviOrari,
        ultimoAggiornamento: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Orario aggiornato salvato con successo direttamente su Cloud Firestore!');
    } catch (cloudErr) {
      console.error('Errore salvataggio diretto Cloud:', cloudErr);
    }
  };

  const ripristinaBackupCompleto = (datiBackup: any) => {
    if (!datiBackup) return;
    if (datiBackup.docenti) {
      setDocenti(datiBackup.docenti);
      localStorage.setItem('scuola_docenti', JSON.stringify(datiBackup.docenti));
    }
    if (datiBackup.orariDocenti) {
      setOrariDocenti(datiBackup.orariDocenti);
      localStorage.setItem('scuola_orari', JSON.stringify(datiBackup.orariDocenti));
    }
    if (datiBackup.assenze) {
      setAssenze(datiBackup.assenze);
      localStorage.setItem('scuola_assenze', JSON.stringify(datiBackup.assenze));
    }
    if (datiBackup.uscite) {
      setUscite(datiBackup.uscite);
      localStorage.setItem('scuola_uscite', JSON.stringify(datiBackup.uscite));
    }
    if (datiBackup.sostituzioni) {
      setSostituzioni(datiBackup.sostituzioni);
      localStorage.setItem('scuola_sostituzioni', JSON.stringify(datiBackup.sostituzioni));
    }
    if (datiBackup.movimentiDebito) {
      setMovimentiDebito(datiBackup.movimentiDebito);
      localStorage.setItem('scuola_movimenti_debito', JSON.stringify(datiBackup.movimentiDebito));
    }
    if (datiBackup.impostazioniScuola) {
      setImpostazioniScuola(datiBackup.impostazioniScuola);
      localStorage.setItem('scuola_impostazioni_generali', JSON.stringify(datiBackup.impostazioniScuola));
    }
    if (datiBackup.impostazioniPriorita) {
      setImpostazioniPriorita(datiBackup.impostazioniPriorita);
      localStorage.setItem('scuola_impostazioni_priorita', JSON.stringify(datiBackup.impostazioniPriorita));
    }
    localStorage.setItem('scuola_orario_version', 'backup_restored_' + Date.now());
  };

  return (
    <AppContext.Provider value={{
      docenti,
      setDocenti,
      orariDocenti,
      setOrariDocenti,
      assenze,
      setAssenze,
      uscite,
      setUscite,
      sostituzioni,
      setSostituzioni,
      movimentiDebito,
      setMovimentiDebito,
      notifiche,
      setNotifiche,
      impostazioniPriorita,
      setImpostazioniPriorita,
      updateImpostazioniPriorita,
      resetImpostazioniPrioritaPredefinite,
      impostazioniScuola,
      setImpostazioniScuola,
      updateImpostazioniScuola,
      richiesteAccessoDocenti,
      setRichiesteAccessoDocenti,
      associaEmailDocente,
      creaRichiestaAccessoDocente,
      approvaRichiestaAccesso,
      rifiutaRichiestaAccesso,
      nomineSupplenti,
      setNomineSupplenti,
      addNominaSupplente,
      rimuoviNominaSupplente,
      prorogaNominaSupplente,
      addAssenza,
      removeAssenza,
      annullaAssenza,
      eliminaDefinitivamenteAssenza,
      rimuoviSingolaOraAssenza,
      addUscitaConAccompagnatori,
      removeUscita,
      annullaUscita,
      assegnaSostituzione,
      rimuoviSostituzione,
      pubblicaTutteSostituzioniData,
      pubblicaSingolaSostituzione,
      firmaSostituzione,
      segnaNotificheLette,
      rimuoviNotifica,
      updateDocente,
      updateOrarioDocente,
      modificaDebitoManuale,
      resetOrarioPredefinito,
      azzeraDocentiEOrario,
      importaNuovoOrarioCompleto,
      aggiornaOrarioSenzaCancellareStorico,
      ripristinaBackupCompleto,
      inviaMailPromemoriaGruppoManuale
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
