const fs = require('fs');

const tabellone = import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Docente, GiornoSettimana, SostituzioneAssegnata, CategoriaSostituto } from '../types';
import { trovaCandidatiSostituzione } from '../utils/substitutionEngine';
import { AlertCircle, CheckCircle, Clock, UserCheck, ShieldAlert, Sparkles, X, ChevronRight } from 'lucide-react';

interface Props {
  selectedDate: string;
  selectedGiorno: GiornoSettimana;
}

interface OraScoperta {
  ora: number;
  classe: string;
  docenteAssente: Docente;
  motivo: string;
  isUscita: boolean;
}

export const TabelloneSostituzioni: React.FC<Props> = ({ selectedDate, selectedGiorno }) => {
  const {
    docenti,
    orariDocenti,
    assenze,
    uscite,
    sostituzioni,
    assegnaSostituzione,
    rimuoviSostituzione,
    pubblicaTutteSostituzioniData
  } = useApp();

  const [selectedOraScoperta, setSelectedOraScoperta] = useState<OraScoperta | null>(null);

  const assenzeOggi = assenze.filter(a => a.data === selectedDate);
  const usciteOggi = uscite.filter(u => u.data === selectedDate);
  const sostituzioniOggi = sostituzioni.filter(s => s.data === selectedDate);

  const oreScoperte: OraScoperta[] = [];

  assenzeOggi.forEach(assenza => {
    const doc = docenti.find(d => d.id === assenza.docenteId);
    if (!doc || doc.isEducatore) return;

    const orarioDoc = orariDocenti.find(o => o.docenteId === doc.id);
    if (!orarioDoc) return;

    assenza.oreInteressate.forEach(ora => {
      const cella = orarioDoc.ore.find(c => c.giorno === selectedGiorno && c.ora === ora);
      const val = cella?.valore?.trim() || '';

      if (val && val !== 'D' && val !== 'P') {
        const classeInUscita = usciteOggi.some(u => u.classe === val && u.ore.includes(ora));
        if (!classeInUscita) {
          oreScoperte.push({
            ora,
            classe: val,
            docenteAssente: doc,
            motivo: assenza.motivo,
            isUscita: assenza.motivo === 'Uscita'
          });
        }
      }
    });
  });

  oreScoperte.sort((a, b) => a.ora - b.ora || a.classe.localeCompare(b.classe));

  const getSostituzione = (ora: number, classe: string) => {
    return sostituzioniOggi.find(s => s.ora === ora && s.classe === classe);
  };

  const getDocenteNome = (id: string) => docenti.find(d => d.id === id)?.nome || id;

  const candidati = selectedOraScoperta
    ? trovaCandidatiSostituzione(
        selectedOraScoperta.ora,
        selectedGiorno,
        selectedOraScoperta.classe,
        selectedOraScoperta.docenteAssente,
        selectedOraScoperta.isUscita,
        orariDocenti,
        docenti,
        assenzeOggi,
        usciteOggi,
        sostituzioniOggi
      )
    : null;

  const handleAutoAssegnaTutto = () => {
    oreScoperte.forEach(os => {
      const giaAssegnata = getSostituzione(os.ora, os.classe);
      if (giaAssegnata) return;

      const cand = trovaCandidatiSostituzione(
        os.ora,
        selectedGiorno,
        os.classe,
        os.docenteAssente,
        os.isUscita,
        orariDocenti,
        docenti,
        assenzeOggi,
        usciteOggi,
        sostituzioniOggi
      );

      const categorieOrdinate: CategoriaSostituto[] = os.isUscita
        ? ['RECUPERO_STESSA_CLASSE', 'LIBERATO_STESSA_CLASSE', 'POTENZIAMENTO', 'LIBERATO_ALTRA_CLASSE', 'SOSTEGNO', 'STRAORDINARIO_D']
        : ['RECUPERO_STESSA_CLASSE', 'POTENZIAMENTO', 'SOSTEGNO', 'RECUPERO_GENERICO', 'STRAORDINARIO_D'];

      for (const cat of categorieOrdinate) {
        const lista = cand[cat];
        if (lista && lista.length > 0) {
          const primo = lista[0];
          assegnaSostituzione({
            data: selectedDate,
            giorno: selectedGiorno,
            ora: os.ora,
            classe: os.classe,
            docenteAssenteId: os.docenteAssente.id,
            docenteSostitutoId: primo.docente.id,
            categoria: cat,
            isStraordinario: cat === 'STRAORDINARIO_D',
            consumaDebito: cat === 'RECUPERO_STESSA_CLASSE' || cat === 'RECUPERO_GENERICO',
            pubblicata: false,
            firmata: false
          });
          break;
        }
      }
    });
  };

  return (
    <div className=space-y-6>
      <div className=bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4>
        <div>
          <h3 className=font-bold text-slate-800 text-lg flex items-center gap-2>
            <span>Quadro Sostituzioni del Giorno</span>
            <span className=bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-bold>
              {oreScoperte.length} Ore da Coprire
            </span>
          </h3>
          <p className=text-xs text-slate-500>
            {selectedGiorno} {selectedDate} • Clicca su un\\'ora scoperta per scegliere manualmente il sostituto
          </p>
        </div>

        <div className=flex items-center gap-3>
          <button
            onClick={handleAutoAssegnaTutto}
            className=bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-4 py-2 rounded-lg text-sm border border-indigo-200 transition flex items-center gap-2
          >
            <Sparkles className=w-4 h-4 text-indigo-600 /> Genera Proposta Automatica
          </button>
          <button
            onClick={() => pubblicaTutteSostituzioniData(selectedDate)}
            className=bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition shadow-sm flex items-center gap-2
          >
            <CheckCircle className=w-4 h-4 /> Pubblica per Firme Docenti
          </button>
        </div>
      </div>

      {oreScoperte.length === 0 ? (
        <div className=bg-white p-12 text-center rounded-xl border border-dashed border-slate-300>
          <CheckCircle className=w-12 h-12 text-emerald-500 mx-auto mb-3 />
          <h4 className=font-bold text-slate-800 text-lg>Nessuna classe scoperta!</h4>
          <p className=text-sm text-slate-500 mt-1>Non ci sono assenze registrate per {selectedGiorno} o tutte le classi sono regolarmente coperte.</p>
        </div>
      ) : (
        <div className=grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4>
          {oreScoperte.map((os, idx) => {
            const sost = getSostituzione(os.ora, os.classe);
            const isSelected = selectedOraScoperta?.ora === os.ora && selectedOraScoperta?.classe === os.classe;

            return (
              <div
                key={idx}
                onClick={() => setSelectedOraScoperta(os)}
                className={p-4 rounded-xl border transition cursor-pointer relative  + (
                  isSelected
                    ? border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50/40 shadow-md
                    : sost
                    ? bg-white border-emerald-300 hover:border-emerald-400 shadow-sm
                    : bg-white border-amber-300 hover:border-amber-400 shadow-sm
                )}
              >
                <div className=flex items-center justify-between mb-2>
                  <div className=flex items-center gap-2>
                    <span className=bg-slate-800 text-white font-bold text-xs px-2.5 py-1 rounded>
                      {os.ora}ª ORA
                    </span>
                    <span className=font-black text-slate-900 text-base>
                      Classe {os.classe}
                    </span>
                  </div>
                  {sost ? (
                    <span className=bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1>
                      <CheckCircle className=w-3 h-3 /> Coperta
                    </span>
                  ) : (
                    <span className=bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1>
                      <AlertCircle className=w-3 h-3 /> Da Assegnare
                    </span>
                  )}
                </div>

                <div className=text-xs text-slate-600 space-y-1 mb-3>
                  <div>
                    <span className=text-slate-400>Docente assente:</span>{' '}
                    <strong className=text-slate-800>{os.docenteAssente.nome}</strong> ({os.docenteAssente.materia})
                  </div>
                  <div>
                    <span className=text-slate-400>Motivo:</span>{' '}
                    <span className=font-medium text-slate-700>{os.motivo}</span>
                  </div>
                </div>

                {sost ? (
                  <div className=pt-2 border-t border-slate-100 flex items-center justify-between>
                    <div>
                      <span className=text-[11px] text-slate-400 block>Sostituto Assegnato:</span>
                      <strong className=text-emerald-800 text-xs>{getDocenteNome(sost.docenteSostitutoId)}</strong>
                      <span className=block text-[10px] text-emerald-600>{sost.categoria}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rimuoviSostituzione(sost.id);
                      }}
                      className=text-red-500 hover:text-red-700 p-1 text-xs
                      title=Rimuovi assegnazione
                    >
                      <X className=w-4 h-4 />
                    </button>
                  </div>
                ) : (
                  <div className=pt-2 border-t border-slate-100 flex items-center justify-between text-indigo-600 text-xs font-semibold>
                    <span>Scegli sostituto...</span>
                    <ChevronRight className=w-4 h-4 />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedOraScoperta && candidati && (
        <div className=fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50>
          <div className=bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6>
            <div className=flex items-center justify-between border-b pb-4>
              <div>
                <span className=text-xs font-bold text-indigo-600 uppercase>Selezione Sostituto Assistita</span>
                <h3 className=text-xl font-black text-slate-900>
                  {selectedOraScoperta.ora}ª Ora • Classe {selectedOraScoperta.classe}
                </h3>
                <p className=text-xs text-slate-500>
                  Assente: <strong>{selectedOraScoperta.docenteAssente.nome}</strong> ({selectedOraScoperta.motivo})
                </p>
              </div>
              <button
                onClick={() => setSelectedOraScoperta(null)}
                className=text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100
              >
                <X className=w-6 h-6 />
              </button>
            </div>

            <div className=space-y-4>
              {/* 1. RECUPERI STESSA CLASSE */}
              <div className=border border-blue-200 bg-blue-50/50 rounded-xl p-3.5>
                <div className=flex items-center gap-2 mb-2 font-bold text-xs uppercase text-blue-900>
                  <span className=w-3 h-3 rounded-full bg-blue-600 inline-block></span>
                  1. Recuperi Stessa Classe (Debito Permesso Breve)
                </div>
                {candidati.RECUPERO_STESSA_CLASSE && candidati.RECUPERO_STESSA_CLASSE.length > 0 ? (
                  <div className=space-y-2>
                    {candidati.RECUPERO_STESSA_CLASSE.map(c => (
                      <div key={c.docente.id} className=flex items-center justify-between bg-white p-2.5 rounded-lg border border-blue-200 shadow-sm>
                        <div>
                          <strong className=text-sm text-slate-800>{c.docente.nome}</strong>
                          <span className=text-xs text-blue-700 block>{c.dettagli}</span>
                        </div>
                        <button
                          onClick={() => {
                            assegnaSostituzione({
                              data: selectedDate,
                              giorno: selectedGiorno,
                              ora: selectedOraScoperta.ora,
                              classe: selectedOraScoperta.classe,
                              docenteAssenteId: selectedOraScoperta.docenteAssente.id,
                              docenteSostitutoId: c.docente.id,
                              categoria: 'RECUPERO_STESSA_CLASSE',
                              isStraordinario: false,
                              consumaDebito: true,
                              pubblicata: false,
                              firmata: false
                            });
                            setSelectedOraScoperta(null);
                          }}
                          className=bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded transition
                        >
                          Assegna (Recupero)
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className=text-xs text-slate-400 italic>Nessun docente della classe con debito orario disponibile in quest\\'ora.</p>
                )}
              </div>

              {/* 2. LIBERATI DA USCITA DIDATTICA */}
              <div className=border border-amber-200 bg-amber-50/50 rounded-xl p-3.5>
                <div className=flex items-center gap-2 mb-2 font-bold text-xs uppercase text-amber-900>
                  <span className=w-3 h-3 rounded-full bg-amber-500 inline-block></span>
                  2. Docenti Liberati da Uscita Didattica
                </div>
                {[...(candidati.LIBERATO_STESSA_CLASSE || []), ...(candidati.LIBERATO_ALTRA_CLASSE || [])].length > 0 ? (
                  <div className=space-y-2>
                    {[...(candidati.LIBERATO_STESSA_CLASSE || []), ...(candidati.LIBERATO_ALTRA_CLASSE || [])].map(c => (
                      <div key={c.docente.id} className=flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-200 shadow-sm>
                        <div>
                          <strong className=text-sm text-slate-800>{c.docente.nome}</strong>
                          <span className=text-xs text-amber-700 block>{c.dettagli}</span>
                        </div>
                        <button
                          onClick={() => {
                            assegnaSostituzione({
                              data: selectedDate,
                              giorno: selectedGiorno,
                              ora: selectedOraScoperta.ora,
                              classe: selectedOraScoperta.classe,
                              docenteAssenteId: selectedOraScoperta.docenteAssente.id,
                              docenteSostitutoId: c.docente.id,
                              categoria: c.categoria,
                              isStraordinario: false,
                              consumaDebito: false,
                              pubblicata: false,
                              firmata: false
                            });
                            setSelectedOraScoperta(null);
                          }}
                          className=bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3 py-1.5 rounded transition
                        >
                          Assegna (Liberato)
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className=text-xs text-slate-400 italic>Nessun docente liberato da uscite didattiche in quest\\'ora.</p>
                )}
              </div>

              {/* 3. POTENZIAMENTI (P) */}
              <div className=border border-emerald-200 bg-emerald-50/50 rounded-xl p-3.5>
                <div className=flex items-center gap-2 mb-2 font-bold text-xs uppercase text-emerald-900>
                  <span className=w-3 h-3 rounded-full bg-emerald-600 inline-block></span>
                  3. Potenziamenti Disponibili (P)
                </div>
                {candidati.POTENZIAMENTO && candidati.POTENZIAMENTO.length > 0 ? (
                  <div className=space-y-2>
                    {candidati.POTENZIAMENTO.map(c => (
                      <div key={c.docente.id} className=flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-200 shadow-sm>
                        <div>
                          <strong className=text-sm text-slate-800>{c.docente.nome}</strong>
                          <span className=text-xs text-emerald-700 block>{c.dettagli}</span>
                        </div>
                        <button
                          onClick={() => {
                            assegnaSostituzione({
                              data: selectedDate,
                              giorno: selectedGiorno,
                              ora: selectedOraScoperta.ora,
                              classe: selectedOraScoperta.classe,
                              docenteAssenteId: selectedOraScoperta.docenteAssente.id,
                              docenteSostitutoId: c.docente.id,
                              categoria: 'POTENZIAMENTO',
                              isStraordinario: false,
                              consumaDebito: false,
                              pubblicata: false,
                              firmata: false
                            });
                            setSelectedOraScoperta(null);
                          }}
                          className=bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded transition
                        >
                          Assegna (Potenziamento)
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className=text-xs text-slate-400 italic>Nessun docente su potenziamento in quest\\'ora.</p>
                )}
              </div>

              {/* 4. RECUPERI GENERICI */}
              <div className=border border-purple-200 bg-purple-50/50 rounded-xl p-3.5>
                <div className=flex items-center gap-2 mb-2 font-bold text-xs uppercase text-purple-900>
                  <span className=w-3 h-3 rounded-full bg-purple-600 inline-block></span>
                  4. Recuperi Generici (Docenti con debito orario)
                </div>
                {candidati.RECUPERO_GENERICO && candidati.RECUPERO_GENERICO.length > 0 ? (
                  <div className=space-y-2>
                    {candidati.RECUPERO_GENERICO.map(c => (
                      <div key={c.docente.id} className=flex items-center justify-between bg-white p-2.5 rounded-lg border border-purple-200 shadow-sm>
                        <div>
                          <strong className=text-sm text-slate-800>{c.docente.nome}</strong>
                          <span className=text-xs text-purple-700 block>{c.dettagli}</span>
                        </div>
                        <button
                          onClick={() => {
                            assegnaSostituzione({
                              data: selectedDate,
                              giorno: selectedGiorno,
                              ora: selectedOraScoperta.ora,
                              classe: selectedOraScoperta.classe,
                              docenteAssenteId: selectedOraScoperta.docenteAssente.id,
                              docenteSostitutoId: c.docente.id,
                              categoria: 'RECUPERO_GENERICO',
                              isStraordinario: false,
                              consumaDebito: true,
                              pubblicata: false,
                              firmata: false
                            });
                            setSelectedOraScoperta(null);
                          }}
                          className=bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-3 py-1.5 rounded transition
                        >
                          Assegna (Recupero)
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className=text-xs text-slate-400 italic>Nessun altro docente con debito orario disponibile.</p>
                )}
              </div>

              {/* 5. SOSTEGNI SPOSTABILI */}
              <div className=border border-orange-200 bg-orange-50/50 rounded-xl p-3.5>
                <div className=flex items-center justify-between mb-2>
                  <div className=flex items-center gap-2 font-bold text-xs uppercase text-orange-900>
                    <span className=w-3 h-3 rounded-full bg-orange-500 inline-block></span>
                    5. Sostegni Spostabili (Senza Caso Grave)
                  </div>
                  <span className=text-[10px] bg-orange-200 text-orange-800 font-bold px-2 py-0.5 rounded-full>
                    Ordinati per minor utilizzo ⚖️
                  </span>
                </div>
                {candidati.SOSTEGNO && candidati.SOSTEGNO.length > 0 ? (
                  <div className=space-y-2>
                    {candidati.SOSTEGNO.map(c => (
                      <div key={c.docente.id} className=flex items-center justify-between bg-white p-2.5 rounded-lg border border-orange-200 shadow-sm>
                        <div>
                          <div className=flex items-center gap-2>
                            <strong className=text-sm text-slate-800>{c.docente.nome}</strong>
                            <span className=text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold>
                              {c.oreSostegnoPregresse || 0} ore svolte finora
                            </span>
                          </div>
                          <span className=text-xs text-orange-700 block>{c.dettagli}</span>
                        </div>
                        <button
                          onClick={() => {
                            assegnaSostituzione({
                              data: selectedDate,
                              giorno: selectedGiorno,
                              ora: selectedOraScoperta.ora,
                              classe: selectedOraScoperta.classe,
                              docenteAssenteId: selectedOraScoperta.docenteAssente.id,
                              docenteSostitutoId: c.docente.id,
                              categoria: 'SOSTEGNO',
                              isStraordinario: false,
                              consumaDebito: false,
                              pubblicata: false,
                              firmata: false
                            });
                            setSelectedOraScoperta(null);
                          }}
                          className=bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs px-3 py-1.5 rounded transition
                        >
                          Assegna Sostegno
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className=text-xs text-slate-400 italic>Nessun docente di sostegno spostabile disponibile (o tutti su casi gravi).</p>
                )}
              </div>

              {/* 6. DISPOSIZIONI (D) COME STRAORDINARIO */}
              <div className=border border-red-200 bg-red-50/50 rounded-xl p-3.5>
                <div className=flex items-center gap-2 mb-2 font-bold text-xs uppercase text-red-900>
                  <span className=w-3 h-3 rounded-full bg-red-600 inline-block></span>
                  6. Disposizioni (D) come Straordinario / Ore Eccedenti (Ultima Spiaggia)
                </div>
                {candidati.STRAORDINARIO_D && candidati.STRAORDINARIO_D.length > 0 ? (
                  <div className=space-y-2>
                    {candidati.STRAORDINARIO_D.map(c => (
                      <div key={c.docente.id} className=flex items-center justify-between bg-white p-2.5 rounded-lg border border-red-200 shadow-sm>
                        <div>
                          <strong className=text-sm text-slate-800>{c.docente.nome}</strong>
                          <span className=text-xs text-red-700 block>{c.dettagli}</span>
                        </div>
                        <button
                          onClick={() => {
                            assegnaSostituzione({
                              data: selectedDate,
                              giorno: selectedGiorno,
                              ora: selectedOraScoperta.ora,
                              classe: selectedOraScoperta.classe,
                              docenteAssenteId: selectedOraScoperta.docenteAssente.id,
                              docenteSostitutoId: c.docente.id,
                              categoria: 'STRAORDINARIO_D',
                              isStraordinario: true,
                              consumaDebito: false,
                              pubblicata: false,
                              firmata: false
                            });
                            setSelectedOraScoperta(null);
                          }}
                          className=bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3 py-1.5 rounded transition
                        >
                          Assegna (Straordinario)
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className=text-xs text-slate-400 italic>Nessun docente con ora D a orario disponibile.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
;

const substitutionEngine = import { Docente, OrarioDocente, AssenzaDocente, UscitaClasse, SostituzioneAssegnata, CandidatoSostituto, CategoriaSostituto } from '../types';

export function trovaCandidatiSostituzione(
  ora: number,
  giorno: string,
  classe: string,
  docenteAssente: Docente,
  isAssenzaPerUscita: boolean,
  orariDocenti: OrarioDocente[],
  tuttiDocenti: Docente[],
  assenzeOggi: AssenzaDocente[],
  usciteOggi: UscitaClasse[],
  storicoSostituzioni: SostituzioneAssegnata[]
): { [key in CategoriaSostituto]?: CandidatoSostituto[] } {
  const candidatiPerCategoria: { [key in CategoriaSostituto]?: CandidatoSostituto[] } = {
    RECUPERO_STESSA_CLASSE: [],
    LIBERATO_STESSA_CLASSE: [],
    POTENZIAMENTO: [],
    LIBERATO_ALTRA_CLASSE: [],
    RECUPERO_GENERICO: [],
    SOSTEGNO: [],
    STRAORDINARIO_D: []
  };

  const docentiAssentiIds = new Set(
    assenzeOggi
      .filter(a => a.oreInteressate.includes(ora))
      .map(a => a.docenteId)
  );

  const docentiGiaImpegnatiInSostituzioneIds = new Set(
    storicoSostituzioni
      .filter(s => s.ora === ora && s.giorno === giorno)
      .map(s => s.docenteSostitutoId)
  );

  const classiInUscitaOggi = new Map<string, number[]>();
  usciteOggi.forEach(u => classiInUscitaOggi.set(u.classe, u.ore));

  const oreSostegnoMappa = new Map<string, number>();
  storicoSostituzioni.forEach(s => {
    if (s.categoria === 'SOSTEGNO') {
      oreSostegnoMappa.set(s.docenteSostitutoId, (oreSostegnoMappa.get(s.docenteSostitutoId) || 0) + 1);
    }
  });

  tuttiDocenti.forEach(docente => {
    if (docente.isEducatore || docente.id === docenteAssente.id) return;
    if (docentiAssentiIds.has(docente.id) || docentiGiaImpegnatiInSostituzioneIds.has(docente.id)) return;

    const orarioDoc = orariDocenti.find(o => o.docenteId === docente.id);
    const cella = orarioDoc?.ore.find(c => c.giorno === giorno && c.ora === ora);
    const cellaVal = cella?.valore?.trim() || '';

    const insegnaInStessaClasse = orarioDoc?.ore.some(c => c.valore.trim() === classe);

    if (docente.oreDebitoPermesso > 0 && insegnaInStessaClasse) {
      if (cellaVal === 'D' || cellaVal === '' || cella?.tipo === 'LIBERO') {
        candidatiPerCategoria.RECUPERO_STESSA_CLASSE!.push({
          docente,
          categoria: 'RECUPERO_STESSA_CLASSE',
          punteggioPriorita: 1,
          dettagli: docente.materia + ' nella classe ' + classe + ' (Debito: ' + docente.oreDebitoPermesso + ' ore)'
        });
        return;
      }
    }

    if (classiInUscitaOggi.has(cellaVal) && classiInUscitaOggi.get(cellaVal)!.includes(ora)) {
      if (cellaVal === classe) {
        candidatiPerCategoria.LIBERATO_STESSA_CLASSE!.push({
          docente,
          categoria: 'LIBERATO_STESSA_CLASSE',
          punteggioPriorita: 2,
          dettagli: 'Avrebbe dovuto insegnare in ' + classe + ' (ora fuori per uscita)'
        });
      } else {
        candidatiPerCategoria.LIBERATO_ALTRA_CLASSE!.push({
          docente,
          categoria: 'LIBERATO_ALTRA_CLASSE',
          punteggioPriorita: 4,
          dettagli: 'Liberato da classe ' + cellaVal + ' in uscita'
        });
      }
      return;
    }

    if (cellaVal === 'P' || docente.isPotenziamento) {
      candidatiPerCategoria.POTENZIAMENTO!.push({
        docente,
        categoria: 'POTENZIAMENTO',
        punteggioPriorita: 3,
        dettagli: 'Ora di Potenziamento a orario (' + docente.materia + ')'
      });
      return;
    }

    if (docente.oreDebitoPermesso > 0 && !docente.isSostegno) {
      if (cellaVal === 'D' || cellaVal === '' || cella?.tipo === 'LIBERO') {
        candidatiPerCategoria.RECUPERO_GENERICO!.push({
          docente,
          categoria: 'RECUPERO_GENERICO',
          punteggioPriorita: 5,
          dettagli: docente.materia + ' (Debito da recuperare: ' + docente.oreDebitoPermesso + ' ore)'
        });
        return;
      }
    }

    if (docente.isSostegno && !docente.casoGraveSostegno) {
      if (cellaVal && cellaVal !== 'D' && cellaVal !== 'P') {
        const oreSvolte = oreSostegnoMappa.get(docente.id) || 0;
        candidatiPerCategoria.SOSTEGNO!.push({
          docente,
          categoria: 'SOSTEGNO',
          punteggioPriorita: 6,
          oreSostegnoPregresse: oreSvolte,
          dettagli: 'In servizio su classe ' + cellaVal + ' (Ore svolte finora: ' + oreSvolte + ')'
        });
        return;
      }
    }

    if (cellaVal === 'D' && docente.oreDebitoPermesso === 0) {
      candidatiPerCategoria.STRAORDINARIO_D!.push({
        docente,
        categoria: 'STRAORDINARIO_D',
        punteggioPriorita: 7,
        dettagli: 'Ora a disposizione D da orario (Nessun debito - Straordinario/Eccedente)'
      });
      return;
    }
  });

  candidatiPerCategoria.SOSTEGNO!.sort((a, b) => (a.oreSostegnoPregresse || 0) - (b.oreSostegnoPregresse || 0));

  return candidatiPerCategoria;
}
;

fs.writeFileSync('src/components/TabelloneSostituzioni.tsx', tabellone, 'utf8');
fs.writeFileSync('src/utils/substitutionEngine.ts', substitutionEngine, 'utf8');
console.log('Files generated successfully.');