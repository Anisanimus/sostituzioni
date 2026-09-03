import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { CURRENT_APP_VERSION, AppVersionInfo } from '../version';

export const UpdateNotificationModal: React.FC = () => {
  const [nuovaVersioneInfo, setNuovaVersioneInfo] = useState<AppVersionInfo | null>(null);
  const [mostraModaleDettagli, setMostraModaleDettagli] = useState<boolean>(false);
  const [inAggiornamento, setInAggiornamento] = useState<boolean>(false);

  // Controllo versione su server
  const controllaAggiornamenti = async () => {
    try {
      // Bypassa qualsiasi cache aggiungendo timestamp casuale
      const response = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      if (!response.ok) return;

      const serverVersion: AppVersionInfo = await response.json();
      if (serverVersion && serverVersion.version && serverVersion.version !== CURRENT_APP_VERSION.version) {
        setNuovaVersioneInfo(serverVersion);
      }
    } catch (err) {
      console.log('Verifica aggiornamento non riuscita o offline:', err);
    }
  };

  useEffect(() => {
    // 1. Controllo immediato all'avvio
    controllaAggiornamenti();

    // 2. Controllo periodico ogni 20 secondi
    const interval = setInterval(controllaAggiornamenti, 20000);

    // 3. Controllo quando l'utente torna sull'app (focus o tab riaperta)
    const handleFocus = () => controllaAggiornamenti();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Esecuzione Hard Purge e Ricarica Istantanea
  const eseguiAggiornamento = async () => {
    setInAggiornamento(true);

    try {
      // 1. Pulisce tutti i caches del browser
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }

      // 2. Disregistra i service workers per scaricare l'ultimissimo sw
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // 3. Aggiorna build locale memorizzata
      if (nuovaVersioneInfo?.version) {
        localStorage.setItem('app_installed_build_id', `build_${nuovaVersioneInfo.version}`);
      }

      // 4. Forza reload immediato saltando la cache HTTP
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (e) {
      window.location.reload();
    }
  };

  if (!nuovaVersioneInfo) return null;

  return (
    <>
      {/* BANNER NOTIFICA TOP CON SUPPORTO IPHONE SAFE AREA (NOTCH & DYNAMIC ISLAND) */}
      <div 
        onClick={() => setMostraModaleDettagli(true)}
        className="fixed top-0 inset-x-0 z-[9999] bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white px-3 sm:px-4 py-2 safe-top-banner shadow-xl animate-in slide-in-from-top-4 duration-300 cursor-pointer hover:brightness-105 transition"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2.5 text-xs">
          
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 bg-white/20 rounded-lg shrink-0 animate-bounce text-xs">
              🚀
            </span>
            <div className="truncate">
              <strong className="font-black tracking-wide">
                Nuova Versione Disponibile ({nuovaVersioneInfo.version})
              </strong>
              <span className="hidden md:inline text-indigo-100 ml-1.5 font-normal">
                — Ci sono novità e miglioramenti pronti per te!
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMostraModaleDettagli(true);
              }}
              className="text-[11px] font-bold bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-lg transition border border-white/20 cursor-pointer flex items-center gap-1"
            >
              <span>📖 Leggi Novità</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                eseguiAggiornamento();
              }}
              disabled={inAggiornamento}
              className="bg-white text-indigo-950 hover:bg-indigo-50 font-black px-3 py-1 sm:py-1.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${inAggiornamento ? 'animate-spin' : ''}`} />
              <span>{inAggiornamento ? 'Aggiornamento...' : 'Aggiorna Ora ⚡'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* MODALE CON LE NOVITÀ DETTAGLIATE DELLA VERSIONE */}
      {mostraModaleDettagli && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-slate-100">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-2xs">
                  ✨
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Aggiornamento Software</span>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {nuovaVersioneInfo.title || `Versione ${nuovaVersioneInfo.version}`}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostraModaleDettagli(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {nuovaVersioneInfo.descrizioneGenerale || 'È disponibile un aggiornamento dell\'applicazione con i seguenti miglioramenti:'}
              </p>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2.5 max-h-72 overflow-y-auto">
                {nuovaVersioneInfo.novita && nuovaVersioneInfo.novita.length > 0 ? (
                  nuovaVersioneInfo.novita.map((item, idx) => {
                    if (typeof item === 'string') {
                      return (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-snug">{item}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{item.titolo}</span>
                          </div>
                          {item.tag && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed pl-5 font-normal">
                          {item.descrizione}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Miglioramenti generali di stabilità e grafica.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMostraModaleDettagli(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Chiudi
              </button>

              <button
                type="button"
                onClick={eseguiAggiornamento}
                disabled={inAggiornamento}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${inAggiornamento ? 'animate-spin' : ''}`} />
                <span>{inAggiornamento ? 'Applicazione modifiche...' : '⚡ Aggiorna e Ricarica Ora'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
