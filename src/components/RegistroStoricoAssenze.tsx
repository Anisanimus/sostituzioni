import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MotivoAssenza, AssenzaDocente } from '../types';
import { 
  Calendar, Trash2, FileSpreadsheet, History, Scale, User, 
  Clock, Plus, Minus, CheckCircle, AlertTriangle, Search, Filter, Ban, RotateCcw,
  Users, ArrowRight, UserCheck, Bell, Send
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getDocentiUnici, getBaseNomeDocente, getDocentiCollegatiIds, getOrarioUnificatoDocente, formatDataItaliana } from '../utils/docentiHelper';

export const RegistroStoricoAssenze: React.FC = () => {
  const { 
    assenze, 
    docenti, 
    uscite, 
    sostituzioni, 
    orariDocenti, 
    annullaAssenza, 
    eliminaDefinitivamenteAssenza, 
    nomineSupplenti,
    rimuoviNominaSupplente
  } = useApp();

  const [assenzaDaAnnullareConferma, setAssenzaDaAnnullareConferma] = useState<AssenzaDocente | null>(null);

  // Sottomenu interno Registro Storico a 3 sezioni logiche:
  // 1. Sostituzioni & Firme (operativo con firme e assenze)
  // 2. Uscite Didattiche & Gite
  // 3. Registro Nomine Supplenti Cattedra
  const [sottoTab, setSottoTab] = useState<'SOSTITUZIONI_FIRME' | 'USCITE_GITE' | 'NOMINE_SUPPLENTI'>('SOSTITUZIONI_FIRME');

  // --- FILTRI STORICO SOSTITUZIONI & ASSENZE ---
  const [filtroDocente, setFiltroDocente] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState<string>('TUTTI');
  const [filtroStato, setFiltroStato] = useState<'TUTTI' | 'ATTIVE' | 'ANNULLATE'>('TUTTI');
  const [filtroFirma, setFiltroFirma] = useState<'TUTTI' | 'FIRMATA' | 'NON_FIRMATA'>('TUTTI');
  const [filtroDataInizio, setFiltroDataInizio] = useState('');
  const [filtroDataFine, setFiltroDataFine] = useState('');

  // --- FILTRI USCITE & GITE ---
  const [filtroClasseUscita, setFiltroClasseUscita] = useState('');
  const [filtroDocenteUscita, setFiltroDocenteUscita] = useState('');

  const getDocenteNome = (id: string) => {
    const d = docenti.find(doc => doc.id === id);
    return d ? getBaseNomeDocente(d.nome) : id;
  };

  // Calcola le ore di reale servizio/lezione del docente per quell'assenza
  const getOreServizioAssenza = (assenza: AssenzaDocente): { ora: number; classe: string; sostitutoNome?: string }[] => {
    const orarioFuso = getOrarioUnificatoDocente(assenza.docenteId, docenti, orariDocenti);
    const collegatiIds = getDocentiCollegatiIds(assenza.docenteId, docenti);

    const oreServizio: { ora: number; classe: string; sostitutoNome?: string }[] = [];

    assenza.oreInteressate.forEach(ora => {
      const cella = orarioFuso.find(c => c.giorno === assenza.giorno && c.ora === ora);
      const val = (cella?.valore || '').trim();

      // Mostra solo le ore in cui il docente aveva effettivamente lezione, sostegno o disposizione
      if (val) {
        // Cerca eventuale sostituzione assegnata per quest'ora e classe
        const sost = sostituzioni.find(s => 
          s.data === assenza.data && 
          s.ora === ora && 
          (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === assenza.docenteId)
        );

        const sostitutoDoc = sost ? docenti.find(d => d.id === sost.docenteSostitutoId) : null;

        oreServizio.push({
          ora,
          classe: val,
          sostitutoNome: sostitutoDoc ? getBaseNomeDocente(sostitutoDoc.nome) : undefined
        });
      }
    });

    return oreServizio;
  };

  // Filtro Assenze
  const assenzeFiltrate = assenze.filter(a => {
    if (filtroDocente) {
      const collegati = getDocentiCollegatiIds(filtroDocente, docenti);
      if (!collegati.includes(a.docenteId)) return false;
    }
    if (filtroMotivo !== 'TUTTI' && a.motivo !== filtroMotivo) return false;
    if (filtroStato === 'ATTIVE' && a.annullata) return false;
    if (filtroStato === 'ANNULLATE' && !a.annullata) return false;
    if (filtroDataInizio && a.data < filtroDataInizio) return false;
    if (filtroDataFine && a.data > filtroDataFine) return false;
    return true;
  });

  // Deduplica le righe dello storico per persona fisica + data
  const assenzeFiltrateDeduplicate = Array.from(
    new Map(
      assenzeFiltrate.map(a => [`${a.data}_${getBaseNomeDocente(getDocenteNome(a.docenteId))}`, a])
    ).values()
  );

  const usciteFiltrate = uscite.filter(u => {
    if (filtroDataInizio && u.data < filtroDataInizio) return false;
    if (filtroDataFine && u.data > filtroDataFine) return false;
    if (filtroClasseUscita && !(u.classi || []).some(c => c.toLowerCase().includes(filtroClasseUscita.toLowerCase()))) return false;
    if (filtroDocenteUscita) {
      const collegati = getDocentiCollegatiIds(filtroDocenteUscita, docenti);
      if (!(u.docentiAccompagnatoriIds || []).some(id => collegati.includes(id))) return false;
    }
    return true;
  }).sort((a, b) => b.data.localeCompare(a.data));

  const nomineFiltrate = (nomineSupplenti || []).sort((a, b) => b.dataInizio.localeCompare(a.dataInizio));

  const exportExcelAssenze = () => {
    const dataToExport = assenzeFiltrateDeduplicate.map(a => {
      const oreServ = getOreServizioAssenza(a);
      const oreStr = oreServ.map(o => `${o.ora}ª (${o.classe}${o.sostitutoNome ? ' -> ' + o.sostitutoNome : ''})`).join(', ') || 'Nessuna ora di lezione';
      return {
        'Data': a.data,
        'Giorno': a.giorno,
        'Docente Assente': getDocenteNome(a.docenteId),
        'Motivo': a.motivo,
        'Ore di Servizio & Sostituti': oreStr,
        'Stato': a.annullata ? 'ANNULLATA' : 'ATTIVA',
        'Debito Generato (h)': a.oreDebitoGenerate || 0,
        'Note': a.note || ''
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Storico Sostituzioni');
    XLSX.writeFile(wb, `Registro_Sostituzioni_Assenze_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportExcelUscite = () => {
    const dataToExport = usciteFiltrate.map(u => ({
      'Data': u.data,
      'Giorno': u.giorno,
      'Classi': (u.classi || []).join(', '),
      'Destinazione / Progetto': u.titoloMeta || 'Uscita didattica',
      'Docenti Accompagnatori': (u.docentiAccompagnatoriIds || []).map(id => getDocenteNome(id)).join(', '),
      'Ore': (u.ore || []).join(', '),
      'Stato': u.annullata ? 'ANNULLATA' : 'CONFERMATA'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registro Uscite');
    XLSX.writeFile(wb, `Registro_Uscite_Gite_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-5 p-4 sm:p-6">

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Registro Storico Ufficiale</span>
          </h3>
          <p className="text-xs text-slate-500">
            Archivio cronologico e verbale ispettivo di sostituzioni, firme, uscite didattiche e nomine supplenti.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
          <button
            onClick={() => setSottoTab('SOSTITUZIONI_FIRME')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sottoTab === 'SOSTITUZIONI_FIRME'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Sostituzioni & Firme</span>
          </button>

          <button
            onClick={() => setSottoTab('USCITE_GITE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sottoTab === 'USCITE_GITE'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🚌 2. Uscite Didattiche & Gite ({uscite.length})</span>
          </button>

          <button
            onClick={() => setSottoTab('NOMINE_SUPPLENTI')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sottoTab === 'NOMINE_SUPPLENTI'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🧑‍🏫 3. Nomine Supplenti Cattedra ({(nomineSupplenti || []).length})</span>
          </button>
        </div>
      </div>

      {sottoTab === 'SOSTITUZIONI_FIRME' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Docente Assente</label>
              <select
                value={filtroDocente}
                onChange={(e) => setFiltroDocente(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2 bg-white font-semibold outline-none"
              >
                <option value="">-- Tutti i Docenti --</option>
                {getDocentiUnici(docenti).map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipologia Assenza</label>
              <select
                value={filtroMotivo}
                onChange={(e) => setFiltroMotivo(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2 bg-white font-semibold outline-none"
              >
                <option value="TUTTI">Tutte</option>
                <option value="Giornaliera">Giornaliera</option>
                <option value="Oraria">Oraria</option>
                <option value="Assemblea sindacale">Assemblea sindacale</option>
                <option value="Uscita">Uscita / Gita</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stato</label>
              <select
                value={filtroStato}
                onChange={(e) => setFiltroStato(e.target.value as any)}
                className="w-full border border-slate-200 rounded-xl p-2 bg-white font-semibold outline-none"
              >
                <option value="TUTTI">Tutte</option>
                <option value="ATTIVE">Solo Attive</option>
                <option value="ANNULLATE">Solo Annullate</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dal Giorno</label>
              <input type="date" value={filtroDataInizio} onChange={(e) => setFiltroDataInizio(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-white font-semibold outline-none" />
            </div>
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Al Giorno</label>
                <input type="date" value={filtroDataFine} onChange={(e) => setFiltroDataFine(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-white font-semibold outline-none" />
              </div>
              <button
                onClick={exportExcelAssenze}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2.5 rounded-xl transition shadow-2xs shrink-0 cursor-pointer"
                title="Esporta Storico Sostituzioni in Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead className="bg-slate-800 text-white font-bold">
                <tr>
                  <th className="p-3 w-28">Data</th>
                  <th className="p-3 w-24">Giorno</th>
                  <th className="p-3">Docente Assente</th>
                  <th className="p-3">Tipologia</th>
                  <th className="p-3 min-w-[220px]">Ore di Servizio & Sostituti</th>
                  <th className="p-3 text-center">Debito</th>
                  <th className="p-3 text-center">Stato</th>
                  <th className="p-3 text-right">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assenzeFiltrateDeduplicate.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">Nessuna sostituzione o assenza registrata.</td>
                  </tr>
                ) : (
                  assenzeFiltrateDeduplicate.map((a) => {
                    const oreServizio = getOreServizioAssenza(a);
                    const isAnnullata = a.annullata;
                    return (
                      <tr key={a.id} className={`hover:bg-slate-50 transition ${isAnnullata ? 'bg-slate-50/70 opacity-60' : ''}`}>
                        <td className="p-3 font-mono font-bold text-slate-700">{formatDataItaliana(a.data)}</td>
                        <td className="p-3 font-semibold text-slate-600">{a.giorno}</td>
                        <td className="p-3 font-black text-slate-900">{getDocenteNome(a.docenteId)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${a.motivo === 'Oraria' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{a.motivo}</span>
                        </td>
                        <td className="p-3">
                          {oreServizio.map((os, idx) => (
                            <div key={idx} className="inline-block px-2 py-0.5 m-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-semibold">
                              {os.ora}ª ({os.classe}) {os.sostitutoNome ? `➔ ${os.sostitutoNome}` : ''}
                            </div>
                          ))}
                        </td>
                        <td className="p-3 text-center font-black">{a.oreDebitoGenerate || '-'}</td>
                        <td className="p-3 text-center">
                          {isAnnullata ? <span className="bg-rose-100 text-rose-700 font-black px-2 py-0.5 rounded-full text-[10px]">ANNULLATA</span> : <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full text-[10px]">ATTIVA</span>}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Eliminare definitivamente la riga di ${getDocenteNome(a.docenteId)} del ${a.data}?`)) {
                                eliminaDefinitivamenteAssenza(a.id);
                              }
                            }}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition font-bold text-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* SOTTOTAB 2: REGISTRO USCITE DIDATTICHE & GITE              */}
      {/* ========================================================= */}
      {sottoTab === 'USCITE_GITE' && (
        <div className="space-y-4 animate-fadeIn">
          {/* BARRA FILTRI USCITE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Docente Accompagnatore</label>
              <select
                value={filtroDocenteUscita}
                onChange={(e) => setFiltroDocenteUscita(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2 bg-white font-semibold outline-none"
              >
                <option value="">-- Tutti i Docenti --</option>
                {getDocentiUnici(docenti).map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Classe</label>
              <input
                type="text"
                placeholder="Es. 1A, 2B..."
                value={filtroClasseUscita}
                onChange={(e) => setFiltroClasseUscita(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2 bg-white font-semibold outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dal Giorno</label>
              <input
                type="date"
                value={filtroDataInizio}
                onChange={(e) => setFiltroDataInizio(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2 bg-white font-semibold outline-none"
              />
            </div>

            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Al Giorno</label>
                <input
                  type="date"
                  value={filtroDataFine}
                  onChange={(e) => setFiltroDataFine(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 bg-white font-semibold outline-none"
                />
              </div>

              <button
                onClick={exportExcelUscite}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2.5 rounded-xl transition shadow-2xs shrink-0 cursor-pointer"
                title="Esporta Registro Uscite in Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TABELLA USCITE DIDATTICHE */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead className="bg-slate-800 text-white font-bold">
                <tr>
                  <th className="p-3 w-28">Data</th>
                  <th className="p-3 w-24">Giorno</th>
                  <th className="p-3">Classi Coinvolte</th>
                  <th className="p-3">Destinazione / Progetto</th>
                  <th className="p-3 min-w-[200px]">Docenti Accompagnatori</th>
                  <th className="p-3 text-center">Ore</th>
                  <th className="p-3 text-center">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usciteFiltrate.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      Nessuna uscita didattica registrata nel periodo selezionato.
                    </td>
                  </tr>
                ) : (
                  usciteFiltrate.map((u) => {
                    const isAnnullata = u.annullata;
                    return (
                      <tr key={u.id} className={`hover:bg-slate-50 transition ${isAnnullata ? 'bg-slate-50/70 opacity-60' : ''}`}>
                        <td className="p-3 font-mono font-bold text-slate-700">{formatDataItaliana(u.data)}</td>
                        <td className="p-3 font-semibold text-slate-600">{u.giorno}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(u.classi || []).map((c, i) => (
                              <span key={i} className="bg-indigo-50 text-indigo-900 border border-indigo-200 font-black px-2 py-0.5 rounded text-[11px]">
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {u.titoloMeta || 'Uscita didattica / Visita guidata'}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(u.docentiAccompagnatoriIds || []).map((id, i) => (
                              <span key={i} className="bg-amber-50 text-amber-900 border border-amber-200 font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                                <span>🚌</span>
                                <span>{getDocenteNome(id)}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {(u.ore || []).map(o => `${o}ª`).join(', ')}
                        </td>
                        <td className="p-3 text-center">
                          {isAnnullata ? (
                            <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Ban className="w-3 h-3" />
                              <span>ANNULLATA</span>
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                              CONFERMATA
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SOTTOTAB 3: REGISTRO NOMINE SUPPLENTI CATTEDRA             */}
      {/* ========================================================= */}
      {sottoTab === 'NOMINE_SUPPLENTI' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-black text-sm text-emerald-950 flex items-center gap-2">
                <span>🧑‍🏫 Registro Ufficiale Nomine Supplenti da Graduatoria</span>
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Tracciamento contrattuale delle supplenze lunghe, maternità, congedi e catene di subentro.
              </p>
            </div>
            <span className="text-xs font-black bg-white text-emerald-900 border border-emerald-300 px-3 py-1.5 rounded-xl shadow-2xs">
              {nomineFiltrate.length} {nomineFiltrate.length === 1 ? 'Contratto Registrato' : 'Contratti Registrati'}
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead className="bg-slate-800 text-white font-bold">
                <tr>
                  <th className="p-3">Docente Supplente Nominato</th>
                  <th className="p-3">Docente Titolare Sostituito</th>
                  <th className="p-3">Periodo di Servizio</th>
                  <th className="p-3">Tipologia Incarico</th>
                  <th className="p-3 text-center">Stato</th>
                  <th className="p-3 text-right">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nomineFiltrate.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      Nessuna nomina di supplenza da graduatoria registrata a sistema.
                    </td>
                  </tr>
                ) : (
                  nomineFiltrate.map((nom) => (
                    <tr key={nom.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-black text-slate-900">
                        <div>{nom.supplenteNome}</div>
                        {nom.supplenteEmail && (
                          <span className="text-[10px] text-indigo-600 font-mono font-normal">
                            {nom.supplenteEmail}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        Prof. {nom.docenteTitolareNome}
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        Dal <strong>{formatDataItaliana(nom.dataInizio)}</strong> al <strong>{formatDataItaliana(nom.dataFine)}</strong>
                      </td>
                      <td className="p-3">
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {nom.motivo || 'Supplenza Temporanea'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                          Attiva
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Vuoi revocare la nomina di ${nom.supplenteNome}?`)) {
                              rimuoviNominaSupplente(nom.id);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-lg transition font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                          title="Revoca o elimina nomina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoca</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALE DI CONFERMA: ANNULLAMENTO ASSENZA E NOTIFICA AI SUPPLENTI          */}
      {/* ========================================================================= */}
      {assenzaDaAnnullareConferma && (() => {
        const a = assenzaDaAnnullareConferma;
        const nomeDocAssente = getDocenteNome(a.docenteId);
        const collegatiIds = getDocentiCollegatiIds(a.docenteId, docenti);
        
        // Trova tutte le sostituzioni assegnate che verranno revocate
        const sostsCoinvolte = sostituzioni.filter(s => 
          s.data === a.data && 
          (collegatiIds.includes(s.docenteAssenteId) || s.docenteAssenteId === a.docenteId) && 
          (a.oreInteressate || []).includes(s.ora) &&
          s.categoria !== 'NON_SOSTITUIRE' &&
          s.docenteSostitutoId
        );

        const sostsDaNotificare = sostsCoinvolte.filter(s => s.pubblicata || s.firmata);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 text-left">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
              
              {/* Header Modale */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                      Conferma Annullamento Assenza
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {formatDataItaliana(a.data)} • Prof. {nomeDocAssente}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAssenzaDaAnnullareConferma(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Corpo Modale */}
              <div className="overflow-y-auto space-y-3 flex-1 pr-1 text-xs">
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-amber-950 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Stai per annullare l'assenza del docente:</span>
                  </div>
                  <div className="text-slate-800 space-y-0.5">
                    <div>Docente: <strong className="text-slate-900 font-black">{nomeDocAssente}</strong></div>
                    <div>Tipologia: <strong>{a.motivo}</strong> ({a.isOraria ? `Oraria ore: ${a.oreInteressate.join(', ')}` : 'Intera giornata'})</div>
                  </div>
                </div>

                {sostsDaNotificare.length > 0 ? (
                  <div className="space-y-2">
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-rose-950 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-900">
                        <Bell className="w-4 h-4 text-rose-600" />
                        <span>Notifica Push di Annullamento ({sostsDaNotificare.length} docenti):</span>
                      </div>
                      <p className="text-[11px] text-rose-800 leading-relaxed">
                        I seguenti colleghi avevano già ricevuto la supplenza e riceveranno immediatamente una <strong>notifica push con suono</strong> di revoca:
                      </p>
                    </div>

                    <div className="space-y-1.5 max-h-44 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                      {sostsDaNotificare.map(s => {
                        const docSost = docenti.find(d => d.id === s.docenteSostitutoId);
                        return (
                          <div key={s.id} className="py-2 px-1 flex items-center justify-between text-xs gap-2">
                            <div>
                              <strong className="text-slate-900 font-black block">
                                Prof. {docSost ? getBaseNomeDocente(docSost.nome) : s.docenteSostitutoId}
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {s.ora}ª ora • Classe {s.classe}
                              </span>
                            </div>
                            <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md shrink-0">
                              Supplenza Revocata
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px]">
                    Nessun docente supplente aveva ancora ricevuto la richiesta di firma per questa assenza.
                  </p>
                )}
              </div>

              {/* Footer Azioni */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setAssenzaDaAnnullareConferma(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  Indietro
                </button>

                <button
                  type="button"
                  onClick={() => {
                    annullaAssenza(a.id);
                    setAssenzaDaAnnullareConferma(null);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Ban className="w-4 h-4" />
                  <span>Conferma Annullamento</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
