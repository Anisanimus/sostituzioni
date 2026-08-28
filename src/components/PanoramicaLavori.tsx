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
  
  // Stato visibilità banner - SU MOBILE default chiuso/compresso, su desktop aperto
  const [visibile, setVisibile] = useState(true);
  const [compresso, setCompresso] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
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

    // Conteggio effettivo ore coperte (fatti), pubblicate (inviata richiesta) e firmate (presa visione fatta)
    const sostituzioniEffettive = oreScoperteGiorno
      .map(os => sostituzioniData.find(s => s.ora === os.ora && s.classe === os.classe))
      .filter(Boolean) as typeof sostituzioniData;

    const totCoperte = sostituzioniEffettive.length; // FATTI
    const totPubblicate = sostituzioniEffettive.filter(s => s.pubblicata).length; // RICHIESTE INVIATE
    const totFirmate = sostituzioniEffettive.filter(s => s.firmata).length; // PRESA VISIONE EFFETTUATA
    const totRimanenti = Math.max(0, totOreScoperte - totCoperte); // DA FARE

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
      totPubblicate,
      totFirmate,
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

  // Effetto per allineare la card attiva: CENTRATA su mobile, PRIMA A SINISTRA su desktop
  React.useEffect(() => {
    const elActive = document.getElementById(`day_card_${selectedDate}`);
    const track = document.getElementById('panoramicaCarouselTrack');
    if (elActive && track) {
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        // Centrato su mobile
        elActive.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        // Primo a sinistra su desktop
        elActive.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
    }
  }, [selectedDate, compresso]);

  // Funzione helper per scorrere o cambiare giorno
  const scrollCarousel = (offset: number) => {
    if (compresso) {
      // Se compresso, le frecce cambiano direttamente il giorno selezionato
      const curIndex = datesFinestra.indexOf(selectedDate);
      if (offset > 0) {
        if (curIndex < datesFinestra.length - 1) onSelectDate(datesFinestra[curIndex + 1]);
      } else {
        if (curIndex > 0) onSelectDate(datesFinestra[curIndex - 1]);
      }
    } else {
      // Se aperto, scorre fluidamente il carosello
      const el = document.getElementById('panoramicaCarouselTrack');
      if (el) el.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleSelectGiorno = (dataStr: string) => {
    onSelectDate(dataStr);
    // Su schermi mobile (< 640px) chiude automaticamente la tendina dopo la selezione
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setCompresso(true);
    }
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
          <span>Mostra Sostituzioni</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-800 rounded-2xl rounded-b-none p-3 sm:p-3.5 shadow-2xs border border-b-0 border-slate-200 space-y-2.5 transition-all">
      
      {/* HEADER PANORAMICA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
        {/* TITOLO + DATA BEN VISIBILE CON FONT PIÙ GRANDE */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              Sostituzioni
            </span>
            <span className="bg-indigo-600 text-white text-xs sm:text-sm font-black px-3 py-1 rounded-xl shadow-xs">
              {currentStat.giornoNome} {new Date(selectedDate).getDate()}/{new Date(selectedDate).getMonth() + 1}
            </span>
          </div>
        </div>

        {/* CONTROLLI: CALENDARIO + FRECCE + BADGE ORE FATTE/PERCENTUALE + TOGGLE COMPRIMI */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
          
          <div className="flex items-center gap-1.5">
            {/* PULSANTE ICONA CALENDARIO */}
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

            {/* FRECCE SCORRIMENTO CAROSELLO */}
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
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* 1. ORE COPERTE CON ICONA OROLOGIO (DESKTOP: ORE ASSEGNATE, MOBILE: SOLO ICONA E CONTEGGIO) */}
            <span className={`text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1 ${
              totGiornoScoperte === 0 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : percentualeGiorno === 100 
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
            }`} title="Ore assegnate / Totale ore">
              <span>🕒 {totGiornoCoperte}/{totGiornoScoperte}</span>
              <span className="hidden sm:inline font-bold">ore assegnate</span>
              {totGiornoCoperte === totGiornoScoperte && totGiornoScoperte > 0 && <span>✓</span>}
            </span>

            {/* 3. RICHIESTE INVIATE (PUBBLICATE) */}
            {totGiornoCoperte > 0 && (
              <span className={`text-[10px] sm:text-[11px] font-black px-2 py-1 rounded-full border flex items-center gap-1 transition ${
                currentStat.totPubblicate === totGiornoCoperte
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : currentStat.totPubblicate > 0
                    ? 'bg-sky-50 text-sky-900 border-sky-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
              }`} title="Richieste di sostituzione pubblicate / inviate ai docenti">
                <span>📤 {currentStat.totPubblicate}/{totGiornoCoperte}</span>
                <span className="hidden sm:inline font-normal text-[10px]">inviate</span>
                {currentStat.totPubblicate === totGiornoCoperte && <span>✓</span>}
              </span>
            )}

            {/* 4. PRESE VISIONE (FIRMATE) */}
            {totGiornoCoperte > 0 && (
              <span className={`text-[10px] sm:text-[11px] font-black px-2 py-1 rounded-full border flex items-center gap-1 transition ${
                currentStat.totFirmate === totGiornoCoperte
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                  : currentStat.totFirmate > 0
                    ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
              }`} title="Prese visione (firme) effettuate dai docenti">
                <span>✍️ {currentStat.totFirmate}/{totGiornoCoperte}</span>
                <span className="hidden sm:inline font-normal text-[10px]">firmate</span>
                {currentStat.totFirmate === totGiornoCoperte && <span>✓</span>}
              </span>
            )}

            <button
              type="button"
              onClick={() => setCompresso(!compresso)}
              className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 sm:border-transparent transition cursor-pointer"
              title={compresso ? "Espandi" : "Comprimi"}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${compresso ? '' : 'rotate-180'}`} />
            </button>
          </div>

        </div>
      </div>

      {/* CONTENUTO ESPANSO */}
      {!compresso && (
        <div className="pt-0.5 animate-in fade-in duration-150 space-y-2.5">
          
          {/* ========================================================================= */}
          {/* VISTA DESKTOP (SM+): CAROSELLO ORIZZONTALE CLASSICO                      */}
          {/* ========================================================================= */}
          <div className="hidden sm:block">
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
                    className={`min-w-[210px] sm:min-w-[230px] p-2.5 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 shrink-0 ${
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

                    {/* RIGA 1: ORE COPERTE CON ICONA OROLOGIO E GRAVITÀ */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <span>🕒 {s.totCoperte}/{s.totOreScoperte}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({s.totDocentiAssenti} doc)</span>
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border ${badgeGravita.color}`}>
                        {badgeGravita.icon} {badgeGravita.label}
                      </span>
                    </div>

                    {/* RIGA 2: RICHIESTE INVIATE E PRESE VISIONE */}
                    {s.totCoperte > 0 && (
                      <div className="grid grid-cols-2 gap-1 text-[10px] font-bold bg-slate-100/90 p-1.5 rounded-lg border border-slate-200/70">
                        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition ${
                          s.totPubblicate === s.totCoperte
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'text-sky-950 border-transparent'
                        }`} title="Richieste inviate">
                          <span>📤</span>
                          <span>{s.totPubblicate}/{s.totCoperte} inviate {s.totPubblicate === s.totCoperte ? '✓' : ''}</span>
                        </span>
                        <span className={`flex items-center justify-end gap-1 px-1.5 py-0.5 rounded border transition ${
                          s.totFirmate === s.totCoperte 
                            ? 'bg-emerald-600 text-white border-emerald-700 font-black shadow-2xs' 
                            : s.totFirmate > 0
                              ? 'text-indigo-950 border-transparent'
                              : 'text-slate-500 border-transparent'
                        }`} title="Prese visione effettuate">
                          <span>✍️</span>
                          <span>{s.totFirmate}/{s.totCoperte} firmate {s.totFirmate === s.totCoperte ? '✓' : ''}</span>
                        </span>
                      </div>
                    )}

                    {/* Mini progress bar del giorno */}
                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          s.totOreScoperte === 0 || (s.totCoperte === s.totOreScoperte && s.totFirmate === s.totOreScoperte)
                            ? 'bg-emerald-500' 
                            : s.totCoperte === s.totOreScoperte
                              ? 'bg-indigo-500'
                              : s.gravita === 'COMPLICATO' 
                                ? 'bg-rose-500' 
                                : s.gravita === 'DISCRETA'
                                  ? 'bg-amber-500'
                                  : 'bg-sky-500'
                        }`}
                        style={{ 
                          width: `${
                            s.totOreScoperte > 0 
                              ? Math.min(100, ( (s.totCoperte * 0.5 + s.totFirmate * 0.5) / s.totOreScoperte) * 100) 
                              : 100
                          }%` 
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VISTA MOBILE (BLOCK SU SMARTPHONE): CALENDARIO VERTICALE + TOGGLE MESE    */}
          {/* ========================================================================= */}
          <div className="block sm:hidden space-y-2.5">
            {/* SELETTORE VISTA MOBILE: SETTIMANA / MESE */}
            <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setVista('GIORNO')}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  vista === 'GIORNO' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                📅 Settimana
              </button>
              <button
                type="button"
                onClick={() => setVista('SETTIMANA')}
                className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
                  vista === 'SETTIMANA' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🗓️ Mese
              </button>
            </div>

            {/* SE VISTA MESE SU MOBILE: MINI MAPPA A MATRICE DEI GIORNI */}
            {vista === 'SETTIMANA' && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-black text-slate-700 uppercase">
                  <span>Mappa Mensile</span>
                  <span className="text-[10px] text-slate-400 font-bold">{statsGiorni.length} Giorni</span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {statsGiorni.map((d) => {
                    const isSel = d.isSelezionata;
                    const isAllOk = d.totOreScoperte > 0 && d.totCoperte === d.totOreScoperte && d.totFirmate === d.totOreScoperte;
                    const bgClass = d.totOreScoperte === 0
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : isAllOk
                        ? 'bg-emerald-600 text-white font-black shadow-2xs'
                        : d.gravita === 'COMPLICATO'
                          ? 'bg-rose-500 text-white font-black'
                          : 'bg-amber-100 text-amber-950 border border-amber-300 font-bold';

                    return (
                      <button
                        key={`mini_${d.dataStr}`}
                        type="button"
                        onClick={() => handleSelectGiorno(d.dataStr)}
                        className={`p-1 rounded-lg ${bgClass} text-[10px] leading-tight flex flex-col items-center justify-center transition cursor-pointer ${
                          isSel ? 'ring-2 ring-indigo-600 ring-offset-1 scale-105' : ''
                        }`}
                      >
                        <span className="font-black">{new Date(d.dataStr).getDate()}</span>
                        <span className="text-[7px] opacity-90">{d.totOreScoperte > 0 ? `${d.totCoperte}/${d.totOreScoperte}` : '✓'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FEED VERTICALE CARD GIORNALIERE SU MOBILE */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {(vista === 'GIORNO' ? statsGiorni.slice(0, 7) : statsGiorni).map((s) => {
                const isCompletato = s.totOreScoperte > 0 && s.totCoperte === s.totOreScoperte && s.totFirmate === s.totOreScoperte;
                const perc = s.totOreScoperte > 0 ? Math.round((s.totCoperte / s.totOreScoperte) * 100) : 100;
                
                const badgeGravita = 
                  s.totDocentiAssenti === 0 
                    ? { label: 'Tranquilla', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '✓' }
                    : s.gravita === 'COMPLICATO'
                      ? { label: `Complicato (${s.totDocentiAssenti})`, color: 'bg-rose-600 text-white font-black animate-pulse', icon: '🔥' }
                      : s.gravita === 'DISCRETA'
                        ? { label: `Discreta (${s.totDocentiAssenti})`, color: 'bg-amber-100 text-amber-950 border-amber-300 font-black', icon: '⚡' }
                        : { label: `Semplice (${s.totDocentiAssenti})`, color: 'bg-sky-50 text-sky-900 border-sky-200 font-bold', icon: 'ℹ️' };

                return (
                  <div
                    key={`mob_${s.dataStr}`}
                    onClick={() => handleSelectGiorno(s.dataStr)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                      s.isSelezionata
                        ? 'bg-indigo-50/90 border-2 border-indigo-600 ring-2 ring-indigo-200 shadow-sm'
                        : isCompletato
                          ? 'bg-white border-emerald-200 hover:border-emerald-300'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Header Card */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center font-black leading-tight shrink-0 ${
                          s.isOggi ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          <span className="text-[8px] uppercase opacity-80">{s.giornoNome.slice(0, 3)}</span>
                          <span className="text-xs font-black">{new Date(s.dataStr).getDate()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-black text-xs text-slate-900">{s.giornoNome} {new Date(s.dataStr).getDate()} {new Date(s.dataStr).toLocaleDateString('it-IT', { month: 'short' })}</span>
                            {s.isOggi && <span className="bg-indigo-600 text-white font-black text-[8px] px-1 py-0.2 rounded">OGGI</span>}
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {s.totDocentiAssenti === 0 ? 'Nessuna assenza' : `${s.totDocentiAssenti} ${s.totDocentiAssenti === 1 ? 'docente assente' : 'docenti assenti'}`}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${badgeGravita.color} shrink-0`}>
                        {badgeGravita.icon} {badgeGravita.label}
                      </span>
                    </div>

                    {/* Metric badges */}
                    {s.totOreScoperte > 0 ? (
                      <div className="space-y-1.5 my-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            s.totCoperte === s.totOreScoperte ? 'bg-emerald-600 text-white' : 'bg-amber-50 text-amber-950 border-amber-300'
                          }`}>
                            <span>🕒 {s.totCoperte}/{s.totOreScoperte}</span>
                            {s.totCoperte === s.totOreScoperte && <span>✓</span>}
                          </span>

                          {s.totCoperte > 0 && (
                            <>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                s.totPubblicate === s.totCoperte ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-sky-50 text-sky-950 border-sky-200'
                              }`}>
                                <span>📤 {s.totPubblicate}/{s.totCoperte}</span>
                                {s.totPubblicate === s.totCoperte && <span>✓</span>}
                              </span>

                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                s.totFirmate === s.totCoperte ? 'bg-emerald-600 text-white' : 'bg-indigo-50 text-indigo-950 border-indigo-200'
                              }`}>
                                <span>✍️ {s.totFirmate}/{s.totCoperte}</span>
                                {s.totFirmate === s.totCoperte && <span>✓</span>}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                          <div className={`${isCompletato ? 'bg-emerald-600' : 'bg-amber-500'} h-1 rounded-full`} style={{ width: `${perc}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-medium my-1 flex items-center gap-1">
                        <span className="text-emerald-700 font-bold">🕒 0/0 ✓</span>
                        <span>Nessuna copertura necessaria</span>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-indigo-600">
                      <span>{s.isSelezionata ? '📌 Giorno aperto nel tabellone sotto' : 'Tocca per aprire questo giorno'}</span>
                      <span>{s.isSelezionata ? 'Attivo' : '→'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};