import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, Users, Clock, ShieldCheck, Bus, Award, 
  Calendar, Download, TrendingUp, TrendingDown, AlertTriangle, FileSpreadsheet,
  CheckCircle2, ArrowUpDown, ChevronDown, Percent, Scale, ArrowDownUp, X, Filter, UserCheck,
  Megaphone, HeartHandshake, Eye, Sparkles, AlertCircle
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
  
  // Drawer / Pannello laterale per il dettaglio movimenti del singolo docente
  const [docenteDrawerDettaglio, setDocenteDrawerDettaglio] = useState<string | null>(null);

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

  // =========================================================================
  // 1. REPARTO: BILANCIO ORE (DEBITO / CREDITO) E MONITORAGGIO PERMESSI BREVI
  // =========================================================================
  const statisticheBilancio = useMemo(() => {
    const statsDocenti = docentiUnici.map(doc => {
      const collegati = doc.allIds;
      
      // Ore maturate di straordinario
      const sostPeriodo = sostituzioniFiltrate.filter(s => 
        (s.isStraordinario || s.categoria === 'STRAORDINARIO_D') && 
        (collegati.includes(s.docenteSostitutoId) || (s.docenteSostitutoId && getBaseNomeDocente(docenti.find(d => d.id === s.docenteSostitutoId)?.nome || '') === doc.nome))
      );
      const oreMaturateLorde = sostPeriodo.length;

      // Ore compensate con permessi brevi
      const movComp = movimentiDebito.filter(m => 
        (collegati.includes(m.docenteId) || getBaseNomeDocente(docenti.find(d => d.id === m.docenteId)?.nome || '') === doc.nome) && 
        m.descrizione?.includes('[COMPENSAZIONE_STRAORDINARIO]') && 
        m.data >= dataInizioFiltro && m.data <= dataFineFiltro
      );
      const oreCompensate = movComp.reduce((acc, m) => acc + Math.abs(m.deltaOre || 0), 0);

      // Credito netto disponibile
      const creditoDisponibileNetto = getOreCreditoDocente(doc.id, docenti, sostituzioni, movimentiDebito);
      const debitoResiduo = doc.oreDebitoPermesso || 0;

      // Conteggio ore di permessi brevi richieste nel periodo vs tetto annuo
      const assenzePermesso = assenzeFiltrate.filter(a => {
        const d = docenti.find(x => x.id === a.docenteId);
        return d && getBaseNomeDocente(d.nome) === doc.nome && a.motivo !== 'Assemblea sindacale' && (a.motivo === 'Oraria' || a.isOraria);
      });
      const orePermessiRichieste = assenzePermesso.reduce((acc, a) => acc + a.oreInteressate.length, 0);

      return {
        id: doc.id,
        nome: doc.nome,
        materie: doc.materie.join(', '),
        oreMaturateLorde,
        oreCompensate,
        creditoDisponibileNetto,
        debitoResiduo,
        saldoNetto: creditoDisponibileNetto - debitoResiduo,
        orePermessiRichieste,
        superatoTettoPermessi: orePermessiRichieste > tettoPermessi
      };
    });

    const docentiConMovimenti = statsDocenti.filter(d => 
      d.creditoDisponibileNetto > 0 || d.debitoResiduo > 0 || d.oreMaturateLorde > 0 || d.oreCompensate > 0 || d.orePermessiRichieste > 0
    ).sort((a, b) => (b.oreMaturateLorde + b.orePermessiRichieste) - (a.oreMaturateLorde + a.orePermessiRichieste));

    const totCreditoDisponibileNetto = statsDocenti.reduce((acc, d) => acc + d.creditoDisponibileNetto, 0);
    const totDebitoResiduo = statsDocenti.reduce((acc, d) => acc + d.debitoResiduo, 0);
    const totOrePermessiRichieste = statsDocenti.reduce((acc, d) => acc + d.orePermessiRichieste, 0);

    return {
      statsDocenti,
      docentiConMovimenti,
      totCreditoDisponibileNetto,
      totDebitoResiduo,
      totOrePermessiRichieste,
      totDocentiCoinvolti: docentiConMovimenti.length
    };
  }, [docentiUnici, docenti, sostituzioni, sostituzioniFiltrate, movimentiDebito, assenzeFiltrate, dataInizioFiltro, dataFineFiltro, tettoPermessi]);

  // =========================================================================
  // 2. REPARTO: ASSEMBLEE SINDACALI (MONITORAGGIO TETTO 10H)
  // =========================================================================
  const statisticheAssemblee = useMemo(() => {
    const stats = docentiUnici.map(doc => {
      const assenzeAssemblea = assenzeFiltrate.filter(a => {
        const d = docenti.find(x => x.id === a.docenteId);
        return d && getBaseNomeDocente(d.nome) === doc.nome && a.motivo === 'Assemblea sindacale';
      });

      const oreAssembleaRichieste = assenzeAssemblea.reduce((acc, a) => acc + a.oreInteressate.length, 0);
      const oreResidue = Math.max(0, tettoAssemblee - oreAssembleaRichieste);
      const percUsata = Math.min(100, Math.round((oreAssembleaRichieste / tettoAssemblee) * 100));

      return {
        id: doc.id,
        nome: doc.nome,
        materia: doc.materie.join(', '),
        oreAssembleaRichieste,
        oreResidue,
        percUsata,
        superatoTetto: oreAssembleaRichieste > tettoAssemblee,
        numEventi: assenzeAssemblea.length,
        assenze: assenzeAssemblea
      };
    }).filter(d => d.oreAssembleaRichieste > 0).sort((a, b) => b.oreAssembleaRichieste - a.oreAssembleaRichieste);

    const totOreAssemblee = stats.reduce((acc, d) => acc + d.oreAssembleaRichieste, 0);

    return {
      docentiPartecipanti: stats,
      totOreAssemblee,
      totDocentiPartecipanti: stats.length
    };
  }, [docentiUnici, docenti, assenzeFiltrate, tettoAssemblee]);

  // =========================================================================
  // 3. REPARTO: REPORT ASSENZE (ORDINARIE / NO GITA) & ASSENZE PER GITA
  // =========================================================================
  const statisticheAssenzeEGite = useMemo(() => {
    // A) Assenze Ordinarie (non dovute a uscite/gite e non assemblee sindacali)
    const assenzeOrdinarie = assenzeFiltrate.filter(a => a.motivo !== 'Uscita' && !a.dettagliUscita && a.motivo !== 'Assemblea sindacale');
    const totOreAssenzeOrdinarie = assenzeOrdinarie.reduce((acc, a) => acc + a.oreInteressate.length, 0);

    const classificaAssenzeOrdinarie = docentiUnici.map(doc => {
      const assDoc = assenzeOrdinarie.filter(a => {
        const d = docenti.find(x => x.id === a.docenteId);
        return d && getBaseNomeDocente(d.nome) === doc.nome;
      });
      const totOre = assDoc.reduce((acc, a) => acc + a.oreInteressate.length, 0);
      const giorniUnici = new Set(assDoc.map(a => a.data)).size;
      return {
        id: doc.id,
        nome: doc.nome,
        materia: doc.materie.join(', '),
        totOre,
        giorniUnici,
        numEventi: assDoc.length
      };
    }).filter(d => d.totOre > 0).sort((a, b) => b.totOre - a.totOre); // Da chi ne ha di più a chi di meno

    // B) Assenze generate per Gita / Uscita Didattica (Accompagnatori)
    const docentiUsciteCount: Record<string, { totUscite: number; totOre: number; materia: string }> = {};
    usciteFiltrate.forEach(u => {
      const numOre = u.ore?.length || (u.oraFine - u.oraInizio + 1);
      (u.docentiAccompagnatoriIds || []).forEach(docId => {
        const d = docenti.find(x => x.id === docId);
        if (d) {
          const nome = getBaseNomeDocente(d.nome);
          if (!docentiUsciteCount[nome]) {
            docentiUsciteCount[nome] = { totUscite: 0, totOre: 0, materia: d.materia || '' };
          }
          docentiUsciteCount[nome].totUscite += 1;
          docentiUsciteCount[nome].totOre += numOre;
        }
      });
    });

    const classificaGite = Object.entries(docentiUsciteCount).map(([nome, data]) => ({
      nome,
      ...data
    })).sort((a, b) => b.totOre - a.totOre); // Da chi ha fatto più gite a chi meno

    const totOreGite = classificaGite.reduce((acc, d) => acc + d.totOre, 0);

    return {
      totOreAssenzeOrdinarie,
      classificaAssenzeOrdinarie,
      totUsciteEffettuate: usciteFiltrate.length,
      totOreGite,
      classificaGite
    };
  }, [docentiUnici, docenti, assenzeFiltrate, usciteFiltrate]);

  // =========================================================================
  // 4. REPARTO: EQUITÀ SOSTITUZIONI ASSEGNATE AI DOCENTI DI SOSTEGNO
  // =========================================================================
  const statisticheEquitaSostegni = useMemo(() => {
    const docentiSostegno = docentiUnici.filter(d => d.isSostegno);
    const stats = docentiSostegno.map(doc => {
      const sostSvolte = sostituzioniFiltrate.filter(s => {
        const sostDoc = docenti.find(d => d.id === s.docenteSostitutoId);
        return sostDoc && getBaseNomeDocente(sostDoc.nome) === doc.nome && (s.categoria === 'SOSTEGNO' || sostDoc.isSostegno);
      });
      return {
        nome: doc.nome,
        totOreSupplenza: sostSvolte.length,
        isCasoGrave: doc.isCasoGraveSostegno
      };
    });

    // Classifica dai più usati ai meno usati
    stats.sort((a, b) => b.totOreSupplenza - a.totOreSupplenza);
    const maxOre = stats.length > 0 ? Math.max(...stats.map(s => s.totOreSupplenza), 1) : 1;
    const mediaOre = stats.length > 0 ? (stats.reduce((acc, s) => acc + s.totOreSupplenza, 0) / stats.length).toFixed(1) : '0';
    const totOreSostegno = stats.reduce((acc, s) => acc + s.totOreSupplenza, 0);

    return {
      stats,
      maxOre,
      mediaOre,
      totDocenti: stats.length,
      totOreSostegno
    };
  }, [docentiUnici, docenti, sostituzioniFiltrate]);

  // =========================================================================
  // MOVIMENTI DETTAGLIATI PER IL DOCENTE SELEZIONATO NEL DRAWER LATERALE
  // =========================================================================
  const movimentiDocenteDrawer = useMemo(() => {
    if (!docenteDrawerDettaglio) return [];
    return movimentiDebito
      .filter(m => {
        const inPeriodo = m.data >= dataInizioFiltro && m.data <= dataFineFiltro;
        if (!inPeriodo) return false;
        const dTarget = docenti.find(d => d.id === m.docenteId);
        const nomeM = dTarget ? getBaseNomeDocente(dTarget.nome) : '';
        return nomeM === docenteDrawerDettaglio || m.docenteId === docenteDrawerDettaglio;
      })
      .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [docenteDrawerDettaglio, movimentiDebito, dataInizioFiltro, dataFineFiltro, docenti]);

  // ESPORTAZIONE COMPLETA EXCEL
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Foglio 1: Bilancio & Permessi
      const dataBilancio = statisticheBilancio.statsDocenti.map(d => ({
        'Docente': d.nome, 'Materia': d.materie,
        'Ore Credito Maturate': d.oreMaturateLorde, 'Ore Compensate con Permessi': d.oreCompensate,
        'Credito Netto Disponibile (h)': d.creditoDisponibileNetto, 'Debito Residuo da Fare (h)': d.debitoResiduo,
        'Saldo Netto (h)': d.saldoNetto,
        'Ore Permessi Brevi Richieste': d.orePermessiRichieste,
        'Tetto Max Permessi (12h)': tettoPermessi
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataBilancio), 'Bilancio Debito Credito');

      // Foglio 2: Assemblee Sindacali
      const dataAssemblee = statisticheAssemblee.docentiPartecipanti.map(a => ({
        'Docente': a.nome, 'Materia': a.materia,
        'Ore Assemblea Usufruite': a.oreAssembleaRichieste,
        'Tetto Max Annuo': tettoAssemblee,
        'Ore Rimanenti Disponibili': a.oreResidue
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataAssemblee), 'Assemblee Sindacali');

      // Foglio 3: Assenze Ordinarie
      const dataAssenze = statisticheAssenzeEGite.classificaAssenzeOrdinarie.map(a => ({
        'Docente': a.nome, 'Materia': a.materia,
        'Ore Totali Assenza': a.totOre, 'Giorni con Assenze': a.giorniUnici, 'Num. Eventi': a.numEventi
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataAssenze), 'Assenze Ordinarie');

      // Foglio 4: Gite e Uscite
      const dataGite = statisticheAssenzeEGite.classificaGite.map(g => ({
        'Docente Accompagnatore': g.nome, 'Materia': g.materia,
        'Numero Uscite': g.totUscite, 'Ore Fuori Sede': g.totOre
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataGite), 'Gite e Uscite Didattiche');

      // Foglio 5: Equità Sostegni
      const dataSostegni = statisticheEquitaSostegni.stats.map((s, idx) => ({
        'Posizione Rotazione': idx + 1,
        'Docente Sostegno': s.nome,
        'Ore Supplenza Assegnate': s.totOreSupplenza,
        'Caso Grave / Bloccato': s.isCasoGrave ? 'SÌ' : 'NO'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataSostegni), 'Equità Sostegni');

      XLSX.writeFile(wb, `Report_Bilanci_Scuola_${dataInizioFiltro}_al_${dataFineFiltro}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Errore durante la generazione del report Excel.');
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER PRINCIPALE CON FILTRI TEMPORALI ED EXPORT */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Bilanci & Report</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Visione integrata macro-micro: debito/credito, permessi brevi, assemblee sindacali, assenze/gite ed equità sostegni.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['MESE', 'QUADRIMESTRE_1', 'QUADRIMESTRE_2', 'ANNO_INTERO'].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p as PeriodoFiltro)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  periodo === p ? 'bg-white text-indigo-950 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'MESE' ? 'Mese' : p === 'QUADRIMESTRE_1' ? '1° Quad' : p === 'QUADRIMESTRE_2' ? '2° Quad' : 'Tutto l\'Anno'}
              </button>
            ))}
          </div>

          {periodo === 'MESE' && (
            <input
              type="month"
              value={meseSelezionato}
              onChange={(e) => setMeseSelezionato(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
            />
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            title="Esporta tutti i 4 reparti in Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Esporta Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GRIGLIA A 4 RIQUADRI / REPARTI (OPZIONE 3)                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        
        {/* --------------------------------------------------------------------- */}
        {/* REPARTO 1: BILANCIO ORE & PERMESSI BREVI                              */}
        {/* --------------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4 h-full">
          <div className="border-b border-slate-100 pb-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>1. Bilancio Ore & Permessi Brevi</span>
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                Tetto Permessi: {tettoPermessi}h/anno
              </span>
            </div>

            {/* Macro KPI Numeri a Vista */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-emerald-800 block">Tot. Crediti</span>
                <strong className="text-lg font-black text-emerald-950">+{statisticheBilancio.totCreditoDisponibileNetto}h</strong>
              </div>
              <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-rose-800 block">Tot. Debiti</span>
                <strong className="text-lg font-black text-rose-950">-{statisticheBilancio.totDebitoResiduo}h</strong>
              </div>
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-amber-800 block">Permessi Brevi</span>
                <strong className="text-lg font-black text-amber-950">{statisticheBilancio.totOrePermessiRichieste}h</strong>
              </div>
            </div>
          </div>

          {/* Micro Elenco Docenti con Debito/Credito e Permessi */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
              <span>Docente ({statisticheBilancio.docentiConMovimenti.length})</span>
              <span>Saldo / Permessi / Azione</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
              {statisticheBilancio.docentiConMovimenti.map(doc => (
                <div key={doc.id} className="py-2 px-1.5 flex items-center justify-between text-xs hover:bg-slate-50 rounded-xl transition">
                  <div className="space-y-0.5">
                    <strong className="font-bold text-slate-900 block">{doc.nome}</strong>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span>Maturate: +{doc.oreMaturateLorde}h</span>
                      <span>•</span>
                      <span className={doc.superatoTettoPermessi ? 'text-rose-700 font-bold' : ''}>
                        Permessi: {doc.orePermessiRichieste}h/{tettoPermessi}h
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {doc.creditoDisponibileNetto > 0 && (
                      <span className="font-black text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
                        +{doc.creditoDisponibileNetto}h
                      </span>
                    )}
                    {doc.debitoResiduo > 0 && (
                      <span className="font-black text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-lg border border-rose-200 text-[11px]">
                        -{doc.debitoResiduo}h
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setDocenteDrawerDettaglio(doc.nome)}
                      className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer shadow-2xs"
                      title="Apri estratto conto e storico movimenti"
                    >
                      Dettaglio
                    </button>
                  </div>
                </div>
              ))}
              {statisticheBilancio.docentiConMovimenti.length === 0 && (
                <p className="text-xs text-slate-400 italic p-4 text-center">Nessun docente con debiti o crediti attivi nel periodo.</p>
              )}
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* REPARTO 2: ASSEMBLEE SINDACALI (TETTO 10H)                           */}
        {/* --------------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4 h-full">
          <div className="border-b border-slate-100 pb-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-purple-600" />
                <span>2. Assemblee Sindacali</span>
              </span>
              <span className="text-[10px] bg-purple-50 text-purple-800 font-bold px-2 py-0.5 rounded-md border border-purple-200">
                Tetto Annuo: {tettoAssemblee}h / docente
              </span>
            </div>

            {/* Macro KPI Numeri a Vista */}
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-purple-800 block">Totale Ore Usufruite</span>
                <strong className="text-lg font-black text-purple-950">{statisticheAssemblee.totOreAssemblee}h</strong>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-600 block">Docenti Partecipanti</span>
                <strong className="text-lg font-black text-slate-900">{statisticheAssemblee.totDocentiPartecipanti}</strong>
              </div>
            </div>
          </div>

          {/* Micro Elenco Docenti con Ore Usufruite e Barre di Avanzamento */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
              <span>Docente ({statisticheAssemblee.docentiPartecipanti.length})</span>
              <span>Ore Usate vs Max 10h</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
              {statisticheAssemblee.docentiPartecipanti.map(doc => (
                <div key={doc.id} className="py-2.5 px-1.5 space-y-1 hover:bg-slate-50 rounded-xl transition">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="font-bold text-slate-900">{doc.nome}</strong>
                    <span className="font-black text-purple-900 text-xs">
                      {doc.oreAssembleaRichieste}h / {tettoAssemblee}h
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        doc.superatoTetto ? 'bg-rose-600' : 'bg-purple-600'
                      }`}
                      style={{ width: `${Math.min(100, (doc.oreAssembleaRichieste / tettoAssemblee) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{doc.numEventi} assemblee</span>
                    <span>Rimanenti: {doc.oreResidue}h</span>
                  </div>
                </div>
              ))}
              {statisticheAssemblee.docentiPartecipanti.length === 0 && (
                <p className="text-xs text-slate-400 italic p-4 text-center">Nessuna assemblea sindacale registrata nel periodo.</p>
              )}
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* REPARTO 3: REPORT ASSENZE ORDINARIE & GITE DIDATTICHE                 */}
        {/* --------------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4 h-full">
          <div className="border-b border-slate-100 pb-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-600" />
                <span>3. Report Assenze & Gite</span>
              </span>
              <span className="text-[10px] bg-rose-50 text-rose-800 font-bold px-2 py-0.5 rounded-md border border-rose-200">
                Classifiche per Frequenza
              </span>
            </div>

            {/* Macro KPI Numeri a Vista */}
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-rose-800 block">Assenze Ordinarie (No Gita)</span>
                <strong className="text-lg font-black text-rose-950">{statisticheAssenzeEGite.totOreAssenzeOrdinarie}h</strong>
              </div>
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-amber-800 block">Ore Fuori Sede per Gite</span>
                <strong className="text-lg font-black text-amber-950">{statisticheAssenzeEGite.totOreGite}h</strong>
              </div>
            </div>
          </div>

          {/* Due Micro-Elenchi: A) Chi ha più assenze, B) Chi ha fatto più gite */}
          <div className="space-y-4 flex-1">
            {/* Sotto-sezione Assenze Ordinarie */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-black text-slate-800 flex items-center justify-between">
                <span>🏥 Classifica Assenze Ordinarie (Da più a meno ore)</span>
                <span className="text-slate-400 font-normal text-[10px]">{statisticheAssenzeEGite.classificaAssenzeOrdinarie.length} docenti</span>
              </h4>
              <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto pr-1">
                {statisticheAssenzeEGite.classificaAssenzeOrdinarie.slice(0, 10).map((doc, idx) => (
                  <div key={doc.id} className="py-1.5 px-1 flex items-center justify-between text-xs hover:bg-slate-50 rounded">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 w-4">#{idx + 1}</span>
                      <strong className="font-bold text-slate-900">{doc.nome}</strong>
                    </div>
                    <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                      {doc.totOre}h ({doc.giorniUnici} gg)
                    </span>
                  </div>
                ))}
                {statisticheAssenzeEGite.classificaAssenzeOrdinarie.length === 0 && (
                  <p className="text-[11px] text-slate-400 italic py-1">Nessuna assenza ordinaria nel periodo.</p>
                )}
              </div>
            </div>

            {/* Sotto-sezione Assenze per Gita */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <h4 className="text-[11px] font-black text-slate-800 flex items-center justify-between">
                <span>🚌 Classifica Accompagnatori Gite (Da più a meno uscite)</span>
                <span className="text-slate-400 font-normal text-[10px]">{statisticheAssenzeEGite.classificaGite.length} docenti</span>
              </h4>
              <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto pr-1">
                {statisticheAssenzeEGite.classificaGite.map((doc, idx) => (
                  <div key={doc.nome} className="py-1.5 px-1 flex items-center justify-between text-xs hover:bg-slate-50 rounded">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 w-4">#{idx + 1}</span>
                      <strong className="font-bold text-slate-900">{doc.nome}</strong>
                    </div>
                    <span className="font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                      {doc.totUscite} gite ({doc.totOre}h)
                    </span>
                  </div>
                ))}
                {statisticheAssenzeEGite.classificaGite.length === 0 && (
                  <p className="text-[11px] text-slate-400 italic py-1">Nessuna uscita didattica registrata nel periodo.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* REPARTO 4: EQUITÀ SOSTITUZIONI DOCENTI DI SOSTEGNO                    */}
        {/* --------------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4 h-full">
          <div className="border-b border-slate-100 pb-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                <span>4. Equità Sostituzioni Sostegno</span>
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                Rotazione Equa
              </span>
            </div>

            {/* Macro KPI Numeri a Vista */}
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-emerald-800 block">Media Supplenze / Docente</span>
                <strong className="text-lg font-black text-emerald-950">{statisticheEquitaSostegni.mediaOre}h</strong>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-600 block">Docenti Sostegno Attivi</span>
                <strong className="text-lg font-black text-slate-900">{statisticheEquitaSostegni.totDocenti}</strong>
              </div>
            </div>
          </div>

          {/* Micro Classifica dai più usati ai meno usati */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
              <span>Docente Sostegno (Ordinati per carico supplenze)</span>
              <span>Ore Svolte</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {statisticheEquitaSostegni.stats.map((s, idx) => {
                const perc = Math.round((s.totOreSupplenza / statisticheEquitaSostegni.maxOre) * 100);
                return (
                  <div key={s.nome} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-400 w-4 text-center text-[10px]">#{idx + 1}</span>
                        <strong className="font-black text-slate-900">{s.nome}</strong>
                        {s.isCasoGrave && (
                          <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded border border-rose-200">
                            🔒 Caso Grave
                          </span>
                        )}
                      </div>
                      <span className="font-black text-emerald-900 text-xs">
                        {s.totOreSupplenza} {s.totOreSupplenza === 1 ? 'ora' : 'ore'}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          s.totOreSupplenza === 0 ? 'bg-slate-300' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.max(4, perc)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {statisticheEquitaSostegni.stats.length === 0 && (
                <p className="text-xs text-slate-400 italic p-4 text-center">Nessun docente di sostegno presente in anagrafica.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DRAWER / MODALE LATERALE: ESTRATTO CONTO MOVIMENTI DEL SINGOLO DOCENTE    */}
      {/* ========================================================================= */}
      {docenteDrawerDettaglio && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg h-full p-5 sm:p-6 shadow-2xl border-l border-slate-200 flex flex-col justify-between space-y-4 animate-in slide-in-from-right duration-200">
            
            {/* Header Drawer */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-200">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Estratto Conto Movimenti
                  </h3>
                  <p className="text-xs text-indigo-700 font-bold mt-0.5">
                    Prof. {docenteDrawerDettaglio}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDocenteDrawerDettaglio(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Riepilogo Saldo del Docente */}
            {(() => {
              const docStat = statisticheBilancio.statsDocenti.find(d => d.nome === docenteDrawerDettaglio);
              return (
                <div className="grid grid-cols-3 gap-2 text-center shrink-0">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                    <span className="text-[10px] font-bold text-emerald-800 block">Credito Netto</span>
                    <strong className="text-base font-black text-emerald-950">+{docStat?.creditoDisponibileNetto || 0}h</strong>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                    <span className="text-[10px] font-bold text-rose-800 block">Debito Residuo</span>
                    <strong className="text-base font-black text-rose-950">-{docStat?.debitoResiduo || 0}h</strong>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5">
                    <span className="text-[10px] font-bold text-indigo-800 block">Permessi Richiesti</span>
                    <strong className="text-base font-black text-indigo-950">{docStat?.orePermessiRichieste || 0}h</strong>
                  </div>
                </div>
              );
            })()}

            {/* Lista Cronologica dei Movimenti del Docente */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Cronologia Variazioni ({movimentiDocenteDrawer.length} movimenti)
              </span>

              {movimentiDocenteDrawer.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600 text-xs">Nessun movimento registrato nel periodo</p>
                </div>
              ) : (
                movimentiDocenteDrawer.map(m => {
                  const isCompensazione = m.descrizione?.includes('[COMPENSAZIONE_STRAORDINARIO]');
                  const isRecupero = m.tipo === 'DEBITO_RECUPERATO';
                  const isDebitoGen = m.tipo === 'DEBITO_GENERATO';

                  return (
                    <div key={m.id} className="py-2.5 px-2 flex items-start justify-between gap-2 hover:bg-slate-50 rounded-xl transition text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-slate-800 text-white font-bold text-[10px] px-2 py-0.2 rounded shadow-2xs">
                            {formatDataItaliana(m.data)}
                          </span>

                          {isCompensazione ? (
                            <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-[9px] px-1.5 py-0.2 rounded">
                              Compensato da Credito
                            </span>
                          ) : isRecupero ? (
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-[9px] px-1.5 py-0.2 rounded">
                              Debito Recuperato
                            </span>
                          ) : isDebitoGen ? (
                            <span className="bg-rose-100 text-rose-900 border border-rose-200 font-bold text-[9px] px-1.5 py-0.2 rounded">
                              Permesso Breve
                            </span>
                          ) : null}
                        </div>

                        <p className="text-slate-700 text-xs font-medium leading-tight">
                          {m.descrizione?.replace('[COMPENSAZIONE_STRAORDINARIO] ', '')}
                        </p>
                      </div>

                      <span className={`font-black text-xs px-2 py-0.5 rounded-lg shrink-0 ${
                        m.deltaOre > 0 
                          ? 'bg-emerald-600 text-white' 
                          : isCompensazione 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-rose-600 text-white'
                      }`}>
                        {m.deltaOre > 0 ? `+${m.deltaOre}h` : `${m.deltaOre}h`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Drawer */}
            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setDocenteDrawerDettaglio(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
              >
                Chiudi
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};