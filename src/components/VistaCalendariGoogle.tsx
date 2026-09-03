import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, ExternalLink, Layers, Monitor, Info, RefreshCw, Clock, MapPin, AlignLeft, CalendarDays, Sparkles
} from 'lucide-react';
import { formatDataItaliana } from '../utils/docentiHelper';

interface VistaCalendariGoogleProps {
  modalita: 'IMPEGNI' | 'RISORSE';
}

export const VistaCalendariGoogle: React.FC<VistaCalendariGoogleProps> = ({ modalita }) => {
  const sanitizeCalendarId = (input?: string): string => {
    if (!input) return '';
    const trimmed = input.trim();
    if (trimmed.includes('src=')) {
      const match = trimmed.match(/src=([^&]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]);
    }
    return trimmed;
  };

  const { impostazioniScuola, eventiCalendariCache } = useApp();
  const { utenteInfo } = useAuth();
  const cfg = impostazioniScuola?.calendariGoogle;

  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Se l'utente è ATA (senza Google account) o ci sono eventi in cache, default su NATIVA
  const isAtaUser = utenteInfo?.ruolo === 'PERSONALE_ATA';
  const [visualizzazione, setVisualizzazione] = useState<'NATIVA' | 'GOOGLE'>(() => {
    return isAtaUser || (eventiCalendariCache && eventiCalendariCache.length > 0) ? 'NATIVA' : 'GOOGLE';
  });

  // Ottieni la lista dinamica degli impegni o risorse
  const listaCalendari = React.useMemo(() => {
    if (modalita === 'IMPEGNI') {
      if (cfg?.impegni && Array.isArray(cfg.impegni) && cfg.impegni.length > 0) {
        return cfg.impegni.filter(c => c.googleId && c.googleId.trim());
      }
      const leg: { id: string; nome: string; googleId: string; colore?: string }[] = [];
      if (cfg?.impegniPlenariId) leg.push({ id: 'cal_plenari', nome: 'Plenari / Unitari', googleId: cfg.impegniPlenariId, colore: '#039BE5' });
      if (cfg?.impegniSecondariaId) leg.push({ id: 'cal_secondaria', nome: 'Secondaria', googleId: cfg.impegniSecondariaId, colore: '#7986CB' });
      return leg;
    } else {
      if (cfg?.risorse && Array.isArray(cfg.risorse) && cfg.risorse.length > 0) {
        return cfg.risorse.filter(r => r.googleId && r.googleId.trim());
      }
      const leg: { id: string; nome: string; googleId: string; colore?: string }[] = [];
      if (cfg?.risorseInformaticaId) leg.push({ id: 'cal_informatica', nome: 'Lab. Informatica', googleId: cfg.risorseInformaticaId, colore: '#009688' });
      if (cfg?.risorseTeatroId) leg.push({ id: 'cal_teatro', nome: 'Teatro / Aula Magna', googleId: cfg.risorseTeatroId, colore: '#E65100' });
      return leg;
    }
  }, [cfg, modalita]);

  // ID del filtro selezionato ('TUTTI' oppure l'ID del singolo calendario)
  const [filtroSelezionato, setFiltroSelezionato] = useState<string>('TUTTI');

  // Eventi filtrati per la modalità corrente e filtro selezionato
  const eventiFiltrati = React.useMemo(() => {
    if (!eventiCalendariCache || eventiCalendariCache.length === 0) return [];
    
    // Filtra per tipologia (IMPEGNI o RISORSE)
    let evs = eventiCalendariCache.filter(e => e.tipo === modalita);

    // Filtra per singolo calendario se selezionato
    if (filtroSelezionato !== 'TUTTI') {
      const targetCal = listaCalendari.find(c => c.id === filtroSelezionato || c.googleId === filtroSelezionato);
      if (targetCal) {
        evs = evs.filter(e => e.calendarioId === targetCal.googleId);
      }
    }

    // Ordina cronologicamente
    return evs.sort((a, b) => new Date(a.dataInizio).getTime() - new Date(b.dataInizio).getTime());
  }, [eventiCalendariCache, modalita, filtroSelezionato, listaCalendari]);

  // Eventi raggruppati per data (oggi in avanti)
  const eventiProssimiRaggruppati = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtratiOggiInPoi = eventiFiltrati.filter(e => {
      const d = new Date(e.dataInizio);
      return d >= today;
    });

    const gruppi: { [data: string]: typeof eventiFiltrati } = {};
    filtratiOggiInPoi.forEach(ev => {
      const dataIso = ev.dataInizio.split('T')[0];
      if (!gruppi[dataIso]) gruppi[dataIso] = [];
      gruppi[dataIso].push(ev);
    });

    return Object.entries(gruppi).map(([dataStr, items]) => ({
      data: dataStr,
      dataFmt: formatDataItaliana(dataStr),
      items
    }));
  }, [eventiFiltrati]);

  const generaEmbedUrl = (): string => {
    const baseUrl = 'https://calendar.google.com/calendar/embed?ctz=Europe%2FRome&mode=MONTH&showTitle=0&showNav=1&showDate=1&showPrint=1&showTabs=1&showCalendars=1&showTz=0';

    if (listaCalendari.length === 0) return baseUrl;

    if (filtroSelezionato !== 'TUTTI') {
      const target = listaCalendari.find(c => c.id === filtroSelezionato || c.googleId === filtroSelezionato);
      if (target) {
        const cleanId = sanitizeCalendarId(target.googleId);
        const col = encodeURIComponent(target.colore || (modalita === 'IMPEGNI' ? '#039BE5' : '#009688'));
        return `${baseUrl}&src=${encodeURIComponent(cleanId)}&color=${col}`;
      }
    }

    let url = baseUrl;
    const colors = modalita === 'IMPEGNI' 
      ? ['%23039BE5', '%237986CB', '%233F51B5', '%2300ACC1', '%235E35B1']
      : ['%23009688', '%23E65100', '%2343A047', '%23D81B60', '%238E24AA'];

    listaCalendari.forEach((cal, idx) => {
      const cleanId = sanitizeCalendarId(cal.googleId);
      if (cleanId) {
        const color = encodeURIComponent(cal.colore || '') || colors[idx % colors.length];
        url += `&src=${encodeURIComponent(cleanId)}&color=${color}`;
      }
    });

    return url;
  };

  const hasConfigurazione = listaCalendari.length > 0;

  const formatOrarioEvento = (isoStart: string, isoEnd: string, tuttoIlGiorno: boolean) => {
    if (tuttoIlGiorno || !isoStart.includes('T')) return 'Tutto il giorno';
    try {
      const dStart = new Date(isoStart);
      const dEnd = new Date(isoEnd);
      const startStr = dStart.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      const endStr = dEnd.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      return `${startStr} - ${endStr}`;
    } catch (e) {
      return 'Orario definito';
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-in fade-in duration-200">
      {/* HEADER DELLA VISTA */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl text-white shadow-md ${modalita === 'IMPEGNI' ? 'bg-indigo-600' : 'bg-teal-600'}`}>
            {modalita === 'IMPEGNI' ? <Calendar className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {modalita === 'IMPEGNI' ? 'Impegni Scolastici & Calendario' : 'Risorse & Spazi Prenotabili'}
              </h2>
              {isAtaUser && (
                <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>🔒 Accesso PIN ATA</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {modalita === 'IMPEGNI' 
                ? "Consigli, riunioni collegiali, dipartimenti e scadenze dell'Istituto"
                : 'Disponibilità e occupazione di aule speciali, laboratori e spazi comuni'}
            </p>
          </div>
        </div>

        {/* CONTROLLI E SELETTORE VISTA (NATIVA VS GOOGLE IFRAME) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Selettore Modalità di Visualizzazione */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setVisualizzazione('NATIVA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                visualizzazione === 'NATIVA'
                  ? modalita === 'IMPEGNI' ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'bg-teal-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Agenda Nativa (Veloce)</span>
            </button>

            <button
              type="button"
              onClick={() => setVisualizzazione('GOOGLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                visualizzazione === 'GOOGLE'
                  ? modalita === 'IMPEGNI' ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'bg-teal-600 text-white shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Google Calendar</span>
            </button>
          </div>

          {/* FILTRI CALENDARIO (TUTTI O SINGOLO) */}
          {listaCalendari.length > 0 && (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 flex-wrap">
              {listaCalendari.length > 1 && (
                <button
                  type="button"
                  onClick={() => setFiltroSelezionato('TUTTI')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    filtroSelezionato === 'TUTTI'
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Tutti</span>
                </button>
              )}

              {listaCalendari.map((cal) => (
                <button
                  key={cal.id}
                  type="button"
                  onClick={() => setFiltroSelezionato(cal.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    filtroSelezionato === cal.id
                      ? 'bg-white text-slate-900 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cal.colore || (modalita === 'IMPEGNI' ? '#039BE5' : '#009688') }} />
                  <span>{cal.nome || 'Calendario'}</span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
            title="Ricarica"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!hasConfigurazione ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
            <Calendar className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-black text-slate-900">
              Calendari Google non ancora collegati
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              La Vicepresidenza può inserire gli ID dei calendari Google nella sezione <strong>Personalizzazioni</strong> per renderli visibili istantaneamente a tutti i docenti e al personale ATA.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-lg mx-auto text-left text-xs text-slate-600 space-y-1.5">
            <span className="font-black text-slate-800 block flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Come trovare l'ID di un Google Calendar:</span>
            </span>
            <p>1. Apri Google Calendar dal browser web.</p>
            <p>2. Clicca sui 3 puntini accanto al calendario ➔ <strong>Impostazioni e condivisione</strong>.</p>
            <p>3. Scorri fino alla sezione <em>"Integra calendario"</em> e copia il campo <strong>ID Calendario</strong>.</p>
          </div>
        </div>
      ) : visualizzazione === 'NATIVA' ? (
        /* ========================================================================= */
        /* 1. VISUALIZZAZIONE NATIVA AD AGENDA (OTTIMIZZATA PER PERSONALE ATA / PIN) */
        /* ========================================================================= */
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-black text-slate-800">
                  Agenda Eventi Sincronizzata ({eventiFiltrati.length} eventi totali registrati)
                </span>
              </div>

              <span className="text-[11px] text-slate-500">
                Visualizzazione diretta senza richiesta di login Google
              </span>
            </div>

            {eventiProssimiRaggruppati.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-700">Nessun evento futuro registrato</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Non ci sono impegni o prenotazioni registrate per le prossime giornate nei calendari selezionati.
                  La Vicepresidenza può premere <em>"Sincronizza Eventi Ora"</em> nel tab Personalizzazioni.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {eventiProssimiRaggruppati.map((gruppo) => (
                  <div key={gruppo.data} className="space-y-2.5">
                    {/* INTESTAZIONE GIORNO */}
                    <div className="flex items-center gap-2 sticky top-0 bg-white/95 backdrop-blur-xs py-1 z-10">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 shadow-2xs">
                        📅 {gruppo.dataFmt}
                      </span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    {/* CARD EVENTI DEL GIORNO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {gruppo.items.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200/80 shadow-2xs transition space-y-2 hover:border-indigo-300"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-2xs" style={{ backgroundColor: ev.colore || (modalita === 'IMPEGNI' ? '#039BE5' : '#009688') }}>
                                {ev.calendarioNome || (modalita === 'IMPEGNI' ? 'Impegno' : 'Risorsa')}
                              </span>
                              <h4 className="text-sm font-black text-slate-900 leading-tight">
                                {ev.titolo}
                              </h4>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                              <Clock className="w-3 h-3 text-indigo-600" />
                              <span>{formatOrarioEvento(ev.dataInizio, ev.dataFine, ev.tuttoIlGiorno)}</span>
                            </div>
                          </div>

                          {ev.luogo && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="font-semibold">{ev.luogo}</span>
                            </div>
                          )}

                          {ev.descrizione && (
                            <div className="flex items-start gap-1.5 text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                              <AlignLeft className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                              <p className="line-clamp-2 text-[11px] leading-relaxed">{ev.descrizione}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. VISUALIZZAZIONE NORMALE IFRAME GOOGLE CALENDAR                          */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-2 sm:p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-800">Visualizzazione Diretta Google Calendar</span>
            </div>
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Apri su Google Calendar</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="w-full h-[650px] sm:h-[750px] relative bg-slate-50">
            <iframe
              key={`${refreshKey}_${filtroSelezionato}_${modalita}`}
              src={generaEmbedUrl()}
              style={{ border: 0 }}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              title="Google Calendar Embed"
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
