import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Lock, CheckCircle2, Clock, 
  Search, Filter, Printer, KeyRound, ShieldAlert,
  ChevronLeft, ChevronRight, User, AlertCircle,
  FileDown, X, CheckSquare, Square, Download, Check,
  ChevronsUpDown, ChevronDown
} from 'lucide-react';
import { getBaseNomeDocente, formatDataItaliana, getOrarioUnificatoDocente, getDocentiCollegatiIds, getStileCardAssenza, getEducatoriInClasseNellOra } from '../utils/docentiHelper';

interface QuadroSostituzioniScuolaProps {
  initialDate?: string;
  isEmbedInVicepresidenza?: boolean;
}

export const QuadroSostituzioniScuola: React.FC<QuadroSostituzioniScuolaProps> = ({ 
  initialDate,
  isEmbedInVicepresidenza = false 
}) => {
  const { 
    docenti, orariDocenti, assenze, uscite, sostituzioni, impostazioniScuola, nomineSupplenti 
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);

  // STATO AUTENTICAZIONE (Se non è invocato dalla Vicepresidenza, richiede il PIN ATA o PIN Docente)
  const [isAutenticato, setIsAutenticato] = useState<boolean>(isEmbedInVicepresidenza);
  const [pinInserito, setPinInserito] = useState<string>('');
  const [errorePin, setErrorePin] = useState<boolean>(false);

  // FILTRI
  const [filtroClasse, setFiltroClasse] = useState<string>('');
  const [filtroOra, setFiltroOra] = useState<string>('TUTTE');
  const [ricercaDocente, setRicercaDocente] = useState<string>('');
  const [mostraFiltroDocente, setMostraFiltroDocente] = useState<boolean>(false);

  // MODALE DOWNLOAD / STAMPA PDF PROSPETTO
  const [mostraModalePdf, setMostraModalePdf] = useState<boolean>(false);
  const [modalitaSelezioneClassiPdf, setModalitaSelezioneClassiPdf] = useState<'TUTTE' | 'PERSONALIZZATA'>('TUTTE');
  const [classiSelezionatePdf, setClassiSelezionatePdf] = useState<string[]>([]);

  const pinAtaValido = impostazioniScuola?.pinPersonaleAta || '1234';

  const handleLoginPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInserito.trim() === pinAtaValido.trim()) {
      setIsAutenticato(true);
      setErrorePin(false);
    } else {
      setErrorePin(true);
    }
  };

  const cambiaGiorno = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getGiornoFromDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const map = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return map[day] || 'Lunedì';
  };

  const giornoSettimana = getGiornoFromDate(selectedDate);

  // Calcolo sostituzioni e ore scoperte del giorno selezionato
  const assenzeOggi = useMemo(() => 
    assenze.filter(a => a.data === selectedDate && !a.annullata),
    [assenze, selectedDate]
  );

  const usciteOggi = useMemo(() => 
    uscite.filter(u => u.data === selectedDate && !u.annullata),
    [uscite, selectedDate]
  );

  const sostituzioniOggi = useMemo(() => 
    sostituzioni.filter(s => s.data === selectedDate),
    [sostituzioni, selectedDate]
  );

  // Costruisce la lista completa delle ore scoperte e dei relativi sostituti
  const righeQuadro = useMemo(() => {
    const items: Array<{
      ora: number;
      classe: string;
      docenteAssente: string;
      materia: string;
      motivo: string;
      isUscita: boolean;
      sostituti: Array<{
        id: string;
        nomeSostituto: string;
        categoria: string;
        firmata: boolean;
        pubblicata: boolean;
      }>;
      nonSostituita: boolean;
    }> = [];

    // 1. Assenze ordinarie & Accompagnatori Uscite
    assenzeOggi.forEach(assenza => {
      const collegatiIds = getDocentiCollegatiIds(assenza.docenteId, docenti);
      const profiliPersona = docenti.filter(d => collegatiIds.includes(d.id));
      const doc = docenti.find(d => d.id === assenza.docenteId);
      const nomeAssente = doc ? getBaseNomeDocente(doc.nome) : 'Docente';

      profiliPersona.forEach(prof => {
        const orarioDoc = orariDocenti.find(o => o.docenteId === prof.id);
        if (!orarioDoc) return;

        assenza.oreInteressate.forEach(ora => {
          const cella = orarioDoc.ore.find(c => c.giorno === giornoSettimana && c.ora === ora);
          const val = cella ? cella.valore.trim().toUpperCase() : '';

          if (val && val !== 'D' && val !== 'P') {
            // Se la classe stessa è in gita/uscita in quell'ora, NON genera un'ora scoperta
            const classeInUscita = usciteOggi.some(u => {
              const classiList = u.classi || [(u as any).classe];
              return classiList.map(c => c.toUpperCase().trim()).includes(val) && u.ore.includes(ora);
            });

            if (!classeInUscita) {
              // Evita duplicati
              const giaInserita = items.some(it => 
                it.ora === ora && 
                it.classe === val && 
                it.docenteAssente === nomeAssente
              );

              if (!giaInserita) {
                let materiaOra = prof.materia;
                if (prof.isAlternativa || prof.nome.toUpperCase().includes('ALTERNATIVA')) {
                  materiaOra = 'ALTERNATIVA';
                } else if (prof.isPotenziamento || prof.nome.toUpperCase().includes('POTENZIAMENTO')) {
                  materiaOra = 'POTENZIAMENTO';
                } else if (prof.isSostegno || prof.nome.toUpperCase().includes('SOSTEGNO')) {
                  materiaOra = 'SOSTEGNO';
                }

                const sosts = sostituzioniOggi.filter(s => 
                  s.ora === ora && 
                  s.classe === val &&
                  (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === assenza.docenteId)
                );
                const nonSost = sosts.some(s => s.categoria === 'NON_SOSTITUIRE');

                items.push({
                  ora,
                  classe: val,
                  docenteAssente: nomeAssente,
                  materia: materiaOra,
                  motivo: assenza.motivo,
                  isUscita: assenza.motivo === 'Uscita',
                  nonSostituita: nonSost,
                  sostituti: sosts
                    .filter(s => s.categoria !== 'NON_SOSTITUIRE')
                    .map(s => {
                      const docSost = docenti.find(d => d.id === s.docenteSostitutoId);
                      return {
                        id: s.id,
                        nomeSostituto: docSost ? getBaseNomeDocente(docSost.nome) : 'Docente Sostituto',
                        categoria: s.categoria.replace(/_/g, ' '),
                        firmata: !!s.firmata,
                        pubblicata: !!s.pubblicata
                      };
                    })
                });
              }
            }
          }
        });
      });
    });

    // Ordinamento cronologico per Ora e poi per Classe
    return items.sort((a, b) => a.ora - b.ora || a.classe.localeCompare(b.classe));
  }, [assenzeOggi, usciteOggi, sostituzioniOggi, docenti, orariDocenti, giornoSettimana]);

  // Lista classi uniche per il selettore filtro
  const classiUniche = useMemo(() => {
    const setC = new Set<string>();
    righeQuadro.forEach(r => setC.add(r.classe));
    return Array.from(setC).sort();
  }, [righeQuadro]);

  // Applicazione filtri utente
  const righeFiltrate = useMemo(() => {
    return righeQuadro.filter(r => {
      if (filtroOra !== 'TUTTE' && r.ora !== Number(filtroOra)) return false;
      if (filtroClasse !== '' && r.classe !== filtroClasse) return false;
      if (ricercaDocente.trim() !== '') {
        const query = ricercaDocente.toLowerCase();
        const matchAssente = r.docenteAssente.toLowerCase().includes(query);
        const matchSostituto = r.sostituti.some(s => s.nomeSostituto.toLowerCase().includes(query));
        if (!matchAssente && !matchSostituto) return false;
      }
      return true;
    });
  }, [righeQuadro, filtroOra, filtroClasse, ricercaDocente]);

  // Due modalità di visualizzazione: Per Ora / Per Docente (con default da impostazioniScuola)
  const [visualizzazione, setVisualizzazione] = useState<'PER_ORA' | 'PER_DOCENTE'>(() => 
    impostazioniScuola?.vistaTabellonePredefinita === 'PER_DOCENTE' ? 'PER_DOCENTE' : 'PER_ORA'
  );

  // Set per gestire gli accordion aperti. Di default vuoti = TUTTO CHIUSO
  const [oreAperte, setOreAperte] = useState<number[]>([]);
  const [docentiAperti, setDocentiAperti] = useState<string[]>([]);

  // Raggruppamento 1: per ORA (senza colonne inutili)
  const gruppiPerOra = useMemo(() => {
    const map = new Map<number, typeof righeFiltrate>();
    righeFiltrate.forEach(r => {
      if (!map.has(r.ora)) map.set(r.ora, []);
      map.get(r.ora)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [righeFiltrate]);

  // Raggruppamento 2: per DOCENTE ASSENTE
  const gruppiPerDocente = useMemo(() => {
    const map = new Map<string, typeof righeFiltrate>();
    righeFiltrate.forEach(r => {
      if (!map.has(r.docenteAssente)) map.set(r.docenteAssente, []);
      map.get(r.docenteAssente)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [righeFiltrate]);

  // STATISTICHE IN SINTESI
  const totOreScoperte = righeQuadro.length;
  const totCoperte = righeQuadro.filter(r => r.sostituti.length > 0).length;
  const totScoperteNonCoperte = righeQuadro.filter(r => r.sostituti.length === 0 && !r.nonSostituita).length;

  // STATO FILTRI SU MOBILE (Accordion chiuso di default con icona filtro e badge filtri attivi)
  const [mostraFiltriMobile, setMostraFiltriMobile] = useState<boolean>(false);
  const filtriAttiviCount = (filtroOra !== 'TUTTE' ? 1 : 0) + (filtroClasse !== '' ? 1 : 0) + (ricercaDocente.trim() !== '' ? 1 : 0);

  // SE NON ANCORA AUTENTICATO: FORM DI LOGIN PIN ATA / SEGRETERIA
  if (!isAutenticato) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center space-y-5">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <KeyRound className="w-8 h-8 text-amber-400" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900">Quadro Giornaliero Sostituzioni</h2>
            <p className="text-xs text-slate-500 mt-1">
              Area riservata al <strong>Personale ATA</strong>, <strong>Segreteria</strong> e <strong>Docenti</strong>.
            </p>
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-left flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-normal">
              Questa sezione contiene dati organizzativi del personale. Inserisci il <strong>PIN di Sicurezza</strong> della scuola per procedere.
            </p>
          </div>

          <form onSubmit={handleLoginPin} className="space-y-3">
            <div>
              <input
                type="password"
                value={pinInserito}
                onChange={(e) => setPinInserito(e.target.value)}
                placeholder="Inserisci PIN (es. 1234)"
                className="w-full text-center text-lg font-mono font-black tracking-widest bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 outline-none focus:border-indigo-600 focus:bg-white transition"
                autoFocus
              />
              {errorePin && (
                <p className="text-xs font-bold text-rose-600 mt-1.5 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>PIN errato. Riprova.</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3 rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Accedi al Quadro Sostituzioni</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // SCHERMATA QUADRO GIORNALIERO (AUTENTICATO)
  return (
    <div className="space-y-3 sm:space-y-4 max-w-6xl mx-auto">
      {/* HEADER DELLA PAGINA CON NAVIGAZIONE DATA, SWITCH VISTA E STAMPA */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase px-2 py-0.5 rounded-md border border-indigo-100">
              {impostazioniScuola?.nomeScuola || 'Istituto Scolastico'}
            </span>
            <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-100">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Area Protetta
            </span>
          </div>
          <h2 className="text-base sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <span>📋 Prospetto Giornaliero Sostituzioni</span>
          </h2>
        </div>

        {/* CONTROLLI DATA & PULSANTE STAMPA */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {/* SELETTORE VISTA: PER ORA VS PER DOCENTE + TASTO ESPANDI/COMPRIMI */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setVisualizzazione('PER_ORA')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  visualizzazione === 'PER_ORA'
                    ? 'bg-white text-indigo-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Per Ora</span>
              </button>

              <button
                type="button"
                onClick={() => setVisualizzazione('PER_DOCENTE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  visualizzazione === 'PER_DOCENTE'
                    ? 'bg-white text-indigo-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Per Docente</span>
              </button>
            </div>

            {/* PULSANTE DISCRETO SOLO ICONA ESPANDI / COMPRIMI TUTTO */}
            {righeFiltrate.length > 0 && (
              (() => {
                const isTuttoAperto = visualizzazione === 'PER_ORA'
                  ? oreAperte.length === gruppiPerOra.length && gruppiPerOra.length > 0
                  : docentiAperti.length === gruppiPerDocente.length && gruppiPerDocente.length > 0;

                const handleToggleTutto = () => {
                  if (visualizzazione === 'PER_ORA') {
                    if (isTuttoAperto) {
                      setOreAperte([]);
                    } else {
                      setOreAperte(gruppiPerOra.map(([oraNum]) => oraNum));
                    }
                  } else {
                    if (isTuttoAperto) {
                      setDocentiAperti([]);
                    } else {
                      setDocentiAperti(gruppiPerDocente.map(([nomeDoc]) => nomeDoc));
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

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => cambiaGiorno(-1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Giorno Precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-2.5 text-center min-w-[105px]">
              <span className="block text-xs font-black text-slate-900">{giornoSettimana}</span>
              <span className="text-[10px] text-slate-500 font-mono">{formatDataItaliana(selectedDate)}</span>
            </div>

            <button
              type="button"
              onClick={() => cambiaGiorno(1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Giorno Successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
            >
              Oggi
            </button>

            {/* PULSANTE FILTRO RICERCA DOCENTE (ICON-ONLY DISCRETO) */}
            <button
              type="button"
              onClick={() => {
                setMostraFiltroDocente(!mostraFiltroDocente);
                if (mostraFiltroDocente) setRicercaDocente('');
              }}
              className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                mostraFiltroDocente || ricercaDocente
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-200 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Filtra per Docente"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setClassiSelezionatePdf(classiUniche);
                setModalitaSelezioneClassiPdf('TUTTE');
                setMostraModalePdf(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Scarica o stampa prospetto in formato PDF"
            >
              <FileDown className="w-4 h-4" />
              <span>Scarica / Stampa PDF</span>
            </button>
          </div>
        </div>

        {/* INPUT DI RICERCA DOCENTE (MOSTRATO SOLO SE APERTO) */}
        {mostraFiltroDocente && (
          <div className="w-full mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={ricercaDocente}
                onChange={(e) => setRicercaDocente(e.target.value)}
                placeholder="Filtra per nome docente assente o sostituto..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {ricercaDocente && (
                <button
                  type="button"
                  onClick={() => setRicercaDocente('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setMostraFiltroDocente(false);
                setRicercaDocente('');
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODALE DI SCELTA CLASSI PER DOWNLOAD / STAMPA PDF         */}
      {/* ========================================================= */}
      {mostraModalePdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs">
                  <FileDown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Scarica / Stampa PDF Prospetto</h3>
                  <p className="text-xs text-slate-500">Seleziona le classi da includere nel documento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostraModalePdf(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* OPZIONI: TUTTE LE CLASSI VS SELEZIONA CLASSI */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalitaSelezioneClassiPdf('TUTTE')}
                  className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                    modalitaSelezioneClassiPdf === 'TUTTE'
                      ? 'bg-white text-indigo-950 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tutte le Classi ({classiUniche.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalitaSelezioneClassiPdf('PERSONALIZZATA')}
                  className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                    modalitaSelezioneClassiPdf === 'PERSONALIZZATA'
                      ? 'bg-white text-indigo-950 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Solo Alcune Classi</span>
                </button>
              </div>

              {/* CHECKBOX GRIGLIA CLASSI QUANDO MODALITA' È PERSONALIZZATA */}
              {modalitaSelezioneClassiPdf === 'PERSONALIZZATA' && (
                <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-700">
                      Selezionate: {classiSelezionatePdf.length} di {classiUniche.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setClassiSelezionatePdf(classiUniche)}
                        className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Seleziona Tutte
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setClassiSelezionatePdf([])}
                        className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Deseleziona
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {classiUniche.map(c => {
                      const isSel = classiSelezionatePdf.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setClassiSelezionatePdf(prev => 
                              prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                            );
                          }}
                          className={`p-2 rounded-xl text-xs font-black border transition flex items-center justify-between cursor-pointer ${
                            isSel 
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{c}</span>
                          {isSel ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-300" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* PULSANTI DI AZIONE */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMostraModalePdf(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="button"
                disabled={modalitaSelezioneClassiPdf === 'PERSONALIZZATA' && classiSelezionatePdf.length === 0}
                onClick={() => {
                  setMostraModalePdf(false);
                  
                  // Se è personalizzata, imposta temporaneamente il filtro prima della stampa o esegui
                  if (modalitaSelezioneClassiPdf === 'PERSONALIZZATA') {
                    if (classiSelezionatePdf.length === 1) {
                      setFiltroClasse(classiSelezionatePdf[0]);
                    }
                  } else {
                    setFiltroClasse('');
                  }

                  setTimeout(() => {
                    window.print();
                  }, 150);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Genera e Salva in PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANNER NOMINE SUPPLENTI ATTIVE OGGI (PER PERSONALE ATA & SEGRETERIA / ACCOGLIENZA) */}
      {(() => {
        const nomineOggi = nomineSupplenti.filter(n => {
          const dIso = selectedDate.split('T')[0];
          return dIso >= n.dataInizio.split('T')[0] && dIso <= n.dataFine.split('T')[0];
        });

        if (nomineOggi.length === 0) return null;

        return (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                🧑‍🏫
              </span>
              <h3 className="text-xs sm:text-sm font-black text-emerald-950">
                Supplenti in Servizio su Cattedra ({nomineOggi.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {nomineOggi.map(nom => (
                <div key={nom.id} className="bg-white p-2.5 rounded-xl border border-emerald-200 text-xs shadow-2xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 text-xs sm:text-sm">{nom.supplenteNome}</strong>
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.2 rounded">
                      Supplente
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Sostituisce: <strong className="text-slate-800">{nom.docenteTitolareNome}</strong> ({nom.motivo || 'Maternità / Congedo'})
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Periodo: {formatDataItaliana(nom.dataInizio)} ➔ {formatDataItaliana(nom.dataFine)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ELENCO SOSTITUZIONI: TABELLA COMPATTA ORIZZONTALE AL 100% (ZERO SCROLL / ZERO SWIPE SU MOBILE) */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {righeFiltrate.length === 0 ? (
          (() => {
            const dObj = new Date(selectedDate);
            const dayOfWeek = dObj.getDay(); // 0 = Dom, 6 = Sab
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isFestivo = (impostazioniScuola?.giorniFestivi || []).includes(selectedDate);
            const isGiornoChiusura = isWeekend || isFestivo;

            if (isGiornoChiusura) {
              return (
                <div className="bg-gradient-to-br from-amber-50/90 via-sky-50/80 to-emerald-50/90 p-8 sm:p-10 text-center space-y-4 animate-in fade-in duration-200">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-md border-2 border-amber-200 animate-bounce">
                    {isWeekend ? '🏖️' : '🎉'}
                  </div>
                  <div className="space-y-1">
                    <p className="text-base sm:text-lg font-black text-slate-900">
                      {isWeekend 
                        ? `Buon Fine Settimana! (${dayOfWeek === 6 ? 'Sabato' : 'Domenica'} - Scuola Chiusa)` 
                        : `Giorno Festivo / Chiusura Scuola`
                      }
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Nessuna attività didattica prevista per {giornoSettimana} {formatDataItaliana(selectedDate)}. ☀️🌴
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-black text-slate-800">
                  {righeQuadro.length === 0 
                    ? 'Nessuna assenza o sostituzione per questa giornata.' 
                    : 'Nessun risultato corrispondente ai filtri selezionati.'}
                </p>
                <p className="text-xs text-slate-500">
                  Tutte le classi sono regolari con i rispettivi docenti titolari.
                </p>
              </div>
            );
          })()
        ) : visualizzazione === 'PER_ORA' ? (
          /* ======================================================= */
          /* VISTA 1: TABELLA RAGGRUPPATA PER ORA (100% FIT SCREEN) */
          /* ======================================================= */
          <div className="divide-y divide-slate-200">
            {gruppiPerOra.map(([oraNum, righeDellOra]) => {
              const isAperto = oreAperte.includes(oraNum);
              return (
                <div key={oraNum} className="bg-white">
                  {/* INTESTAZIONE ORA ACCORDION */}
                  <button
                    type="button"
                    onClick={() => {
                      setOreAperte(prev => 
                        prev.includes(oraNum) ? prev.filter(o => o !== oraNum) : [...prev, oraNum]
                      );
                    }}
                    className="w-full bg-indigo-50/70 hover:bg-indigo-100/70 border-y border-indigo-100/80 text-indigo-950 py-2.5 px-3 flex items-center justify-between transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 font-black text-xs sm:text-sm tracking-wide">
                      <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black shadow-2xs">
                        ⏰ {oraNum}ª ORA
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        ({righeDellOra.length} {righeDellOra.length === 1 ? 'classe' : 'classi'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-white text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md shadow-2xs">
                        {righeDellOra.filter(r => r.sostituti.length > 0).length}/{righeDellOra.length} coperte
                      </span>
                      <ChevronDown className={`w-4 h-4 text-indigo-600 transition-transform duration-200 ${isAperto ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* TABELLA CLASSI DI QUELL'ORA */}
                  {isAperto && (
                    <div className="overflow-x-auto animate-in fade-in duration-150">
                      <table className="w-full text-left border-collapse table-fixed text-[11px] sm:text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold text-[10px] uppercase tracking-wider">
                            <th className="py-2 px-1.5 sm:px-3 w-[15%] sm:w-16 text-center">Classe</th>
                            <th className="py-2 px-1.5 sm:px-3 w-[35%] sm:w-auto">Docente Assente</th>
                            <th className="py-2 px-1.5 sm:px-3 w-[35%] sm:w-auto">Docente Sostituto</th>
                            <th className="py-2 px-1.5 sm:px-3 w-[15%] sm:w-28 text-center">Stato</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {righeDellOra.map((r, idx) => (
                            <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                              {/* CLASSE */}
                              <td className="py-2 px-1 sm:px-3 text-center align-middle">
                                <span className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-900 font-black px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs shadow-2xs">
                                  {r.classe}
                                </span>
                              </td>

                              {/* DOCENTE ASSENTE */}
                              <td className="py-2 px-1.5 sm:px-3 align-middle">
                                <div className="font-black text-slate-900 leading-tight truncate">
                                  {r.docenteAssente}
                                </div>
                                <div className="text-[9px] sm:text-[10px] text-slate-500 leading-tight truncate mt-0.5 flex flex-wrap items-center gap-1">
                                  <span>{r.materia}</span>
                                  {r.isUscita ? (
                                    <span className="text-amber-700 font-bold">• Uscita</span>
                                  ) : (
                                    <span className="text-slate-400">• {r.motivo}</span>
                                  )}
                                  {/* REMIND EDUCATORE IN COMPRESENZA */}
                                  {(() => {
                                    const eds = getEducatoriInClasseNellOra(r.classe, giornoSettimana as any, r.ora, docenti, orariDocenti);
                                    if (eds.length === 0) return null;
                                    return eds.map(ed => (
                                      <span key={ed.id} className="bg-teal-50 text-teal-800 border border-teal-300 font-bold px-1.5 py-0.2 rounded text-[9px] flex items-center gap-0.5">
                                        <span>🎓</span>
                                        <span>Educatore: {getBaseNomeDocente(ed.nome)}</span>
                                      </span>
                                    ));
                                  })()}
                                </div>
                              </td>

                              {/* DOCENTE SOSTITUTO */}
                              <td className="py-2 px-1.5 sm:px-3 align-middle">
                                {r.sostituti.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {r.sostituti.map(s => (
                                      <div key={s.id} className="leading-tight">
                                        <span className="font-black text-indigo-950 text-[11px] sm:text-xs block sm:inline truncate">
                                          👤 {s.nomeSostituto}
                                        </span>
                                        <span className="text-[9px] text-slate-500 font-normal hidden md:inline ml-1">
                                          ({s.categoria})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : r.nonSostituita ? (
                                  <span className="inline-block bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded border border-slate-200 text-[9px] sm:text-[10px]">
                                    Non Sost.
                                  </span>
                                ) : (
                                  <span className="inline-block bg-amber-100 text-amber-900 font-black px-1.5 py-0.2 rounded border border-amber-300 text-[9px] sm:text-[10px] animate-pulse">
                                    In attesa
                                  </span>
                                )}
                              </td>

                              {/* STATO FIRMA */}
                              <td className="py-2 px-1 sm:px-3 text-center align-middle">
                                {r.sostituti.length > 0 ? (
                                  r.sostituti.every(s => s.firmata) ? (
                                    <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[9px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded shadow-2xs">
                                      <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 shrink-0" />
                                      <span className="hidden sm:inline">Firmata</span>
                                      <span className="sm:hidden">OK</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[9px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded">
                                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 shrink-0" />
                                      <span className="hidden sm:inline">Assegnata</span>
                                      <span className="sm:hidden">Ass.</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400 text-[10px]">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ======================================================= */
          /* VISTA 2: CARD MODERNE RAGGRUPPATE PER DOCENTE (UGUALE A VICEPRESIDENZA) */
          /* ======================================================= */
          <div className="space-y-4 p-3 sm:p-4 bg-slate-100/50">
            {gruppiPerDocente.map(([docenteNome, righeDocente], gIdx) => {
              const isAperto = docentiAperti.includes(docenteNome);
              const totOreDoc = righeDocente.length;
              const totCoperteDoc = righeDocente.filter(r => r.sostituti.length > 0 || r.nonSostituita).length;
              const isTuttoCoperto = totCoperteDoc === totOreDoc;
              const materiaDoc = righeDocente[0]?.materia || '';
              const motivoAssenza = righeDocente[0]?.motivo || 'Assenza';
              const isUscitaDoc = righeDocente[0]?.isUscita || false;
              const isOrariaDoc = motivoAssenza.toLowerCase().includes('oraria') || motivoAssenza.toLowerCase().includes('permesso');
              const stileCard = getStileCardAssenza(motivoAssenza, isUscitaDoc, isOrariaDoc);

              return (
                <div key={gIdx} className={`bg-white rounded-2xl border overflow-hidden transition-all ${stileCard.cardBorder}`}>
                  {/* Intestazione del Docente Assente Accordion con Avatar e Statistiche Dinamiche */}
                  <button
                    type="button"
                    onClick={() => {
                      setDocentiAperti(prev => 
                        prev.includes(docenteNome) ? prev.filter(d => d !== docenteNome) : [...prev, docenteNome]
                      );
                    }}
                    className={`w-full ${stileCard.bgHeader} ${stileCard.textColor} px-4 py-3 flex flex-wrap items-center justify-between gap-2 transition cursor-pointer text-left`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl ${stileCard.bgAvatar} flex items-center justify-center font-black text-xs shadow-2xs`}>
                        {docenteNome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-black tracking-wide">{docenteNome}</strong>
                          <span className={`text-xs ${stileCard.subTextColor} font-semibold`}>({materiaDoc})</span>
                        </div>
                        <span className={`text-[11px] ${stileCard.subTextColor} flex items-center gap-1 mt-0.5 font-medium`}>
                          <span>{stileCard.icon}</span>
                          <span>Tipologia assenza: <strong>{stileCard.label}</strong></span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* ORE COPERTE CON BADGE AMBRA/VERDE */}
                      <span className={`text-xs font-black px-3 py-1 rounded-xl shadow-2xs flex items-center gap-1.5 ${
                        isTuttoCoperto 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-amber-500 text-white'
                      }`}>
                        <span>🕒 {totCoperteDoc}/{totOreDoc}</span>
                        {isTuttoCoperto && <span>✓</span>}
                      </span>

                      <ChevronDown className={`w-4 h-4 ${stileCard.textColor} transition-transform duration-200 ${isAperto ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Elenco delle ore del docente come Card Moderne Accordion */}
                  {isAperto && (
                    <div className={`p-3 ${stileCard.bodyBg} space-y-2 animate-in fade-in duration-150`}>
                    {righeDocente.map((r, idx) => {
                      const isAssegnata = r.sostituti.length > 0;
                      const isNonSost = r.nonSostituita;

                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:border-indigo-300"
                        >
                          {/* Ora, Classe e Dettaglio Materia */}
                          <div className="flex items-center gap-3">
                            <span className="bg-indigo-100 text-indigo-950 border border-indigo-200 font-black text-xs px-2.5 py-1.5 rounded-lg shrink-0 shadow-2xs">
                              {r.ora}ª ORA
                            </span>
                            
                            <div className={`w-11 h-9 rounded-lg flex items-center justify-center font-black text-sm border shadow-2xs shrink-0 ${
                              isAssegnata ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}>
                              {r.classe}
                            </div>

                            <div className="leading-tight">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2 py-0.5 rounded-md border border-indigo-100 uppercase">
                                  {r.materia}
                                </span>
                                {/* REMIND EDUCATORE IN COMPRESENZA */}
                                {(() => {
                                  const eds = getEducatoriInClasseNellOra(r.classe, giornoSettimana as any, r.ora, docenti, orariDocenti);
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

                          {/* Stato / Docente Sostituto Assegnato */}
                          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                            {isAssegnata ? (
                              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 flex-wrap">
                                {r.sostituti.map((sost) => (
                                  <div
                                    key={sost.id}
                                    className="bg-emerald-50 text-emerald-900 border border-emerald-300 font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <span>👤 {sost.nomeSostituto}</span>
                                    <span className="text-[10px] text-emerald-700 font-semibold hidden md:inline">
                                      ({sost.categoria})
                                    </span>
                                    {sost.firmata ? (
                                      <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded ml-1">
                                        ✓ Firmata
                                      </span>
                                    ) : (
                                      <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded ml-1">
                                        In attesa
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : isNonSost ? (
                              <span className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-300">
                                🚫 Non Sostituire
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-900 border border-amber-300 font-black text-xs px-3.5 py-1.5 rounded-lg shadow-2xs animate-pulse">
                                In attesa di sostituto
                              </span>
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
    </div>
  );
};