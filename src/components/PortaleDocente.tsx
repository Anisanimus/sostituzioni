import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Bell, User, Key, Calendar, AlertTriangle, X, LayoutDashboard } from 'lucide-react';
import { getDocentiCollegatiIds, getDocentiUnici } from '../utils/docentiHelper';
import { QuadroSostituzioniScuola } from './QuadroSostituzioniScuola';

export const PortaleDocente: React.FC = () => {
  const { docenti, sostituzioni, notifiche, firmaSostituzione, segnaNotificheLette } = useApp();
  const [selectedDocenteId, setSelectedDocenteId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [notificaAttiva, setNotificaAttiva] = useState<boolean>(false);
  const [tabDocente, setTabDocente] = useState<'MIE_SOSTITUZIONI' | 'QUADRO_SCUOLA'>('MIE_SOSTITUZIONI');

  const docente = docenti.find(d => d.id === selectedDocenteId);
  const collegatiIds = selectedDocenteId ? getDocentiCollegatiIds(selectedDocenteId, docenti) : [];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docente) return;
    if (docente.pinAccesso && pin !== docente.pinAccesso) {
      alert('PIN errato! (Il PIN predefinito è 1234)');
      return;
    }
    setIsLogged(true);
  };

  const handleRichiediNotifiche = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificaAttiva(true);
        new Notification('Notifiche Attivate', {
          body: 'Riceverai un avviso ogni volta che ti viene assegnata o modificata una sostituzione.'
        });
      }
    } else {
      alert('Il tuo browser non supporta le notifiche push.');
    }
  };

  const mieSostituzioni = sostituzioni.filter(
    s => collegatiIds.includes(s.docenteSostitutoId) && s.pubblicata
  );

  const mieNotificheNonLette = notifiche.filter(
    n => collegatiIds.includes(n.docenteId) && !n.letta
  );

  const getDocenteNome = (id: string) => docenti.find(d => d.id === id)?.nome || id;

  if (!isLogged) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mt-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Area Personale Docente</h3>
          <p className="text-xs text-slate-500 mt-1">Accedi per consultare e firmare le tue sostituzioni settimanali</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seleziona il tuo Nome</label>
            <select
              value={selectedDocenteId}
              onChange={(e) => setSelectedDocenteId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 text-sm bg-white font-semibold shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              required
            >
              <option value="">-- Scegli Docente --</option>
              {getDocentiUnici(docenti).map(d => (
                <option key={d.id} value={d.id}>
                  {d.nome} ({d.materie.join(', ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">PIN Personale</label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Inserisci PIN (1234)"
                required
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm pl-9"
              />
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition text-sm shadow-md"
          >
            Accedi all'Area Riservata
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* BANNER NOTIFICHE ANNULLAMENTI/AVVISI */}
      {mieNotificheNonLette.length > 0 && (
        <div className="space-y-2">
          {mieNotificheNonLette.map(n => (
            <div key={n.id} className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-950 text-sm flex items-center gap-2">
                    <span>{n.titolo}</span>
                    <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </h4>
                  <p className="text-xs text-rose-900 mt-0.5">{n.messaggio}</p>
                </div>
              </div>

              <button
                onClick={() => segnaNotificheLette(selectedDocenteId)}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-100/80 hover:bg-rose-200 px-2.5 py-1 rounded-lg transition shrink-0"
              >
                Ho Capito ✓
              </button>
            </div>
          ))}
        </div>
      )}

      {/* HEADER PROFILO DOCENTE */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase">Docente Collegato</span>
          <h2 className="text-2xl font-black text-slate-900">{docente?.nome}</h2>
          <p className="text-xs text-slate-500">
            Materia: <strong>{docente?.materia}</strong> • Debito Permessi: <strong>{docente?.oreDebitoPermesso} ore</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRichiediNotifiche}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
              notificaAttiva
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            {notificaAttiva ? 'Notifiche Push Attive' : 'Attiva Notifiche Push'}
          </button>
          <button
            onClick={() => setIsLogged(false)}
            className="text-xs text-slate-500 hover:text-slate-800 underline p-2"
          >
            Esci
          </button>
        </div>
      </div>

      {/* SELETTORE SCHEDE DOCENTE: MIE SOSTITUZIONI VS QUADRO SCUOLA */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setTabDocente('MIE_SOSTITUZIONI')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            tabDocente === 'MIE_SOSTITUZIONI'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Le mie Sostituzioni Assegnate</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${tabDocente === 'MIE_SOSTITUZIONI' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {mieSostituzioni.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTabDocente('QUADRO_SCUOLA')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            tabDocente === 'QUADRO_SCUOLA'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Quadro Generale Sostituzioni Scuola</span>
        </button>
      </div>

      {/* CONTENUTO SCHEDA 1: LE MIE SOSTITUZIONI */}
      {tabDocente === 'MIE_SOSTITUZIONI' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>Le tue Sostituzioni Assegnate</span>
              </h3>
              <p className="text-xs text-slate-500">Firma per presa visione delle ore di supplenza a te affidate</p>
            </div>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
              {mieSostituzioni.length} Assegnazioni
            </span>
          </div>

          {mieSostituzioni.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">Nessuna sostituzione assegnata</p>
              <p className="text-xs">Al momento non hai supplenze pubblicate per questa settimana.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {mieSostituzioni.map(s => (
                <div key={s.id} className="p-4 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-0.5 rounded">
                        {s.giorno} {s.data}
                      </span>
                      <span className="bg-slate-800 text-white font-bold text-xs px-2.5 py-0.5 rounded">
                        {s.ora}ª Ora
                      </span>
                      <span className="font-black text-slate-900 text-base">
                        Classe {s.classe}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Sostituzione del docente: <strong>{getDocenteNome(s.docenteAssenteId)}</strong>
                    </div>
                    <div className="text-[11px] text-indigo-700 font-medium">
                      Tipologia: {s.categoria.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <div>
                    {s.firmata ? (
                      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Firmato il {s.dataFirma}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => firmaSostituzione(s.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow flex items-center gap-2"
                      >
                        <span>Firma per Presa Visione</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENUTO SCHEDA 2: QUADRO GENERALE SCUOLA (ACCESSO DIRETTO GIÀ AUTENTICATO DAL DOCENTE) */}
      {tabDocente === 'QUADRO_SCUOLA' && (
        <QuadroSostituzioniScuola isEmbedInVicepresidenza={true} />
      )}
    </div>
  );
};
