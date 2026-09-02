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
  const { assenze, docenti, uscite, sostituzioni, orariDocenti, annullaAssenza, eliminaDefinitivamenteAssenza, movimentiDebito, modificaDebitoManuale } = useApp();

  const [assenzaDaAnnullareConferma, setAssenzaDaAnnullareConferma] = useState<AssenzaDocente | null>(null);

  // Sottomenu interno: "1. Storico Assenze & Gite" oppure "2. Database Debiti & Recuperi Ore"
  const [sottoTab, setSottoTab] = useState<'STORICO_ASSENZE' | 'DATABASE_RECUPERI'>('STORICO_ASSENZE');

  // --- FILTRI STORICO ASSENZE ---
  const [filtroDocente, setFiltroDocente] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState<string>('TUTTI');
  const [filtroStato, setFiltroStato] = useState<'TUTTI' | 'ATTIVE' | 'ANNULLATE'>('TUTTI');
  const [filtroDataInizio, setFiltroDataInizio] = useState('');
  const [filtroDataFine, setFiltroDataFine] = useState('');

  // --- STATO DATABASE RECUPERI ---
  const [selectedDocenteDebitoId, setSelectedDocenteDebitoId] = useState<string>('');
  const [mostraElencoDocentiConDebito, setMostraElencoDocentiConDebito] = useState<boolean>(false);
  const [soloConDebito, setSoloConDebito] = useState(false);
  const [deltaManuale, setDeltaManuale] = useState<number>(1);
  const [motivoManuale, setMotivoManuale] = useState('');
  const [notificaDebito, setNotificaDebito] = useState<string | null>(null);

  const getDocenteNome = (id: string) => {
    const d = docenti.find(doc => doc.id === id);
    return d ? getBaseNomeDocente(d.nome) : id;
  };
  
  const docenteSelezionatoDebito = docenti.find(d => d.id === selectedDocenteDebitoId);

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

  // Movimenti del docente selezionato
  const movimentiDocente = movimentiDebito.filter(m => {
    if (!selectedDocenteDebitoId) return false;
    const collegati = getDocentiCollegatiIds(selectedDocenteDebitoId, docenti);
    return collegati.includes(m.docenteId);
  });

  // Lista docenti con debito > 0 deduplicati
  const docentiConDebitoList = getDocentiUnici(docenti.filter(d => (d.oreDebitoPermesso || 0) > 0));

  // Docenti per il menu a tendina recuperi (deduplicati per persona fisica e ordinati alfabeticamente)
  const docentiPerSelectDebito = getDocentiUnici(docenti)
    .filter(d => {
      if (soloConDebito) return (d.oreDebitoPermesso || 0) > 0;
      return true;
    });

  // Statistiche rapide
  const totDocentiConDebito = docentiConDebitoList.length;
  const totOreDebitoComplessive = docenti.reduce((acc, d) => acc + (d.oreDebitoPermesso || 0), 0);

  // Click sul banner "Docenti con Debito Attivo"
  const handleBannerDocentiDebitoClick = () => {
    setMostraElencoDocentiConDebito(true);
    setSelectedDocenteDebitoId('');
  };

  // EXPORT EXCEL STORICO ASSENZE
  const exportExcelAssenze = () => {
    const dataToExport = assenzeFiltrateDeduplicate.map(a => {
      const oreServ = getOreServizioAssenza(a);
      const oreStr = oreServ.map(o => `${o.ora}ª (${o.classe}${o.sostitutoNome ? ' -> ' + o.sostitutoNome : ''})`).join(', ') || 'Nessuna ora di lezione';

      return {
        'Data': a.data,
        'Giorno': a.giorno,
        'Docente': getDocenteNome(a.docenteId),
        'Motivo': a.motivo,
        'Ore di Servizio & Sostituti': oreStr,
        'Stato': a.annullata ? 'ANNULLATA' : 'ATTIVA',
        'Debito Generato (h)': a.oreDebitoGenerate || 0,
        'Note': a.note || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Storico Assenze');
    XLSX.writeFile(wb, `Registro_Assenze_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // EXPORT EXCEL DATABASE RECUPERI
  const exportExcelRecuperi = () => {
    const dataToExport = docenti
      .filter(d => !d.isEducatore)
      .map(d => ({
        'Docente': d.nome,
        'Materia': d.materia,
        'Ore Debito Residuo': d.oreDebitoPermesso || 0,
        'Stato': (d.oreDebitoPermesso || 0) > 0 ? 'DA RECUPERARE' : 'IN PARI'
      }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Database Debiti');
    XLSX.writeFile(wb, `Database_Debiti_Recuperi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-5 p-4 sm:p-6">
      
      {/* NOTIFICA BUON FINE */}
      {notificaDebito && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-md text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{notificaDebito}</span>
          </div>
          <button onClick={() => setNotificaDebito(null)} className="text-emerald-200 hover:text-white">✕</button>
        </div>
      )}

      {/* HEADER CON SOTTOMENU A DUE SCHEDE */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Registro Storico & Database Recuperi</span>
          </h3>
          <p className="text-xs text-slate-500">
            Archivio permanente di tutte le assenze, gite e gestione contabile dei debiti orari (permessi brevi).
          </p>
        </div>

        {/* Sottomenu di Navigazione */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSottoTab('STORICO_ASSENZE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              sottoTab === 'STORICO_ASSENZE'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Storico Assenze & Gite</span>
          </button>

          <button
            onClick={() => setSottoTab('DATABASE_RECUPERI')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              sottoTab === 'DATABASE_RECUPERI'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            <span>2. Database Debiti & Recuperi ({totDocentiConDebito})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SOTTOTAB 1: STORICO ASSENZE & GITE CON ORE DI SERVIZIO     */}
      {/* ========================================================= */}
      {sottoTab === 'STORICO_ASSENZE' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* BARRA FILTRI STORICO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Docente</label>
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipologia</label>
              <select
                value={filtroMotivo}
                onChange={(e) => setFiltroMotivo(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2 bg-white font-semibold outline-none"
              >
                <option value="TUTTI">Tutte le tipologie</option>
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
                <option value="TUTTI">Tutte (Attive e Annullate)</option>
                <option value="ATTIVE">Solo Attive</option>
                <option value="ANNULLATE">Solo Annullate</option>
              </select>
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
                onClick={exportExcelAssenze}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2.5 rounded-xl transition shadow-2xs shrink-0"
                title="Esporta Storico in Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TABELLA STORICO CON ORE DI SERVIZIO & SOSTITUTI */}
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
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Nessuna assenza registrata con i filtri correnti.
                    </td>
                  </tr>
                ) : (
                  assenzeFiltrateDeduplicate.map((a) => {
                    const isAnnullata = a.annullata || false;
                    const oreServizio = getOreServizioAssenza(a);

                    return (
                      <tr 
                        key={a.id} 
                        className={`transition ${
                          isAnnullata 
                            ? 'bg-slate-50/80 text-slate-400 opacity-70' 
                            : 'hover:bg-slate-50/70 text-slate-700'
                        }`}
                      >
                        <td className="p-3 font-mono font-bold">
                          <span className={isAnnullata ? 'line-through' : ''}>{formatDataItaliana(a.data)}</span>
                        </td>
                        <td className="p-3 font-semibold">{a.giorno}</td>
                        <td className="p-3 font-bold text-slate-900">
                          <span className={isAnnullata ? 'line-through text-slate-500' : ''}>
                            {getDocenteNome(a.docenteId)}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            a.motivo === 'Uscita' 
                              ? 'bg-amber-100 text-amber-800' 
                              : a.motivo === 'Assemblea sindacale'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {a.motivo}
                          </span>
                        </td>
                        
                        {/* ORE DI SERVIZIO EFFETTIVE E CHI HA SOSTITUITO */}
                        <td className="p-3">
                          {oreServizio.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">Nessuna ora da orario</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {oreServizio.map((os, idx) => (
                                <div
                                  key={idx}
                                  className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold flex items-center gap-1 ${
                                    os.sostitutoNome
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                      : 'bg-slate-100 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span className="font-bold">{os.ora}ª ({os.classe})</span>
                                  {os.sostitutoNome ? (
                                    <span className="text-[10px] text-emerald-700 font-bold">
                                      ➔ {os.sostitutoNome}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 font-medium">
                                      (Non coperta)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          {a.oreDebitoGenerate && a.oreDebitoGenerate > 0 ? (
                            <span className={`font-black text-[11px] px-2 py-0.5 rounded-md ${
                              isAnnullata ? 'bg-slate-200 text-slate-500 line-through' : 'bg-rose-100 text-rose-800'
                            }`}>
                              -{a.oreDebitoGenerate}h
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isAnnullata ? (
                            <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Ban className="w-3 h-3" />
                              <span>ANNULLATA</span>
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                              ATTIVA
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isAnnullata ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setAssenzaDaAnnullareConferma(a)}
                                  className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 p-1.5 rounded-lg transition font-bold text-xs flex items-center gap-1 cursor-pointer"
                                  title="Annulla assenza (rimane registrata come annullata)"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Annulla</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Sei sicuro di voler ELIMINARE DEFINITIVAMENTE la riga di ${getDocenteNome(a.docenteId)} del ${a.data} dallo storico?`)) {
                                      eliminaDefinitivamenteAssenza(a.id);
                                    }
                                  }}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition font-bold text-xs flex items-center gap-1"
                                  title="Cancella definitivamente riga"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questa riga annullata di ${getDocenteNome(a.docenteId)} dal registro?`)) {
                                    eliminaDefinitivamenteAssenza(a.id);
                                  }
                                }}
                                className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-lg transition font-bold text-xs flex items-center gap-1 ml-auto"
                                title="Elimina riga annullata dallo storico"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Elimina</span>
                              </button>
                            )}
                          </div>
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
      {/* SOTTOTAB 2: DATABASE DEBITI & RECUPERI ORE                */}
      {/* ========================================================= */}
      {sottoTab === 'DATABASE_RECUPERI' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* BANNER STATISTICHE DEBITI - CLICCABILE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div 
              onClick={handleBannerDocentiDebitoClick}
              className="bg-amber-50/80 hover:bg-amber-100/90 border border-amber-300 hover:border-amber-400 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition shadow-2xs group"
              title="Clicca per visualizzare l'elenco dettagliato dei docenti che devono recuperare ore"
            >
              <div>
                <span className="text-[11px] font-black text-amber-900 block uppercase tracking-wider group-hover:text-amber-950">
                  DOCENTI CON DEBITO ATTIVO
                </span>
                <strong className="text-2xl font-black text-amber-950 block mt-0.5">{totDocentiConDebito}</strong>
                <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 mt-1 group-hover:underline">
                  <span>Tocca per vedere i dettagli</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-200/90 text-amber-950 flex items-center justify-center font-bold text-base shadow-2xs group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5 text-amber-900" />
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-800 block uppercase">Ore Totali da Recuperare</span>
                <strong className="text-xl sm:text-2xl font-black text-rose-950">{totOreDebitoComplessive} Ore</strong>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-900 flex items-center justify-center font-bold text-base">
                ⏳
              </div>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-indigo-800 block uppercase">Movimenti Registrati</span>
                <strong className="text-xl sm:text-2xl font-black text-indigo-950">{movimentiDebito.length}</strong>
              </div>
              <button
                onClick={exportExcelRecuperi}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SELETTORE DOCENTE STANDARD A TENDINA (COME AGGIUNGI ASSENTE) */}
          {/* ========================================================= */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-2xs border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Docente per Gestione Recuperi:
                  </label>
                  <button
                    type="button"
                    onClick={() => setSoloConDebito(!soloConDebito)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                      soloConDebito 
                        ? 'bg-amber-500 text-white border-amber-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {soloConDebito ? '✓ Mostra solo con Debito (> 0)' : 'Filtro: Solo con Debito (> 0)'}
                  </button>
                </div>

                <select
                  value={selectedDocenteDebitoId}
                  onChange={(e) => {
                    setSelectedDocenteDebitoId(e.target.value);
                    setMostraElencoDocentiConDebito(false);
                  }}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-bold bg-white text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                >
                  <option value="">-- Scegli Docente --</option>
                  {docentiPerSelectDebito.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nome} ({d.materie.join(', ')}{d.isSostegno ? ' - Sost.' : ''}) { (d.oreDebitoPermesso || 0) > 0 ? `[-${d.oreDebitoPermesso}h]` : '' }
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIQUADRO DETTAGLI RECUPERI: ELENCO DOCENTI O DETTAGLIO     */}
          {/* ========================================================= */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4 bg-white">
            
            {/* VISTA 1: ELENCO GENERALE DOCENTI CHE DEVONO RECUPERARE ORE */}
            {mostraElencoDocentiConDebito && !docenteSelezionatoDebito ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-black text-amber-950 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-amber-600" />
                      <span>Elenco Docenti con Debito Orario Attivo ({totDocentiConDebito})</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Docenti che hanno usufruito di permessi brevi orari e devono ancora recuperare le rispettive ore di lezione.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMostraElencoDocentiConDebito(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                  >
                    Chiudi Elenco
                  </button>
                </div>

                {docentiConDebitoList.length === 0 ? (
                  <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-200 space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                    <h5 className="text-sm font-bold text-emerald-950">Nessun Debito Orario Attivo!</h5>
                    <p className="text-xs text-emerald-700">Tutti i docenti sono attualmente in pari con le ore di servizio.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {docentiConDebitoList.map(d => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedDocenteDebitoId(d.id);
                          setMostraElencoDocentiConDebito(false);
                        }}
                        className="p-3.5 bg-amber-50/50 hover:bg-amber-100/70 border border-amber-200 rounded-2xl cursor-pointer transition shadow-2xs flex items-center justify-between group"
                      >
                        <div className="truncate pr-2">
                          <strong className="text-xs font-black text-slate-900 block truncate group-hover:text-indigo-700">
                            {d.nome}
                          </strong>
                          <span className="text-[11px] text-slate-500 font-semibold block truncate">
                            {d.materie.join(', ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="bg-rose-100 text-rose-900 font-black text-xs px-2.5 py-1 rounded-xl shadow-2xs">
                            -{d.oreDebitoPermesso}h
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-amber-700 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : docenteSelezionatoDebito ? (
              <>
                {/* VISTA 2: DETTAGLIO DEL DOCENTE SELEZIONATO */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-slate-900">{docenteSelezionatoDebito.nome}</h4>
                      <span className="text-xs text-indigo-600 font-bold">({docenteSelezionatoDebito.materia})</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Stato Debito Attuale: <strong className="text-rose-600 font-black">{docenteSelezionatoDebito.oreDebitoPermesso || 0} Ore da Recuperare</strong>
                    </p>
                  </div>

                  {/* Badge Debito Residuo */}
                  <div className={`px-3 py-1.5 rounded-xl border font-black text-xs flex items-center gap-1.5 ${
                    (docenteSelezionatoDebito.oreDebitoPermesso || 0) > 0 
                      ? 'bg-rose-50 border-rose-200 text-rose-800' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    {(docenteSelezionatoDebito.oreDebitoPermesso || 0) > 0 ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Debito: {docenteSelezionatoDebito.oreDebitoPermesso} Ore</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>In Pari (0 ore)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Form Rapido di Modifica Manuale Debito */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase block">
                    Aggiungi / Scomputa Ore Manualmente:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setDeltaManuale(Math.max(1, deltaManuale - 1))}
                        className="w-6 h-6 rounded bg-slate-100 font-bold hover:bg-slate-200 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="px-2 font-black text-slate-800">{deltaManuale}h</span>
                      <button
                        type="button"
                        onClick={() => setDeltaManuale(deltaManuale + 1)}
                        className="w-6 h-6 rounded bg-slate-100 font-bold hover:bg-slate-200 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Motivo (es. Permesso breve, Accordo dirigente...)"
                      value={motivoManuale}
                      onChange={(e) => setMotivoManuale(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-400"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        modificaDebitoManuale(docenteSelezionatoDebito.id, deltaManuale, motivoManuale || 'Aggiunta manuale debito');
                        setMotivoManuale('');
                        setNotificaDebito(`Aggiunte ${deltaManuale} ore di debito a ${docenteSelezionatoDebito.nome}!`);
                        setTimeout(() => setNotificaDebito(null), 3000);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Aggiungi Debito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        modificaDebitoManuale(docenteSelezionatoDebito.id, -deltaManuale, motivoManuale || 'Scomputo manuale debito');
                        setMotivoManuale('');
                        setNotificaDebito(`Scomputate ${deltaManuale} ore di debito a ${docenteSelezionatoDebito.nome}!`);
                        setTimeout(() => setNotificaDebito(null), 3000);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center gap-1"
                    >
                      <Minus className="w-3 h-3" />
                      <span>Scomputa Debito</span>
                    </button>
                  </div>
                </div>

                {/* Storico Movimenti e Cronologia */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                    Cronologia Movimentazioni Debito:
                  </span>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {movimentiDocente.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Nessun movimento registrato finora per questo docente.
                      </p>
                    ) : (
                      movimentiDocente.map(m => (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                            m.deltaOre < 0 
                              ? 'bg-rose-50/70 border-rose-200 text-rose-950' 
                              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg font-black flex items-center justify-center text-xs shrink-0 ${
                              m.deltaOre < 0 ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                            }`}>
                              {m.deltaOre < 0 ? `${m.deltaOre}h` : `+${m.deltaOre}h`}
                            </div>
                            <div>
                              <strong className="block text-slate-900 font-bold">{m.descrizione}</strong>
                              <span className="text-[10px] text-slate-500">Data evento: {m.data}</span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            m.deltaOre < 0 ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                          }`}>
                            {m.deltaOre < 0 ? 'Generato Debito' : 'Recuperato'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Alert Informativo sul Quadro Sostituzioni */}
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 flex items-start gap-2.5">
                  <span className="text-base">💡</span>
                  <div>
                    <strong>Priorità Normativa nel Quadro Sostituzioni:</strong>
                    Se questo docente ha ore di debito ed è libero o in Disposizione (D) in un'ora di supplenza, il sistema lo posiziona in cima con priorità <strong>"1. Recupero Debito Stessa Classe"</strong> o <strong>"Recupero Generico"</strong>, scomputando automaticamente 1 ora dal suo debito ad ogni sostituzione effettuata!
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <User className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black text-slate-800">Nessun docente selezionato</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Scegli un docente dal menu a tendina in alto oppure tocca il riquadro <strong>"Docenti con Debito Attivo"</strong> per visualizzare l'elenco completo.
                </p>
              </div>
            )}
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
