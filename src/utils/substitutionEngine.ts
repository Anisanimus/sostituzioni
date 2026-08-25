import { Docente, OrarioDocente, AssenzaDocente, UscitaClasse, SostituzioneAssegnata, CandidatoSostituto, CategoriaSostituto } from '../types';
import { getDocentiCollegatiIds, getBaseNomeDocente, getDocentiUnici } from './docentiHelper';

export function trovaCandidatiSostituzione(
  data: string,
  ora: number,
  giorno: string,
  classe: string,
  docenteAssente: Docente,
  isUscita: boolean,
  orariDocenti: OrarioDocente[],
  docenti: Docente[],
  assenze: AssenzaDocente[],
  uscite: UscitaClasse[],
  sostituzioniEsistenti: SostituzioneAssegnata[]
): Record<CategoriaSostituto, CandidatoSostituto[]> {
  
  const candidatiPerCategoria: Record<CategoriaSostituto, CandidatoSostituto[]> = {
    COMPRESENTE_CLASSE: [],
    RECUPERO_STESSA_CLASSE: [],
    LIBERATO_STESSA_CLASSE: [],
    LIBERATO_STESSA_MATERIA: [],
    LIBERATO_ALTRA_CLASSE: [],
    POTENZIAMENTO: [],
    RECUPERO_GENERICO: [],
    SOSTEGNO: [],
    STRAORDINARIO_D: []
  };

  // 1. Tutti gli ID collegati alle persone assenti nel giorno e nell'ora specifica (non possono sostituire)
  const personeAssentiNomi = new Set<string>();
  assenze
    .filter(a => a.data === data && !a.annullata && a.oreInteressate.includes(ora))
    .forEach(a => {
      const doc = docenti.find(d => d.id === a.docenteId);
      if (doc) personeAssentiNomi.add(getBaseNomeDocente(doc.nome));
    });

  // Aggiungi anche il docente assente stesso
  personeAssentiNomi.add(getBaseNomeDocente(docenteAssente.nome));

  // 2. Persone già impegnate in un'altra sostituzione nella stessa data e ora (nessun conflitto/doppia assegnazione)
  const personeImpegnateNomi = new Set<string>();
  sostituzioniEsistenti
    .filter(s => s.data === data && s.ora === ora)
    .forEach(s => {
      const doc = docenti.find(d => d.id === s.docenteSostitutoId);
      if (doc) personeImpegnateNomi.add(getBaseNomeDocente(doc.nome));
    });

  // 3. Classi in uscita didattica in quest'ora (solo uscite attive)
  const classiInUscitaNellOra = new Set<string>();
  uscite
    .filter(u => u.data === data && !u.annullata && u.ore.includes(ora))
    .forEach(u => {
      if (u.classi && Array.isArray(u.classi)) {
        u.classi.forEach(c => classiInUscitaNellOra.add(c));
      } else if ((u as any).classe) {
        classiInUscitaNellOra.add((u as any).classe);
      }
    });

  // Conteggio ore di supplenza svolte dai docenti di sostegno (per equità)
  const conteggioSostegnoPerNome: Record<string, number> = {};
  docenti.forEach(d => {
    if (d.isSostegno) conteggioSostegnoPerNome[getBaseNomeDocente(d.nome)] = 0;
  });

  sostituzioniEsistenti
    .filter(s => s.categoria === 'SOSTEGNO')
    .forEach(s => {
      const doc = docenti.find(d => d.id === s.docenteSostitutoId);
      if (doc && doc.isSostegno) {
        const nome = getBaseNomeDocente(doc.nome);
        conteggioSostegnoPerNome[nome] = (conteggioSostegnoPerNome[nome] || 0) + 1;
      }
    });

  // Esamina ogni persona fisica una sola volta
  const personeUniche = getDocentiUnici(docenti);

  personeUniche.forEach(persona => {
    const nomePersona = persona.nome;

    // Esclusioni categoriche assolute
    if (persona.isEducatore) return;
    if (personeAssentiNomi.has(nomePersona)) return;
    if (personeImpegnateNomi.has(nomePersona)) return;

    // Recupera tutti i profili orari associati a questa persona (es. cattedra sostegno + alternativa)
    const profiliCollegati = docenti.filter(d => persona.allIds.includes(d.id));

    // Determina l'impegno esatto della persona in quest'ora specifica
    let cellaValEffettiva = '';
    let profiloAttivoNellOra: Docente = profiliCollegati[0];
    let isCellaCasoGrave = false;

    for (const prof of profiliCollegati) {
      const orario = orariDocenti.find(o => o.docenteId === prof.id);
      if (orario) {
        const c = orario.ore.find(cell => cell.giorno === giorno && cell.ora === ora);
        const val = (c?.valore || '').trim().toUpperCase();
        if (val !== '') {
          // Trovato l'impegno effettivo in quest'ora (Lezione, Sostegno, P, D, ecc.)
          cellaValEffettiva = val;
          profiloAttivoNellOra = prof;
          if (c?.isCasoGrave) isCellaCasoGrave = true;
          break;
        }
      }
    }

    // Verifica se è marcato caso grave (singola ora o tutto il profilo)
    const isCasoGraveEffettivo = isCellaCasoGrave || 
      persona.isCasoGraveSostegno || 
      profiloAttivoNellOra.isCasoGraveSostegno || 
      (profiloAttivoNellOra as any).casoGraveSostegno || 
      false;

    // 0. COMPRESENTE IN QUELLA STESSA CLASSE IN QUEST'ORA SPECIFICA
    // Mostra solo la materia in cui è EFFETTIVAMENTE in servizio in quell'ora
    if (cellaValEffettiva === classe) {
      candidatiPerCategoria.COMPRESENTE_CLASSE.push({
        docente: profiloAttivoNellOra,
        categoria: 'COMPRESENTE_CLASSE',
        punteggioPriorita: isCasoGraveEffettivo ? 99 : 0,
        isCasoGrave: isCasoGraveEffettivo,
        dettagli: `Già presente in classe ${classe} in quest'ora (${profiloAttivoNellOra.materia}${profiloAttivoNellOra.isSostegno ? ' - Sostegno' : ''})${isCasoGraveEffettivo ? ' • ♿ Caso Grave' : ''}`
      });
    }

    // Se l'ora o il docente è marcato come "CASO GRAVE", NON può MAI essere spostato su altre classi
    if (isCasoGraveEffettivo) {
      return;
    }

    // Controlla se la persona insegna nella stessa classe in altri momenti
    const insegnaInStessaClasse = profiliCollegati.some(prof => {
      const o = orariDocenti.find(ord => ord.docenteId === prof.id);
      return o?.ore.some(c => c.valore.trim() === classe);
    });

    // 1. Recupero stessa classe con debito (se in quest'ora ha D o è Libero)
    if (persona.oreDebitoPermesso > 0 && insegnaInStessaClasse && cellaValEffettiva !== classe) {
      if (cellaValEffettiva === 'D' || cellaValEffettiva === '') {
        candidatiPerCategoria.RECUPERO_STESSA_CLASSE.push({
          docente: profiloAttivoNellOra,
          categoria: 'RECUPERO_STESSA_CLASSE',
          punteggioPriorita: 1,
          dettagli: `${profiloAttivoNellOra.materia} nella classe ${classe} (Debito: ${persona.oreDebitoPermesso} ore)`
        });
        return;
      }
    }

    // 2. Docenti liberati da uscite didattiche (la cui classe è in gita in quest'ora specifica)
    if (cellaValEffettiva && Array.from(classiInUscitaNellOra).some(c => c.toUpperCase().trim() === cellaValEffettiva.toUpperCase().trim())) {
      const classeInGita = cellaValEffettiva;
      const stessaMateria = (profiloAttivoNellOra.materia === docenteAssente.materia) || 
        profiliCollegati.some(p => p.materia === docenteAssente.materia);

      if (insegnaInStessaClasse) {
        candidatiPerCategoria.LIBERATO_STESSA_CLASSE.push({
          docente: profiloAttivoNellOra,
          categoria: 'LIBERATO_STESSA_CLASSE',
          punteggioPriorita: 2,
          dettagli: `Insegna nella classe ${classe} (${profiloAttivoNellOra.materia}) • Liberato da ${classeInGita} in gita`
        });
      } else if (stessaMateria) {
        candidatiPerCategoria.LIBERATO_STESSA_MATERIA.push({
          docente: profiloAttivoNellOra,
          categoria: 'LIBERATO_STESSA_MATERIA',
          punteggioPriorita: 2.5,
          dettagli: `Stessa materia (${docenteAssente.materia}) • Liberato da classe ${classeInGita} in gita`
        });
      } else {
        candidatiPerCategoria.LIBERATO_ALTRA_CLASSE.push({
          docente: profiloAttivoNellOra,
          categoria: 'LIBERATO_ALTRA_CLASSE',
          punteggioPriorita: 3,
          dettagli: `Altra materia (${profiloAttivoNellOra.materia}) • Liberato da classe ${classeInGita} in gita`
        });
      }
      return;
    }

    // 3. Potenziamento P: RIGOROSAMENTE SOLO SE IN QUEST'ORA HA 'P'
    if (cellaValEffettiva === 'P') {
      candidatiPerCategoria.POTENZIAMENTO.push({
        docente: profiloAttivoNellOra,
        categoria: 'POTENZIAMENTO',
        punteggioPriorita: 3,
        dettagli: `Ora di Potenziamento (P) da orario (${nomePersona})`
      });
      return;
    }

    // 4. Disposizioni (D) da orario in quest'ora specifica
    if (cellaValEffettiva === 'D') {
      if (persona.oreDebitoPermesso > 0) {
        candidatiPerCategoria.RECUPERO_GENERICO.push({
          docente: profiloAttivoNellOra,
          categoria: 'RECUPERO_GENERICO',
          punteggioPriorita: 5,
          dettagli: `Docente di ${profiloAttivoNellOra.materia} in D da orario (Recupera debito: ${persona.oreDebitoPermesso} ore)`
        });
      } else {
        candidatiPerCategoria.STRAORDINARIO_D.push({
          docente: profiloAttivoNellOra,
          categoria: 'STRAORDINARIO_D',
          punteggioPriorita: 7,
          dettagli: `In Disposizione (D) in quest'ora (${profiloAttivoNellOra.materia})`
        });
      }
      return;
    }

    // 5. Recupero generico con debito se in quest'ora è Libero (non D e non a lezione)
    if (persona.oreDebitoPermesso > 0 && !persona.isSostegno && cellaValEffettiva !== classe) {
      if (cellaValEffettiva === '') {
        candidatiPerCategoria.RECUPERO_GENERICO.push({
          docente: profiloAttivoNellOra,
          categoria: 'RECUPERO_GENERICO',
          punteggioPriorita: 5,
          dettagli: `Docente di ${profiloAttivoNellOra.materia} con debito di ${persona.oreDebitoPermesso} ore (Ora buca/libera)`
        });
        return;
      }
    }

    // 6. Sostegni di ALTRE classi senza caso grave (spostabili in servizio in quest'ora, ordinati per equità)
    if (profiloAttivoNellOra.isSostegno && cellaValEffettiva !== classe) {
      if (cellaValEffettiva && cellaValEffettiva !== 'D' && cellaValEffettiva !== 'P') {
        const oreGiaFatte = conteggioSostegnoPerNome[nomePersona] || 0;
        candidatiPerCategoria.SOSTEGNO.push({
          docente: profiloAttivoNellOra,
          categoria: 'SOSTEGNO',
          punteggioPriorita: 6,
          oreSostegnoPregresse: oreGiaFatte,
          dettagli: `In servizio su classe ${cellaValEffettiva} in quest'ora • ${oreGiaFatte} ore svolte finora`
        });
      }
    }

  });

  // Ordina i candidati del sostegno per equità di rotazione (chi ha fatto meno ore prima)
  candidatiPerCategoria.SOSTEGNO.sort((a, b) => (a.oreSostegnoPregresse || 0) - (b.oreSostegnoPregresse || 0));

  return candidatiPerCategoria;
}
