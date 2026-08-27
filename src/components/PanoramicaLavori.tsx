import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getBaseNomeDocente, getDocentiCollegatiIds } from '../utils/docentiHelper';
import { 
  ChevronDown, X, BarChart3, TrendingUp, Calendar 
} from 'lucide-react';

interface PanoramicaLavoriProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const PanoramicaLavori: React.FC<PanoramicaLavoriProps> = ({ selectedDate, onSelectDate }) => {
  const { docenti, orariDocenti, assenze, uscite, sostituzioni } = useApp();
  
  // Stato visibilità banner
  const [visibile, setVisibile] = useState(true);
  const [compresso, setCompresso] = useState(false);
  const [vista, setVista] = useState<'GIORNO' | 'SETTIMANA'>('GIORNO');

  const todayStr = new Date().toISOString().split('T')[0];

  // Calcola una finestra di giorni scolastici (Lun-Ven) con 10 giorni passati e 25 futuri
  const getFinestraGiorniScuola = (passati: number = 10, futuri: number = 25) => {
    const dates: string[] = [];
    
    // Giorni passati
    let curPast = new Date();
    const tempPast: string[] = [];
    while (tempPast.length < passati) {
      curPast.setDate(curPast.getDate() - 1);
      if (curPast.getDay() !== 0 && curPast.getDay() !== 6) {
        tempPast.unshift(curPast.toISOString().split('T')[0]);
      }
    }
    dates.push(...tempPast);

    // Oggi + Giorni futuri
    let cur = new Date();
    while (dates.length < passati + futuri) {
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

  const datesFinestra = getFinestraGiorniScuola(10, 25);
  const statsGiorni = datesFinestra.map(d => getStatsGiorno(d));

  // Statistiche del giorno selezionato o di oggi
  const currentStat = getStatsGiorno(selectedDate);
  const totGiornoScoperte = currentStat.totOreScoperte;
  const totGiornoCoperte = currentStat.totCoperte;
  const percentualeGiorno = totGiornoScoperte > 0 
    ? Math.round((totGiornoCoperte / totGiornoScoperte) * 100) 
    : 100;

  // Effetto per centrare/scorrere la card attiva nel carosello all'avvio e quando cambia data
  React.useEffect(() => {
    const elActive = document.getElementById(`day_card_${selectedDate}`);
    if (elActive) {
      elActive.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedDate, compresso]);

  // Funzione helper per scorrere il carosello orizzontale
  const scrollCarousel = (offset: number) => {
    const el = document.getElementById('panoramicaCarouselTrack');
    if (el) el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  if (!visibile) {
    return (
      <div className="flex justify-end mb-1">
        <button
          type="button"
          onClick={() => setVisibile(true)}
          className="bg-white hover:bg-slate-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Mostra Avanzamento Lavori</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-2xs border border-slate-200 mb-3 space-y-2.5 transition-all">
      
      {/* HEADER PANORAMICA */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide text-slate-800">
                Avanzamento Lavori
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                totGiornoScoperte === 0 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : percentualeGiorno === 100 
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}>
                {totGiornoCoperte}/{totGiornoScoperte} Ore ({percentualeGiorno}%)
              </span>
            </div>
          </div>
        </div>

        {/* CONTROLLI: VISTA (Giorno / Settimana / Mese) + FRECCE SCORRIMENTO + COMPRIMI + CHIUDI */}
        <div className="flex items-center gap-1.5">
          
          {/* PULSANTE ICONA CALENDARIO PER SCEGLIERE QUALSIASI GIORNO */}
          <label className="relative p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-indigo-900 border border-slate-200 shadow-2xs flex items-center justify-center cursor-pointer transition" title="Scegli giorno dal calendario">
            <Calendar className="w-4 h-4 text-indigo-700" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </label>

          {/* FRECCE SCORRIMENTO CAROSELLO (INDIETRO / AVANTI) */}
          <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => scrollCarousel(-220)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 text-slate-700 text-xs font-black transition cursor-pointer"
              title="Scorri indietro"
            >
              ❮
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(220)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 text-slate-700 text-xs font-black transition cursor-pointer"
              title="Scorri avanti"
            >
              ❯
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
        </div>
      </div>

      {/* CONTENUTO ESPANSO */}
      {!compresso && (
        <div className="pt-0.5 animate-in fade-in duration-150 space-y-2">
          
          {/* ========================================================================= */}
          {/* 1. VISTA GIORNO (DEFAULT): FOCUS SU OGGI + CAROSELLO PROSSIMI GIORNI      */}
          {/* ========================================================================= */}
          {vista === 'GIORNO' && (
            <div 
              id="panoramicaCarouselTrack"
              className="flex gap-2.5 overflow-x-auto py-1 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {statsGiorni.map((s) => {
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
                    id={`day_card_${s.dataStr}`}
                    type="button"
                    onClick={() => onSelectDate(s.dataStr)}
                    className={`min-w-[190px] sm:min-w-[210px] p-2.5 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 shrink-0 ${
                      s.isSelezionata 
                        ? 'bg-indigo-50/90 border-2 border-indigo-600 ring-4 ring-indigo-200/80 shadow-md scale-[1.01]' 
                        : 'bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-800">
                        {s.giornoNome.slice(0, 3)} {new Date(s.dataStr).getDate()} {new Date(s.dataStr).toLocaleDateString('it-IT', { month: 'short' })}
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
          )}

          {/* ========================================================================= */}
          {/* LEGENDA A FASCIA CONTINUA DI COLORI (-) E (+) CON GRADIENTE               */}
          {/* ========================================================================= */}
          {/* LEGENDA A FASCIA CONTINUA DI COLORI (-) E (+) (VISIBILE SOLO SU DESKTOP)  */}
          {/* ========================================================================= */}
          <div className="hidden sm:flex flex-wrap items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="font-bold text-slate-700 text-xs shrink-0">Gravità:</span>
              <span className="font-black text-slate-500 text-xs">−</span>
              {/* Barra / Fascia continua di colori */}
              <div className="h-3 w-40 sm:w-56 rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 via-amber-400 to-rose-500 shadow-inner border border-slate-200" title="Scala gravità da Tranquilla (-) a Complicato (+)" />
              <span className="font-black text-slate-500 text-xs">+</span>
              <span className="text-[10px] text-slate-400 hidden sm:inline ml-1">(Verde: 0 doc • Azzurro: 1-3 • Giallo: 4-7 • Rosso: &gt;7)</span>
            </div>
            <span className="text-[10px] text-slate-400 italic">Usa ❮ ❯ per scorrere i giorni futuri</span>
          </div>

        </div>
      )}
    </div>
  );
};