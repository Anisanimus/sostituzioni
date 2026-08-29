import React from 'react';
import { useAuth } from '../context/AuthContext';
import { School, ShieldCheck, User, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginConGoogle, bypassDemoLogin, erroreAuth, isLoadingAuth } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-white text-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* HEADER BRANDING */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-600/30 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-600/30 rounded-full blur-2xl" />
          
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-white/10">
            <School className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Sostituzioni Smart</h1>
          <p className="text-xs text-slate-300 mt-1 font-medium">Piattaforma Istituzionale Gestione Orario & Sostituzioni</p>
        </div>

        {/* CONTENUTO LOGIN */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {erroreAuth && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{erroreAuth}</span>
            </div>
          )}

          {/* PULSANTE GOOGLE WORKSPACE */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={isLoadingAuth}
              onClick={loginConGoogle}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-indigo-400 rounded-2xl font-bold text-sm text-slate-700 shadow-xs hover:shadow-md transition flex items-center justify-center gap-3 cursor-pointer group"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Accedi con Google Workspace</span>
            </button>
            <p className="text-[11px] text-center text-slate-500 font-medium">
              Usa l'account istituzionale <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">@scuola.edu.it</code>
            </p>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">oppure accesso rapido</span>
          </div>

          {/* ACCESSO DIRETTO AMMINISTRAZIONE / DEMO */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => bypassDemoLogin('VICEPRESIDENZA')}
              className="w-full p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl font-bold text-xs flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Entra come Vicepresidenza</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
            </button>

            <button
              type="button"
              onClick={() => bypassDemoLogin('DOCENTE')}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-slate-600" />
                <span>Entra come Portale Docente</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* PRIVACY & PROTEZIONE STUDENTI */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              Accesso riservato e protetto per il solo personale scolastico
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
