import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { OraScoperta, SostituzioneAssegnata, CandidatoSostituto, CategoriaSostituto } from '../types';
import { trovaCandidatiSostituzione, risolviOttimizzazioneGlobale } from '../utils/substitutionEngine';
import { 
  Users, AlertCircle, CheckCircle, Clock, ArrowRight, UserPlus, 
  HelpCircle, Trash2, Bus, ShieldAlert, Sparkles, Filter, ChevronRight, ChevronLeft, ChevronDown,
  Printer, LayoutGrid, List, MessageSquare, AlertTriangle, Accessibility, Lock,
  UserCheck, UserX, UserMinus, GraduationCap, ChevronsUpDown, ChevronUp, Send, Bell
} from 'lucide-react';
import { getBaseNomeDocente, getDocentiCollegatiIds, formatDataItaliana, getDocentiUnici, DocenteUnico, getPrimoGiornoScolasticoValido, getOrarioUnificatoDocente, getStileCardAssenza, getEducatoriInClasseNellOra } from '../utils/docentiHelper';

export const TabelloneSostituzioni: React.FC<{ 
  selectedDate: string; 
  selectedGiorno: any;
  onChangeDate?: (newDate: string) => void;
  mostraRisorseLaterale?: boolean;
}> = ({ selectedDate, selectedGiorno, onChangeDate, mostraRisorseLaterale = false }) => {
  const { 
    docenti, orariDocenti, assenze, uscite, sostituzioni, 
    impostazioniPriorita, impostazioniScuola, assegnaSostituzione, rimuoviSostituzione, 
    pubblicaTutteSostituzioniData, pubblicaSingolaSostituzione,
    rimuoviSingolaOraAssenza, nomineSupplenti
  } = useApp();

  const [selectedOraScoperta, setSelectedOraScoperta] = useState<OraScoperta | null>(null);
  // Modali di conferma invio notifiche per la firma
  const [mostraConfermaPubblicaTutto, setMostraConfermaPubblicaTutto] = useState<boolean>(false);
  const [sostituzionePerInvioSingolo, setSostituzionePerInvioSingolo] = useState<{ sost: SostituzioneAssegnata; oraScoperta?: OraScoperta } | null>(null);

  // Due modalità di visualizzazione: A blocchi orari, Per Docente Assente (con default da impostazioniScuola)
  const [visualizzazione, setVisualizzazione] = useState<'GRUPPI_ORA' | 'PER_DOCENTE'>(() => 
    impostazioniScuola?.vistaTabellonePredefinita || 'GRUPPI_ORA'
  );
  const [mostraRisorseMobile, setMostraRisorseMobile] = useState<boolean>(false);
  
  // Set per gestire gli accordion aperti (se presente nel set = aperto). Di default vuoti = TUTTO CHIUSO
  const [oreAperte, setOreAperte] = useState<number[]>([]);
  const [docentiAperti, setDocentiAperti] = useState<string[]>([]);
  // Chiuse di default per le risorse
  const [oreRisorseChiuse, setOreRisorseChiuse] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);

  // Tutti i filtri attivi di default
  const [mostraDisposizioni, setMostraDisposizioni] = useState(true);
  const [mostraPotenziamento, setMostraPotenziamento] = useState(true);
  const [mostraLiberatiGita, setMostraLiberatiGita] = useState(true);
  const [mostraGiaUsati, setMostraGiaUsati] = useState(true);

  // Filtra eventi attivi (non annullati) per la data selezionata
  const assenzeOggi = assenze.filter(a => a.data === selectedDate && !a.annullata);
  const usciteOggi = uscite.filter(u => u.data === selectedDate && !u.annullata);
  const sostituzioniOggi = sostituzioni.filter(s => s.data === selectedDate);

  // Calcola tutte le ore scoperte reali per il giorno selezionato
  const oreScoperte: OraScoperta[] = [];

  assenzeOggi.forEach(assenza => {
    const doc = docenti.find(d => d.id === assenza.docenteId);
    if (!doc || doc.isEducatore) return;

    const collegatiIds = getDocentiCollegatiIds(assenza.docenteId, docenti);
    const profiliDocente = docenti.filter(d => collegatiIds.includes(d.id));

    // Raccogli le ore di lezione da tutti i profili associati alla persona (es. Lettere + Potenziamento + Alternativa)
    profiliDocente.forEach(prof => {
      const orarioDoc = orariDocenti.find(o => o.docenteId === prof.id);
      if (!orarioDoc) return;

      assenza.oreInteressate.forEach(ora => {
        const cella = orarioDoc.ore.find(c => c.giorno === selectedGiorno && c.ora === ora);
        const val = cella ? cella.valore.trim().toUpperCase() : '';

        // Qualsiasi ora di servizio attiva (Classi curricolari, Sostegno, Alternativa, Potenziamento P) tranne Disposizione D
        if (val && val !== 'D') {
          const nomeClasseVisualizzata = (val === 'P' || val === 'POT' || val.startsWith('POTENZ')) ? 'P' : val;

          const classeInUscita = usciteOggi.some(u => {
            const classiList = u.classi || [(u as any).classe];
            return classiList.some(c => c.toUpperCase().trim() === val) && u.ore.includes(ora);
          });

          if (!classeInUscita) {
            // Evita duplicazioni della stessa ora e classe/attività per la stessa persona
            const giaInserita = oreScoperte.some(os => 
              os.ora === ora && 
              os.classe === nomeClasseVisualizzata && 
              getBaseNomeDocente(os.docenteAssente.nome) === getBaseNomeDocente(prof.nome)
            );

            if (!giaInserita) {
              // Determina l'esatta materia/attività di quest'ora specifica
              let materiaOra = prof.materia;
              if (prof.isAlternativa || prof.nome.toUpperCase().includes('ALTERNATIVA') || prof.dettaglioMateria?.toUpperCase().includes('ALTERNATIVA')) {
                materiaOra = 'ALTERNATIVA';
              } else if (prof.isPotenziamento || prof.nome.toUpperCase().includes('POTENZIAMENTO') || prof.dettaglioMateria?.toUpperCase().includes('POTENZIAMENTO') || nomeClasseVisualizzata === 'P') {
                materiaOra = 'POTENZIAMENTO';
              } else if (prof.isSostegno || prof.nome.toUpperCase().includes('SOSTEGNO')) {
                materiaOra = 'SOSTEGNO';
              }

              oreScoperte.push({
                ora,
                classe: nomeClasseVisualizzata,
                docenteAssente: {
                  ...prof,
                  materia: materiaOra
                },
                motivo: assenza.motivo,
                isUscita: assenza.motivo === 'Uscita'
              });
            }
          }
        }
      });
    });
  });

  oreScoperte.sort((a, b) => a.ora - b.ora || a.classe.localeCompare(b.classe));

  const getSostituzione = (ora: number, classe: string) => {
    return sostituzioniOggi.find(s => s.ora === ora && s.classe === classe);
  };

  const getSostituzioniList = (ora: number, classe: string) => {
    return sostituzioniOggi.filter(s => s.ora === ora && s.classe === classe);
  };

  const getDocenteNome = (id: string) => {
    const d = docenti.find(doc => doc.id === id);
    return d ? getBaseNomeDocente(d.nome) : id;
  };

  const isDocenteAssenteCasoGraveNellOra = (docenteId: string, ora: number): boolean => {
    const doc = docenti.find(d => d.id === docenteId);
    if (!doc) return false;
    if (doc.isCasoGraveSostegno || (doc as any).casoGraveSostegno) return true;
    
    // Controlla la singola cella oraria del docente
    const orarioDoc = orariDocenti.find(o => o.docenteId === docenteId);
    const cella = orarioDoc?.ore.find(c => c.giorno === selectedGiorno && c.ora === ora);
    return cella?.isCasoGrave || false;
  };

  // Funzione "Assegna Tutto" con OTTIMIZZAZIONE A PANORAMICA GLOBALE GUIDATA DALLE PRIORITÀ UTENTE
  const handleAutoAssegnaTutto = () => {
    const prioritaAssenzeUtente = impostazioniPriorita?.prioritaAssenze || [
      'COMPRESENTE_CLASSE', 
      'RECUPERO_STESSA_CLASSE', 
      'POTENZIAMENTO', 
      'SOSTEGNO', 
      'RECUPERO_GENERICO', 
      'STRAORDINARIO_D'
    ];

    const prioritaGiteUtente = impostazioniPriorita?.prioritaGite || [
      'COMPRESENTE_CLASSE', 
      'LIBERATO_STESSA_CLASSE', 
      'LIBERATO_STESSA_MATERIA', 
      'LIBERATO_ALTRA_CLASSE', 
      'RECUPERO_STESSA_CLASSE', 
      'POTENZIAMENTO', 
      'SOSTEGNO', 
      'STRAORDINARIO_D'
    ];

    const nuoveSostituzioni = risolviOttimizzazioneGlobale(
      selectedDate,
      selectedGiorno,
      oreScoperte,
      orariDocenti,
      docenti,
      assenze,
      uscite,
      sostituzioniOggi,
      prioritaAssenzeUtente,
      prioritaGiteUtente,
      nomineSupplenti
    );

    nuoveSostituzioni.forEach(sost => {
      assegnaSostituzione(sost);
    });
  };

  // Helper priorità stato per ordinamento dinamico
  const getStatoPriorita = (os: OraScoperta) => {
    const s = getSostituzione(os.ora, os.classe);
    if (!s) return 0; // In alto: Da assegnare (pulsante "Scegli Sostituto")
    if (!s.firmata) return 1; // Al centro: Assegnati (In attesa presa visione / Invia per firma)
    return 2; // In basso: Firmati
  };

  // 1. Raggruppamento per ora (fino a 9 ore per giorno) con ordinamento dinamico interno
  const personeUniche = getDocentiUnici(docenti);

  const oreRaggruppate = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(oraNum => {
    const items = oreScoperte
      .filter(os => os.ora === oraNum)
      .sort((a, b) => {
        const pA = getStatoPriorita(a);
        const pB = getStatoPriorita(b);
        return pA - pB;
      });

    const totCoperteGruppo = items.filter(os => !!getSostituzione(os.ora, os.classe)).length;
    const totPubblicateGruppo = items.filter(os => getSostituzione(os.ora, os.classe)?.pubblicata).length;
    const totFirmateGruppo = items.filter(os => getSostituzione(os.ora, os.classe)?.firmata).length;

    return {
      ora: oraNum,
      items,
      totCoperteGruppo,
      totPubblicateGruppo,
      totFirmateGruppo
    };
  }).filter(g => g.items.length > 0);

  // 2. Raggruppamento per Docente Assente con ordinamento dinamico interno
  const docentiAssentiUnici = Array.from(
    new Map(oreScoperte.map(os => [getBaseNomeDocente(os.docenteAssente.nome), os.docenteAssente])).values()
  );

  const docentiAssentiRaggruppati = docentiAssentiUnici.map(docAss => {
    const baseNomeAssente = getBaseNomeDocente(docAss.nome);
    const items = oreScoperte
      .filter(os => getBaseNomeDocente(os.docenteAssente.nome) === baseNomeAssente)
      .sort((a, b) => a.ora - b.ora);

    const totOreDoc = items.length;
    const totCoperteDoc = items.filter(os => !!getSostituzione(os.ora, os.classe)).length;
    const totPubblicateDoc = items.filter(os => getSostituzione(os.ora, os.classe)?.pubblicata).length;
    const totFirmateDoc = items.filter(os => getSostituzione(os.ora, os.classe)?.firmata).length;
    const totDaFareDoc = Math.max(0, totOreDoc - totCoperteDoc);

    const materieDocAssente = Array.from(new Set(items.map(os => os.docenteAssente.materia))).join(' / ');
    const materiaVisualizzata = materieDocAssente || docAss.materia || 'Docente';

    return {
      nomeDocente: baseNomeAssente,
      docAssente: docAss,
      materiaVisualizzata,
      totOreDoc,
      totCoperteDoc,
      totPubblicateDoc,
      totFirmateDoc,
      totDaFareDoc,
      items
    };
  });

  const sostituzioniEffettiveOggi = oreScoperte
    .map(os => getSostituzione(os.ora, os.classe))
    .filter(Boolean) as SostituzioneAssegnata[];

  const totaleCoperte = sostituzioniEffettiveOggi.length; // FATTI
  const totaleDaCoprire = oreScoperte.length; // TOTALE
  const totaleDaFare = Math.max(0, totaleDaCoprire - totaleCoperte); // DA FARE
  const totalePubblicate = sostituzioniEffettiveOggi.filter(s => s.pubblicata).length; // RICHIESTE INVIATE
  const totaleFirmate = sostituzioniEffettiveOggi.filter(s => s.firmata).length; // PRESE VISIONE (FIRMATE)

  // ==============================================================================
  // CALCOLO SPECCHIETTO COMPATTO RISORSE DISPONIBILI (DIVISI PER ORA E TIPOLOGIA)
  // ==============================================================================
  const oreGiornoList = [1, 2, 3, 4, 5, 6, 7, 8];
  const dataIsoOggi = selectedDate.split('T')[0];

  const risorsePerOra = oreGiornoList.map(oraNum => {
    // 1. Persone assenti nell'ora (o per l'intera giornata)
    const personeAssentiOra = new Set<string>();
    assenzeOggi
      .forEach(a => {
        const isAssenteNellOra = !a.isOraria || a.motivo !== 'Oraria' || a.oreInteressate.includes(oraNum);
        if (isAssenteNellOra) {
          const d = docenti.find(doc => doc.id === a.docenteId);
          if (d) {
            personeAssentiOra.add(getBaseNomeDocente(d.nome));
            // Aggiungi anche tutti i docenti collegati alla persona fisica
            getDocentiCollegatiIds(d.id, docenti).forEach(colId => {
              const cDoc = docenti.find(doc => doc.id === colId);
              if (cDoc) personeAssentiOra.add(getBaseNomeDocente(cDoc.nome));
            });
          }
        }
      });

    // 1.bis Escludi categoricamente i docenti titolari che oggi hanno una nomina di supplenza attiva (sono assenti e sostituiti)
    nomineSupplenti.forEach(n => {
      const inizio = n.dataInizio.split('T')[0];
      const fine = n.dataFine.split('T')[0];
      if (dataIsoOggi >= inizio && dataIsoOggi <= fine) {
        if (n.docenteTitolareNome) personeAssentiOra.add(getBaseNomeDocente(n.docenteTitolareNome));
        const titolareDoc = docenti.find(d => d.id === n.docenteTitolareId);
        if (titolareDoc) personeAssentiOra.add(getBaseNomeDocente(titolareDoc.nome));
      }
    });

    // 2. Persone già impegnate in una sostituzione in quest'ora
    const personeGiaAssegnateOra = new Set<string>();
    sostituzioniOggi
      .filter(s => s.ora === oraNum)
      .forEach(s => {
        const d = docenti.find(doc => doc.id === s.docenteSostitutoId);
        if (d) personeGiaAssegnateOra.add(getBaseNomeDocente(d.nome));
      });

    // 3. Classi in gita nell'ora
    const classiInGitaOra = new Set<string>();
    usciteOggi
      .filter(u => u.ore.includes(oraNum))
      .forEach(u => {
        const cList = u.classi || [(u as any).classe];
        cList.forEach(c => classiInGitaOra.add(c.toUpperCase().trim()));
      });

    const potenziamentoList: { nome: string; docenteId: string; usata: boolean }[] = [];
    const disposizioniList: { nome: string; docenteId: string; debito: number; usata: boolean }[] = [];
    const liberatiGitaList: { nome: string; docenteId: string; classe: string; materia: string; usata: boolean }[] = [];

    personeUniche.forEach(persona => {
      if (persona.isEducatore) return;
      if (personeAssentiOra.has(persona.nome)) return; // Se è assente viene CANCELLATO completamente

      const isUsata = personeGiaAssegnateOra.has(persona.nome); // Se è già usata diventa grigia
      const profiliCollegati = docenti.filter(d => persona.allIds.includes(d.id));

      // Cerca in tutti i profili collegati l'impegno prioritario (Lezione, P, D, ecc.)
      let cellaVal = '';
      let profAttivo = profiliCollegati[0];
      let isGrave = persona.isCasoGraveSostegno || false;

      for (const prof of profiliCollegati) {
        const orario = orariDocenti.find(o => o.docenteId === prof.id);
        if (orario) {
          const c = orario.ore.find(cell => cell.giorno === selectedGiorno && cell.ora === oraNum);
          const val = (c?.valore || '').trim().toUpperCase();
          if (val !== '') {
            cellaVal = val;
            profAttivo = prof;
            if (c?.isCasoGrave || prof.isCasoGraveSostegno || (prof as any).casoGraveSostegno) isGrave = true;
            break;
          }
        }
      }

      if (isGrave) return; // Non mostrare docenti vincolati a casi gravi

      // A) Docenti Liberati da Gita
      if (cellaVal && Array.from(classiInGitaOra).some(cg => cg === cellaVal.toUpperCase().trim())) {
        liberatiGitaList.push({
          nome: getBaseNomeDocente(persona.nome),
          docenteId: profAttivo.id,
          classe: cellaVal,
          materia: profAttivo.materia,
          usata: isUsata
        });
      }
      // B) Potenziamento (P) - SE LA CELLA È 'P', 'POT', '3F P' O PROFILO/RIGA POTENZIAMENTO
      else if (
        (
          cellaVal === 'P' || 
          cellaVal === 'POT' || 
          cellaVal.endsWith(' P') || 
          cellaVal.endsWith(' POT') || 
          cellaVal.startsWith('P ') || 
          cellaVal.startsWith('POT ') || 
          cellaVal.includes('POTENZ') || 
          profAttivo.isPotenziamento ||
          profAttivo.materia === 'POTENZIAMENTO'
        ) && cellaVal !== '' && cellaVal !== 'D'
      ) {
        const classeCompresenza = cellaVal.replace(/POTENZIAMENTO|POT|P/g, '').trim();
        potenziamentoList.push({
          nome: getBaseNomeDocente(persona.nome) + (classeCompresenza ? ` (in ${classeCompresenza})` : ''),
          docenteId: profAttivo.id,
          usata: isUsata
        });
      }
      // C) Disposizioni (D) - RIGOROSAMENTE SE LA CELLA È 'D' O 'DISP'
      else if (cellaVal === 'D' || cellaVal === 'DISP' || cellaVal.startsWith('DISPOSIZ')) {
        disposizioniList.push({
          nome: getBaseNomeDocente(persona.nome),
          docenteId: profAttivo.id,
          debito: persona.oreDebitoPermesso || 0,
          usata: isUsata
        });
      }
    });

    const totDisponibili = potenziamentoList.length + disposizioniList.length + liberatiGitaList.length;

    return {
      ora: oraNum,
      totDisponibili,
      potenziamentoList,
      disposizioniList,
      liberatiGitaList
    };
  }).filter(r => r.totDisponibili > 0);

  // Calcolo totali giornalieri per tipo di risorsa per disabilitare/ingrigire i filtri se 0
  const totPotenziamentoOggi = risorsePerOra.reduce((acc, r) => acc + r.potenziamentoList.length, 0);
  const totGiteOggi = risorsePerOra.reduce((acc, r) => acc + r.liberatiGitaList.length, 0);
  const totDisposizioniOggi = risorsePerOra.reduce((acc, r) => acc + r.disposizioniList.length, 0);

  // Gestione click su filtro: attiva SOLO quel filtro e apre tutti gli accordion delle risorse per mostrare subito i risultati
  const handleFiltroRisorseClick = (tipo: 'POTENZIAMENTO' | 'GITA' | 'DISPONIBILE') => {
    // Se già solo questo è attivo, riattiva tutti i filtri disponibili
    const soloQuestoAttivo = 
      (tipo === 'POTENZIAMENTO' && mostraPotenziamento && !mostraLiberatiGita && !mostraDisposizioni) ||
      (tipo === 'GITA' && mostraLiberatiGita && !mostraPotenziamento && !mostraDisposizioni) ||
      (tipo === 'DISPONIBILE' && mostraDisposizioni && !mostraPotenziamento && !mostraLiberatiGita);

    if (soloQuestoAttivo) {
      setMostraPotenziamento(true);
      setMostraLiberatiGita(true);
      setMostraDisposizioni(true);
      // Se riattiva tutto, li richiude di default
      setOreRisorseChiuse([1, 2, 3, 4, 5, 6, 7, 8]);
    } else {
      setMostraPotenziamento(tipo === 'POTENZIAMENTO');
      setMostraLiberatiGita(tipo === 'GITA');
      setMostraDisposizioni(tipo === 'DISPONIBILE');
      // Espandi tutto (oreRisorseChiuse = []) per mostrare subito le risorse filtrate
      setOreRisorseChiuse([]);
    }
  };

  return (
    <div className="space-y-3">
      {/* AREA DINAMICA: TUTTA LARGHEZZA SE RISORSE È CHIUSO, A 2 COLONNE (8/12 + 4/12) SE APERTO */}
      {/* ============================================================================== */}
      <div className={`grid grid-cols-1 ${mostraRisorseLaterale && risorsePerOra.length > 0 ? 'lg:grid-cols-12' : ''} gap-4 items-start`}>

        {/* COLONNA TABELLONE PRINCIPALE (A TUTTA LARGHEZZA SE RISORSE CHIUSO, 8/12 SE APERTO) */}
        <div className={`${mostraRisorseLaterale && risorsePerOra.length > 0 ? 'lg:col-span-8' : 'w-full'} bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4`}>
          
          {/* HEADER UNIFICATO TABELLONE: TUTTO SU UNA SOLA RIGA SIA SU MOBILE CHE SU DESKTOP */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 border-b border-slate-100 pb-3 flex-wrap sm:flex-nowrap">
            
            {/* SELETTORE VISTE (A BLOCCHI / PER DOCENTE) E TASTO ESPANDI/COMPRIMI TUTTO */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div id="targetSelettoreViste" className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs border border-slate-200 shadow-2xs shrink-0">
                <button
                  onClick={() => setVisualizzazione('GRUPPI_ORA')}
                  className={`px-2 py-1 sm:px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                    visualizzazione === 'GRUPPI_ORA' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="A blocchi orari"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> 
                  <span className="hidden md:inline">A blocchi</span>
                </button>

                <button
                  onClick={() => setVisualizzazione('PER_DOCENTE')}
                  className={`px-2 py-1 sm:px-2.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer ${
                    visualizzazione === 'PER_DOCENTE' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Per Docente Assente"
                >
                  <UserMinus className="w-3.5 h-3.5 text-indigo-600" /> 
                  <span className="hidden md:inline">Per Docente</span>
                </button>
              </div>

              {/* PULSANTE DISCRETO SOLO ICONA ESPANDI / COMPRIMI TUTTO */}
              {oreScoperte.length > 0 && (
                (() => {
                  const isTuttoAperto = visualizzazione === 'GRUPPI_ORA'
                    ? oreAperte.length === oreRaggruppate.length && oreRaggruppate.length > 0
                    : docentiAperti.length === docentiAssentiRaggruppati.length && docentiAssentiRaggruppati.length > 0;

                  const handleToggleTutto = () => {
                    if (visualizzazione === 'GRUPPI_ORA') {
                      if (isTuttoAperto) {
                        setOreAperte([]);
                      } else {
                        setOreAperte(oreRaggruppate.map(g => g.ora));
                      }
                    } else {
                      if (isTuttoAperto) {
                        setDocentiAperti([]);
                      } else {
                        setDocentiAperti(docentiAssentiRaggruppati.map(d => d.docAssente.id));
                      }
                    }
                  };

                  return (
                    <button
                      type="button"
                      onClick={handleToggleTutto}
                      className={`p-1.5 rounded-xl border transition flex items-center justify-center cursor-pointer shadow-2xs ${
                        isTuttoAperto
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      }`}
                      title={isTuttoAperto ? "Tutto aperto - Clicca per Comprimere tutto" : "Tutto chiuso - Clicca per Espandere tutto"}
                    >
                      <ChevronsUpDown className={`w-4 h-4 ${isTuttoAperto ? 'text-white' : 'text-slate-600'}`} />
                    </button>
                  );
                })()
              )}
            </div>

            {/* PULSANTI DI AZIONE: SULLA STESSA RIGA */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* TARGET STEP 5: ASSEGNA (MOBILE) / ASSEGNA TUTTO (DESKTOP) */}
              <button
                id="targetBtnAssegnaTutto"
                onClick={handleAutoAssegnaTutto}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs border border-indigo-200 flex items-center justify-center gap-1 sm:gap-1.5 shadow-2xs transition whitespace-nowrap"
                title="Assegna automaticamente in base alle priorità"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="sm:hidden">Assegna</span>
                <span className="hidden sm:inline">Assegna Tutto</span>
              </button>
              
              {/* TARGET STEP 7: PUBBLICA (MOBILE) / PUBBLICA FIRME (DESKTOP) */}
              <button
                id="targetBtnPubblicaFirme"
                onClick={() => setMostraConfermaPubblicaTutto(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-xs transition whitespace-nowrap cursor-pointer"
                title="Pubblica per le firme"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="sm:hidden">Pubblica</span>
                <span className="hidden sm:inline">Pubblica Firme</span>
              </button>
            </div>
          </div>

      {(() => {
        const dObj = new Date(selectedDate);
        const dayOfWeek = dObj.getDay(); // 0 = Dom, 6 = Sab
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isFestivo = (impostazioniScuola?.giorniFestivi || []).includes(selectedDate);
        const isGiornoChiusura = isWeekend || isFestivo;

        if (isGiornoChiusura && oreScoperte.length === 0) {
          return (
            <div className="bg-gradient-to-br from-amber-50/90 via-sky-50/80 to-emerald-50/90 p-8 sm:p-10 text-center rounded-2xl border-2 border-amber-200/80 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-md border-2 border-amber-200 animate-bounce">
                {isWeekend ? '🏖️' : '🎉'}
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
                  {isWeekend 
                    ? `Buon Fine Settimana! (${dayOfWeek === 6 ? 'Sabato' : 'Domenica'} - Scuola Chiusa)`
                    : `Giorno Festivo / Chiusura Scuola`
                  }
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">
                  Nessuna attività didattica prevista per <strong className="text-slate-800">{selectedGiorno} {formatDataItaliana(selectedDate)}</strong>. Rilassati e goditi la giornata! ☀️🌴
                </p>
              </div>
              {onChangeDate && (
                <button
                  type="button"
                  onClick={() => onChangeDate(getPrimoGiornoScolasticoValido(selectedDate, true, impostazioniScuola?.giorniFestivi || []))}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Vai al prossimo giorno di lezione ➔</span>
                </button>
              )}
            </div>
          );
        }

        if (oreScoperte.length === 0) {
          return (
            <div className="bg-white p-8 text-center rounded-xl border border-dashed border-slate-300">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 text-base">Tutte le classi sono coperte!</h4>
              <p className="text-xs text-slate-500 mt-0.5">Non ci sono ore scoperte per {selectedGiorno} {formatDataItaliana(selectedDate)}.</p>
            </div>
          );
        }

        return null;
      })()}

      {oreScoperte.length > 0 && (visualizzazione === 'GRUPPI_ORA' ? (
        /* VISTA 1: RAGGRUPPATA PER ORA */
        <div className="space-y-3">
          {oreRaggruppate.map(gruppo => {
            const isAperto = oreAperte.includes(gruppo.ora);
            const sostsGruppo = gruppo.items.map(item => getSostituzione(item.ora, item.classe)).filter(Boolean);
            const totCoperteGruppo = sostsGruppo.length; // FATTI
            const totPubblicateGruppo = sostsGruppo.filter(s => s?.pubblicata).length; // INVIATE
            const totFirmateGruppo = sostsGruppo.filter(s => s?.firmata).length; // PRESE VISIONE (FIRMATE)
            const totDaFareGruppo = Math.max(0, gruppo.items.length - totCoperteGruppo); // DA FARE

            return (
              <div key={gruppo.ora} className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setOreAperte(prev => 
                      prev.includes(gruppo.ora) ? prev.filter(o => o !== gruppo.ora) : [...prev, gruppo.ora]
                    );
                  }}
                  className="w-full bg-slate-50/80 hover:bg-slate-100/90 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-600 text-white font-black text-xs px-2 py-0.5 rounded shadow-2xs">
                      {gruppo.ora}ª ORA
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {gruppo.items.length} {gruppo.items.length === 1 ? 'sostituzione' : 'sostituzioni'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* 1. ORE COPERTE CON ICONA OROLOGIO */}
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      totCoperteGruppo === gruppo.items.length 
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`} title="Ore coperte / totali">
                      <span>🕒 {totCoperteGruppo}/{gruppo.items.length}</span>
                      {totCoperteGruppo === gruppo.items.length && <span>✓</span>}
                    </span>

                    {/* 3. INVIATE */}
                    {totCoperteGruppo > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border transition ${
                        totPubblicateGruppo === totCoperteGruppo
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-sky-50 text-sky-900 border-sky-200'
                      }`} title="Richieste inviate">
                        <span>📤 {totPubblicateGruppo}/{totCoperteGruppo}</span>
                        {totPubblicateGruppo === totCoperteGruppo && <span>✓</span>}
                      </span>
                    )}

                    {/* 4. PRESE VISIONE / FIRME */}
                    {totCoperteGruppo > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 transition ${
                        totFirmateGruppo === totCoperteGruppo
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                          : totFirmateGruppo > 0
                            ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`} title="Prese visione (firme) effettuate dai docenti">
                        <span>✍️ {totFirmateGruppo}/{totCoperteGruppo}</span>
                        <span className="hidden sm:inline font-normal text-[9px]">firmate</span>
                        {totFirmateGruppo === totCoperteGruppo && <span>✓</span>}
                      </span>
                    )}

                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isAperto ? 'rotate-180 text-indigo-600' : ''}`} />
                  </div>
                </button>

                {isAperto && (
                  <div className="divide-y divide-slate-100 animate-in fade-in duration-150">
                {gruppo.items.map((os, idx) => {
                  const sosts = getSostituzioniList(os.ora, os.classe);
                  const isSelected = selectedOraScoperta?.ora === os.ora && selectedOraScoperta?.classe === os.classe;
                  const isGraveSostegno = isDocenteAssenteCasoGraveNellOra(os.docenteAssente.id, os.ora);
                  const isFirstUnassigned = sosts.length === 0 && idx === 0;

                  return (
                    <div
                      key={idx}
                      id={isFirstUnassigned ? 'targetSlotOraScoperta' : undefined}
                      onClick={() => setSelectedOraScoperta(os)}
                      className={`px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-indigo-50/30 transition cursor-pointer ${
                        isSelected ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-300' : ''
                      }`}
                    >
                      {/* Info Classe e Docente Assente */}
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-9 rounded-lg flex items-center justify-center font-black text-sm border shadow-2xs shrink-0 ${
                          sosts.length > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}>
                          {os.classe}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">{getBaseNomeDocente(os.docenteAssente.nome)}</span>
                            <span className="text-[11px] text-slate-400 font-medium">({os.docenteAssente.materia})</span>
                            
                            {/* BADGE ROSSO CASO GRAVE SE SOSTEGNO CON CELLA GRAVE */}
                            {isGraveSostegno && (
                              <span className="bg-rose-600 text-white font-black px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 shadow-2xs animate-pulse">
                                <span>♿</span>
                                <span>GRAVE</span>
                              </span>
                            )}

                            {/* REMIND EDUCATORE IN COMPRESENZA NELLA CLASSE */}
                            {(() => {
                              const eds = getEducatoriInClasseNellOra(os.classe, selectedGiorno, os.ora, docenti, orariDocenti);
                              if (eds.length === 0) return null;
                              return eds.map(ed => (
                                <span key={ed.id} className="bg-teal-50 text-teal-800 border border-teal-300 font-bold px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 shadow-2xs">
                                  <span>🎓</span>
                                  <span>Educatore: {getBaseNomeDocente(ed.nome)}</span>
                                </span>
                              ));
                            })()}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                            <span>Tipologia: <strong className="text-slate-700">{os.motivo}</strong></span>
                            {os.isUscita && (
                              <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded text-[10px] flex items-center gap-1">
                                <Bus className="w-2.5 h-2.5" /> Accompagnatore
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stato Assegnazione, Firma e Gestione Singola Ora */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                        {sosts.length > 0 ? (
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 flex-wrap">
                            {sosts.map((sost) => (
                              sost.categoria === 'NON_SOSTITUIRE' ? (
                                <div key={sost.id} className="flex items-center gap-2 bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                                  <div className="text-left">
                                    <div className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                                      <span>🚫 Non Sostituita</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 block">Classe senza sostituto</span>
                                  </div>

                                  {/* CESTINO ANNULLA NON SOSTITUIRE */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      rimuoviSostituzione(sost.id);
                                    }}
                                    className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition ml-1 cursor-pointer"
                                    title="Annulla scelta 'Non Sostituire'"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div key={sost.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                                  <div className="text-left">
                                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                      <span className="text-indigo-700">👤 {getDocenteNome(sost.docenteSostitutoId)}</span>
                                      <span className="text-[10px] font-normal text-slate-500">({sost.categoria.replace(/_/g, ' ')})</span>
                                    </div>

                                    {/* TRACKING STATO PRESA VISIONE E CONDIVISIONE RAPIDA */}
                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                      {sost.firmata ? (
                                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-md shadow-2xs">
                                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                                          <span>Presa visione {sost.dataFirma ? `(${new Date(sost.dataFirma).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}</span>
                                        </span>
                                      ) : sost.pubblicata ? (
                                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] px-2 py-0.5 rounded-md shadow-2xs">
                                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                          <span>In attesa presa visione</span>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSostituzionePerInvioSingolo({ sost, oraScoperta: os });
                                          }}
                                          className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px] px-2 py-0.5 rounded-md transition shadow-2xs cursor-pointer"
                                          title="Invia la richiesta di firma per presa visione a questo singolo docente"
                                        >
                                          <span>✉️ Invia per Firma</span>
                                        </button>
                                      )}

                                      {/* PULSANTE WHATSAPP RAPIDO */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const nomeSostituto = getDocenteNome(sost.docenteSostitutoId);
                                          const nomeAssente = getBaseNomeDocente(os.docenteAssente.nome);
                                          const dataFmt = formatDataItaliana(selectedDate);
                                          const testoMsg = `Gentile Prof./Prof.ssa ${nomeSostituto}, Le comunichiamo che il giorno ${dataFmt} è assegnato/a alla ${os.ora}ª ora nella classe ${os.classe} per la sostituzione del Prof. ${nomeAssente}.`;
                                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(testoMsg)}`, '_blank');
                                        }}
                                        className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px] px-2 py-0.5 rounded-md transition shadow-2xs cursor-pointer"
                                        title="Invia avviso su WhatsApp con messaggio precompilato"
                                      >
                                        <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
                                        <span>WhatsApp</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* CESTINO SOSTITUZIONE */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const msg = sost.pubblicata || sost.firmata
                                        ? `Attenzione: questa sostituzione è già stata inviata/firmata.\nVuoi cancellarla? Il docente ${getDocenteNome(sost.docenteSostitutoId)} riceverà una notifica di annullamento.`
                                        : `Vuoi rimuovere l'assegnazione per ${getDocenteNome(sost.docenteSostitutoId)}?`;
                                      if (window.confirm(msg)) {
                                        rimuoviSostituzione(sost.id);
                                      }
                                    }}
                                    className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition ml-1 cursor-pointer"
                                    title="Annulla sostituto assegnato"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )
                            ))}

                            {/* PULSANTE AGGIUNGI ALTRO SOSTITUTO (SE NON È NON_SOSTITUIRE) */}
                            {!sosts.some(s => s.categoria === 'NON_SOSTITUIRE') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOraScoperta(os);
                                }}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="Aggiungi un altro docente per coprire questa classe in compresenza"
                              >
                                <span>+ Aggiungi</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOraScoperta(os);
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                            >
                              <span>Scegli Sostituto</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            {/* CANCELLA QUESTA SINGOLA ORA DAL TABELLONE */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Vuoi cancellare quest'ora di assenza dal tabellone (${os.ora}ª ora di ${getBaseNomeDocente(os.docenteAssente.nome)} in ${os.classe})?\n\nL'ora verrà rimossa dalle ore scoperte senza dover cancellare tutta l'assenza.`)) {
                                  rimuoviSingolaOraAssenza(os.docenteAssente.id, selectedDate, os.ora, os.classe);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-200 transition shadow-2xs"
                              title="Cancella solo quest'ora dal tabellone"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
      ) : (
        /* VISTA 2: RAGGRUPPATA PER DOCENTE ASSENTE CON LE SUE ORE SOTTO */
        <div className="space-y-4">
          {docentiAssentiRaggruppati.map((gruppoDoc, gIdx) => {
            const isAperto = docentiAperti.includes(gruppoDoc.docAssente.id);
            const motivoPrimo = gruppoDoc.items[0]?.motivo || 'Giornaliera';
            const isUscitaDoc = gruppoDoc.items[0]?.isUscita || false;
            const isOrariaDoc = motivoPrimo.toLowerCase().includes('oraria') || motivoPrimo.toLowerCase().includes('permesso');
            const stileCard = getStileCardAssenza(motivoPrimo, isUscitaDoc, isOrariaDoc);

            return (
              <div key={gIdx} className={`bg-white rounded-2xl border overflow-hidden transition-all ${stileCard.cardBorder}`}>
                {/* Intestazione del Docente Assente come Accordion Button Dinamico per Colore e Icona */}
                <button
                  type="button"
                  onClick={() => {
                    setDocentiAperti(prev => 
                      prev.includes(gruppoDoc.docAssente.id)
                        ? prev.filter(id => id !== gruppoDoc.docAssente.id)
                        : [...prev, gruppoDoc.docAssente.id]
                    );
                  }}
                  className={`w-full ${stileCard.bgHeader} ${stileCard.textColor} px-4 py-3 flex flex-wrap items-center justify-between gap-2 transition cursor-pointer text-left`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${stileCard.bgAvatar} flex items-center justify-center font-black text-xs`}>
                      {gruppoDoc.nomeDocente.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-black tracking-wide">{gruppoDoc.nomeDocente}</strong>
                        <span className={`text-xs ${stileCard.subTextColor} font-semibold`}>({gruppoDoc.materiaVisualizzata})</span>
                        {gruppoDoc.docAssente.isCasoGraveSostegno && (
                          <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-2xs">
                            ♿ GRAVE
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] ${stileCard.subTextColor} flex items-center gap-1 mt-0.5 font-medium`}>
                        <span>{stileCard.icon}</span>
                        <span>Tipologia assenza: <strong>{stileCard.label}</strong></span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* 1. ORE COPERTE CON ICONA OROLOGIO */}
                    <span className={`text-xs font-black px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1 ${
                      gruppoDoc.totCoperteDoc === gruppoDoc.totOreDoc 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-amber-500 text-white'
                    }`} title="Ore coperte per questo docente">
                      <span>🕒 {gruppoDoc.totCoperteDoc}/{gruppoDoc.totOreDoc}</span>
                      {gruppoDoc.totCoperteDoc === gruppoDoc.totOreDoc && <span>✓</span>}
                    </span>

                    {/* 3. INVIATE */}
                    {gruppoDoc.totCoperteDoc > 0 && (
                      <span className={`text-xs font-black px-2 py-1 rounded-xl border shadow-2xs flex items-center gap-1 transition ${
                        gruppoDoc.totPubblicateDoc === gruppoDoc.totCoperteDoc
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-sky-100 text-sky-900 border-sky-300'
                      }`} title="Richieste inviate ai docenti">
                        <span>📤 {gruppoDoc.totPubblicateDoc}/{gruppoDoc.totCoperteDoc}</span>
                        {gruppoDoc.totPubblicateDoc === gruppoDoc.totCoperteDoc && <span>✓</span>}
                      </span>
                    )}

                    {/* 4. PRESE VISIONE (FIRME) */}
                    {gruppoDoc.totCoperteDoc > 0 && (
                      <span className={`text-xs font-black px-2 py-1 rounded-xl shadow-2xs flex items-center gap-1 transition ${
                        gruppoDoc.totFirmateDoc === gruppoDoc.totCoperteDoc
                          ? 'bg-emerald-600 text-white border border-emerald-700'
                          : gruppoDoc.totFirmateDoc > 0
                            ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                            : 'bg-white text-slate-600 border border-slate-300'
                      }`} title="Prese visione (firme) effettuate dai docenti">
                        <span>✍️ {gruppoDoc.totFirmateDoc}/{gruppoDoc.totCoperteDoc}</span>
                        <span className="hidden sm:inline font-normal text-[10px]">firmate</span>
                        {gruppoDoc.totFirmateDoc === gruppoDoc.totCoperteDoc && <span>✓</span>}
                      </span>
                    )}

                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isAperto ? 'rotate-180 text-slate-800' : ''}`} />
                  </div>
                </button>

                {/* Elenco delle ore del docente sotto l'intestazione */}
                {isAperto && (
                  <div className={`divide-y divide-slate-100 p-2 sm:p-3 ${stileCard.bodyBg} space-y-1.5 animate-in fade-in duration-150`}>
                {gruppoDoc.items.map((os, idx) => {
                  const sosts = getSostituzioniList(os.ora, os.classe);
                  const isSelected = selectedOraScoperta?.ora === os.ora && selectedOraScoperta?.classe === os.classe;
                  const isGraveSostegno = isDocenteAssenteCasoGraveNellOra(os.docenteAssente.id, os.ora);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedOraScoperta(os)}
                      className={`p-3 bg-white rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition ${
                        isSelected 
                          ? 'border-indigo-400 bg-indigo-50/50 shadow-xs' 
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 shadow-2xs'
                      }`}
                    >
                      {/* Ora e Classe */}
                      <div className="flex items-center gap-3">
                        <span className="bg-indigo-100 text-indigo-950 border border-indigo-200 font-black text-xs px-2.5 py-1.5 rounded-lg shrink-0 shadow-2xs">
                          {os.ora}ª ORA
                        </span>
                        
                        <div className={`w-11 h-9 rounded-lg flex items-center justify-center font-black text-sm border shadow-2xs shrink-0 ${
                          sosts.length > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}>
                          {os.classe}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 uppercase">
                              {os.docenteAssente.materia}
                            </span>
                            {isGraveSostegno && (
                              <span className="bg-rose-600 text-white font-black px-1.5 py-0.2 rounded text-[9px] flex items-center gap-0.5">
                                <span>♿</span> GRAVE
                              </span>
                            )}
                            {/* REMIND EDUCATORE IN COMPRESENZA */}
                            {(() => {
                              const eds = getEducatoriInClasseNellOra(os.classe, selectedGiorno, os.ora, docenti, orariDocenti);
                              if (eds.length === 0) return null;
                              return eds.map(ed => (
                                <span key={ed.id} className="bg-teal-50 text-teal-800 border border-teal-300 font-bold px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 shadow-2xs">
                                  <span>🎓</span>
                                  <span>Educatore: {getBaseNomeDocente(ed.nome)}</span>
                                </span>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Docente Sostituto, Firma e Gestione Singola Ora */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                        {sosts.length > 0 ? (
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 flex-wrap">
                            {sosts.map((sost) => (
                              sost.categoria === 'NON_SOSTITUIRE' ? (
                                <div key={sost.id} className="flex items-center gap-2 bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                                  <div className="text-left">
                                    <div className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                                      <span>🚫 Non Sostituita</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 block">Classe senza sostituto</span>
                                  </div>

                                  {/* CESTINO ANNULLA NON SOSTITUIRE */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      rimuoviSostituzione(sost.id);
                                    }}
                                    className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition ml-1 cursor-pointer"
                                    title="Annulla scelta 'Non Sostituire'"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div key={sost.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                                  <div className="text-left">
                                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                      <span className="text-indigo-700">👤 {getDocenteNome(sost.docenteSostitutoId)}</span>
                                      <span className="text-[10px] font-normal text-slate-500">({sost.categoria.replace(/_/g, ' ')})</span>
                                    </div>

                                    {/* TRACKING STATO PRESA VISIONE E CONDIVISIONE RAPIDA */}
                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                      {sost.firmata ? (
                                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-md shadow-2xs">
                                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                                          <span>Presa visione {sost.dataFirma ? `(${new Date(sost.dataFirma).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}</span>
                                        </span>
                                      ) : sost.pubblicata ? (
                                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] px-2 py-0.5 rounded-md shadow-2xs">
                                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                                          <span>In attesa presa visione</span>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSostituzionePerInvioSingolo({ sost, oraScoperta: os });
                                          }}
                                          className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px] px-2 py-0.5 rounded-md transition shadow-2xs cursor-pointer"
                                          title="Invia la richiesta di firma per presa visione a questo singolo docente"
                                        >
                                          <span>✉️ Invia per Firma</span>
                                        </button>
                                      )}

                                      {/* PULSANTE WHATSAPP RAPIDO */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const nomeSostituto = getDocenteNome(sost.docenteSostitutoId);
                                          const nomeAssente = getBaseNomeDocente(os.docenteAssente.nome);
                                          const dataFmt = formatDataItaliana(selectedDate);
                                          const testoMsg = `Gentile Prof./Prof.ssa ${nomeSostituto}, Le comunichiamo che il giorno ${dataFmt} è assegnato/a alla ${os.ora}ª ora nella classe ${os.classe} per la sostituzione del Prof. ${nomeAssente}.`;
                                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(testoMsg)}`, '_blank');
                                        }}
                                        className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px] px-2 py-0.5 rounded-md transition shadow-2xs cursor-pointer"
                                        title="Invia avviso su WhatsApp con messaggio precompilato"
                                      >
                                        <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
                                        <span>WhatsApp</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* CESTINO SOSTITUZIONE */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const msg = sost.pubblicata || sost.firmata
                                        ? `Attenzione: questa sostituzione è già stata inviata/firmata.\nVuoi cancellarla? Il docente ${getDocenteNome(sost.docenteSostitutoId)} riceverà una notifica di annullamento.`
                                        : `Vuoi rimuovere l'assegnazione per ${getDocenteNome(sost.docenteSostitutoId)}?`;
                                      if (window.confirm(msg)) {
                                        rimuoviSostituzione(sost.id);
                                      }
                                    }}
                                    className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition ml-1 cursor-pointer"
                                    title="Annulla sostituzione"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )
                            ))}

                            {/* PULSANTE AGGIUNGI ALTRO SOSTITUTO (SE NON È NON_SOSTITUIRE) */}
                            {!sosts.some(s => s.categoria === 'NON_SOSTITUIRE') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOraScoperta(os);
                                }}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="Aggiungi un altro docente per coprire questa classe in compresenza"
                              >
                                <span>+ Aggiungi</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOraScoperta(os);
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                            >
                              <span>Scegli Sostituto</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            {/* CANCELLA QUESTA SINGOLA ORA DAL TABELLONE */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Vuoi cancellare quest'ora di assenza dal tabellone (${os.ora}ª ora di ${getBaseNomeDocente(os.docenteAssente.nome)} in ${os.classe})?\n\nL'ora verrà rimossa dalle ore scoperte senza dover cancellare tutta l'assenza.`)) {
                                  rimuoviSingolaOraAssenza(os.docenteAssente.id, selectedDate, os.ora, os.classe);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-200 transition shadow-2xs"
                              title="Cancella solo quest'ora dal tabellone"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
      ))}

        </div>

        {/* COLONNA LATERALE: SPECCHIETTO RISORSE DISPONIBILI (LG: 4/12) VISIBILE SE APERTO */}
        {mostraRisorseLaterale && risorsePerOra.length > 0 && (
          <div className="lg:col-span-4 space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
            <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-1.5 border-b border-slate-100 pb-2">
                <span id="targetSpecchiettoRisorse" className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                    ⚡
                  </span>
                  <span>Risorse Oggi ({risorsePerOra.reduce((acc, r) => acc + r.totDisponibili, 0)})</span>
                </span>
              </div>

              {/* FILTRI IN LEGENDA DESKTOP */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                <button
                  type="button"
                  disabled={totPotenziamentoOggi === 0}
                  onClick={() => handleFiltroRisorseClick('POTENZIAMENTO')}
                  className={`px-2.5 py-1 rounded-md border transition flex items-center gap-1 cursor-pointer ${
                    totPotenziamentoOggi === 0
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      : mostraPotenziamento
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-black shadow-2xs'
                        : 'bg-slate-100 text-slate-400 line-through'
                  }`}
                  title={totPotenziamentoOggi === 0 ? "Nessun docente di potenziamento disponibile oggi" : "Filtra solo Potenziamento"}
                >
                  ⚡ Potenziamento ({totPotenziamentoOggi})
                </button>

                <button
                  type="button"
                  disabled={totGiteOggi === 0}
                  onClick={() => handleFiltroRisorseClick('GITA')}
                  className={`px-2.5 py-1 rounded-md border transition flex items-center gap-1 cursor-pointer ${
                    totGiteOggi === 0
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      : mostraLiberatiGita
                        ? 'bg-amber-100 text-amber-950 border-amber-300 font-black shadow-2xs'
                        : 'bg-slate-100 text-slate-400 line-through'
                  }`}
                  title={totGiteOggi === 0 ? "Nessuna classe in gita oggi" : "Filtra solo Liberati da Gita"}
                >
                  🚌 Gita ({totGiteOggi})
                </button>

                <button
                  type="button"
                  disabled={totDisposizioniOggi === 0}
                  onClick={() => handleFiltroRisorseClick('DISPONIBILE')}
                  className={`px-2.5 py-1 rounded-md border transition flex items-center gap-1 cursor-pointer ${
                    totDisposizioniOggi === 0
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      : mostraDisposizioni
                        ? 'bg-purple-100 text-purple-950 border-purple-300 font-black shadow-2xs'
                        : 'bg-slate-100 text-slate-400 line-through'
                  }`}
                  title={totDisposizioniOggi === 0 ? "Nessun docente a disposizione oggi" : "Filtra solo Disponibile"}
                >
                  ⏱️ Disponibile ({totDisposizioniOggi})
                </button>
              </div>

              {/* LISTA RISORSE DESKTOP (ACCORDION PER ORA) */}
              <div className="space-y-2 text-xs">
                {risorsePerOra.map(r => {
                  const potVisibili = mostraPotenziamento ? (mostraGiaUsati ? r.potenziamentoList : r.potenziamentoList.filter(p => !p.usata)) : [];
                  const giteVisibili = mostraLiberatiGita ? (mostraGiaUsati ? r.liberatiGitaList : r.liberatiGitaList.filter(g => !g.usata)) : [];
                  const dispVisibili = (mostraDisposizioni ? r.disposizioniList : r.disposizioniList.filter(d => d.debito > 0))
                    .filter(d => mostraGiaUsati ? true : !d.usata);
                  const totFiltrati = potVisibili.length + giteVisibili.length + dispVisibili.length;
                  if (totFiltrati === 0) return null;

                  const isOraRisorsaChiusa = oreRisorseChiuse.includes(r.ora);

                  return (
                    <div key={r.ora} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          setOreRisorseChiuse(prev => 
                            prev.includes(r.ora) ? prev.filter(o => o !== r.ora) : [...prev, r.ora]
                          );
                        }}
                        className="w-full p-2.5 flex items-center justify-between hover:bg-slate-100/80 transition cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 text-xs">{r.ora}ª Ora</span>
                          <span className="text-[10px] bg-slate-200/80 text-slate-700 font-bold px-1.5 py-0.2 rounded-full">
                            {totFiltrati} {totFiltrati === 1 ? 'docente' : 'docenti'}
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOraRisorsaChiusa ? '' : 'rotate-180 text-indigo-600'}`} />
                      </button>

                      {!isOraRisorsaChiusa && (
                        <div className="p-2 pt-0 border-t border-slate-100 flex flex-wrap gap-1.5 animate-in fade-in duration-150 mt-1">
                          {potVisibili.map(p => (
                            <span 
                              key={p.docenteId} 
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                                p.usata
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-75'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                              }`}
                              title={p.usata ? `${p.nome} è già assegnato in quest'ora` : `${p.nome} è disponibile`}
                            >
                              ⚡ {p.nome} {p.usata ? '(Occupato)' : ''}
                            </span>
                          ))}
                          {giteVisibili.map(g => (
                            <span 
                              key={g.docenteId} 
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                                g.usata
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-75'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs'
                              }`}
                              title={g.usata ? `${g.nome} è già assegnato in quest'ora` : `${g.nome} è disponibile (Liberato da ${g.classe})`}
                            >
                              🚌 {g.nome} {g.usata ? '(Occupato)' : ''}
                            </span>
                          ))}
                          {dispVisibili.map(d => (
                            <span 
                              key={d.docenteId} 
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                                d.usata
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-75'
                                  : 'bg-purple-50 text-purple-800 border-purple-200 shadow-2xs'
                              }`}
                              title={d.usata ? `${d.nome} è già assegnato in quest'ora` : `${d.nome} è a disposizione`}
                            >
                              ⏱️ {d.nome} {d.usata ? '(Occupato)' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* POPUP MODALE SCELTA ASSISTITA SOSTITUTO */}
      {selectedOraScoperta && (
        <ModalSceltaSostituto
          selectedDate={selectedDate}
          selectedGiorno={selectedGiorno}
          oraScoperta={selectedOraScoperta}
          isGraveAssente={isDocenteAssenteCasoGraveNellOra(selectedOraScoperta.docenteAssente.id, selectedOraScoperta.ora)}
          onClose={() => setSelectedOraScoperta(null)}
          onAssegna={(docenteId, categoria, isStraordinario, consumaDebito) => {
            assegnaSostituzione({
              data: selectedDate,
              giorno: selectedGiorno,
              ora: selectedOraScoperta.ora,
              classe: selectedOraScoperta.classe,
              docenteAssenteId: selectedOraScoperta.docenteAssente.id,
              docenteSostitutoId: docenteId,
              categoria,
              isStraordinario,
              consumaDebito,
              pubblicata: false,
              firmata: false
            });
            setSelectedOraScoperta(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODALE DI CONFERMA: PUBBLICA TUTTE LE SOSTITUZIONI DELLA GIORNATA        */}
      {/* ========================================================================= */}
      {mostraConfermaPubblicaTutto && (() => {
        const daPubblicare = sostituzioniOggi.filter(s => !s.pubblicata && s.docenteSostitutoId && s.categoria !== 'NON_SOSTITUIRE');
        const giaPubblicate = sostituzioniOggi.filter(s => s.pubblicata && s.docenteSostitutoId && s.categoria !== 'NON_SOSTITUIRE');

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
              
              {/* Header Modale */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                      Pubblica e Invia Notifiche Firme
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {selectedGiorno} {formatDataItaliana(selectedDate)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMostraConfermaPubblicaTutto(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Corpo Modale: Elenco Docenti da Notificare */}
              <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                {daPubblicare.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-1">
                    <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto" />
                    <h4 className="font-bold text-amber-950 text-xs sm:text-sm">Nessuna nuova sostituzione da inviare</h4>
                    <p className="text-[11px] text-amber-800">
                      {giaPubblicate.length > 0
                        ? `Tutte le ${giaPubblicate.length} sostituzioni di oggi sono già state inviate ai docenti.`
                        : 'Non ci sono ancora sostituti assegnati da pubblicare per questa data.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                        <Bell className="w-4 h-4 text-emerald-600" />
                        <span>I seguenti docenti riceveranno notifica push e avviso sonoro:</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        All'invio, i docenti troveranno il banner in cima al proprio portale con il pulsante <strong>"Ho Capito ✓"</strong> e la richiesta di apporre la firma digitale.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                        Docenti Destinatari ({daPubblicare.length}):
                      </span>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                        {daPubblicare.map(s => {
                          const docAssente = docenti.find(d => d.id === s.docenteAssenteId);
                          const docSostituto = docenti.find(d => d.id === s.docenteSostitutoId);
                          return (
                            <div key={s.id} className="py-2 px-1 flex items-center justify-between text-xs gap-2">
                              <div>
                                <strong className="text-slate-900 font-black block">
                                  Prof. {docSostituto ? getBaseNomeDocente(docSostituto.nome) : s.docenteSostitutoId}
                                </strong>
                                <span className="text-[11px] text-slate-500">
                                  {s.ora}ª ora • Classe {s.classe} (in sostituzione di {docAssente ? getBaseNomeDocente(docAssente.nome) : 'Docente'})
                                </span>
                              </div>
                              <span className="text-[10px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded-md shrink-0">
                                {s.categoria.replace(/_/g, ' ')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer Azioni */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMostraConfermaPubblicaTutto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  Annulla
                </button>

                {daPubblicare.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      pubblicaTutteSostituzioniData(selectedDate);
                      setMostraConfermaPubblicaTutto(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Conferma e Invia ({daPubblicare.length} Notifiche)</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODALE DI CONFERMA: INVIA NOTIFICA A SINGOLO DOCENTE                      */}
      {/* ========================================================================= */}
      {sostituzionePerInvioSingolo && (() => {
        const { sost, oraScoperta } = sostituzionePerInvioSingolo;
        const docAssente = docenti.find(d => d.id === sost.docenteAssenteId);
        const docSostituto = docenti.find(d => d.id === sost.docenteSostitutoId);
        const nomeSostituto = docSostituto ? getBaseNomeDocente(docSostituto.nome) : sost.docenteSostitutoId;
        const nomeAssente = docAssente ? getBaseNomeDocente(docAssente.nome) : (oraScoperta ? getBaseNomeDocente(oraScoperta.docenteAssente.nome) : 'Docente');

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
              
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base leading-tight">
                      Invia Notifica Supplenza
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {selectedGiorno} {formatDataItaliana(selectedDate)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSostituzionePerInvioSingolo(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 text-indigo-950 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span>Dettagli Invio al Docente:</span>
                  </div>
                  <div className="space-y-1 text-slate-800">
                    <div>Docente: <strong className="text-indigo-950 text-sm">{nomeSostituto}</strong></div>
                    <div>Ora e Classe: <strong>{sost.ora}ª ora in {sost.classe}</strong></div>
                    <div>In sostituzione di: <strong>{nomeAssente}</strong></div>
                  </div>
                </div>

                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Il docente riceverà immediatamente un <strong>avviso sonoro</strong>, la <strong>notifica push a schermo bloccato</strong> e troverà il banner in alto con <strong>"Ho Capito ✓"</strong> nel suo portale per firmare la presa visione.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSostituzionePerInvioSingolo(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={() => {
                    pubblicaSingolaSostituzione(sost.id);
                    setSostituzionePerInvioSingolo(null);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Conferma e Invia</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ==============================================================================
// POPUP MODALE DI SCELTA ASSISTITA DEL SOSTITUTO
// ==============================================================================
interface ModalSceltaSostitutoProps {
  selectedDate: string;
  selectedGiorno: any;
  oraScoperta: OraScoperta;
  isGraveAssente: boolean;
  onClose: () => void;
  onAssegna: (docenteId: string, categoria: CategoriaSostituto, isStraordinario: boolean, consumaDebito: boolean) => void;
}

const ModalSceltaSostituto: React.FC<ModalSceltaSostitutoProps> = ({
  selectedDate,
  selectedGiorno,
  oraScoperta,
  isGraveAssente,
  onClose,
  onAssegna
}) => {
  const { docenti, orariDocenti, assenze, uscite, sostituzioni, nomineSupplenti } = useApp();

  const candidati = trovaCandidatiSostituzione(
    selectedDate,
    oraScoperta.ora,
    selectedGiorno,
    oraScoperta.classe,
    oraScoperta.docenteAssente,
    oraScoperta.isUscita || false,
    orariDocenti,
    docenti,
    assenze,
    uscite,
    sostituzioni,
    nomineSupplenti
  );

  const [ricercaManuale, setRicercaManuale] = useState<string>('');
  const [docenteManualeSelezionatoId, setDocenteManualeSelezionatoId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const dataIsoOggi = selectedDate.split('T')[0];
  const nomiTitolariSostituiti = new Set<string>();
  nomineSupplenti.forEach(n => {
    const inizio = n.dataInizio.split('T')[0];
    const fine = n.dataFine.split('T')[0];
    if (dataIsoOggi >= inizio && dataIsoOggi <= fine) {
      if (n.docenteTitolareNome) nomiTitolariSostituiti.add(getBaseNomeDocente(n.docenteTitolareNome));
      const titolareDoc = docenti.find(d => d.id === n.docenteTitolareId);
      if (titolareDoc) nomiTitolariSostituiti.add(getBaseNomeDocente(titolareDoc.nome));
    }
  });

  const docentiUnici = getDocentiUnici(docenti).filter(d => !nomiTitolariSostituiti.has(d.nome));
  const docentiFiltrati = docentiUnici.filter(d => 
    d.nome.toLowerCase().includes(ricercaManuale.toLowerCase()) ||
    d.materie.some(m => m.toLowerCase().includes(ricercaManuale.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto min-h-[100dvh] pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] animate-fadeIn">
      <div className="bg-white w-full max-w-3xl lg:max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] my-auto">
        
        {/* HEADER MODALE */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm">
              {oraScoperta.ora}ª
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Classe {oraScoperta.classe} - {oraScoperta.ora}ª Ora</h3>
                {isGraveAssente && (
                  <span className="bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow-2xs">
                    ♿ CASO GRAVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Assente: <strong className="text-white">{oraScoperta.docenteAssente.nome}</strong> ({oraScoperta.docenteAssente.materia})
              </p>

              {/* REMIND EDUCATORE PRESENTE NELLA CLASSE */}
              {(() => {
                const eds = getEducatoriInClasseNellOra(oraScoperta.classe, selectedGiorno, oraScoperta.ora, docenti, orariDocenti);
                if (eds.length === 0) return null;
                return (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px]">
                    <span className="bg-teal-900/90 text-teal-200 border border-teal-600 px-2 py-0.5 rounded font-bold flex items-center gap-1 shadow-2xs">
                      <span>🎓</span>
                      <span>Educatore in classe: <strong>{eds.map(e => getBaseNomeDocente(e.nome)).join(', ')}</strong></span>
                    </span>
                  </div>
                );
              })()}

              {/* Mostra eventuali sostituti già assegnati per questa ora */}
              {(() => {
                const giaAssegnati = sostituzioni.filter(s => s.data === selectedDate && s.ora === oraScoperta.ora && s.classe === oraScoperta.classe && s.categoria !== 'NON_SOSTITUIRE');
                if (giaAssegnati.length === 0) return null;
                return (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px]">
                    <span className="text-emerald-400 font-bold">Già assegnati:</span>
                    {giaAssegnati.map(s => (
                      <span key={s.id} className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded font-semibold">
                        👤 {getDocentiUnici(docenti).find(d => d.allIds.includes(s.docenteSostitutoId))?.nome || s.docenteSostitutoId}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold p-1">✕</button>
        </div>

        {/* CONTENUTO SCORREVOLE CANDIDATI IN ORDINE NORMATIVO */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">

          {/* OPZIONE SPECIALE: NON SOSTITUIRE (LASCIA SCOPERTA / SENZA SOSTITUTO) */}
          <div className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-300 flex items-center justify-between gap-3 transition">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                🚫
              </span>
              <div>
                <strong className="text-xs font-bold text-slate-800 block">Non Sostituire</strong>
                <span className="text-[11px] text-slate-500 block">
                  Segna l'ora come "Non Sostituita" (la classe non necessita di docente o resta scoperta intenzionalmente)
                </span>
              </div>
            </div>
            <button
              onClick={() => onAssegna('', 'NON_SOSTITUIRE', false, false)}
              className="bg-slate-700 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition shrink-0 shadow-xs"
            >
              Non Sostituire
            </button>
          </div>
          
          {/* SEZIONE COMPRESENTI IN CLASSE */}
          {candidati.COMPRESENTE_CLASSE.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-purple-900 block uppercase tracking-wide">
                Priorità Massima: Compresenza in Aula
              </span>
              <div className="space-y-1.5">
                {candidati.COMPRESENTE_CLASSE.map((cand, i) => {
                  const isGrave = cand.isCasoGrave || cand.docente.isCasoGraveSostegno || (cand.docente as any).casoGraveSostegno;
                  return (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between p-3 rounded-xl border transition ${
                        isGrave 
                          ? 'bg-rose-50/80 border-rose-300 text-rose-950' 
                          : 'bg-purple-50/60 border-purple-200 text-purple-950'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-slate-900">{cand.docente.nome}</strong>
                          {isGrave && (
                            <span className="bg-rose-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded flex items-center gap-0.5 shadow-2xs">
                              <span>♿</span>
                              <span>CASO GRAVE</span>
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] block mt-0.5 ${isGrave ? 'text-rose-800 font-semibold' : 'text-purple-700'}`}>
                          {cand.dettagli}
                        </span>
                      </div>
                      
                      {isGrave ? (
                        <button
                          onClick={() => {
                            if (window.confirm(`Attenzione: ${cand.docente.nome} segue un alunno con Caso Grave (♿). Vuoi confermare comunque la compresenza in aula?`)) {
                              onAssegna(cand.docente.id, 'COMPRESENTE_CLASSE', false, false);
                            }
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black px-2.5 py-1.5 rounded-lg shadow-2xs transition shrink-0 flex items-center gap-1"
                          title="Docente su caso grave: clicca per forzare se necessario"
                        >
                          <Lock className="w-3 h-3" />
                          <span>♿ Caso Grave</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onAssegna(cand.docente.id, 'COMPRESENTE_CLASSE', false, false)}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition shrink-0"
                        >
                          Copri con Compresente
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEZIONE 1: RECUPERO ORE DEBITO PERMESSO STESSA CLASSE */}
          {candidati.RECUPERO_STESSA_CLASSE.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
                1. Recupero Debito Permessi (Stessa Classe)
              </span>
              {candidati.RECUPERO_STESSA_CLASSE.map((cand, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">{cand.docente.nome}</strong>
                    <span className="text-[11px] text-slate-500 block">{cand.dettagli}</span>
                  </div>
                  <button
                    onClick={() => onAssegna(cand.docente.id, 'RECUPERO_STESSA_CLASSE', false, true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    Recupera Debito (-1h)
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SEZIONE 2.1: DOCENTI LIBERATI DA GITA - STESSA CLASSE */}
          {candidati.LIBERATO_STESSA_CLASSE.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-950 block uppercase tracking-wide flex items-center gap-1.5">
                <span>⭐ 2. Liberati da Gita (Stessa Classe)</span>
              </span>
              {candidati.LIBERATO_STESSA_CLASSE.map((cand, i) => (
                <div key={'stessa_classe_' + i} className="flex items-center justify-between p-2.5 bg-amber-50/90 rounded-xl border border-amber-300 shadow-2xs">
                  <div>
                    <strong className="text-xs font-bold text-amber-950 block">{cand.docente.nome}</strong>
                    <span className="text-[11px] text-amber-900 block font-medium">{cand.dettagli}</span>
                  </div>
                  <button
                    onClick={() => onAssegna(cand.docente.id, 'LIBERATO_STESSA_CLASSE', false, false)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition shrink-0"
                  >
                    Assegna (Stessa Classe)
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SEZIONE 2.2: DOCENTI LIBERATI DA GITA - STESSA MATERIA */}
          {candidati.LIBERATO_STESSA_MATERIA.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-900 block uppercase tracking-wide flex items-center gap-1.5">
                <span>📚 2. Liberati da Gita (Stessa Materia)</span>
              </span>
              {candidati.LIBERATO_STESSA_MATERIA.map((cand, i) => (
                <div key={'stessa_materia_' + i} className="flex items-center justify-between p-2.5 bg-amber-50/90 rounded-xl border border-amber-300 shadow-2xs">
                  <div>
                    <strong className="text-xs font-bold text-amber-900 block">{cand.docente.nome}</strong>
                    <span className="text-[11px] text-amber-800 block font-medium">{cand.dettagli}</span>
                  </div>
                  <button
                    onClick={() => onAssegna(cand.docente.id, 'LIBERATO_STESSA_MATERIA', false, false)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition shrink-0"
                  >
                    Assegna Materia
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SEZIONE 2.3: DOCENTI LIBERATI DA GITA - ALTRE CLASSI */}
          {candidati.LIBERATO_ALTRA_CLASSE.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-800 block uppercase tracking-wide flex items-center gap-1.5">
                <span>🚌 2. Liberati da Gita (Altre Classi)</span>
              </span>
              {candidati.LIBERATO_ALTRA_CLASSE.map((cand, i) => (
                <div key={'altra_classe_' + i} className="flex items-center justify-between p-2.5 bg-amber-50/50 rounded-xl border border-amber-200">
                  <div>
                    <strong className="text-xs font-bold text-slate-800 block">{cand.docente.nome}</strong>
                    <span className="text-[11px] text-amber-700 block">{cand.dettagli}</span>
                  </div>
                  <button
                    onClick={() => onAssegna(cand.docente.id, 'LIBERATO_ALTRA_CLASSE', false, false)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition shrink-0"
                  >
                    Assegna Liberato
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SEZIONE 3: POTENZIAMENTO */}
          {candidati.POTENZIAMENTO.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-emerald-950 block uppercase tracking-wide flex items-center gap-1.5">
                <span>⚡ Docenti in Potenziamento (P)</span>
              </span>
              {candidati.POTENZIAMENTO.map((cand, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-emerald-50/90 rounded-xl border border-emerald-300 shadow-2xs">
                  <div>
                    <strong className="text-xs font-bold text-emerald-950 block">{cand.docente.nome}</strong>
                    <span className="text-[11px] text-emerald-800 block font-medium">{cand.dettagli}</span>
                  </div>
                  <button
                    onClick={() => onAssegna(cand.docente.id, 'POTENZIAMENTO', false, false)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-xs"
                  >
                    Assegna Potenziamento
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SEZIONE 4: RECUPERO DEBITO GENERICO */}
          {candidati.RECUPERO_GENERICO.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
                4. Recupero Debito Permessi (Altra Classe / Libero)
              </span>
              {candidati.RECUPERO_GENERICO.map((cand, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">{cand.docente.nome}</strong>
                    <span className="text-[11px] text-slate-500 block">{cand.dettagli}</span>
                  </div>
                  <button
                    onClick={() => onAssegna(cand.docente.id, 'RECUPERO_GENERICO', false, true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    Recupera Debito (-1h)
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SEZIONE 5: SOSTEGNO CON ROTAZIONE */}
          {candidati.SOSTEGNO.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
                5. Docenti di Sostegno Disponibili (Rotazione Equa)
              </span>
              {candidati.SOSTEGNO.map((cand, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">{cand.docente.nome}</strong>
                    <span className="text-[11px] text-slate-500 block">{cand.dettagli}</span>
                  </div>
                  <button
                    onClick={() => onAssegna(cand.docente.id, 'SOSTEGNO', false, false)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    Assegna Sostegno
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SEZIONE 6: STRAORDINARIO DISPOSIZIONE (D) */}
          {candidati.STRAORDINARIO_D.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
                6. Docenti in Disposizione (D) - Ore a Pagamento
              </span>
              {candidati.STRAORDINARIO_D.map((cand, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">{cand.docente.nome}</strong>
                    <span className="text-[11px] text-slate-500 block">{cand.dettagli}</span>
                  </div>
                  <button
                    onClick={() => onAssegna(cand.docente.id, 'STRAORDINARIO_D', true, false)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    Assegna Disposizione (D)
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SEZIONE 7: SCELTA MANUALE UNIFICATA CON AUTOCOMPLETAMENTO E SUGGERIMENTI */}
          {/* ========================================================================= */}
          <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <span>📋 Scelta Manuale (Tutti i Docenti)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {docentiUnici.length} docenti in organico
              </span>
            </div>

            {/* CASELLA UNICA DIGITABILE CON SUGGERIMENTI INTERATTIVI */}
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={ricercaManuale}
                    onChange={(e) => {
                      setRicercaManuale(e.target.value);
                      setIsDropdownOpen(true);
                      // Se l'utente digita, resetta l'id finché non sceglie
                      const matchEsatto = docentiUnici.find(d => 
                        d.nome.toLowerCase() === e.target.value.toLowerCase() ||
                        `${d.nome} (${d.materie.join(', ')})`.toLowerCase() === e.target.value.toLowerCase()
                      );
                      setDocenteManualeSelezionatoId(matchEsatto ? matchEsatto.id : '');
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Digita nome docente o materia (es. Rossi, Matematica, Lettere)..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none shadow-xs"
                  />
                  {ricercaManuale && (
                    <button
                      type="button"
                      onClick={() => {
                        setRicercaManuale('');
                        setDocenteManualeSelezionatoId('');
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  disabled={!docenteManualeSelezionatoId}
                  onClick={() => {
                    if (!docenteManualeSelezionatoId) return;

                    const collegatiIds = getDocentiCollegatiIds(docenteManualeSelezionatoId, docenti);
                    const docSel = docenti.find(d => d.id === docenteManualeSelezionatoId);
                    const nomeDocSel = docSel ? getBaseNomeDocente(docSel.nome) : 'Il docente';

                    // 1. Controllo se il docente è assente in questa giornata/ora
                    const assenzaDoc = assenze.find(a => 
                      a.data === selectedDate && 
                      !a.annullata && 
                      collegatiIds.includes(a.docenteId) && 
                      a.oreInteressate.includes(oraScoperta.ora)
                    );

                    // 2. Controllo se il docente è già stato assegnato a un'altra classe nella stessa ora
                    const sostituzioneEsistente = sostituzioni.find(s => 
                      s.data === selectedDate && 
                      s.ora === oraScoperta.ora && 
                      s.categoria !== 'NON_SOSTITUIRE' && 
                      collegatiIds.includes(s.docenteSostitutoId) &&
                      !(s.classe === oraScoperta.classe && s.docenteAssenteId === oraScoperta.docenteAssente.id)
                    );

                    // 3. Controllo se il docente è già impegnato in orario curricolare in un'altra classe
                    const orarioUnificato = getOrarioUnificatoDocente(docenteManualeSelezionatoId, docenti, orariDocenti);
                    const cellaCurricolare = orarioUnificato.find(c => 
                      c.giorno === selectedGiorno && 
                      c.ora === oraScoperta.ora && 
                      c.valore !== '' && 
                      c.valore !== 'D' && 
                      c.valore !== 'P'
                    );

                    const motiviConflitto: string[] = [];

                    if (assenzaDoc) {
                      motiviConflitto.push(`🔴 È SEGNATO COME ASSENTE (${assenzaDoc.motivo}) alla ${oraScoperta.ora}ª ora.`);
                    }

                    if (sostituzioneEsistente) {
                      motiviConflitto.push(`⚠️ È GIÀ STATO ASSEGNATO COME SOSTITUTO in classe ${sostituzioneEsistente.classe} alla ${oraScoperta.ora}ª ora.`);
                    }

                    if (cellaCurricolare) {
                      motiviConflitto.push(`📚 Ha già lezione curricolare in classe ${cellaCurricolare.valore} alla ${oraScoperta.ora}ª ora.`);
                    }

                    if (motiviConflitto.length > 0) {
                      const messaggio = `ATTENZIONE: Conflitto per ${nomeDocSel} alla ${oraScoperta.ora}ª ora:\n\n` + 
                        motiviConflitto.join('\n') + 
                        `\n\nVuoi procedere comunque e forzare l'assegnazione?`;

                      if (!window.confirm(messaggio)) {
                        return;
                      }
                    }

                    onAssegna(docenteManualeSelezionatoId, 'STRAORDINARIO_D', false, false);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition shadow-xs flex items-center justify-center gap-1 ${
                    docenteManualeSelezionatoId
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>Assegna Scelto</span>
                </button>
              </div>

              {/* LISTA SUGGERIMENTI AUTOCOMPLETAMENTO (ESPANDIBILE INTEGRATA) */}
              {isDropdownOpen && (
                <div className="mt-2 bg-white rounded-xl shadow-lg border border-slate-300 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                  <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                    <span>Docenti trovati ({docentiFiltrati.length})</span>
                    <button 
                      type="button" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      Chiudi elenco ✕
                    </button>
                  </div>
                  {docentiFiltrati.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 font-medium">
                      Nessun docente trovato con "{ricercaManuale}"
                    </div>
                  ) : (
                    docentiFiltrati.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setDocenteManualeSelezionatoId(d.id);
                          setRicercaManuale(`${d.nome} (${d.materie.join(', ')})`);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-indigo-50 transition flex items-center justify-between gap-2 cursor-pointer ${
                          docenteManualeSelezionatoId === d.id ? 'bg-indigo-50 font-black text-indigo-900 ring-1 ring-inset ring-indigo-200' : 'text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{d.nome}</span>
                          <span className="text-[11px] text-slate-400 font-normal">({d.materie.join(', ')})</span>
                        </div>
                        <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          Seleziona ➔
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

