import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, Users, Clock, ShieldCheck, Bus, Award, 
  Calendar, Download, TrendingUp, AlertTriangle, FileSpreadsheet,
  CheckCircle2, ArrowUpDown, ChevronDown, Percent
} from 'lucide-react';
import { getBaseNomeDocente, formatDataItaliana, getDocentiUnici } from '../utils/docentiHelper';
import * as XLSX from 'xlsx';

type PeriodoFiltro = 'MESE' | 'QUADRIMESTRE_1' | 'QUADRIMESTRE_2' | 'ANNO_INTERO';

export const ReportStatistiche: React.FC = () => {
  const { docenti, assenze, uscite, sostituzioni, movimentiDebito, impostazioniScuola, nomineSupplenti } = useApp();

  const tettoPermessi = impostazioniScuola?.tettoMaxPermessiBreviAnno || 12;
  const tettoAssemblee = impostazioniScuola?.tettoMaxAssembleeSindacaliAnno || 10;

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [periodo, setPeriodo] = useState<PeriodoFiltro>('ANNO_INTERO');
  const [meseSelezionato, setMeseSelezionato] = useState<string>(currentMonthStr);
  const [tabReport, setTabReport] = useState<'SOSTEGNI' | 'PERMESSI' | 'ASSENZE' | 'USCITE' | 'STRAORDINARI' | 'NOMINE'>('SOSTEGNI');

  // Calcolo range date attivo in base al filtro periodo
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

  // Filtra i dati in base all'intervallo temporale
  const assenzeFiltrate = useMemo(() => {
    return assenze.filter(a => !a.annullata && a.data >= dataInizioFiltro && a.data <= dataFineFiltro);
  }, [assenze, dataInizioFiltro, dataFineFiltro]);

  const usciteFiltrate = useMemo(() => {
    return uscite.filter(u => !u.annullata && u.data >= dataInizioFiltro && u.data <= dataFineFiltro);
  }, [uscite, dataInizioFiltro, dataFineFiltro]);

  const sostituzioniFiltrate = useMemo(() => {
    return sostituzioni.filter(s => s.data >= dataInizioFiltro && s.data <= dataFineFiltro);
  }, [sostituzioni, dataInizioFiltro, dataFineFiltro]);

  const docentiUnici = useMemo(() => getDocentiUnici(docenti), [docenti]);

  // 1. STATISTICHE EQUITÀ SOSTEGNI
  const statisticheSostegni = useMemo(() => {
    const docentiSostegno = docentiUnici.filter(d => d.isSostegno);
    
    const stats = docentiSostegno.map(doc => {
      const sostSvolte = sostituzioniFiltrate.filter(s => {
        const sostDoc = docenti.find(d => d.id === s.docenteSostitutoId);
        return sostDoc && getBaseNomeDocente(sostDoc.nome) === doc.nome && (s.categoria === 'SOSTEGNO' || sostDoc.isSostegno);
      });

      return {
        nome: doc.nome,
        totOreSupplenza: sostSvolte.length,
        isCasoGrave: doc.isCasoGraveSostegno,
        sostituzioni: sostSvolte
      };
    });

    stats.sort((a, b) => b.totOreSupplenza - a.totOreSupplenza);
    const maxOre = stats.length > 0 ? Math.max(...stats.map(s => s.totOreSupplenza), 1) : 1;
    const mediaOre = stats.length > 0 ? (stats.reduce((acc, s) => acc + s.totOreSupplenza, 0) / stats.length).toFixed(1) : '0';

    return { stats, maxOre, mediaOre, totDocenti: stats.length };
  }, [docentiUnici, docenti, sostituzioniFiltrate]);

  // 2. STATISTICHE PERMESSI BREVI E ASSEMBLEE SINDACALI
  const statistichePermessiEAssemblee = useMemo(() => {
    const stats = docentiUnici.map(doc => {
      const assenzePermesso = assenzeFiltrate.filter(a => {
        const d = docenti.find(x => x.id === a.docenteId);
        return d && getBaseNomeDocente(d.nome) === doc.nome && (a.motivo === 'Oraria' || a.isOraria);
      });
      const orePermessiRichieste = assenzePermesso.reduce((acc, a) => acc + a.oreInteressate.length, 0);

      const assenzeAssemblea = assenzeFiltrate.filter(a => {
        const d = docenti.find(x => x.id === a.docenteId);
        return d && getBaseNomeDocente(d.nome) === doc.nome && a.motivo === 'Assemblea sindacale';
      });
      const oreAssembleaRichieste = assenzeAssemblea.reduce((acc, a) => acc + a.oreInteressate.length, 0);

      const movimentiDoc = movimentiDebito.filter(m => {
        const d = docenti.find(x => x.id === m.docenteId);
        return d && getBaseNomeDocente(d.nome) === doc.nome && m.data >= dataInizioFiltro && m.data <= dataFineFiltro;
      });

      const oreRecuperate = movimentiDoc
        .filter(m => m.tipo === 'DEBITO_RECUPERATO')
        .reduce((acc, m) => acc + Math.abs(m.deltaOre), 0);

      return {
        nome: doc.nome,
        materia: doc.materie.join(', '),
        orePermessiRichieste,
        oreAssembleaRichieste,
        oreRecuperate,
        debitoAttuale: doc.oreDebitoPermesso,
        nPermessi: assenzePermesso.length,
        nAssemblee: assenzeAssemblea.length
      };
    });

    stats.sort((a, b) => (b.orePermessiRichieste + b.oreAssembleaRichieste) - (a.orePermessiRichieste + a.oreAssembleaRichieste));
    return stats;
  }, [docentiUnici, docenti, assenzeFiltrate, movimentiDebito, dataInizioFiltro, dataFineFiltro]);

  // 3. STATISTICHE GLOBALI ASSENZE
  const statisticheAssenze = useMemo(() => {
    const conteggioPerGiornoSettimana: Record<string, number> = {
      'Lunedì': 0, 'Martedì': 0, 'Mercoledì': 0, 'Giovedì': 0, 'Venerdì': 0
    };
    const conteggioPerMotivo: Record<string, number> = {};

    assenzeFiltrate.forEach(a => {
      if (conteggioPerGiornoSettimana[a.giorno] !== undefined) {
        conteggioPerGiornoSettimana[a.giorno] += a.oreInteressate.length;
      }
      const motivo = a.motivo || 'Altro';
      conteggioPerMotivo[motivo] = (conteggioPerMotivo[motivo] || 0) + a.oreInteressate.length;
    });

    const statsDocenti = docentiUnici.map(doc => {
      const assenzeDoc = assenzeFiltrate.filter(a => {
        const d = docenti.find(x => x.id === a.docenteId);
        return d && getBaseNomeDocente(d.nome) === doc.nome;
      });

      const totOre = assenzeDoc.reduce((acc, a) => acc + a.oreInteressate.length, 0);
      const giorniUnici = new Set(assenzeDoc.map(a => a.data)).size;

      return {
        nome: doc.nome,
        materia: doc.materie.join(', '),
        totOre,
        giorniUnici,
        numEventi: assenzeDoc.length
      };
    }).filter(d => d.totOre > 0).sort((a, b) => b.totOre - a.totOre);

    const totOreAssenze = assenzeFiltrate.reduce((acc, a) => acc + a.oreInteressate.length, 0);
    const totOreCoperte = sostituzioniFiltrate.length;
    const tassoCopertura = totOreAssenze > 0 ? Math.min(100, Math.round((totOreCoperte / totOreAssenze) * 100)) : 100;

    return {
      statsDocenti,
      totOreAssenze,
      totOreCoperte,
      tassoCopertura,
      conteggioPerGiornoSettimana,
      conteggioPerMotivo
    };
  }, [docentiUnici, docenti, assenzeFiltrate, sostituzioniFiltrate]);

  // 4. STATISTICHE USCITE E GITE
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

      (u.classi || []).forEach(c => {
        classiUsciteCount[c] = (classiUsciteCount[c] || 0) + 1;
      });
    });

    const topDocentiAccompagnatori = Object.entries(docentiUsciteCount)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.totOre - a.totOre);

    const topClassiUscite = Object.entries(classiUsciteCount)
      .map(([classe, totUscite]) => ({ classe, totUscite }))
      .sort((a, b) => b.totUscite - a.totUscite);

    return {
      topDocentiAccompagnatori,
      topClassiUscite,
      totUsciteEffettuate: usciteFiltrate.length
    };
  }, [usciteFiltrate, docenti]);

  // 5. STATISTICHE STRAORDINARI E PAGAMENTI D
  const statisticheStraordinari = useMemo(() => {
    const sostStraordinario = sostituzioniFiltrate.filter(s => s.categoria === 'STRAORDINARIO_D' || s.isStraordinario);
    
    const countPerDocente: Record<string, number> = {};
    sostStraordinario.forEach(s => {
      const d = docenti.find(x => x.id === s.docenteSostitutoId);
      if (d) {
        const nome = getBaseNomeDocente(d.nome);
        countPerDocente[nome] = (countPerDocente[nome] || 0) + 1;
      }
    });

    const lista = Object.entries(countPerDocente)
      .map(([nome, ore]) => ({ nome, ore }))
      .sort((a, b) => b.ore - a.ore);

    return {
      lista,
      totOreStraordinario: sostStraordinario.length
    };
  }, [sostituzioniFiltrate, docenti]);

  // ESPORTAZIONE EXCEL
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const dataSostegni = statisticheSostegni.stats.map(s => ({
        'Docente Sostegno': s.nome,
        'Ore Supplenza Svolte': s.totOreSupplenza,
        'Caso Grave / Bloccato': s.isCasoGrave ? 'SÌ' : 'NO'
      }));
      const wsSostegni = XLSX.utils.json_to_sheet(dataSostegni);
      XLSX.utils.book_append_sheet(wb, wsSostegni, 'Equità Sostegni');

      const dataPermessi = statistichePermessiEAssemblee.map(p => ({
        'Docente': p.nome,
        'Materia': p.materia,
        'Ore Permesso Breve Richieste': p.orePermessiRichieste,
        'Ore Assemblea Sindacale (Max 10h)': p.oreAssembleaRichieste,
        'Ore Recuperate': p.oreRecuperate,
        'Debito Residuo Attuale': p.debitoAttuale
      }));
      const wsPermessi = XLSX.utils.json_to_sheet(dataPermessi);
      XLSX.utils.book_append_sheet(wb, wsPermessi, 'Permessi e Assemblee');

      const dataAssenze = statisticheAssenze.statsDocenti.map(a => ({
        'Docente': a.nome,
        'Materia': a.materia,
        'Ore Totali Assenza': a.totOre,
        'Giorni con Assenze': a.giorniUnici,
        'Num. Richieste': a.numEventi
      }));
      const wsAssenze = XLSX.utils.json_to_sheet(dataAssenze);
      XLSX.utils.book_append_sheet(wb, wsAssenze, 'Riepilogo Assenze');

      const dataUscite = statisticheUscite.topDocentiAccompagnatori.map(u => ({
        'Docente Accompagnatore': u.nome,
        'Numero Uscite / Gite': u.totUscite,
        'Ore Fuori Sede': u.totOre
      }));
      const wsUscite = XLSX.utils.json_to_sheet(dataUscite);
      XLSX.utils.book_append_sheet(wb, wsUscite, 'Uscite Accompagnatori');

      const dataStraordinari = statisticheStraordinari.lista.map(s => ({
        'Docente': s.nome,
        'Ore a Pagamento (D)': s.ore
      }));
      const wsStraordinari = XLSX.utils.json_to_sheet(dataStraordinari);
      XLSX.utils.book_append_sheet(wb, wsStraordinari, 'Ore Straordinario D');

      XLSX.writeFile(wb, `Report_Statistiche_Scuola_${dataInizioFiltro}_al_${dataFineFiltro}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Errore durante la generazione del report Excel.');
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER DELLA PAGINA CON FILTRI TEMPORALI E DOWNLOAD */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Reportistica & Statistiche Avanzate</span>
          </h2>
          <p className="text-xs text-slate-500">
            Analisi dettagliata di equità sostegni, permessi brevi, assemblee sindacali, uscite e coperture.
          </p>
        </div>

        {/* AZIONI E SELETTORE PERIODO */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setPeriodo('MESE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${periodo === 'MESE' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Mese
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('QUADRIMESTRE_1')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${periodo === 'QUADRIMESTRE_1' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              1° Quad
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('QUADRIMESTRE_2')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${periodo === 'QUADRIMESTRE_2' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              2° Quad
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('ANNO_INTERO')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${periodo === 'ANNO_INTERO' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Tutto l'Anno
            </button>
          </div>

          {periodo === 'MESE' && (
            <input
              type="month"
              value={meseSelezionato}
              onChange={(e) => setMeseSelezionato(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none text-slate-800"
            />
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            title="Scarica tutti i dati in un file Excel .xlsx a 5 fogli"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Esporta Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS PANORAMICHE */}
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

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">Ore Straordinario (D)</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700">{statisticheStraordinari.totOreStraordinario}h</div>
          <span className="text-[10px] text-slate-400 mt-0.5">ore a pagamento maturate</span>
        </div>
      </div>

      {/* TABS DI NAVIGAZIONE INTERNA AL REPORT */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setTabReport('SOSTEGNI')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            tabReport === 'SOSTEGNI'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🤝 Equità Sostegni ({statisticheSostegni.totDocenti})</span>
        </button>

        <button
          type="button"
          onClick={() => setTabReport('PERMESSI')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            tabReport === 'PERMESSI'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>⏱️ Permessi & Assemblee Sindacali</span>
        </button>

        <button
          type="button"
          onClick={() => setTabReport('ASSENZE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            tabReport === 'ASSENZE'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>📋 Quadro Assenze Personale</span>
        </button>

        <button
          type="button"
          onClick={() => setTabReport('USCITE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            tabReport === 'USCITE'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🚌 Uscite Didattiche & Gite</span>
        </button>

        <button
          type="button"
          onClick={() => setTabReport('STRAORDINARI')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            tabReport === 'STRAORDINARI'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>💶 Ore Straordinario / D</span>
        </button>

        <button
          type="button"
          onClick={() => setTabReport('NOMINE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            tabReport === 'NOMINE'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>🧑‍🏫 Registro Nomine Supplenti ({nomineSupplenti.length})</span>
        </button>
      </div>

      {/* CONTENUTO SCHEDA 1: EQUITÀ SOSTEGNI */}
      {tabReport === 'SOSTEGNI' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span>🤝 Tabella di Equità e Rotazione Docenti di Sostegno</span>
              </h3>
              <p className="text-xs text-slate-500">
                Verifica visiva del carico di supplenze svolto per garantire rotazione equa ed evitare disparità.
              </p>
            </div>
            <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-200">
              Media Periodo: {statisticheSostegni.mediaOre} ore / docente
            </span>
          </div>

          <div className="space-y-2.5">
            {statisticheSostegni.stats.map((s, idx) => {
              const perc = Math.round((s.totOreSupplenza / statisticheSostegni.maxOre) * 100);
              return (
                <div key={s.nome} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400 w-5 text-center">#{idx + 1}</span>
                      <span className="font-black text-slate-900">{s.nome}</span>
                      {s.isCasoGrave && (
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded border border-rose-200">
                          🔒 Caso Grave
                        </span>
                      )}
                    </div>
                    <span className="font-black text-purple-900 text-sm">
                      {s.totOreSupplenza} {s.totOreSupplenza === 1 ? 'ora' : 'ore'}
                    </span>
                  </div>

                  {/* Barra visuale di progresso equità */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        s.totOreSupplenza === 0 ? 'bg-slate-300' : 'bg-purple-600'
                      }`}
                      style={{ width: `${Math.max(5, perc)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENUTO SCHEDA 2: PERMESSI BREVI E ASSEMBLEE SINDACALI */}
      {tabReport === 'PERMESSI' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                ⏱️ Permessi Brevi & Monte Ore Assemblee Sindacali
              </h3>
              <p className="text-xs text-slate-500">
                Monitoraggio ore di permesso richieste, ore recuperate e controllo limite 10h/anno per assemblee sindacali.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-800 text-white font-bold text-[11px]">
                  <th className="p-2.5 rounded-tl-xl">Docente</th>
                  <th className="p-2.5">Materia</th>
                  <th className="p-2.5 text-center">Permessi Brevi (Tetto {tettoPermessi}h)</th>
                  <th className="p-2.5 text-center">Assemblee Sindacali (Max {tettoAssemblee}h)</th>
                  <th className="p-2.5 text-center">Ore Recuperate</th>
                  <th className="p-2.5 text-center rounded-tr-xl">Debito Residuo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {statistichePermessiEAssemblee.map(p => (
                  <tr key={p.nome} className="hover:bg-slate-50/70">
                    <td className="p-2.5 font-bold text-slate-900">{p.nome}</td>
                    <td className="p-2.5 text-slate-500">{p.materia}</td>
                    <td className="p-2.5 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-lg border ${
                        p.orePermessiRichieste >= tettoPermessi
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {p.orePermessiRichieste}h / {tettoPermessi}h ({p.nPermessi} {p.nPermessi === 1 ? 'richiesta' : 'richieste'})
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded-lg border ${
                        p.oreAssembleaRichieste >= tettoAssemblee 
                          ? 'bg-rose-100 text-rose-800 border-rose-300' 
                          : p.oreAssembleaRichieste >= tettoAssemblee * 0.8
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {p.oreAssembleaRichieste}h / {tettoAssemblee}h max
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-bold text-emerald-700">
                      +{p.oreRecuperate}h
                    </td>
                    <td className="p-2.5 text-center">
                      {p.debitoAttuale > 0 ? (
                        <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                          {p.debitoAttuale}h da fare
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">In pari (0h)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENUTO SCHEDA 3: QUADRO ASSENZE */}
      {tabReport === 'ASSENZE' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                📋 Quadro Assenze Personale & Distribuzione Settimanale
              </h3>
              <p className="text-xs text-slate-500">
                Classifica docenti con più ore di assenza e picchi di assenza nei giorni della settimana.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Object.entries(statisticheAssenze.conteggioPerGiornoSettimana).map(([giorno, ore]) => (
              <div key={giorno} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="block text-[11px] font-bold text-slate-500">{giorno}</span>
                <span className="text-base font-black text-slate-900">{ore}h</span>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-800 text-white font-bold text-[11px]">
                  <th className="p-2.5 rounded-tl-xl">Docente</th>
                  <th className="p-2.5">Materia</th>
                  <th className="p-2.5 text-center">Giorni di Assenza</th>
                  <th className="p-2.5 text-center rounded-tr-xl">Ore Totali Assenza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {statisticheAssenze.statsDocenti.map(doc => (
                  <tr key={doc.nome} className="hover:bg-slate-50/70">
                    <td className="p-2.5 font-bold text-slate-900">{doc.nome}</td>
                    <td className="p-2.5 text-slate-500">{doc.materia}</td>
                    <td className="p-2.5 text-center font-bold text-slate-700">{doc.giorniUnici} gg</td>
                    <td className="p-2.5 text-center font-black text-rose-700 text-sm">{doc.totOre}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENUTO SCHEDA 4: USCITE DIDATTICHE */}
      {tabReport === 'USCITE' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                🚌 Uscite Didattiche, Viaggi & Docenti Accompagnatori
              </h3>
              <p className="text-xs text-slate-500">
                Totale uscite effettuate ({statisticheUscite.totUsciteEffettuate}) e bilanciamento tra accompagnatori e classi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-800">Docenti Accompagnatori più attivi</h4>
              <div className="space-y-1.5">
                {statisticheUscite.topDocentiAccompagnatori.map(doc => (
                  <div key={doc.nome} className="p-2.5 rounded-xl border border-slate-200 bg-amber-50/40 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{doc.nome}</span>
                    <span className="font-black text-amber-900">{doc.totUscite} gite ({doc.totOre}h fuori sede)</span>
                  </div>
                ))}
                {statisticheUscite.topDocentiAccompagnatori.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Nessuna uscita registrata nel periodo.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-800">Uscite effettuate per Classe</h4>
              <div className="flex flex-wrap gap-2">
                {statisticheUscite.topClassiUscite.map(c => (
                  <div key={c.classe} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2 text-xs">
                    <span className="font-black text-slate-800">{c.classe}:</span>
                    <span className="font-bold text-indigo-700">{c.totUscite} uscite</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENUTO SCHEDA 5: STRAORDINARI D */}
      {tabReport === 'STRAORDINARI' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                💶 Ore di Straordinario / Pagamento (D)
              </h3>
              <p className="text-xs text-slate-500">
                Riepilogo delle ore di supplenza a pagamento svolte in ora a disposizione (D) senza debito.
              </p>
            </div>
            <span className="text-xs font-black bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200">
              Totale Ore Straordinario: {statisticheStraordinari.totOreStraordinario}h
            </span>
          </div>

          <div className="space-y-2">
            {statisticheStraordinari.lista.map(s => (
              <div key={s.nome} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{s.nome}</span>
                <span className="font-black text-emerald-800 text-sm">{s.ore} {s.ore === 1 ? 'ora a pagamento' : 'ore a pagamento'}</span>
              </div>
            ))}
            {statisticheStraordinari.lista.length === 0 && (
              <p className="text-xs text-slate-400 italic">Nessuna ora di straordinario maturata nel periodo selezionato.</p>
            )}
          </div>
        </div>
      )}

      {/* CONTENUTO SCHEDA 6: REGISTRO NOMINE SUPPLENTI & CATENE */}
      {tabReport === 'NOMINE' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span>🧑‍🏫 Registro Storico Nomine & Supplenze Cattedra</span>
              </h3>
              <p className="text-xs text-slate-500">
                Storico completo di tutte le nomine temporanee da graduatoria, maternità e sub-supplenze a catena.
              </p>
            </div>
            <span className="text-xs font-black bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200">
              {nomineSupplenti.length} {nomineSupplenti.length === 1 ? 'Nomina Registrata' : 'Nomine Registrate'}
            </span>
          </div>

          <div className="space-y-3">
            {nomineSupplenti.map((nom, idx) => (
              <div key={nom.id} className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-black text-slate-900 text-sm">{nom.supplenteNome}</span>
                    <span className="text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                      Supplente su cattedra
                    </span>
                    {nom.supplenteEmail && (
                      <span className="text-indigo-700 bg-indigo-50 font-mono text-[11px] px-2 py-0.5 rounded-md border border-indigo-100">
                        ✉️ {nom.supplenteEmail}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700">
                    Sostituisce il docente titolare: <strong className="text-slate-900">{nom.docenteTitolareNome}</strong> ({nom.motivo || 'Maternità / Congedo'})
                  </p>

                  <p className="text-[11px] text-slate-500 font-medium">
                    🗓️ Presa di servizio dal <strong>{formatDataItaliana(nom.dataInizio)}</strong> fino al <strong>{formatDataItaliana(nom.dataFine)}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
                    Attiva a Sistema
                  </span>
                </div>
              </div>
            ))}

            {nomineSupplenti.length === 0 && (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs italic">Nessuna nomina di supplenza su cattedra registrata.</p>
                <p className="text-[11px] text-slate-400">Puoi aggiungere una nuova nomina con il pulsante "+ Nomina Supplente" nella Gestione Assenze.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};