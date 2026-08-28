import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  School, Lock, Eye, CheckCircle2, Clock, Calendar, 
  Search, Filter, Printer, KeyRound, ShieldAlert, Sparkles,
  ChevronLeft, ChevronRight, User, Bus, AlertCircle
} from 'lucide-react';
import { getBaseNomeDocente, formatDataItaliana } from '../utils/docentiHelper';

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
      const doc = docenti.find(d => d.id === assenza.docenteId);
      if (!doc) return;
      const orario = orariDocenti.find(o => o.docenteId === doc.id);
      if (!orario) return;

      const oreLezione = orario.ore.filter(c => 
        c.giorno === giornoSettimana && 
        c.tipo === 'LEZIONE' && 
        c.valore !== '' &&
        assenza.oreInteressate.includes(c.ora)
      );

      oreLezione.forEach(c => {
        const sosts = sostituzioniOggi.filter(s => s.ora === c.ora && s.classe === c.valore);
        const nonSost = sosts.some(s => s.categoria === 'NON_SOSTITUIRE');

        items.push({
          ora: c.ora,
          classe: c.valore,
          docenteAssente: getBaseNomeDocente(doc.nome),
          materia: doc.materia,
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
        const doc = docenti.find(d => d.id === docId);
        if (!doc) return;
        const orario = orariDocenti.find(o => o.docenteId === doc.id);
        if (!orario) return;

        const oreLezione = orario.ore.filter(c => 
          c.giorno === giornoSettimana && 
          c.tipo === 'LEZIONE' && 
          c.valore !== '' && 
          !uscita.classi.includes(c.valore) && 
          uscita.ore.includes(c.ora)
        );

        oreLezione.forEach(c => {
          const sosts = sostituzioniOggi.filter(s => s.ora === c.ora && s.classe === c.valore);
          const nonSost = sosts.some(s => s.categoria === 'NON_SOSTITUIRE');

          items.push({
            ora: c.ora,
            classe: c.valore,
            docenteAssente: getBaseNomeDocente(doc.nome),
            materia: doc.materia,
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

  // STATISTICHE IN SINTESI
  const totOreScoperte = righeQuadro.length;
  const totCoperte = righeQuadro.filter(r => r.sostituti.length > 0).length;
  const totScoperteNonCoperte = righeQuadro.filter(r => r.sostituti.length === 0 && !r.nonSostituita).length;

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
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* HEADER DELLA PAGINA CON NAVIGAZIONE DATA E STAMPA */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase px-2 py-0.5 rounded-md border border-indigo-100">
              {impostazioniScuola?.nomeScuola || 'Istituto Scolastico'}
            </span>
            <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-100">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Area Protetta
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <span>📋 Prospetto Giornaliero Sostituzioni</span>
          </h2>
          <p className="text-xs text-slate-500">
            Quadro completo per Collaboratori Scolastici, Segreteria e Sala Docenti.
          </p>
        </div>

        {/* CONTROLLI DATA & PULSANTE STAMPA */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => cambiaGiorno(-1)}
              className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="Giorno Precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 text-center">
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

          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
          >
            Oggi
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            title="Stampa foglio per bacheca o reception"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Stampa A4</span>
          </button>
        </div>
      </div>

      {/* KPI DI RIEPILOGO STATO COPERTURA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">Ore Scoperte Totali</span>
            <span className="text-xl font-black text-slate-900">{totOreScoperte}</span>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 block">Sostituzioni Coperte</span>
            <span className="text-xl font-black text-emerald-800">{totCoperte}</span>
          </div>
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 block">Ancora da Coprire</span>
            <span className="text-xl font-black text-amber-800">{totScoperteNonCoperte}</span>
          </div>
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* BARRA FILTRI RAPIDI */}
      <div className="bg-white rounded-xl p-3 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filtro Ora */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Ora:</span>
            <select
              value={filtroOra}
              onChange={(e) => setFiltroOra(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
            >
              <option value="TUTTE">Tutte le Ore</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(o => (
                <option key={o} value={o}>{o}ª Ora</option>
              ))}
            </select>
          </div>

          {/* Filtro Classe */}
          {classiUniche.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Classe:</span>
              <select
                value={filtroClasse}
                onChange={(e) => setFiltroClasse(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
              >
                <option value="">Tutte le Classi</option>
                {classiUniche.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Cerca Docente */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={ricercaDocente}
            onChange={(e) => setRicercaDocente(e.target.value)}
            placeholder="Cerca docente assente o supplente..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* TABELLA PROSPETTO SOSTITUZIONI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {righeFiltrate.length === 0 ? (
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px]">
                  <th className="p-3 w-16 text-center">Ora</th>
                  <th className="p-3 w-20 text-center">Classe</th>
                  <th className="p-3">Docente Assente / In Uscita</th>
                  <th className="p-3">Docente Sostituto Assegnato</th>
                  <th className="p-3 text-center">Stato / Presa Visione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {righeFiltrate.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    {/* ORA */}
                    <td className="p-3 text-center">
                      <span className="bg-slate-900 text-white font-black px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                        {r.ora}ª
                      </span>
                    </td>

                    {/* CLASSE */}
                    <td className="p-3 text-center">
                      <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-black px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                        {r.classe}
                      </span>
                    </td>

                    {/* DOCENTE ASSENTE */}
                    <td className="p-3">
                      <div className="font-bold text-slate-900 text-xs">
                        {r.docenteAssente}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{r.materia}</span>
                        {r.isUscita ? (
                          <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Bus className="w-2.5 h-2.5" /> Uscita Didattica
                          </span>
                        ) : (
                          <span className="text-slate-400">• {r.motivo}</span>
                        )}
                      </div>
                    </td>

                    {/* DOCENTE SOSTITUTO */}
                    <td className="p-3">
                      {r.sostituti.length > 0 ? (
                        <div className="space-y-1">
                          {r.sostituti.map(s => (
                            <div key={s.id} className="flex items-center gap-1.5">
                              <span className="font-black text-indigo-900 text-xs bg-indigo-50/80 border border-indigo-200 px-2 py-0.5 rounded-lg shadow-2xs">
                                👤 {s.nomeSostituto}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">({s.categoria})</span>
                            </div>
                          ))}
                        </div>
                      ) : r.nonSostituita ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md border border-slate-300 text-[10px]">
                          🚫 Non Sostituita
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-black px-2.5 py-0.5 rounded-lg border border-amber-300 text-[10px] animate-pulse shadow-2xs">
                          ⚠️ In attesa di assegnazione
                        </span>
                      )}
                    </td>

                    {/* STATO FIRMA */}
                    <td className="p-3 text-center">
                      {r.sostituti.length > 0 ? (
                        r.sostituti.every(s => s.firmata) ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-md shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Presa Visione
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3 text-amber-600" /> Assegnata
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};