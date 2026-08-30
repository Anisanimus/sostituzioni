import { Docente, OrarioDocente, CellaOrario, GiornoSettimana } from '../types';

/**
 * Normalizza il nome del docente rimuovendo suffissi tra parentesi
 * Es: "COLETTA SERGIO (ALTERNATIVA)" -> "COLETTA SERGIO"
 *     "AIME GIANLUCA (POTENZIAMENTO)" -> "AIME GIANLUCA"
 *     "AIME GIANLUCA (SOSTEGNO)" -> "AIME GIANLUCA"
 *     "CHIRICO TERESA (ALTERNATIVA)" -> "CHIRICO TERESA"
 */
/**
 * Normalizza il nome del docente rimuovendo suffissi tra parentesi
 * Es: "COLETTA SERGIO (ALTERNATIVA)" -> "COLETTA SERGIO"
 *     "AIME GIANLUCA (POTENZIAMENTO)" -> "AIME GIANLUCA"
 *     "AIME GIANLUCA (SOSTEGNO)" -> "AIME GIANLUCA"
 *     "CHIRICO TERESA (ALTERNATIVA)" -> "CHIRICO TERESA"
 */
export function getBaseNomeDocente(nome: string): string {
  return nome.replace(/\s*\([^)]*\)\s*$/, '').trim().toUpperCase();
}

/**
 * Converte qualsiasi data YYYY-MM-DD o ISO nel formato standard italiano DD/MM/YYYY
 */
export function formatDataItaliana(dataStr: string): string {
  if (!dataStr) return '';
  const clean = dataStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  }
  return dataStr;
}

/**
 * Verifica se una data è un giorno di lezione (non weekend e non festivo)
 */
export function isGiornoScolastico(dataStr: string, nascondiWeekend: boolean = true, giorniFestivi: string[] = []): boolean {
  if (!dataStr) return false;
  const d = new Date(dataStr);
  const day = d.getDay(); // 0 = Domenica, 6 = Sabato
  if (nascondiWeekend && (day === 0 || day === 6)) return false;
  const iso = d.toISOString().split('T')[0];
  if (giorniFestivi && giorniFestivi.includes(iso)) return false;
  return true;
}

/**
 * Calcola il primo giorno scolastico valido a partire da una data (se oggi è weekend/festivo, salta a Lunedì/primo giorno utile)
 */
export function getPrimoGiornoScolasticoValido(dataStr: string, nascondiWeekend: boolean = true, giorniFestivi: string[] = []): string {
  let d = new Date(dataStr);
  let attempts = 0;
  while (attempts < 60) {
    const day = d.getDay();
    const iso = d.toISOString().split('T')[0];
    const isWeekend = day === 0 || day === 6;
    const isFestivo = giorniFestivi && giorniFestivi.includes(iso);
    if ((!nascondiWeekend || !isWeekend) && !isFestivo) {
      return iso;
    }
    d.setDate(d.getDate() + 1);
    attempts++;
  }
  return dataStr;
}

/**
 * Calcola il giorno scolastico successivo o precedente (+1 o -1) saltando automaticamente weekend e festività
 */
export function spostaGiornoScolastico(dataStr: string, delta: number, nascondiWeekend: boolean = true, giorniFestivi: string[] = []): string {
  let d = new Date(dataStr);
  const step = delta >= 0 ? 1 : -1;
  const count = Math.abs(delta) || 1;
  let advanced = 0;
  let attempts = 0;

  while (advanced < count && attempts < 100) {
    d.setDate(d.getDate() + step);
    const day = d.getDay();
    const iso = d.toISOString().split('T')[0];
    const isWeekend = day === 0 || day === 6;
    const isFestivo = giorniFestivi && giorniFestivi.includes(iso);
    if ((!nascondiWeekend || !isWeekend) && !isFestivo) {
      advanced++;
    }
    attempts++;
  }
  return d.toISOString().split('T')[0];
}

/**
 * Restituisce tutti gli ID dei profili associati alla stessa persona fisica
 */
export function getDocentiCollegatiIds(docenteIdOrNome: string, docenti: Docente[]): string[] {
  const targetDoc = docenti.find(d => d.id === docenteIdOrNome || d.nome === docenteIdOrNome);
  const baseNome = targetDoc ? getBaseNomeDocente(targetDoc.nome) : getBaseNomeDocente(docenteIdOrNome);
  
  return docenti
    .filter(d => getBaseNomeDocente(d.nome) === baseNome)
    .map(d => d.id);
}

/**
 * Restituisce la lista deduplicata di docenti unici per persona fisica,
 * aggregando le informazioni su tutte le materie/ruoli svolti
 */
export interface DocenteUnico {
  id: string; // ID primario
  allIds: string[]; // Tutti gli ID associati
  nome: string; // Nome pulito senza parentesi
  materie: string[]; // Es. ["LETTERE", "ALTERNATIVA"]
  isSostegno: boolean;
  isEducatore: boolean;
  isPotenziamento: boolean;
  isAlternativa: boolean;
  isCasoGraveSostegno?: boolean;
  oreDebitoPermesso: number;
  pinAccesso?: string;
}

export function getDocentiUnici(docenti: Docente[]): DocenteUnico[] {
  const map = new Map<string, DocenteUnico>();

  docenti.forEach(d => {
    if (d.isEducatore) return; // gli educatori rimangono gestiti a parte se necessario

    const baseNome = getBaseNomeDocente(d.nome);
    
    // Determina la label reale della materia del profilo corrente
    let materiaEffettiva: string = d.materia;
    if (d.isAlternativa || d.nome.toUpperCase().includes('ALTERNATIVA') || d.dettaglioMateria?.toUpperCase().includes('ALTERNATIVA')) {
      materiaEffettiva = 'ALTERNATIVA';
    } else if (d.isPotenziamento || d.nome.toUpperCase().includes('POTENZIAMENTO') || d.dettaglioMateria?.toUpperCase().includes('POTENZIAMENTO')) {
      materiaEffettiva = 'POTENZIAMENTO';
    } else if (d.isSostegno || d.nome.toUpperCase().includes('SOSTEGNO') || d.dettaglioMateria?.toUpperCase().includes('SOSTEGNO')) {
      materiaEffettiva = 'SOSTEGNO';
    }

    if (!map.has(baseNome)) {
      map.set(baseNome, {
        id: d.id,
        allIds: [d.id],
        nome: baseNome,
        materie: [materiaEffettiva],
        isSostegno: d.isSostegno,
        isEducatore: d.isEducatore,
        isPotenziamento: d.isPotenziamento,
        isAlternativa: d.isAlternativa,
        isCasoGraveSostegno: d.isCasoGraveSostegno || (d as any).casoGraveSostegno,
        oreDebitoPermesso: d.oreDebitoPermesso || 0,
        pinAccesso: d.pinAccesso
      });
    } else {
      const existing = map.get(baseNome)!;
      if (!existing.allIds.includes(d.id)) {
        existing.allIds.push(d.id);
      }
      if (!existing.materie.includes(materiaEffettiva)) {
        existing.materie.push(materiaEffettiva);
      }
      existing.isSostegno = existing.isSostegno || d.isSostegno;
      existing.isPotenziamento = existing.isPotenziamento || d.isPotenziamento;
      existing.isAlternativa = existing.isAlternativa || d.isAlternativa;
      existing.isCasoGraveSostegno = existing.isCasoGraveSostegno || d.isCasoGraveSostegno || (d as any).casoGraveSostegno;
      existing.oreDebitoPermesso = Math.max(existing.oreDebitoPermesso, d.oreDebitoPermesso || 0);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Fonde e restituisce tutte le 45 celle orarie di una persona fisica
 * unificando tutti i suoi profili/ruoli orari in una singola matrice
 */
export function getOrarioUnificatoDocente(
  docenteIdOrNome: string,
  docenti: Docente[],
  orariDocenti: OrarioDocente[]
): CellaOrario[] {
  const allIds = getDocentiCollegatiIds(docenteIdOrNome, docenti);
  const orariTrovati = orariDocenti.filter(o => allIds.includes(o.docenteId));

  const GIORNI: GiornoSettimana[] = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
  const orarioFuso: CellaOrario[] = [];

  GIORNI.forEach(giorno => {
    for (let ora = 1; ora <= 9; ora++) {
      let cellaVal = '';
      let tipo: any = 'LIBERO';
      let isCasoGrave = false;

      // Cerca tra tutti i profili orari della persona
      for (const o of orariTrovati) {
        const c = o.ore.find(cell => cell.giorno === giorno && cell.ora === ora);
        if (c && c.valore && c.valore.trim() !== '') {
          cellaVal = c.valore.trim();
          tipo = c.tipo;
          if (c.isCasoGrave) isCasoGrave = true;
          break; // Trovata ora di lezione/D/P
        }
      }

      orarioFuso.push({
        giorno,
        ora,
        valore: cellaVal,
        tipo,
        isCasoGrave
      });
    }
  });

  return orarioFuso;
}

export interface RisultatoMatchDocente {
  tipo: 'ESATTO' | 'SUGGERITO' | 'NESSUNO';
  docente?: DocenteUnico;
  confidenza: number; // da 0 a 100
  motivo?: string;
}

/**
 * Algoritmo intelligente di Corrispondenza Account Google -> Docente Organico
 * Gestisce:
 * 1. Email esatta già salvata nel profilo
 * 2. Formati standard: nome.cognome@... o cognome.nome@...
 * 3. Nomi composti (es: VASSIADIS MARIA SERENA -> VASSIADIS MARIA)
 * 4. Token matching su display name Google ("Elena Bussino" -> "BUSSINO ELENA")
 */
export function trovaCorrispondenzaDocente(
  email: string,
  displayName: string,
  docenti: Docente[]
): RisultatoMatchDocente {
  const docentiUnici = getDocentiUnici(docenti);
  const emailNorm = (email || '').toLowerCase().trim();
  const displayNorm = (displayName || '').toUpperCase().trim();

  // 1. Match Esatto Diretto: Email già presente nell'anagrafica
  const matchEmailDiretta = docentiUnici.find(d => {
    const docOriginale = docenti.find(orig => d.allIds.includes(orig.id));
    return docOriginale?.email?.toLowerCase().trim() === emailNorm;
  });
  if (matchEmailDiretta) {
    return { tipo: 'ESATTO', docente: matchEmailDiretta, confidenza: 100, motivo: 'Email associata nell\'anagrafica' };
  }

  // Estrai token dall'email (es: "mario.rossi" -> ["MARIO", "ROSSI"])
  const localPart = emailNorm.split('@')[0] || '';
  const emailTokens = localPart
    .split(/[\._\-0-9]/)
    .map(t => t.toUpperCase().trim())
    .filter(t => t.length >= 2);

  // Estrai token dal displayName (es: "Maria Serena Vassiadis" -> ["MARIA", "SERENA", "VASSIADIS"])
  const displayTokens = displayNorm
    .split(/[\s\._\-]/)
    .map(t => t.toUpperCase().trim())
    .filter(t => t.length >= 2);

  const tuttiIUserTokens = Array.from(new Set([...emailTokens, ...displayTokens]));

  // Calcola punteggio di corrispondenza per ogni docente
  const candidatiConPunteggio: { docente: DocenteUnico; score: number; isExactMatch: boolean; details: string }[] = [];

  for (const doc of docentiUnici) {
    const docNomeTokens = doc.nome.split(/\s+/).map(t => t.toUpperCase().trim()).filter(t => t.length >= 2);
    if (docNomeTokens.length === 0) continue;

    // Quanti token del docente sono presenti nei token dell'utente?
    const matchTokens = docNomeTokens.filter(dt => tuttiIUserTokens.includes(dt));
    
    // Controlla se tutti i token del docente sono soddisfatti
    const tuttiTokenDocenteTrovati = matchTokens.length === docNomeTokens.length;
    
    // Controlla se i token dell'utente contengono parole extra (es. secondo nome)
    const paroleExtraUtente = tuttiIUserTokens.filter(ut => !docNomeTokens.includes(ut));

    let score = (matchTokens.length / docNomeTokens.length) * 100;

    if (tuttiTokenDocenteTrovati && paroleExtraUtente.length === 0) {
      // Corrispondenza biunivoca perfetta al 100% (es. BUSSINO ELENA <=> elena.bussino)
      candidatiConPunteggio.push({ docente: doc, score: 100, isExactMatch: true, details: 'Corrispondenza biunivoca perfetta' });
    } else if (tuttiTokenDocenteTrovati && paroleExtraUtente.length > 0) {
      // Nome composto o token aggiuntivo (es. VASSIADIS MARIA <=> vassiadis.mariaserena)
      candidatiConPunteggio.push({ docente: doc, score: 90, isExactMatch: false, details: `Nome composto con token aggiuntivi (${paroleExtraUtente.join(', ')})` });
    } else if (matchTokens.length >= 1 && docNomeTokens.length > 1) {
      // Corrispondenza solo sul cognome (es. ROSSI <=> e.rossi)
      candidatiConPunteggio.push({ docente: doc, score: 50, isExactMatch: false, details: 'Corrispondenza parziale (solo cognome o nome)' });
    }
  }

  // Ordina per score decrescente
  candidatiConPunteggio.sort((a, b) => b.score - a.score);

  if (candidatiConPunteggio.length === 0 || candidatiConPunteggio[0].score < 50) {
    return { tipo: 'NESSUNO', confidenza: 0, motivo: 'Nessun docente corrispondente trovato nell\'organico' };
  }

  const topMatch = candidatiConPunteggio[0];

  // Se c'è un secondo candidato con lo stesso punteggio (es. omonimia), non può essere esatto
  const isAmbiguo = candidatiConPunteggio.length > 1 && candidatiConPunteggio[1].score === topMatch.score;

  if (topMatch.isExactMatch && !isAmbiguo) {
    return {
      tipo: 'ESATTO',
      docente: topMatch.docente,
      confidenza: 100,
      motivo: topMatch.details
    };
  }

  return {
    tipo: 'SUGGERITO',
    docente: topMatch.docente,
    confidenza: topMatch.score,
    motivo: isAmbiguo ? 'Possibile omonimia rilevata nell\'organico' : topMatch.details
  };
}

/**
 * Risolve chi è il docente effettivamente in servizio su una cattedra in una specifica data,
 * percorrendo l'intera catena di nomine e sub-supplenze ricorsive.
 */
export function getDocenteAttivoInData(
  docenteIdOrNome: string,
  dataStr: string,
  nomine: import('../types').NominaSupplente[],
  docenti: Docente[]
): {
  id: string;
  nome: string;
  isSupplente: boolean;
  titolareOriginaleNome: string;
  catenaNomine: import('../types').NominaSupplente[];
} {
  const baseNome = getBaseNomeDocente(docenteIdOrNome);
  const docOriginale = docenti.find(d => getBaseNomeDocente(d.nome) === baseNome || d.id === docenteIdOrNome);
  const titolareNome = docOriginale?.nome || baseNome;

  const dataIso = (dataStr || '').split('T')[0];
  const catena: import('../types').NominaSupplente[] = [];

  // Funzione ricorsiva per trovare l'ultimo supplente attivo
  let currentTargetId = docOriginale?.id || docenteIdOrNome;
  let currentTargetNome = titolareNome;
  let trovato = true;

  while (trovato) {
    // Cerca una nomina attiva per currentTarget in questa data
    const nominaAttiva = nomine.find(n => {
      const matchDoc = n.docenteTitolareId === currentTargetId || 
                         getBaseNomeDocente(n.docenteTitolareNome) === getBaseNomeDocente(currentTargetNome);
      if (!matchDoc) return false;
      const dInizio = n.dataInizio.split('T')[0];
      const dFine = n.dataFine.split('T')[0];
      return dataIso >= dInizio && dataIso <= dFine;
    });

    if (nominaAttiva) {
      catena.push(nominaAttiva);
      currentTargetId = nominaAttiva.id;
      currentTargetNome = nominaAttiva.supplenteNome;
    } else {
      trovato = false;
    }
  }

  const isSupplente = catena.length > 0;
  return {
    id: isSupplente ? catena[catena.length - 1].id : (docOriginale?.id || docenteIdOrNome),
    nome: isSupplente ? catena[catena.length - 1].supplenteNome : titolareNome,
    isSupplente,
    titolareOriginaleNome: titolareNome,
    catenaNomine: catena
  };
}
