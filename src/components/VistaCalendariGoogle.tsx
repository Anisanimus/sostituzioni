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

  // Calcolo ID attivi
  const idPlenari = sanitizeCalendarId(cfg?.impegniPlenariId);
  const idSecondaria = sanitizeCalendarId(cfg?.impegniSecondariaId);
  const idInformatica = sanitizeCalendarId(cfg?.risorseInformaticaId);
  const idTeatro = sanitizeCalendarId(cfg?.risorseTeatroId);

  const [filtroImpegni, setFiltroImpegni] = useState<'COMBINATO' | 'PLENARI' | 'SECONDARIA'>(() => {
    if (idPlenari && !idSecondaria) return 'PLENARI';
    if (idSecondaria && !idPlenari) return 'SECONDARIA';
    return 'COMBINATO';
  });

  const [filtroRisorse, setFiltroRisorse] = useState<'INFORMATICA' | 'TEATRO' | 'COMBINATO'>(() => {
    if (idInformatica && !idTeatro) return 'INFORMATICA';
    if (idTeatro && !idInformatica) return 'TEATRO';
    return 'COMBINATO';
  });

  const generaEmbedUrl = (): string => {
    const baseUrl = 'https://calendar.google.com/calendar/embed?ctz=Europe%2FRome&mode=MONTH&showTitle=0&showNav=1&showDate=1&showPrint=1&showTabs=1&showCalendars=1&showTz=0';

    if (modalita === 'IMPEGNI') {
      if (filtroImpegni === 'PLENARI' && idPlenari) {
        return `${baseUrl}&src=${encodeURIComponent(idPlenari)}&color=%23039BE5`;
      }
      if (filtroImpegni === 'SECONDARIA' && idSecondaria) {
        return `${baseUrl}&src=${encodeURIComponent(idSecondaria)}&color=%237986CB`;
      }
      let url = baseUrl;
      let added = 0;
      if (idPlenari) {
        url += `&src=${encodeURIComponent(idPlenari)}&color=%23039BE5`;
        added++;
      }
      if (idSecondaria) {
        url += `&src=${encodeURIComponent(idSecondaria)}&color=%237986CB`;
        added++;
      }
      if (added === 0) {
        // Fallback su uno qualsiasi disponibile
        const fallback = idPlenari || idSecondaria;
        if (fallback) url += `&src=${encodeURIComponent(fallback)}`;
      }
      return url;
    } else {
      if (filtroRisorse === 'INFORMATICA' && idInformatica) {
        return `${baseUrl}&src=${encodeURIComponent(idInformatica)}&color=%23009688`;
      }
      if (filtroRisorse === 'TEATRO' && idTeatro) {
        return `${baseUrl}&src=${encodeURIComponent(idTeatro)}&color=%23E65100`;
      }
      let url = baseUrl;
      let added = 0;
      if (idInformatica) {
        url += `&src=${encodeURIComponent(idInformatica)}&color=%23009688`;
        added++;
      }
      if (idTeatro) {
        url += `&src=${encodeURIComponent(idTeatro)}&color=%23E65100`;
        added++;
      }
      if (added === 0) {
        const fallback = idInformatica || idTeatro;
        if (fallback) url += `&src=${encodeURIComponent(fallback)}`;
      }
      return url;
    }
  };

  const hasConfigurazione = modalita === 'IMPEGNI' 
    ? Boolean(idPlenari || idSecondaria) 
    : Boolean(idInformatica || idTeatro);

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
                : 'Disponibilità e occupazione di Laboratorio Informatica, Teatro e aule speciali'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {modalita === 'IMPEGNI' ? (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setFiltroImpegni('COMBINATO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${filtroImpegni === 'COMBINATO' ? 'bg-white text-indigo-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tutti gli Impegni</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroImpegni('PLENARI')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${filtroImpegni === 'PLENARI' ? 'bg-blue-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Plenari / Unitari</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroImpegni('SECONDARIA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${filtroImpegni === 'SECONDARIA' ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-300" />
                <span>Secondaria</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setFiltroRisorse('INFORMATICA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${filtroRisorse === 'INFORMATICA' ? 'bg-teal-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Lab. Informatica</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroRisorse('TEATRO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${filtroRisorse === 'TEATRO' ? 'bg-amber-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Theater className="w-3.5 h-3.5" />
                <span>Teatro / Aula Magna</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroRisorse('COMBINATO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${filtroRisorse === 'COMBINATO' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tutte le Risorse</span>
              </button>
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
              key={refreshKey + filtroImpegni + filtroRisorse}
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
