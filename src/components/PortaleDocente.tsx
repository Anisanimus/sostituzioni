import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Bell, User, Key, Calendar } from 'lucide-react';

export const PortaleDocente: React.FC = () => {
  const { docenti, sostituzioni, firmaSostituzione } = useApp();
  const [selectedDocenteId, setSelectedDocenteId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [notificaAttiva, setNotificaAttiva] = useState<boolean>(false);

  const docente = docenti.find(d => d.id === selectedDocenteId);

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
          body: 'Riceverai un avviso ogni volta che ti viene assegnata una nuova sostituzione.'
        });
      }
    } else {
      alert('Il tuo browser non supporta le notifiche push.');
    }
  };

  const mieSostituzioni = sostituzioni.filter(
    s => s.docenteSostitutoId === selectedDocenteId && s.pubblicata
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
              required
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white"
            >
              <option value="">-- Seleziona Docente --</option>
              {docenti
                .filter(d => !d.isEducatore)
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map(d => (
                  <option key={d.id} value={d.id}>{d.nome} ({d.materia})</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">PIN di Accesso (Default: 1234)</label>
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
    <div className="max-w-4xl mx-auto space-y-6">
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
    </div>
  );
};
