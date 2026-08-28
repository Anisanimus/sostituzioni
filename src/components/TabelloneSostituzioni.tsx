import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { OraScoperta, SostituzioneAssegnata, CandidatoSostituto, CategoriaSostituto } from '../types';
import { trovaCandidatiSostituzione } from '../utils/substitutionEngine';
import { 
  Users, AlertCircle, CheckCircle, Clock, ArrowRight, UserPlus, 
  HelpCircle, Trash2, Bus, ShieldAlert, Sparkles, Filter, ChevronRight, ChevronLeft, ChevronDown,
  Printer, LayoutGrid, List, MessageSquare, AlertTriangle, Accessibility, Lock,
  UserCheck, UserX, UserMinus
} from 'lucide-react';
import { getBaseNomeDocente, getDocentiCollegatiIds, formatDataItaliana, getDocentiUnici, DocenteUnico } from '../utils/docentiHelper';

export const TabelloneSostituzioni: React.FC<{ 
  selectedDate: string; 
  selectedGiorno: any;
  onChangeDate?: (newDate: string) => void;
}> = ({ selectedDate, selectedGiorno, onChangeDate }) => {
  const { 
    docenti, orariDocenti, assenze, uscite, sostituzioni, 
    impostazioniPriorita, assegnaSostituzione, rimuoviSostituzione, 
    pubblicaTutteSostituzioniData, pubblicaSingolaSostituzione,
    rimuoviSingolaOraAssenza
  } = useApp();

  const [selectedOraScoperta, setSelectedOraScoperta] = useState<OraScoperta | null>(null);
  // Due modalità di visualizzazione: A blocchi orari, Per Docente Assente
  const [visualizzazione, setVisualizzazione] = useState<'GRUPPI_ORA' | 'PER_DOCENTE'>('GRUPPI_ORA');
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

  // Funzione "Assegna Tutto" in base alla priorità normativa (1 -> 7) ESCLUDENDO I CASI GRAVI
  const handleAutoAssegnaTutto = () => {
    let sostituzioniCorrenti = [...sostituzioniOggi];

    oreScoperte.forEach(os => {
      const giaAssegnata = sostituzioniCorrenti.some(s => s.ora === os.ora && s.classe === os.classe);
      if (giaAssegnata) return;

      const cand = trovaCandidatiSostituzione(
        selectedDate,
        os.ora,
        selectedGiorno,
        os.classe,
        os.docenteAssente,
        os.isUscita || false,
        orariDocenti,
        docenti,
        assenze,
        uscite,
        sostituzioniCorrenti
      );

      const ciSonoGiteOggi = usciteOggi.length > 0 || os.isUscita;
      const categorieOrdinate: CategoriaSostituto[] = ciSonoGiteOggi
        ? (impostazioniPriorita?.prioritaGite || ['COMPRESENTE_CLASSE', 'LIBERATO_STESSA_CLASSE', 'LIBERATO_STESSA_MATERIA', 'LIBERATO_ALTRA_CLASSE', 'RECUPERO_STESSA_CLASSE', 'POTENZIAMENTO', 'SOSTEGNO', 'STRAORDINARIO_D'])
        : (impostazioniPriorita?.prioritaAssenze || ['COMPRESENTE_CLASSE', 'RECUPERO_STESSA_CLASSE', 'POTENZIAMENTO', 'SOSTEGNO', 'RECUPERO_GENERICO', 'STRAORDINARIO_D']);

      for (const cat of categorieOrdinate) {
        const lista = cand[cat];
        if (lista && lista.length > 0) {
          // Filtra rigorosamente solo candidati NON su Caso Grave
          const candidatiValidi = lista.filter(c => !c.isCasoGrave && !c.docente.isCasoGraveSostegno && !(c.docente as any).casoGraveSostegno);
          if (candidatiValidi.length === 0) continue;

          const primo = candidatiValidi[0];

          const nuovaSost: SostituzioneAssegnata = {
            id: 'sost_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            data: selectedDate,
            giorno: selectedGiorno,
            ora: os.ora,
            classe: os.classe,
            docenteAssenteId: os.docenteAssente.id,
            docenteSostitutoId: primo.docente.id,
            categoria: cat,
            isStraordinario: cat === 'STRAORDINARIO_D',
            consumaDebito: cat === 'RECUPERO_STESSA_CLASSE' || cat === 'RECUPERO_GENERICO',
            pubblicata: false,
            firmata: false
          };
          
          sostituzioniCorrenti = [...sostituzioniCorrenti, nuovaSost];
          assegnaSostituzione(nuovaSost);
          break; // Passa alla prossima ora scoperta
        }
      }
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
  const oreRaggruppate = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(oraNum => {
    const items = oreScoperte
      .filter(os => os.ora === oraNum)
      .sort((a, b) => {
        const pA = getStatoPriorita(a);
        const pB = getStatoPriorita(b);
        if (pA !== pB) return pA - pB;
        return a.classe.localeCompare(b.classe);
      });

    return {
      ora: oraNum,
      items
    };
  }).filter(g => g.items.length > 0);

  // 2. Raggruppamento per Docente Assente con ordinamento dinamico interno
  const docentiAssentiRaggruppati = Array.from(
    new Set(oreScoperte.map(os => getBaseNomeDocente(os.docenteAssente.nome)))
  ).map(nomeDocente => {
    const items = oreScoperte
      .filter(os => getBaseNomeDocente(os.docenteAssente.nome) === nomeDocente)
      .sort((a, b) => {
        const pA = getStatoPriorita(a);
        const pB = getStatoPriorita(b);
        if (pA !== pB) return pA - pB;
        return a.ora - b.ora;
      });

    const docAssente = items[0].docenteAssente;
    const totOreDoc = items.length;
    const sostsDoc = items.map(os => getSostituzione(os.ora, os.classe)).filter(Boolean);
    const totCoperteDoc = sostsDoc.length;
    const totPubblicateDoc = sostsDoc.filter(s => s?.pubblicata).length;
    const totFirmateDoc = sostsDoc.filter(s => s?.firmata).length;
    const totDaFareDoc = Math.max(0, totOreDoc - totCoperteDoc);

    return {
      nomeDocente,
      docAssente,
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
  const personeUniche = getDocentiUnici(docenti);
  const oreGiornoList = [1, 2, 3, 4, 5, 6, 7, 8];

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
      // B) Potenziamento (P) - RIGOROSAMENTE SE LA CELLA È 'P' O 'POTENZIAMENTO'
      else if (cellaVal === 'P' || cellaVal === 'POT' || cellaVal.startsWith('POTENZ')) {
        potenziamentoList.push({
          nome: getBaseNomeDocente(persona.nome),
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
      {/* ============================================================================== */}
      {/* AREA A 2 COLONNE: TABELLONE IN PRIMO PIANO A SINISTRA (8/12) + RISORSE (4/12)   */}
      {/* ============================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">

        {/* DA MOBILE: BARRA ACCORDION RISORSE DISPONIBILI ATTACCATA SENZA SPAZIO ALLA CARD SOPRA */}
        {risorsePerOra.length > 0 && (
          <div className="block lg:hidden col-span-1 bg-white rounded-b-2xl rounded-t-none p-2.5 sm:p-3 shadow-2xs border border-t-0 border-slate-200 mb-3">
            <div>
              <button
                type="button"
                onClick={() => setMostraRisorseMobile(prev => !prev)}
                className="w-full flex items-center justify-between cursor-pointer font-bold text-xs text-slate-800 text-left"
              >
                <span id="targetSpecchiettoRisorseMobile" className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                    ⚡
                  </span>
                  <span>Risorse Disponibili Oggi ({risorsePerOra.reduce((acc, r) => acc + r.totDisponibili, 0)})</span>
                </span>
                <div className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600">
                  <span className="text-[10px] text-slate-400 font-normal">
                    {mostraRisorseMobile ? 'Nascondi dettagli' : 'Tocca per dettagli'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${mostraRisorseMobile ? 'rotate-180 text-slate-600' : ''}`} />
                </div>
              </button>

              {mostraRisorseMobile && (
                <div className="pt-3 mt-2 border-t border-slate-100 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* FILTRI IN ACCORDION MOBILE */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                  <button
                    type="button"
                    disabled={totPotenziamentoOggi === 0}
                    onClick={() => handleFiltroRisorseClick('POTENZIAMENTO')}
                    className={`px-2.5 py-1 rounded-full border transition flex items-center gap-1 ${
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
                    className={`px-2.5 py-1 rounded-full border transition flex items-center gap-1 ${
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
                    className={`px-2.5 py-1 rounded-full border transition flex items-center gap-1 ${
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

                  {/* LISTA RISORSE PER ORA (ACCORDION PER ORA) */}
                  <div className="space-y-2">
                    {risorsePerOra.map(r => {
                      const potVisibili = mostraPotenziamento ? (mostraGiaUsati ? r.potenziamentoList : r.potenziamentoList.filter(p => !p.usata)) : [];
                      const giteVisibili = mostraLiberatiGita ? (mostraGiaUsati ? r.liberatiGitaList : r.liberatiGitaList.filter(g => !g.usata)) : [];
                      const dispVisibili = (mostraDisposizioni ? r.disposizioniList : r.disposizioniList.filter(d => d.debito > 0))
                        .filter(d => mostraGiaUsati ? true : !d.usata);
                      const totFiltrati = potVisibili.length + giteVisibili.length + dispVisibili.length;
                      if (totFiltrati === 0) return null;

                      const isOraRisorsaChiusa = oreRisorseChiuse.includes(r.ora);

                      return (
                        <div key={r.ora} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
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
              )}
            </div>
          </div>
        )}

        {/* COLONNA TABELLONE PRINCIPALE (LG: 8/12) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
          
          {/* HEADER UNIFICATO TABELLONE: TUTTO SU UNA SOLA RIGA SIA SU MOBILE CHE SU DESKTOP */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 border-b border-slate-100 pb-3 flex-wrap sm:flex-nowrap">
            
            {/* SELETTORE VISTE (A BLOCCHI / PER DOCENTE) */}
            <div id="targetSelettoreViste" className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs border border-slate-200 shadow-2xs shrink-0">
              <button
                onClick={() => setVisualizzazione('GRUPPI_ORA')}
                className={`px-2 py-1 sm:px-2.5 rounded-lg font-bold flex items-center gap-1 transition ${
                  visualizzazione === 'GRUPPI_ORA' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="A blocchi orari"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> 
                <span className="hidden md:inline">A blocchi</span>
              </button>

              <button
                onClick={() => setVisualizzazione('PER_DOCENTE')}
                className={`px-2 py-1 sm:px-2.5 rounded-lg font-bold flex items-center gap-1 transition ${
                  visualizzazione === 'PER_DOCENTE' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Per Docente Assente"
              >
                <UserMinus className="w-3.5 h-3.5 text-indigo-600" /> 
                <span className="hidden md:inline">Per Docente</span>
              </button>
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
                onClick={() => pubblicaTutteSostituzioniData(selectedDate)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-xs transition whitespace-nowrap"
                title="Pubblica per le firme"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="sm:hidden">Pubblica</span>
                <span className="hidden sm:inline">Pubblica Firme</span>
              </button>
            </div>
          </div>

      {oreScoperte.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-xl border border-dashed border-slate-300">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-base">Tutte le classi sono coperte!</h4>
          <p className="text-xs text-slate-500 mt-0.5">Non ci sono ore scoperte per {selectedGiorno} {formatDataItaliana(selectedDate)}.</p>
        </div>
      ) : visualizzazione === 'GRUPPI_ORA' ? (
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
                    <span className="bg-slate-900 text-white font-black text-xs px-2 py-0.5 rounded shadow-2xs">
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

                                    {/* TRACKING STATO PRESA VISIONE */}
                                    <div className="mt-1 flex items-center gap-1.5">
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
                                            pubblicaSingolaSostituzione(sost.id);
                                          }}
                                          className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px] px-2 py-0.5 rounded-md transition shadow-2xs cursor-pointer"
                                          title="Invia la richiesta di firma per presa visione a questo singolo docente"
                                        >
                                          <span>✉️ Invia per Firma</span>
                                        </button>
                                      )}
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

            return (
              <div key={gIdx} className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
                {/* Intestazione del Docente Assente come Accordion Button */}
                <button
                  type="button"
                  onClick={() => {
                    setDocentiAperti(prev => 
                      prev.includes(gruppoDoc.docAssente.id)
                        ? prev.filter(id => id !== gruppoDoc.docAssente.id)
                        : [...prev, gruppoDoc.docAssente.id]
                    );
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                      {gruppoDoc.nomeDocente.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-black tracking-wide">{gruppoDoc.nomeDocente}</strong>
                        <span className="text-xs text-indigo-300 font-semibold">({gruppoDoc.docAssente.materia})</span>
                        {gruppoDoc.docAssente.isCasoGraveSostegno && (
                          <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                            ♿ GRAVE
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-300 block">
                        Tipologia assenza: {gruppoDoc.items[0]?.motivo}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* 1. ORE COPERTE CON ICONA OROLOGIO */}
                    <span className={`text-xs font-black px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1 ${
                      gruppoDoc.totCoperteDoc === gruppoDoc.totOreDoc 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-amber-500 text-white'
                    }`} title="Ore coperte per questo docente">
                      <span>🕒 {gruppoDoc.totCoperteDoc}/{gruppoDoc.totOreDoc}</span>
                      {gruppoDoc.totCoperteDoc === gruppoDoc.totOreDoc && <span>✓</span>}
                    </span>

                    {/* 3. INVIATE */}
                    {gruppoDoc.totCoperteDoc > 0 && (
                      <span className={`text-xs font-black px-2 py-1 rounded-xl border shadow-2xs flex items-center gap-1 transition ${
                        gruppoDoc.totPubblicateDoc === gruppoDoc.totCoperteDoc
                          ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'
                          : 'bg-sky-900/80 text-sky-100 border-sky-700'
                      }`} title="Richieste inviate ai docenti">
                        <span>📤 {gruppoDoc.totPubblicateDoc}/{gruppoDoc.totCoperteDoc}</span>
                        {gruppoDoc.totPubblicateDoc === gruppoDoc.totCoperteDoc && <span>✓</span>}
                      </span>
                    )}

                    {/* 4. PRESE VISIONE (FIRME) */}
                    {gruppoDoc.totCoperteDoc > 0 && (
                      <span className={`text-xs font-black px-2 py-1 rounded-xl shadow-2xs flex items-center gap-1 transition ${
                        gruppoDoc.totFirmateDoc === gruppoDoc.totCoperteDoc
                          ? 'bg-emerald-500 text-white border border-emerald-400'
                          : gruppoDoc.totFirmateDoc > 0
                            ? 'bg-indigo-900/80 text-indigo-100 border border-indigo-700'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`} title="Prese visione (firme) effettuate dai docenti">
                        <span>✍️ {gruppoDoc.totFirmateDoc}/{gruppoDoc.totCoperteDoc}</span>
                        <span className="hidden sm:inline font-normal text-[10px]">firmate</span>
                        {gruppoDoc.totFirmateDoc === gruppoDoc.totCoperteDoc && <span>✓</span>}
                      </span>
                    )}

                    <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${isAperto ? 'rotate-180 text-white' : ''}`} />
                  </div>
                </button>

                {/* Elenco delle ore del docente sotto l'intestazione */}
                {isAperto && (
                  <div className="divide-y divide-slate-100 p-2 sm:p-3 bg-slate-50/40 space-y-1.5 animate-in fade-in duration-150">
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
                        <span className="bg-slate-900 text-white font-black text-xs px-2.5 py-1.5 rounded-lg shrink-0 shadow-2xs">
                          {os.ora}ª ORA
                        </span>
                        
                        <div className={`w-11 h-9 rounded-lg flex items-center justify-center font-black text-sm border shadow-2xs shrink-0 ${
                          sosts.length > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}>
                          {os.classe}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-800">Classe {os.classe}</span>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              {os.docenteAssente.materia}
                            </span>
                            {isGraveSostegno && (
                              <span className="bg-rose-600 text-white font-black px-1.5 py-0.2 rounded text-[9px] flex items-center gap-0.5">
                                <span>♿</span> GRAVE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            Fascia oraria regolare da orario docente
                          </span>
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

                                    {/* TRACKING STATO PRESA VISIONE */}
                                    <div className="mt-1 flex items-center gap-1.5">
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
                                            pubblicaSingolaSostituzione(sost.id);
                                          }}
                                          className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10px] px-2 py-0.5 rounded-md transition shadow-2xs cursor-pointer"
                                          title="Invia la richiesta di firma per presa visione a questo singolo docente"
                                        >
                                          <span>✉️ Invia per Firma</span>
                                        </button>
                                      )}
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
      )}

        </div>

        {/* COLONNA LATERALE: SPECCHIETTO RISORSE DISPONIBILI (LG: 4/12) VISIBILE SOLO SU DESKTOP / TABLET >= LG */}
        {risorsePerOra.length > 0 && (
          <div className="hidden lg:block lg:col-span-4 space-y-3">
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
  const { docenti, orariDocenti, assenze, uscite, sostituzioni } = useApp();

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
    sostituzioni
  );

  const [ricercaManuale, setRicercaManuale] = useState<string>('');
  const [docenteManualeSelezionatoId, setDocenteManualeSelezionatoId] = useState<string>('');

  const docentiUnici = getDocentiUnici(docenti);
  const docentiFiltrati = docentiUnici.filter(d => 
    d.nome.toLowerCase().includes(ricercaManuale.toLowerCase()) ||
    d.materie.some(m => m.toLowerCase().includes(ricercaManuale.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER MODALE */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
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
        <div className="p-4 overflow-y-auto space-y-4 text-xs">

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
          {/* SEZIONE 7: SCELTA MANUALE DA ELENCO COMPLETO DOCENTI (CON MATERIE TRA PARENTESI) */}
          {/* ========================================================================= */}
          <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <span>📋 Scelta Manuale (Tutti i Docenti)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {docentiFiltrati.length} docenti disponibili
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={docenteManualeSelezionatoId}
                  onChange={(e) => setDocenteManualeSelezionatoId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Seleziona un docente dall'elenco --</option>
                  {docentiFiltrati.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nome} ({d.materie.join(', ')})
                    </option>
                  ))}
                </select>

                <button
                  disabled={!docenteManualeSelezionatoId}
                  onClick={() => {
                    if (docenteManualeSelezionatoId) {
                      onAssegna(docenteManualeSelezionatoId, 'STRAORDINARIO_D', false, false);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-bold text-xs shrink-0 transition shadow-xs flex items-center justify-center gap-1 ${
                    docenteManualeSelezionatoId
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>Assegna Scelto</span>
                </button>
              </div>

              <input
                type="text"
                value={ricercaManuale}
                onChange={(e) => setRicercaManuale(e.target.value)}
                placeholder="Filtra docente o materia (es. Matematica, Lettere)..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
