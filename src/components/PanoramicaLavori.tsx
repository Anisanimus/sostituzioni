import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getBaseNomeDocente, getDocentiCollegatiIds } from '../utils/docentiHelper';
import { 
  ChevronDown, X, BarChart3, TrendingUp 
} from 'lucide-react';

interface PanoramicaLavoriProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const PanoramicaLavori: React.FC<PanoramicaLavoriProps> = ({ selectedDate, onSelectDate }) => {
  const { docenti, orariDocenti, assenze, uscite, sostituzioni } = useApp();
  
  // Stato visibilità banner e tab vista (Settimanale / Mensile)
  const [visibile, setVisibile] = useState(true);
  const [compresso, setCompresso] = useState(false);
  const [vista, setVista] = useState<'SETTIMANA' | 'MESE'>('SETTIMANA');

  const todayStr = new Date().toISOString().split('T')[0];

  // Calcola i prossimi 5 giorni lavorativi (Lun-Ven) a partire da OGGI (incluso)
  const getProssimiGiorniSettimana = () => {
    const dates: string[] = [];
    let cur = new Date();
    // Se oggi è sabato o domenica, parti dal prossimo lunedì
    if (cur.getDay() === 6) cur.setDate(cur.getDate() + 2);
    else if (cur.getDay() === 0) cur.setDate(cur.getDate() + 1);

    while (dates.length < 5) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) {
        dates.push(cur.toISOString().split('T')[0]);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // Calcola 25 giorni lavorativi (Lun-Ven) a partire da OGGI (circa 5 settimane di scuola future)
  const getGiorniMeseDaOggi = () => {
    const dates: string[] = [];
    const cur = new Date();

    while (dates.length < 25) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) {
        dates.push(cur.toISOString().split('T')[0]);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // Funzione per calcolare statistiche di una singola giornata PERFETTAMENTE SINCRONIZZATA con il Tabellone
  const getStatsGiorno = (dataStr: string) => {
    const giornoD = new Date(dataStr);
    const nomiGiorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const giornoNome = nomiGiorni[giornoD.getDay()];

    const assenzeData = assenze.filter(a => a.data === dataStr && !a.annullata);
    const usciteData = uscite.filter(u => u.data === dataStr && !u.annullata);
    const sostituzioniData = sostituzioni.filter(s => s.data === dataStr);

    // Calcolo ore scoperte identico a TabelloneSostituzioni
    const oreScoperteGiorno: Array<{ ora: number; classe: string; docNome: string }> = [];

    assenzeData.forEach(assenza => {
      const doc = docenti.find(d => d.id === assenza.docenteId);
      if (!doc || doc.isEducatore) return;

      const collegatiIds = getDocentiCollegatiIds(assenza.docenteId, docenti);
      const profiliDocente = docenti.filter(d => collegatiIds.includes(d.id));

      profiliDocente.forEach(prof => {
        const orarioDoc = orariDocenti.find(o => o.docenteId === prof.id);
        if (!orarioDoc) return;

        assenza.oreInteressate.forEach(ora => {
          const cella = orarioDoc.ore.find(c => c.giorno === giornoNome && c.ora === ora);
          const val = cella ? cella.valore.trim().toUpperCase() : '';

          if (val && val !== 'D') {
            const nomeClasseVisualizzata = (val === 'P' || val === 'POT' || val.startsWith('POTENZ')) ? 'P' : val;

            const classeInUscita = usciteData.some(u => {
              const classiList = u.classi || [(u as any).classe];
              return classiList.some(c => c.toUpperCase().trim() === val) && u.ore.includes(ora);
            });

            if (!classeInUscita) {
              const docBaseNome = getBaseNomeDocente(prof.nome);
              const giaInserita = oreScoperteGiorno.some(os => 
                os.ora === ora && 
                os.classe === nomeClasseVisualizzata && 
                os.docNome === docBaseNome
              );

              if (!giaInserita) {
                oreScoperteGiorno.push({
                  ora,
                  classe: nomeClasseVisualizzata,
                  docNome: docBaseNome
                });
              }
            }
          }
        });
      });
    });

    const totOreScoperte = oreScoperteGiorno.length;

    // Calcolo docenti unici assenti nel giorno
    const docentiAssentiUnici = new Set<string>();
    assenzeData.forEach(assenza => {
      const doc = docenti.find(d => d.id === assenza.docenteId);
      if (doc && !doc.isEducatore) {
        docentiAssentiUnici.add(getBaseNomeDocente(doc.nome));
      }
    });
    const totDocentiAssenti = docentiAssentiUnici.size;

    // Conteggio effettivo ore coperte corrispondenti a ore scoperte reali
    const totCoperte = oreScoperteGiorno.filter(os => 
      sostituzioniData.some(s => s.ora === os.ora && s.classe === os.classe)
    ).length;

    const totRimanenti = Math.max(0, totOreScoperte - totCoperte);

    // Livello gravità in base al numero di docenti assenti:
    // 0 docenti: OK (Nessuna assenza / Tranquilla)
    // 1-3 docenti: SEMPLICE (Verde / Azzurro)
    // 4-7 docenti: DISCRETA (Giallo / Ambra)
    // >7 docenti: COMPLICATO (Rosso vivo / Critica)
    let gravita: 'OK' | 'SEMPLICE' | 'DISCRETA' | 'COMPLICATO' = 'OK';
    if (totDocentiAssenti > 7) gravita = 'COMPLICATO';
    else if (totDocentiAssenti >= 4) gravita = 'DISCRETA';
    else if (totDocentiAssenti >= 1) gravita = 'SEMPLICE';

    return {
      dataStr,
      giornoNome,
      totDocentiAssenti,
      totOreScoperte,
      totCoperte,
      totRimanenti,
      gravita,
      isOggi: dataStr === new Date().toISOString().split('T')[0],
      isSelezionata: dataStr === selectedDate
    };
  };

  const datesSettimana = getProssimiGiorniSettimana();
  const statsSettimana = datesSettimana.map(d => getStatsGiorno(d));
  const datesMese = getGiorniMeseDaOggi();
  const statsMese = datesMese.map(d => getStatsGiorno(d));

  // Totali complessivi dei prossimi giorni
  const totSettimanaScoperte = statsSettimana.reduce((acc, s) => acc + s.totOreScoperte, 0);
  const totSettimanaCoperte = statsSettimana.reduce((acc, s) => acc + s.totCoperte, 0);
  const percentualeCompletamento = totSettimanaScoperte > 0 
    ? Math.round((totSettimanaCoperte / totSettimanaScoperte) * 100) 
    : 100;

  if (!visibile) {
    return (
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setVisibile(true)}
          className="bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Mostra Panoramica Lavori</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-2xs border border-slate-200 mb-3 space-y-2.5 transition-all">
      
      {/* HEADER PANORAMICA */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide text-slate-800">
                Avanzamento Lavori
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                totSettimanaScoperte === 0 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : percentualeCompletamento === 100 
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                {totSettimanaCoperte}/{totSettimanaScoperte} Ore ({percentualeCompletamento}%)
              </span>
            </div>
          </div>
        </div>

        {/* CONTROLLI: VISTA + COMPRIMI + CHIUDI */}
        <div className="flex items-center gap-1.5">
          <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setVista('SETTIMANA')}
              className={`px-2.5 py-0.5 rounded-lg transition ${vista === 'SETTIMANA' ? 'bg-white text-indigo-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Settimana
            </button>
            <button
              type="button"
              onClick={() => setVista('MESE')}
              className={`px-2.5 py-0.5 rounded-lg transition ${vista === 'MESE' ? 'bg-white text-indigo-900 shadow-2xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Mese
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCompresso(!compresso)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title={compresso ? "Espandi" : "Comprimi"}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${compresso ? '' : 'rotate-180'}`} />
          </button>

          <button
            type="button"
            onClick={() => setVisibile(false)}
            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
            title="Chiudi banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CONTENUTO ESPANSO */}
      {!compresso && (
        <div className="pt-1 animate-in fade-in duration-150">
          {vista === 'SETTIMANA' ? (
            /* VISTA SETTIMANALE: 5 GIORNI (LUN - VEN) */
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {statsSettimana.map((s) => {
                const badgeGravita = 
                  s.totDocentiAssenti === 0 
                    ? { label: 'Tranquilla', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '✓' }
                    : s.gravita === 'COMPLICATO'
                      ? { label: 'Complicato (>7)', color: 'bg-rose-600 text-white border-rose-700 font-black animate-pulse shadow-2xs', icon: '🔥' }
                      : s.gravita === 'DISCRETA'
                        ? { label: 'Discreta (4-7)', color: 'bg-amber-100 text-amber-950 border-amber-300 font-black', icon: '⚡' }
                        : { label: 'Semplice (1-3)', color: 'bg-sky-50 text-sky-900 border-sky-200', icon: 'ℹ️' };

                return (
                  <button
                    key={s.dataStr}
                    type="button"
                    onClick={() => onSelectDate(s.dataStr)}
                    className={`p-2 rounded-xl text-left transition border cursor-pointer flex flex-col justify-between gap-1.5 ${
                      s.isSelezionata 
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/60 shadow-2xs' 
                        : 'bg-slate-50/70 hover:bg-slate-100/90 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-800">
                        {s.giornoNome.slice(0, 3)} {new Date(s.dataStr).getDate()}
                      </span>
                      {s.isOggi && (
                        <span className="text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.2 rounded-md shadow-2xs">
                          Oggi
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-slate-600">
                        {s.totCoperte}/{s.totOreScoperte} ore <span className="text-[10px] text-slate-400 font-normal">({s.totDocentiAssenti} doc)</span>
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border ${badgeGravita.color}`}>
                        {badgeGravita.icon} {s.totOreScoperte === 0 ? '0' : s.totRimanenti > 0 ? `${s.totRimanenti} da fare` : 'OK'}
                      </span>
                    </div>

                    {/* Mini progress bar del giorno */}
                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          s.totOreScoperte === 0 || s.totCoperte === s.totOreScoperte
                            ? 'bg-emerald-500' 
                            : s.gravita === 'COMPLICATO' 
                              ? 'bg-rose-500' 
                              : s.gravita === 'DISCRETA'
                                ? 'bg-amber-500'
                                : 'bg-sky-500'
                        }`}
                        style={{ width: `${s.totOreScoperte > 0 ? Math.min(100, (s.totCoperte / s.totOreScoperte) * 100) : 100}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* VISTA MENSILE ULTRA-COMPATTA (PROSSIMI 25 GIORNI DI SCUOLA) */
            <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                  Prossimi 25 Giorni di Scuola (da Oggi in poi)
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Clicca su una casella per saltare a quella data</span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-13 lg:grid-cols-25 gap-1 text-center">
                {statsMese.map((st) => {
                  const dObj = new Date(st.dataStr);
                  const giornoMeseNum = dObj.getDate();
                  const meseAbbr = dObj.toLocaleDateString('it-IT', { month: 'short' });

                  const bgCol = 
                    st.totDocentiAssenti === 0 
                      ? 'bg-white text-emerald-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40' 
                      : st.totRimanenti === 0 
                        ? 'bg-emerald-500 text-white border-emerald-600 font-black shadow-2xs'
                        : st.gravita === 'COMPLICATO'
                          ? 'bg-rose-500 text-white border-rose-600 font-black animate-pulse shadow-2xs'
                          : st.gravita === 'DISCRETA'
                            ? 'bg-amber-100 text-amber-950 border-amber-300 font-black shadow-2xs'
                            : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100/60';

                  return (
                    <button
                      key={st.dataStr}
                      type="button"
                      onClick={() => onSelectDate(st.dataStr)}
                      className={`py-1 px-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center justify-center min-w-[32px] ${bgCol} ${
                        st.isSelezionata ? 'ring-2 ring-indigo-500 scale-105 shadow-2xs font-black' : 'hover:scale-105'
                      }`}
                      title={`${st.giornoNome} ${giornoMeseNum} ${meseAbbr}: ${st.totDocentiAssenti} assenti (${st.totCoperte}/${st.totOreScoperte} ore coperte)`}
                    >
                      <span className="text-[8px] text-slate-500 leading-none uppercase">{st.giornoNome.slice(0, 2)}</span>
                      <span className="font-black text-[11px] leading-tight my-0.5">{giornoMeseNum}</span>
                      <span className="text-[7px] leading-none font-bold opacity-90">
                        {st.totDocentiAssenti > 0 ? `${st.totDocentiAssenti}d` : '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEGENDA GRAVITÀ SOTTOSTANTE */}
          <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100 gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-700">Stima gravità:</span>
              <span className="flex items-center gap-1 text-emerald-700 font-bold">🟢 Tranquilla (0 assenti)</span>
              <span className="flex items-center gap-1 text-sky-700 font-bold">🔵 Semplice (1-3 assenti)</span>
              <span className="flex items-center gap-1 text-amber-700 font-bold">🟡 Discreta (4-7 assenti)</span>
              <span className="flex items-center gap-1 text-rose-600 font-black">🔴 Complicato (&gt;7 assenti)</span>
            </div>
            <span className="text-slate-400 italic">Clicca su qualsiasi giorno per selezionarlo</span>
          </div>
        </div>
      )}
    </div>
  );
};