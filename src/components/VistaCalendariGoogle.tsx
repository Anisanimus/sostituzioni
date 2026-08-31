import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, ExternalLink, Layers, Monitor, Theater, Info, RefreshCw
} from 'lucide-react';

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

  const { impostazioniScuola } = useApp();
  const cfg = impostazioniScuola?.calendariGoogle;

  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Ottieni la lista dinamica degli impegni o risorse
  const listaCalendari = React.useMemo(() => {
    if (modalita === 'IMPEGNI') {
      if (cfg?.impegni && Array.isArray(cfg.impegni) && cfg.impegni.length > 0) {
        return cfg.impegni.filter(c => c.googleId && c.googleId.trim());
      }
      // Fallback legacy
      const leg: { id: string; nome: string; googleId: string; colore?: string }[] = [];
      if (cfg?.impegniPlenariId) leg.push({ id: 'cal_plenari', nome: 'Plenari / Unitari', googleId: cfg.impegniPlenariId, colore: '#039BE5' });
      if (cfg?.impegniSecondariaId) leg.push({ id: 'cal_secondaria', nome: 'Secondaria', googleId: cfg.impegniSecondariaId, colore: '#7986CB' });
      return leg;
    } else {
      if (cfg?.risorse && Array.isArray(cfg.risorse) && cfg.risorse.length > 0) {
        return cfg.risorse.filter(r => r.googleId && r.googleId.trim());
      }
      // Fallback legacy
      const leg: { id: string; nome: string; googleId: string; colore?: string }[] = [];
      if (cfg?.risorseInformaticaId) leg.push({ id: 'cal_informatica', nome: 'Lab. Informatica', googleId: cfg.risorseInformaticaId, colore: '#009688' });
      if (cfg?.risorseTeatroId) leg.push({ id: 'cal_teatro', nome: 'Teatro / Aula Magna', googleId: cfg.risorseTeatroId, colore: '#E65100' });
      return leg;
    }
  }, [cfg, modalita]);

  // ID del filtro selezionato ('TUTTI' oppure l'ID del singolo calendario)
  const [filtroSelezionato, setFiltroSelezionato] = useState<string>('TUTTI');

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

    // Modalità combinata "TUTTI": aggiungi tutti i calendari della categoria
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

  return (
    <div className="space-y-4 max-w-6xl mx-auto animate-in fade-in duration-200">
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl text-white shadow-md ${modalita === 'IMPEGNI' ? 'bg-indigo-600' : 'bg-teal-600'}`}>
            {modalita === 'IMPEGNI' ? <Calendar className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              {modalita === 'IMPEGNI' ? 'Impegni Scolastici & Calendario' : 'Risorse & Spazi Prenotabili'}
            </h2>
            <p className="text-xs text-slate-500">
              {modalita === 'IMPEGNI' 
                ? "Consigli, riunioni collegiali, dipartimenti e scadenze dell'Istituto"
                : 'Disponibilità e occupazione di aule speciali, laboratori e spazi comuni'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {listaCalendari.length > 0 && (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 flex-wrap">
              {listaCalendari.length > 1 && (
                <button
                  type="button"
                  onClick={() => setFiltroSelezionato('TUTTI')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    filtroSelezionato === 'TUTTI'
                      ? modalita === 'IMPEGNI' ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'bg-teal-600 text-white shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{modalita === 'IMPEGNI' ? 'Tutti gli Impegni' : 'Tutte le Risorse'}</span>
                </button>
              )}

              {listaCalendari.map((cal) => (
                <button
                  key={cal.id}
                  type="button"
                  onClick={() => setFiltroSelezionato(cal.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    filtroSelezionato === cal.id
                      ? modalita === 'IMPEGNI' ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'bg-teal-600 text-white shadow-2xs font-black'
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
            title="Ricarica Calendario"
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
              La Vicepresidenza può inserire gli ID dei calendari Google (es. <em>c_xxxx@group.calendar.google.com</em>) nella sezione <strong>Personalizzazioni</strong> per renderli visibili istantaneamente a tutti i docenti e al personale ATA.
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
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-2 sm:p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-800">Sincronizzato in Tempo Reale con Google Calendar</span>
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
