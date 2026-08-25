import React, { createContext, useContext, useState, useEffect } from 'react';
import { Docente, OrarioDocente, AssenzaDocente, UscitaClasse, SostituzioneAssegnata, MovimentoDebito, ImpostazioniPriorita, CategoriaSostituto } from '../types';
import { DOCENTI_PRECARICATI, ORARI_DOCENTI_PRECARICATI } from '../data/initialData';
import { getDocentiCollegatiIds, getOrarioUnificatoDocente, getBaseNomeDocente } from '../utils/docentiHelper';

const CURRENT_TIMETABLE_VERSION = 'v14_fictional_demo_names';

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
  impostazioniPriorita: ImpostazioniPriorita;
  setImpostazioniPriorita: React.Dispatch<React.SetStateAction<ImpostazioniPriorita>>;
  updateImpostazioniPriorita: (nuove: ImpostazioniPriorita) => void;
  resetImpostazioniPrioritaPredefinite: () => void;
  
  addAssenza: (assenza: Omit<AssenzaDocente, 'id' | 'createdAt'>) => void;
  removeAssenza: (id: string) => void;
  annullaAssenza: (id: string, motivo?: string) => void;
  eliminaDefinitivamenteAssenza: (id: string) => void;
  addUscitaConAccompagnatori: (uscita: Omit<UscitaClasse, 'id' | 'createdAt'>) => void;
  removeUscita: (id: string) => void;
  annullaUscita: (id: string) => void;
  assegnaSostituzione: (sostituzione: Omit<SostituzioneAssegnata, 'id'>) => void;
  rimuoviSostituzione: (id: string) => void;
  pubblicaTutteSostituzioniData: (data: string) => void;
  firmaSostituzione: (sostituzioneId: string) => void;
  updateDocente: (docente: Docente) => void;
  updateOrarioDocente: (docenteId: string, nuoveOre: any[]) => void;
  modificaDebitoManuale: (docenteId: string, deltaOre: number, descrizione: string) => void;
  resetOrarioPredefinito: () => void;
  azzeraDocentiEOrario: () => void;
  importaNuovoOrarioCompleto: (nuoviDocenti: Docente[], nuoviOrari: OrarioDocente[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [docenti, setDocenti] = useState<Docente[]>(() => {
    try {
      const savedVersion = localStorage.getItem('scuola_orario_version');
      if (savedVersion === CURRENT_TIMETABLE_VERSION) {
        const saved = localStorage.getItem('scuola_docenti');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (e) {}
    return DOCENTI_PRECARICATI;
  });

  const [orariDocenti, setOrariDocenti] = useState<OrarioDocente[]>(() => {
    try {
      const savedVersion = localStorage.getItem('scuola_orario_version');
      if (savedVersion === CURRENT_TIMETABLE_VERSION) {
        const saved = localStorage.getItem('scuola_orari');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const is9Cols = parsed[0]?.ore?.length === 45;
            if (is9Cols) return parsed;
          }
        }
      }
    } catch (e) {}
    localStorage.setItem('scuola_orario_version', CURRENT_TIMETABLE_VERSION);
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

  const updateImpostazioniPriorita = (nuove: ImpostazioniPriorita) => {
    setImpostazioniPriorita(nuove);
  };

  const resetImpostazioniPrioritaPredefinite = () => {
    setImpostazioniPriorita({
      prioritaAssenze: DEFAULT_PRIORITA_ASSENZE,
      prioritaGite: DEFAULT_PRIORITA_GITE
    });
  };

  useEffect(() => {
    localStorage.setItem('scuola_impostazioni_priorita', JSON.stringify(impostazioniPriorita));
  }, [impostazioniPriorita]);

  useEffect(() => {
    localStorage.setItem('scuola_docenti', JSON.stringify(docenti));
  }, [docenti]);

  useEffect(() => {
    localStorage.setItem('scuola_orari', JSON.stringify(orariDocenti));
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

    setAssenze(prev => [assenza, ...prev]);
  };

  // Annulla Assenza (annulla tutti i record associati alla stessa persona per quella data/ora)
  const annullaAssenza = (id: string) => {
    const assenza = assenze.find(a => a.id === id);
    if (!assenza) return;

    const collegatiIds = getDocentiCollegatiIds(assenza.docenteId, docenti);

    // Rimuovi eventuali sostituzioni collegate
    setSostituzioni(prev => prev.filter(s => 
      !(s.data === assenza.data && collegatiIds.includes(s.docenteAssenteId) && assenza.oreInteressate.includes(s.ora))
    ));

    // Se aveva generato debito, storna il debito
    if (assenza.oreDebitoGenerate && assenza.oreDebitoGenerate > 0 && !assenza.annullata) {
      setDocenti(prev => prev.map(d => {
        if (collegatiIds.includes(d.id)) {
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
        descrizione: `Storno debito per annullamento assenza del ${assenza.data}`,
        createdAt: new Date().toISOString()
      };
      setMovimentiDebito(prev => [mov, ...prev]);
    }

    // Marca come annullate tutte le assenze della stessa persona per quella data
    setAssenze(prev => prev.map(a => {
      if (a.data === assenza.data && collegatiIds.includes(a.docenteId)) {
        return {
          ...a,
          annullata: true,
          annullataIl: new Date().toISOString()
        };
      }
      return a;
    }));
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

    // Rimuovi eventuali sostituzioni collegate
    setSostituzioni(prev => prev.filter(s => 
      !(s.data === assenza.data && (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === assenza.docenteId) && (assenza.oreInteressate || []).includes(s.ora))
    ));

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

    setAssenze(prev => prev.filter(a => {
      if (a.id === id) return false;
      const currentDoc = docenti.find(d => d.id === a.docenteId);
      const currentBaseNome = currentDoc ? getBaseNomeDocente(currentDoc.nome) : a.docenteId.toUpperCase();
      if (a.data === assenza.data && (collegatiIds.includes(a.docenteId) || a.docenteId === assenza.docenteId || currentBaseNome === targetBaseNome)) {
        return false;
      }
      return true;
    }));
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

    setUscite(prev => [uscita, ...prev]);
    setAssenze(prev => [...assenzeAccompagnatori, ...prev]);
  };

  const annullaUscita = (id: string) => {
    const uscita = uscite.find(u => u.id === id);
    if (!uscita) return;

    setAssenze(prev => prev.map(a => {
      if (a.data === uscita.data && a.dettagliUscita?.uscitaId === id) {
        return { ...a, annullata: true, annullataIl: new Date().toISOString() };
      }
      return a;
    }));

    const tuttiAccompagnatoriIds = uscita.docentiAccompagnatoriIds.flatMap(docId => getDocentiCollegatiIds(docId, docenti));

    setSostituzioni(prev => prev.filter(s => 
      !(s.data === uscita.data && tuttiAccompagnatoriIds.includes(s.docenteAssenteId) && uscita.ore.includes(s.ora))
    ));

    setUscite(prev => prev.map(u => {
      if (u.id === id) return { ...u, annullata: true, annullataIl: new Date().toISOString() };
      return u;
    }));
  };

  const removeUscita = (id: string) => {
    annullaUscita(id);
  };

  const assegnaSostituzione = (nuovaSostituzione: Omit<SostituzioneAssegnata, 'id'>) => {
    setSostituzioni(prev => {
      const filtrate = prev.filter(s => !(s.data === nuovaSostituzione.data && s.ora === nuovaSostituzione.ora && s.classe === nuovaSostituzione.classe));
      const sost: SostituzioneAssegnata = {
        ...nuovaSostituzione,
        id: 'sost_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
      };
      return [...filtrate, sost];
    });

    // Se la sostituzione consuma debito, scala 1 ora da tutti gli account della persona fisica
    if (nuovaSostituzione.consumaDebito) {
      const collegatiIds = getDocentiCollegatiIds(nuovaSostituzione.docenteSostitutoId, docenti);

      setDocenti(prev => prev.map(d => {
        if (collegatiIds.includes(d.id)) {
          return { ...d, oreDebitoPermesso: Math.max(0, (d.oreDebitoPermesso || 0) - 1) };
        }
        return d;
      }));

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
      setMovimentiDebito(prev => [mov, ...prev]);
    }
  };

  const rimuoviSostituzione = (id: string) => {
    const sost = sostituzioni.find(s => s.id === id);
    if (sost && sost.consumaDebito) {
      const collegatiIds = getDocentiCollegatiIds(sost.docenteSostitutoId, docenti);

      setDocenti(prev => prev.map(d => {
        if (collegatiIds.includes(d.id)) {
          return { ...d, oreDebitoPermesso: (d.oreDebitoPermesso || 0) + 1 };
        }
        return d;
      }));

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
      setMovimentiDebito(prev => [mov, ...prev]);
    }

    setSostituzioni(prev => prev.filter(s => s.id !== id));
  };

  const modificaDebitoManuale = (docenteId: string, deltaOre: number, descrizione: string) => {
    const collegatiIds = getDocentiCollegatiIds(docenteId, docenti);

    setDocenti(prev => prev.map(d => {
      if (collegatiIds.includes(d.id)) {
        const nuovoVal = Math.max(0, (d.oreDebitoPermesso || 0) + deltaOre);
        return { ...d, oreDebitoPermesso: nuovoVal };
      }
      return d;
    }));

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
    setMovimentiDebito(prev => [mov, ...prev]);
  };

  const pubblicaTutteSostituzioniData = (data: string) => {
    setSostituzioni(prev => prev.map(s => {
      if (s.data === data) {
        return { ...s, pubblicata: true };
      }
      return s;
    }));
  };

  const firmaSostituzione = (sostituzioneId: string) => {
    setSostituzioni(prev => prev.map(s => {
      if (s.id === sostituzioneId) {
        return { ...s, firmata: true, dataFirma: new Date().toISOString() };
      }
      return s;
    }));
  };

  const updateDocente = (docenteAggiornato: Docente) => {
    setDocenti(prev => prev.map(d => d.id === docenteAggiornato.id ? docenteAggiornato : d));
  };

  const updateOrarioDocente = (docenteId: string, nuoveOre: any[]) => {
    setOrariDocenti(prev => {
      const index = prev.findIndex(o => o.docenteId === docenteId);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = { docenteId, ore: nuoveOre };
        return copy;
      }
      return [...prev, { docenteId, ore: nuoveOre }];
    });
  };

  const resetOrarioPredefinito = () => {
    setDocenti(DOCENTI_PRECARICATI);
    setOrariDocenti(ORARI_DOCENTI_PRECARICATI);
    localStorage.removeItem('scuola_docenti');
    localStorage.removeItem('scuola_orari');
    localStorage.setItem('scuola_orario_version', CURRENT_TIMETABLE_VERSION);
  };

  const azzeraDocentiEOrario = () => {
    setDocenti([]);
    setOrariDocenti([]);
    try {
      localStorage.setItem('scuola_docenti', JSON.stringify([]));
      localStorage.setItem('scuola_orari', JSON.stringify([]));
      localStorage.setItem('scuola_orario_version', 'empty_' + Date.now());
    } catch (e) {
      console.error('Errore durante l\'azzeramento in localStorage:', e);
    }
  };

  const importaNuovoOrarioCompleto = (nuoviDocenti: Docente[], nuoviOrari: OrarioDocente[]) => {
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
      impostazioniPriorita,
      setImpostazioniPriorita,
      updateImpostazioniPriorita,
      resetImpostazioniPrioritaPredefinite,
      addAssenza,
      removeAssenza,
      annullaAssenza,
      eliminaDefinitivamenteAssenza,
      addUscitaConAccompagnatori,
      removeUscita,
      annullaUscita,
      assegnaSostituzione,
      rimuoviSostituzione,
      pubblicaTutteSostituzioniData,
      firmaSostituzione,
      updateDocente,
      updateOrarioDocente,
      modificaDebitoManuale,
      resetOrarioPredefinito,
      azzeraDocentiEOrario,
      importaNuovoOrarioCompleto
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
