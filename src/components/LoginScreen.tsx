import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { School, ShieldCheck, Smartphone, LayoutDashboard, Lock, AlertCircle, ArrowRight, KeyRound, ChevronLeft } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginConGoogle, loginAtaConPin, erroreAuth, isLoadingAuth } = useAuth();
  const { impostazioniScuola } = useApp();

  const [profiloScelto, setProfiloScelto] = useState<'SELEZIONE' | 'VICEPRESIDENZA' | 'DOCENTE' | 'ATA'>('SELEZIONE');
  const [pinAta, setPinAta] = useState<string>('');
  const [errorePinAta, setErrorePinAta] = useState<boolean>(false);

  const handleAtaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = loginAtaConPin(pinAta);
    if (!ok) {
      setErrorePinAta(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 text-slate-100">
      <div className="w-full max-w-lg bg-white text-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER BRANDING */}
        <div className="bg-slate-900 text-white p-6 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-600/30 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-600/30 rounded-full blur-2xl" />
          
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-lg ring-4 ring-white/10">
            <School className="w-7 h-7 text-white" />
          </div>
          
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {impostazioniScuola?.nomeScuola || 'Sostituzioni Smart'}
          </h1>
          <p className="text-xs text-slate-300 mt-0.5 font-medium">Portale Ufficiale Gestione Orario & Sostituzioni</p>
        </div>

        {/* CONTENUTO LOGIN */}
        <div className="p-6 sm:p-7 space-y-5">
          
          {erroreAuth && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{erroreAuth}</span>
            </div>
          )}

          {/* VISTA 1: SCELTA DEL PROFILO D'ACCESSO (3 CARD CHIARE E DISTINTE) */}
          {profiloScelto === 'SELEZIONE' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Identificazione Utente</span>
                <h3 className="text-base font-black text-slate-900">Seleziona il tuo profilo di accesso</h3>
              </div>

              <div className="space-y-3">
                {/* 1. DOCENTI (PRIMO IN EVIDENZA) */}
                <button
                  type="button"
                  onClick={() => setProfiloScelto('DOCENTE')}
                  className="w-full p-4 bg-emerald-50/90 hover:bg-emerald-100/90 border-2 border-emerald-300 hover:border-emerald-500 rounded-2xl flex items-center justify-between transition cursor-pointer group text-left shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="block font-black text-base text-slate-900">Portale Personale Docenti</span>
                      <span className="text-xs text-slate-600 font-medium">Ricezione supplenze, notifiche push e firma</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition shrink-0" />
                </button>

                {/* 2. PERSONALE ATA / SEGRETERIA */}
                <button
                  type="button"
                  onClick={() => setProfiloScelto('ATA')}
                  className="w-full p-3.5 bg-amber-50/70 hover:bg-amber-100/80 border-2 border-amber-200 hover:border-amber-400 rounded-2xl flex items-center justify-between transition cursor-pointer group text-left shadow-2xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block font-black text-sm text-slate-900">Personale ATA & Segreteria</span>
                      <span className="text-[11px] text-slate-500 font-medium">Consultazione e stampa del quadro giornaliero</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 shrink-0">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>PIN Rapido</span>
                  </div>
                </button>

                {/* 3. VICEPRESIDENZA / DIRIGENZA (PIÙ DISCRETO IN FONDO) */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setProfiloScelto('VICEPRESIDENZA')}
                    className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center justify-between transition cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-slate-200 group-hover:bg-indigo-600 text-slate-700 group-hover:text-white rounded-lg flex items-center justify-center transition">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold text-xs text-slate-700 group-hover:text-indigo-950">
                          Accesso Riservato Vicepresidenza / Dirigenza
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Gestione e configurazione istituto
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: ACCESSO VICEPRESIDENZA (ACCOUNT GOOGLE OBBLIGATORIO) */}
          {profiloScelto === 'VICEPRESIDENZA' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
              <button
                type="button"
                onClick={() => setProfiloScelto('SELEZIONE')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Torna alla scelta profilo</span>
              </button>

              <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200 text-center space-y-1">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Accesso Vicepresidenza & Dirigenza</h4>
                <p className="text-xs text-slate-600">Autenticazione istituzionale con account abilitato.</p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={isLoadingAuth}
                  onClick={loginConGoogle}
                  className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border-2 border-indigo-300 hover:border-indigo-600 rounded-2xl font-bold text-sm text-slate-800 shadow-xs hover:shadow-md transition flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Accedi con Account Google Istituzionale</span>
                </button>
              </div>
            </div>
          )}

          {/* VISTA 3: ACCESSO DOCENTI (ACCOUNT GOOGLE OBBLIGATORIO) */}
          {profiloScelto === 'DOCENTE' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
              <button
                type="button"
                onClick={() => setProfiloScelto('SELEZIONE')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Torna alla scelta profilo</span>
              </button>

              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-center space-y-1">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Accesso Personale Docente</h4>
                <p className="text-xs text-slate-600">Accedi con la tua email scolastica per consultare e firmare le supplenze.</p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={isLoadingAuth}
                  onClick={loginConGoogle}
                  className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border-2 border-emerald-300 hover:border-emerald-600 rounded-2xl font-bold text-sm text-slate-800 shadow-xs hover:shadow-md transition flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Accedi con Google Workspace</span>
                </button>
              </div>
            </div>
          )}

          {/* VISTA 4: ACCESSO PERSONALE ATA & SEGRETERIA (SOLO PIN RAPIDO SENZA ACCOUNT GOOGLE) */}
          {profiloScelto === 'ATA' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
              <button
                type="button"
                onClick={() => {
                  setProfiloScelto('SELEZIONE');
                  setErrorePinAta(false);
                  setPinAta('');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Torna alla scelta profilo</span>
              </button>

              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-center space-y-1">
                <div className="w-10 h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Quadro Sostituzioni per ATA & Segreteria</h4>
                <p className="text-xs text-slate-600">Inserisci il PIN numerico della scuola per visualizzare il tabellone.</p>
              </div>

              <form onSubmit={handleAtaSubmit} className="space-y-3 pt-1">
                <div>
                  <input
                    type="password"
                    value={pinAta}
                    onChange={(e) => {
                      setPinAta(e.target.value);
                      setErrorePinAta(false);
                    }}
                    placeholder="Inserisci PIN Scuola (es. 1234)"
                    className="w-full text-center text-lg font-mono font-black tracking-widest bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 outline-none focus:border-amber-600 focus:bg-white transition"
                    autoFocus
                    required
                  />
                  {errorePinAta && (
                    <p className="text-xs font-bold text-rose-600 mt-1.5 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>PIN non corretto. Riprova.</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm py-3 rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Apri Quadro Sostituzioni</span>
                </button>
              </form>
            </div>
          )}

          {/* PRIVACY & FOOTER */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              Accesso protetto e crittografato per l'istituto scolastico
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
