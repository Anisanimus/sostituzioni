import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, Users, Clock, ShieldCheck, Bus, Award, 
  Calendar, Download, TrendingUp, TrendingDown, AlertTriangle, FileSpreadsheet,
  CheckCircle2, ArrowUpDown, ChevronDown, Percent, Scale, ArrowDownUp, X, Filter, UserCheck
} from 'lucide-react';
import { getBaseNomeDocente, formatDataItaliana, getDocentiUnici, getOreCreditoDocente, getDocentiCollegatiIds } from '../utils/docentiHelper';
import * as XLSX from 'xlsx';

type PeriodoFiltro = 'MESE' | 'QUADRIMESTRE_1' | 'QUADRIMESTRE_2' | 'ANNO_INTERO';

export const ReportStatistiche: React.FC = () => {
  const { docenti, assenze, uscite, sostituzioni, movimentiDebito, impostazioniScuola } = useApp();

  const tettoPermessi = impostazioniScuola?.tettoMaxPermessiBreviAnno || 12;
  const tettoAssemblee = impostazioniScuola?.tettoMaxAssembleeSindacaliAnno || 10;

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [periodo, setPeriodo] = useState<PeriodoFiltro>('ANNO_INTERO');
  const [meseSelezionato, setMeseSelezionato] = useState<string>(currentMonthStr);
  const [tabReport, setTabReport] = useState<'BILANCIO_ORE' | 'SOSTEGNI' | 'ASSENZE' | 'USCITE'>('BILANCIO_ORE');
  
  const [docenteSelezionatoMovimenti, setDocenteSelezionatoMovimenti] = useState<string>('TUTTI');
  const [mostraModaleKpiBilancio, setMostraModaleKpiBilancio] = useState<boolean>(false);

  const { dataInizioFiltro, dataFineFiltro } = useMemo(() => {
    const curYear = today.getFullYear();
    const annoInizio = today.getMonth() >= 8 ? curYear : curYear - 1;
    const annoFine = annoInizio + 1;

    if (periodo === 'MESE') {
      const [y, m] = meseSelezionato.split('-').map(Number);
      const ultimoGiornoMese = new Date(y, m, 0).getDate();
      return {
        dataInizioFiltro: `${meseSelezionato}-01`,
        dataFineFiltro: `${meseSelezionato}-${String(ultimoGiornoMese).padStart(2, '0')}`
      };
    }
    if (periodo === 'QUADRIMESTRE_1') {
      return {
        dataInizioFiltro: `${annoInizio}-09-01`,
        dataFineFiltro: `${annoFine}-01-31`
      };
    }
    if (periodo === 'QUADRIMESTRE_2') {
      return {
        dataInizioFiltro: `${annoFine}-02-01`,
        dataFineFiltro: `${annoFine}-06-30`
      };
    }
    return {
      dataInizioFiltro: `${annoInizio}-09-01`,
      dataFineFiltro: `${annoFine}-06-30`
    };
  }, [periodo, meseSelezionato, today]);

  const assenzeFiltrate = useMemo(() => assenze.filter(a => !a.annullata && a.data >= dataInizioFiltro && a.data <= dataFineFiltro), [assenze, dataInizioFiltro, dataFineFiltro]);
  const usciteFiltrate = useMemo(() => uscite.filter(u => !u.annullata && u.data >= dataInizioFiltro && u.data <= dataFineFiltro), [uscite, dataInizioFiltro, dataFineFiltro]);
  const sostituzioniFiltrate = useMemo(() => sostituzioni.filter(s => s.data >= dataInizioFiltro && s.data <= dataFineFiltro), [sostituzioni, dataInizioFiltro, dataFineFiltro]);
  const docentiUnici = useMemo(() => getDocentiUnici(docenti), [docenti]);

  const statisticheSostegni = useMemo(() => {
    const docentiSostegno = docentiUnici.filter(d => d.isSostegno);
    const stats = docentiSostegno.map(doc => {
      const sostSvolte = sostituzioniFiltrate.filter(s => {
        const sostDoc = docenti.find(d => d.id === s.docenteSostitutoId);
        return sostDoc && getBaseNomeDocente(sostDoc.nome) === doc.nome && (s.categoria === 'SOSTEGNO' || sostDoc.isSostegno);
      });
      return { nome: doc.nome, totOreSupplenza: sostSvolte.length, isCasoGrave: doc.isCasoGraveSostegno };
    });
    stats.sort((a, b) => b.totOreSupplenza - a.totOreSupplenza);
    const maxOre = stats.length > 0 ? Math.max(...stats.map(s => s.totOreSupplenza), 1) : 1;
    const mediaOre = stats.length > 0 ? (stats.reduce((acc, s) => acc + s.totOreSupplenza, 0) / stats.length).toFixed(1) : '0';
    return { stats, maxOre, mediaOre, totDocenti: stats.length };
  }, [docentiUnici, docenti, sostituzioniFiltrate]);

  const statisticheAssenze = useMemo(() => {
    const conteggioPerGiornoSettimana: Record<string, number> = {'Lunedì': 0, 'Martedì': 0, 'Mercoledì': 0, 'Giovedì': 0, 'Venerdì': 0};
    assenzeFiltrate.forEach(a => { if (conteggioPerGiornoSettimana[a.giorno] !== undefined) conteggioPerGiornoSettimana[a.giorno] += a.oreInteressate.length; });
    const statsDocenti = docentiUnici.map(doc => {
      const assenzeDoc = assenzeFiltrate.filter(a => docenti.find(x => x.id === a.docenteId && getBaseNomeDocente(x.nome) === doc.nome));
      const totOre = assenzeDoc.reduce((acc, a) => acc + a.oreInteressate.length, 0);
      return { nome: doc.nome, materia: doc.materie.join(', '), totOre, giorniUnici: new Set(assenzeDoc.map(a => a.data)).size, numEventi: assenzeDoc.length };
    }).filter(d => d.totOre > 0).sort((a, b) => b.totOre - a.totOre);
    const totOreAssenze = assenzeFiltrate.reduce((acc, a) => acc + a.oreInteressate.length, 0);
    const totOreCoperte = sostituzioniFiltrate.length;
    return { statsDocenti, totOreAssenze, totOreCoperte, tassoCopertura: totOreAssenze > 0 ? Math.min(100, Math.round((totOreCoperte / totOreAssenze) * 100)) : 100, conteggioPerGiornoSettimana };
  }, [docentiUnici, docenti, assenzeFiltrate, sostituzioniFiltrate]);

  const statisticheUscite = useMemo(() => {
    const docentiUsciteCount: Record<string, { totUscite: number; totOre: number }> = {};
    const classiUsciteCount: Record<string, number> = {};
    usciteFiltrate.forEach(u => {
      const numOre = u.ore?.length || (u.oraFine - u.oraInizio + 1);
      (u.docentiAccompagnatoriIds || []).forEach(docId => {
        const d = docenti.find(x => x.id === docId);
        if (d) {
          const nome = getBaseNomeDocente(d.nome);
          if (!docentiUsciteCount[nome]) docentiUsciteCount[nome] = { totUscite: 0, totOre: 0 };
          docentiUsciteCount[nome].totUscite += 1;
          docentiUsciteCount[nome].totOre += numOre;
        }
      });
      (u.classi || []).forEach(c => classiUsciteCount[c] = (classiUsciteCount[c] || 0) + 1);
    });
    return {
      topDocentiAccompagnatori: Object.entries(docentiUsciteCount).map(([nome, data]) => ({ nome, ...data })).sort((a, b) => b.totOre - a.totOre),
      topClassiUscite: Object.entries(classiUsciteCount).map(([classe, totUscite]) => ({ classe, totUscite })).sort((a, b) => b.totUscite - a.totUscite),
      totUsciteEffettuate: usciteFiltrate.length
    };
  }, [usciteFiltrate, docenti]);

  const statisticheBilancio = useMemo(() => {
    const statsDocenti = docentiUnici.map(doc => {
      const collegati = doc.allIds;
      const sostPeriodo = sostituzioniFiltrate.filter(s => (s.isStraordinario || s.categoria === 'STRAORDINARIO_D') && (collegati.includes(s.docenteSostitutoId) || (s.docenteSostitutoId && getBaseNomeDocente(docenti.find(d => d.id === s.docenteSostitutoId)?.nome || '') === doc.nome)));
      const oreMaturateLorde = sostPeriodo.length;
      const movComp = movimentiDebito.filter(m => (collegati.includes(m.docenteId) || getBaseNomeDocente(docenti.find(d => d.id === m.docenteId)?.nome || '') === doc.nome) && m.descrizione?.includes('[COMPENSAZIONE_STRAORDINARIO]') && m.data >= dataInizioFiltro && m.data <= dataFineFiltro);
      const oreCompensate = movComp.reduce((acc, m) => acc + Math.abs(m.deltaOre || 0), 0);
      const creditoDisponibileNetto = getOreCreditoDocente(doc.id, docenti, sostituzioni, movimentiDebito);
      const debitoResiduo = doc.oreDebitoPermesso || 0;
      return { id: doc.id, nome: doc.nome, materie: doc.materie.join(', '), oreMaturateLorde, oreCompensate, creditoDisponibileNetto, debitoResiduo, saldoNetto: creditoDisponibileNetto - debitoResiduo };
    });
    return {
      statsDocenti,
      docentiConCredito: statsDocenti.filter(d => d.creditoDisponibileNetto > 0 || d.oreMaturateLorde > 0).sort((a, b) => b.creditoDisponibileNetto - a.creditoDisponibileNetto),
      docentiConDebito: statsDocenti.filter(d => d.debitoResiduo > 0).sort((a, b) => b.debitoResiduo - a.debitoResiduo),
      totCreditoDisponibileNetto: statsDocenti.reduce((acc, d) => acc + d.creditoDisponibileNetto, 0),
      totOreMaturateLorde: statsDocenti.reduce((acc, d) => acc + d.oreMaturateLorde, 0),
      totDebitoResiduo: statsDocenti.reduce((acc, d) => acc + d.debitoResiduo, 0)
    };
  }, [docentiUnici, docenti, sostituzioni, sostituzioniFiltrate, movimentiDebito, dataInizioFiltro, dataFineFiltro]);

  const movimentiContabiliFiltrati = useMemo(() => {
    return movimentiDebito
      .filter(m => {
        const inPeriodo = m.data >= dataInizioFiltro && m.data <= dataFineFiltro;
        if (!inPeriodo) return false;
        if (docenteSelezionatoMovimenti === 'TUTTI') return true;
        const dTarget = docenti.find(d => d.id === m.docenteId);
        const nomeM = dTarget ? getBaseNomeDocente(dTarget.nome) : '';
        return nomeM === docenteSelezionatoMovimenti || m.docenteId === docenteSelezionatoMovimenti;
      })
      .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [movimentiDebito, dataInizioFiltro, dataFineFiltro, docenteSelezionatoMovimenti, docenti]);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const dataBilancio = statisticheBilancio.statsDocenti.filter(d => d.creditoDisponibileNetto > 0 || d.debitoResiduo > 0 || d.oreMaturateLorde > 0).map(d => ({
        'Docente': d.nome, 'Materia': d.materie, 'Ore Credito Maturate': d.oreMaturateLorde, 'Ore Compensate con Permessi': d.oreCompensate,
        'Credito Netto Disponibile (h)': d.creditoDisponibileNetto, 'Debito Residuo da Recuperare (h)': d.debitoResiduo, 'Saldo Netto (h)': d.saldoNetto
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataBilancio), 'Bilancio Debito Credito');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statisticheSostegni.stats.map(s => ({ 'Docente Sostegno': s.nome, 'Ore Supplenza Svolte': s.totOreSupplenza, 'Caso Grave / Bloccato': s.isCasoGrave ? 'SÌ' : 'NO' }))), 'Equità Sostegni');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statisticheAssenze.statsDocenti.map(a => ({ 'Docente': a.nome, 'Materia': a.materia, 'Ore Totali Assenza': a.totOre, 'Giorni con Assenze': a.giorniUnici, 'Num. Richieste': a.numEventi }))), 'Riepilogo Assenze');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statisticheUscite.topDocentiAccompagnatori.map(u => ({ 'Docente Accompagnatore': u.nome, 'Numero Uscite / Gite': u.totUscite, 'Ore Fuori Sede': u.totOre }))), 'Uscite Accompagnatori');
      XLSX.writeFile(wb, `Report_Statistiche_Scuola_${dataInizioFiltro}_al_${dataFineFiltro}.xlsx`);
    } catch (err) { console.error(err); alert('Errore durante la generazione del report Excel.'); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Bilanci & Report</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rendicontazione debito/credito ore, monitoraggio rotazione sostegni, statistiche uscite e assenze.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['MESE', 'QUADRIMESTRE_1', 'QUADRIMESTRE_2', 'ANNO_INTERO'].map(p => (
              <button key={p} type="button" onClick={() => setPeriodo(p as PeriodoFiltro)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${periodo === p ? 'bg-white text-indigo-950 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'}`}>
                {p === 'MESE' ? 'Mese' : p === 'QUADRIMESTRE_1' ? '1° Quad' : p === 'QUADRIMESTRE_2' ? '2° Quad' : 'Tutto l\'Anno'}
              </button>
            ))}
          </div>

          {periodo === 'MESE' && (
            <input type="month" value={meseSelezionato} onChange={(e) => setMeseSelezionato(e.target.value)} className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none" />
          )}

          <button type="button" onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Esporta Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">Ore Assenze Totali</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{statisticheAssenze.totOreAssenze}h</div>
          <span className="text-[10px] text-slate-400 mt-0.5">Nel periodo selezionato</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">Tasso di Copertura</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">{statisticheAssenze.tassoCopertura}%</div>
          <span className="text-[10px] text-slate-400 mt-0.5">{statisticheAssenze.totOreCoperte} ore coperte</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">Media Ore Sostegno</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-700">{statisticheSostegni.mediaOre}h</div>
          <span className="text-[10px] text-slate-400 mt-0.5">su {statisticheSostegni.totDocenti} docenti sostegno</span>
        </div>

        <div onClick={() => setMostraModaleKpiBilancio(true)} className="bg-gradient-to-br from-amber-50/70 to-emerald-50/70 hover:from-amber-100/70 hover:to-emerald-100/70 p-3.5 rounded-2xl border border-amber-300/80 shadow-2xs flex flex-col justify-between cursor-pointer transition group hover:scale-[1.02] active:scale-[0.99]">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[11px] font-black text-slate-800 flex items-center gap-1"><span>Bilancio Debito / Credito</span></span>
            <div className="p-1 bg-amber-100 text-amber-800 rounded-lg group-hover:bg-amber-200 transition"><Scale className="w-3.5 h-3.5" /></div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black text-emerald-700 flex items-center gap-0.5"><TrendingUp className="w-3.5 h-3.5 inline text-emerald-600" /><span>+{statisticheBilancio.totCreditoDisponibileNetto}h</span></span>
              <span className="text-xs text-slate-300 font-bold">|</span>
              <span className="text-sm sm:text-base font-black text-rose-700 flex items-center gap-0.5"><TrendingDown className="w-3.5 h-3.5 inline text-rose-600" /><span>-{statisticheBilancio.totDebitoResiduo}h</span></span>
            </div>
            <span className="text-[10px] font-bold bg-white text-indigo-700 px-1.5 py-0.5 rounded shadow-2xs border border-indigo-100">Dettaglio ➔</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
            <span className="text-emerald-700 font-semibold">{statisticheBilancio.docentiConCredito.length} a credito</span>
            <span className="text-rose-700 font-semibold">{statisticheBilancio.docentiConDebito.length} a debito</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        <button type="button" onClick={() => setTabReport('BILANCIO_ORE')} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${tabReport === 'BILANCIO_ORE' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><span>⚖️ 1. Bilancio Debito/Credito Ore</span></button>
        <button type="button" onClick={() => setTabReport('SOSTEGNI')} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${tabReport === 'SOSTEGNI' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><span>🤝 2. Equità Sostegni</span></button>
        <button type="button" onClick={() => setTabReport('ASSENZE')} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${tabReport === 'ASSENZE' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><span>🏥 3. Analisi Assenze</span></button>
        <button type="button" onClick={() => setTabReport('USCITE')} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${tabReport === 'USCITE' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}><span>🚌 4. Uscite Didattiche</span></button>
      </div>

      {tabReport === 'BILANCIO_ORE' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div><h3 className="text-sm sm:text-base font-black text-slate-900">⚖️ Quadro Generale Debiti e Crediti Docenti</h3></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold text-[11px]">
                    <th className="p-2.5 rounded-tl-xl">Docente</th><th className="p-2.5">Materia</th><th className="p-2.5 text-center">Ore Credito</th><th className="p-2.5 text-center">Compensate</th><th className="p-2.5 text-center">Credito Netto</th><th className="p-2.5 text-center">Debito Residuo</th><th className="p-2.5 text-center rounded-tr-xl">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {statisticheBilancio.statsDocenti.filter(d => d.creditoDisponibileNetto > 0 || d.debitoResiduo > 0 || d.oreMaturateLorde > 0 || d.oreCompensate > 0).map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => setDocenteSelezionatoMovimenti(d.nome)}>
                      <td className="p-2.5 font-bold text-slate-900 flex items-center gap-1.5"><span>{d.nome}</span></td>
                      <td className="p-2.5 text-slate-500">{d.materie}</td>
                      <td className="p-2.5 text-center font-bold text-amber-800">{d.oreMaturateLorde > 0 ? `+${d.oreMaturateLorde}h` : '0h'}</td>
                      <td className="p-2.5 text-center font-medium text-slate-600">{d.oreCompensate > 0 ? <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold border border-indigo-200">-{d.oreCompensate}h</span> : <span className="text-slate-400">0h</span>}</td>
                      <td className="p-2.5 text-center">{d.creditoDisponibileNetto > 0 ? <span className="font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-300 text-xs">+{d.creditoDisponibileNetto}h</span> : <span className="text-slate-400 font-medium">0h</span>}</td>
                      <td className="p-2.5 text-center">{d.debitoResiduo > 0 ? <span className="font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-300 text-xs">-{d.debitoResiduo}h</span> : <span className="text-slate-400 font-medium">In pari (0h)</span>}</td>
                      <td className="p-2.5 text-center font-black"><span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs ${d.saldoNetto > 0 ? 'bg-emerald-600 text-white' : d.saldoNetto < 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{d.saldoNetto > 0 ? `+${d.saldoNetto}h` : `${d.saldoNetto}h`}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div><h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2"><span>Registro Storico Movimenti</span></h3></div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={docenteSelezionatoMovimenti} onChange={(e) => setDocenteSelezionatoMovimenti(e.target.value)} className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800">
                  <option value="TUTTI">-- Tutti i Docenti --</option>
                  {docentiUnici.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {movimentiContabiliFiltrati.map(m => (
                <div key={m.id} className="py-3 px-2 flex justify-between gap-3 text-xs hover:bg-slate-50 rounded-xl">
                  <div>
                    <span className="font-black text-slate-900">{docenti.find(d => d.id === m.docenteId)?.nome || 'Docente'}</span>
                    <p className="text-slate-700">{m.descrizione}</p>
                  </div>
                  <span className={`font-black ${m.deltaOre > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{m.deltaOre > 0 ? `+${m.deltaOre}h` : `${m.deltaOre}h`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mostraModaleKpiBilancio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black">Prospetto Analitico</h3>
              <button onClick={() => setMostraModaleKpiBilancio(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center"><strong className="text-xl font-black text-emerald-950">+{statisticheBilancio.totCreditoDisponibileNetto}h</strong></div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center"><strong className="text-xl font-black text-rose-950">-{statisticheBilancio.totDebitoResiduo}h</strong></div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              {statisticheBilancio.statsDocenti.filter(d => d.creditoDisponibileNetto > 0 || d.debitoResiduo > 0).map(d => (
                <div key={d.id} className="py-2.5 px-2 flex items-center justify-between text-xs hover:bg-slate-50 rounded-xl">
                  <strong>{d.nome}</strong>
                  <button onClick={() => { setDocenteSelezionatoMovimenti(d.nome); setTabReport('BILANCIO_ORE'); setMostraModaleKpiBilancio(false); }} className="text-indigo-600 underline cursor-pointer">Vedi Movimenti</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};