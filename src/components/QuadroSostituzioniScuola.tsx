import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Lock, CheckCircle2, Clock, 
  Search, Filter, Printer, KeyRound, ShieldAlert,
  ChevronLeft, ChevronRight, User, AlertCircle
} from 'lucide-react';
import { getBaseNomeDocente, formatDataItaliana, getOrarioUnificatoDocente, getDocentiCollegatiIds } from '../utils/docentiHelper';

interface QuadroSostituzioniScuolaProps {
  initialDate?: string;
  isEmbedInVicepresidenza?: boolean;
}

export const QuadroSostituzioniScuola: React.FC<QuadroSostituzioniScuolaProps> = ({ 
  initialDate,
  isEmbedInVicepresidenza = false 
}) => {
  const { 
    docenti, orariDocenti, assenze, uscite, sostituzioni, impostazioniScuola 
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

    // 1. Assenze ordinarie
    assenzeOggi.forEach(assenza => {
      const orarioFuso = getOrarioUnificatoDocente(assenza.docenteId, docenti, orariDocenti);
      const collegatiIds = getDocentiCollegatiIds(assenza.docenteId, docenti);
      const doc = docenti.find(d => d.id === assenza.docenteId);
      const nomeAssente = doc ? getBaseNomeDocente(doc.nome) : 'Docente';
      const profiliPersona = docenti.filter(d => collegatiIds.includes(d.id));
      const materiePersona = Array.from(new Set(profiliPersona.map(p => {
        if (p.isAlternativa || p.nome.toUpperCase().includes('ALTERNATIVA')) return 'ALTERNATIVA';
        if (p.isPotenziamento || p.nome.toUpperCase().includes('POTENZIAMENTO')) return 'POTENZIAMENTO';
        return p.materia;
      }))).filter(Boolean);
      // Metti prima le materie curricolari
      materiePersona.sort((a, b) => {
        if (a === 'ALTERNATIVA' || a === 'POTENZIAMENTO') return 1;
        if (b === 'ALTERNATIVA' || b === 'POTENZIAMENTO') return -1;
        return a.localeCompare(b);
      });
      const materiaDoc = materiePersona.length > 0 ? materiePersona.join(', ') : (doc?.materia || 'Materia');

      const oreLezione = orarioFuso.filter(c => 
        c.giorno === giornoSettimana && 
        c.valore !== '' && 
        c.valore !== 'D' && 
        c.valore !== 'P' &&
        assenza.oreInteressate.includes(c.ora)
      );

      oreLezione.forEach(c => {
        const sosts = sostituzioniOggi.filter(s => 
          s.ora === c.ora && 
          s.classe === c.valore &&
          (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === assenza.docenteId)
        );
        const nonSost = sosts.some(s => s.categoria === 'NON_SOSTITUIRE');

        items.push({
          ora: c.ora,
          classe: c.valore,
          docenteAssente: nomeAssente,
          materia: materiaDoc,
          motivo: assenza.motivo,
          isUscita: false,
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
      });
    });

    // 2. Uscite didattiche / Gite
    usciteOggi.forEach(uscita => {
      uscita.docentiAccompagnatoriIds.forEach(docId => {
        const orarioFuso = getOrarioUnificatoDocente(docId, docenti, orariDocenti);
        const collegatiIds = getDocentiCollegatiIds(docId, docenti);
        const doc = docenti.find(d => d.id === docId);
        const nomeAccompagnatore = doc ? getBaseNomeDocente(doc.nome) : 'Docente';
        const materiaDoc = doc?.materia || 'Materia';

        const oreLezione = orarioFuso.filter(c => 
          c.giorno === giornoSettimana && 
          c.valore !== '' && 
          c.valore !== 'D' && 
          c.valore !== 'P' &&
          !uscita.classi.includes(c.valore) && 
          uscita.ore.includes(c.ora)
        );

        oreLezione.forEach(c => {
          const sosts = sostituzioniOggi.filter(s => 
            s.ora === c.ora && 
            s.classe === c.valore &&
            (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === docId)
          );
          const nonSost = sosts.some(s => s.categoria === 'NON_SOSTITUIRE');

          items.push({
            ora: c.ora,
            classe: c.valore,
            docenteAssente: nomeAccompagnatore,
            materia: materiaDoc,
            motivo: `Uscita ${uscita.classi.join(', ')}`,
            isUscita: true,
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
          {/* SELETTORE VISTA: PER ORA VS PER DOCENTE */}
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

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              title="Stampa foglio per bacheca o reception"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stampa</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI DI RIEPILOGO STATO COMPATTO (SU 1 RIGA SU MOBILE E DESKTOP) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white p-2.5 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate block">Ore Scoperte</span>
            <span className="text-base sm:text-xl font-black text-slate-900">{totOreScoperte}</span>
          </div>
          <div className="p-1.5 sm:p-2.5 bg-slate-100 text-slate-700 rounded-lg sm:rounded-xl shrink-0">
            <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 truncate block">Coperte</span>
            <span className="text-base sm:text-xl font-black text-emerald-800">{totCoperte}</span>
          </div>
          <div className="p-1.5 sm:p-2.5 bg-emerald-100 text-emerald-700 rounded-lg sm:rounded-xl shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 truncate block">Da Coprire</span>
            <span className="text-base sm:text-xl font-black text-amber-800">{totScoperteNonCoperte}</span>
          </div>
          <div className="p-1.5 sm:p-2.5 bg-amber-100 text-amber-700 rounded-lg sm:rounded-xl shrink-0">
            <AlertCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* BARRA FILTRI CON ACCORDION/COLLAPSE PER MOBILE */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMostraFiltriMobile(!mostraFiltriMobile)}
              className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-100"
            >
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filtri</span>
              {filtriAttiviCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-mono">
                  {filtriAttiviCount}
                </span>
              )}
            </button>

            <span className="text-xs font-bold text-slate-700 hidden sm:flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filtri & Ricerca</span>
            </span>
          </div>

          <div className="relative flex-1 max-w-xs ml-auto">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={ricercaDocente}
              onChange={(e) => setRicercaDocente(e.target.value)}
              placeholder="Cerca docente..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className={`${mostraFiltriMobile ? 'block' : 'hidden'} sm:flex flex-wrap items-center gap-3 p-3 bg-slate-50/70 border-t border-slate-100 animate-in fade-in duration-150`}>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">Ora:</span>
            <select
              value={filtroOra}
              onChange={(e) => setFiltroOra(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
            >
              <option value="TUTTE">Tutte le Ore</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(o => (
                <option key={o} value={o}>{o}ª Ora</option>
              ))}
            </select>
          </div>

          {classiUniche.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">Classe:</span>
              <select
                value={filtroClasse}
                onChange={(e) => setFiltroClasse(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
              >
                <option value="">Tutte le Classi</option>
                {classiUniche.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {filtriAttiviCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFiltroOra('TUTTE');
                setFiltroClasse('');
                setRicercaDocente('');
              }}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer ml-auto sm:ml-0"
            >
              Azzera Filtri
            </button>
          )}
        </div>
      </div>

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
          <table className="w-full text-left border-collapse table-fixed text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10px] sm:text-[11px]">
                <th className="py-2 px-1.5 sm:px-3 w-[15%] sm:w-16 text-center">Classe</th>
                <th className="py-2 px-1.5 sm:px-3 w-[35%] sm:w-auto">Docente Assente</th>
                <th className="py-2 px-1.5 sm:px-3 w-[35%] sm:w-auto">Docente Sostituto</th>
                <th className="py-2 px-1.5 sm:px-3 w-[15%] sm:w-28 text-center">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gruppiPerOra.map(([oraNum, righeDellOra]) => (
                <React.Fragment key={oraNum}>
                  {/* INTESTAZIONE ORA UNIFICATA (SENZA COLONNE EXTRA) */}
                  <tr className="bg-slate-800 text-white">
                    <td colSpan={4} className="py-1.5 px-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-[11px] sm:text-xs tracking-wide">
                          <span>⏰ {oraNum}ª ORA</span>
                          <span className="text-[10px] font-normal text-slate-300">
                            ({righeDellOra.length} {righeDellOra.length === 1 ? 'classe' : 'classi'})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300">
                          {righeDellOra.filter(r => r.sostituti.length > 0).length}/{righeDellOra.length} coperte
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* RIGHE CLASSI DI QUELL'ORA */}
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
                        <div className="text-[9px] sm:text-[10px] text-slate-500 leading-tight truncate mt-0.5">
                          <span>{r.materia}</span>
                          {r.isUscita ? (
                            <span className="text-amber-700 font-bold ml-1">• Uscita</span>
                          ) : (
                            <span className="text-slate-400 ml-1">• {r.motivo}</span>
                          )}
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          /* ======================================================= */
          /* VISTA 2: TABELLA RAGGRUPPATA PER DOCENTE ASSENTE        */
          /* ======================================================= */
          <table className="w-full text-left border-collapse table-fixed text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[10px] sm:text-[11px]">
                <th className="py-2 px-1.5 sm:px-3 w-[15%] sm:w-16 text-center">Ora</th>
                <th className="py-2 px-1.5 sm:px-3 w-[15%] sm:w-16 text-center">Classe</th>
                <th className="py-2 px-1.5 sm:px-3 w-[55%] sm:w-auto">Docente Sostituto Assegnato</th>
                <th className="py-2 px-1.5 sm:px-3 w-[15%] sm:w-28 text-center">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gruppiPerDocente.map(([docenteNome, righeDocente]) => (
                <React.Fragment key={docenteNome}>
                  {/* INTESTAZIONE DOCENTE */}
                  <tr className="bg-slate-800 text-white">
                    <td colSpan={4} className="py-1.5 px-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-[11px] sm:text-xs tracking-wide">
                          <span>👤 {docenteNome}</span>
                          <span className="text-[10px] font-normal text-slate-300">
                            ({righeDocente[0]?.materia})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300">
                          {righeDocente.filter(r => r.sostituti.length > 0).length}/{righeDocente.length} coperte
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* RIGHE DEL DOCENTE */}
                  {righeDocente.map((r, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                      {/* ORA */}
                      <td className="py-2 px-1 sm:px-3 text-center align-middle">
                        <span className="inline-block bg-slate-900 text-white font-black px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs">
                          {r.ora}ª
                        </span>
                      </td>

                      {/* CLASSE */}
                      <td className="py-2 px-1 sm:px-3 text-center align-middle">
                        <span className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-900 font-black px-1.5 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs shadow-2xs">
                          {r.classe}
                        </span>
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};