import { Docente, OrarioDocente, CellaOrario, GiornoSettimana } from '../types';
 
/**
 * Genera l'URL diretto per aggiungere l'ora di supplenza su Google Calendar
 */
export function generaLinkGoogleCalendar(
  data: string, 
  ora: number, 
  classe: string, 
  docenteAssenteNome: string,
  nomeScuola?: string
): string {
  const orariInizioFine: Record<number, { start: string; end: string }> = {
    1: { start: '080000', end: '085500' },
    2: { start: '085500', end: '095000' },
    3: { start: '100000', end: '105500' },
    4: { start: '105500', end: '115000' },
    5: { start: '115000', end: '124500' },
    6: { start: '124500', end: '134000' },
    7: { start: '140000', end: '150000' },
    8: { start: '150000', end: '160000' },
    9: { start: '160000', end: '170000' }
  };

  const orario = orariInizioFine[ora] || { start: '080000', end: '090000' };
  const dataPulita = data.replace(/-/g, ''); // YYYYMMDD
  const datesParam = `${dataPulita}T${orario.start}/${dataPulita}T${orario.end}`;

  const title = encodeURIComponent(`Supplenza ${ora}ª ora in ${classe} (per Prof. ${docenteAssenteNome})`);
  const details = encodeURIComponent(`Sostituzione oraria assegnata presso ${nomeScuola || 'Scuola'}.\nOra: ${ora}ª ora\nClasse: ${classe}\nDocente sostituito: ${docenteAssenteNome}`);
  const location = encodeURIComponent(`Aula ${classe} - ${nomeScuola || 'Istituto Scolastico'}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
}

/**
 * Genera e scarica un file .ics standard compatibile con Calendario Apple (iPhone/iPad/Mac) e Outlook
 */
export function scaricaFileIcsCalendar(
  data: string, 
  ora: number, 
  classe: string, 
  docenteAssenteNome: string,
  nomeScuola?: string
) {
  const orariInizioFine: Record<number, { start: string; end: string }> = {
    1: { start: '080000', end: '085500' },
    2: { start: '085500', end: '095000' },
    3: { start: '100000', end: '105500' },
    4: { start: '105500', end: '115000' },
    5: { start: '115000', end: '124500' },
    6: { start: '124500', end: '134000' },
    7: { start: '140000', end: '150000' },
    8: { start: '150000', end: '160000' },
    9: { start: '160000', end: '170000' }
  };

  const orario = orariInizioFine[ora] || { start: '080000', end: '090000' };
  const dataPulita = data.replace(/-/g, ''); // YYYYMMDD
  const dtStart = `${dataPulita}T${orario.start}`;
  const dtEnd = `${dataPulita}T${orario.end}`;
  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const summary = `Supplenza ${ora}ª ora in ${classe} (per Prof. ${docenteAssenteNome})`;
  const description = `Sostituzione oraria assegnata presso ${nomeScuola || 'Scuola'}.\\nOra: ${ora}ª ora\\nClasse: ${classe}\\nDocente sostituito: ${docenteAssenteNome}`;
  const location = `Aula ${classe} - ${nomeScuola || 'Istituto Scolastico'}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sostituzioni Smart//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:supplenza_${dataPulita}_${ora}_${classe}_${Date.now()}@sostituzionismart`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `supplenza_${classe}_ora${ora}_${data}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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

export function getDocentiUnici(docenti: Docente[], includeEducatori: boolean = false): DocenteUnico[] {
  const map = new Map<string, DocenteUnico>();

  docenti.forEach(d => {
    if (d.isEducatore && !includeEducatori) return;

    const baseNome = getBaseNomeDocente(d.nome);
    
    // Determina la label reale della materia del profilo corrente
    let materiaEffettiva: string = d.materia;
    if (d.isEducatore || d.nome.toUpperCase().includes('EDUCATORE') || d.dettaglioMateria?.toUpperCase().includes('EDUCATORE')) {
      materiaEffettiva = 'EDUCATORE';
    } else if (d.isAlternativa || d.nome.toUpperCase().includes('ALTERNATIVA') || d.dettaglioMateria?.toUpperCase().includes('ALTERNATIVA')) {
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
      existing.isEducatore = existing.isEducatore || d.isEducatore;
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

/**
 * Ritorna le classi di stile Tailwind, icona ed etichetta per la testata e il corpo delle card docente in tema chiaro
 */
export function getStileCardAssenza(motivo: string = '', isUscita: boolean = false, isOraria: boolean = false) {
  const m = motivo.toLowerCase();
  
  if (isUscita || m.includes('uscita') || m.includes('gita') || m.includes('viaggio')) {
    return {
      cardBorder: 'border-amber-300 ring-1 ring-amber-200/50 shadow-2xs',
      bgHeader: 'bg-gradient-to-r from-amber-50 to-amber-100/70 hover:from-amber-100 hover:to-amber-100 border-b border-amber-200',
      bgAvatar: 'bg-amber-500 text-white font-black shadow-2xs',
      textColor: 'text-amber-950',
      subTextColor: 'text-amber-800',
      accentColor: 'text-amber-900',
      icon: '🚌',
      label: 'Uscita Didattica / Gita',
      bodyBg: 'bg-amber-50/20'
    };
  }

  if (m.includes('assemblea')) {
    return {
      cardBorder: 'border-rose-300 ring-1 ring-rose-200/50 shadow-2xs',
      bgHeader: 'bg-gradient-to-r from-rose-50 to-rose-100/70 hover:from-rose-100 hover:to-rose-100 border-b border-rose-200',
      bgAvatar: 'bg-rose-500 text-white font-black shadow-2xs',
      textColor: 'text-rose-950',
      subTextColor: 'text-rose-800',
      accentColor: 'text-rose-900',
      icon: '📢',
      label: 'Assemblea Sindacale',
      bodyBg: 'bg-rose-50/20'
    };
  }

  if (isOraria || m.includes('oraria') || m.includes('permesso') || m.includes('fascia')) {
    return {
      cardBorder: 'border-purple-300 ring-1 ring-purple-200/50 shadow-2xs',
      bgHeader: 'bg-gradient-to-r from-purple-50 to-purple-100/70 hover:from-purple-100 hover:to-purple-100 border-b border-purple-200',
      bgAvatar: 'bg-purple-600 text-white font-black shadow-2xs',
      textColor: 'text-purple-950',
      subTextColor: 'text-purple-800',
      accentColor: 'text-purple-900',
      icon: '⏱️',
      label: 'Permesso Breve / Oraria',
      bodyBg: 'bg-purple-50/20'
    };
  }

  // Default: Assenza Giornaliera (Malattia, congedo, ecc.)
  return {
    cardBorder: 'border-indigo-200 shadow-2xs',
    bgHeader: 'bg-gradient-to-r from-indigo-50/70 to-slate-50 hover:from-indigo-100/80 hover:to-slate-100 border-b border-indigo-100',
    bgAvatar: 'bg-indigo-600 text-white font-black shadow-2xs',
    textColor: 'text-slate-900',
    subTextColor: 'text-indigo-900',
    accentColor: 'text-indigo-700',
    icon: '👤',
    label: motivo || 'Assenza Giornaliera',
    bodyBg: 'bg-slate-50/30'
  };
}

/**
 * Restituisce l'elenco degli educatori presenti in una determinata classe, giorno e ora
 */
export function getEducatoriInClasseNellOra(
  classe: string,
  giorno: GiornoSettimana,
  ora: number,
  docenti: Docente[],
  orariDocenti: OrarioDocente[]
): Docente[] {
  if (!classe) return [];
  const classeNorm = classe.toUpperCase().trim();

  // Trova tutti i profili marcati come Educatore
  const educatori = docenti.filter(d => 
    d.isEducatore || 
    d.materia?.toUpperCase().includes('EDUCATORE') || 
    d.nome?.toUpperCase().includes('EDUCATORE') ||
    d.dettaglioMateria?.toUpperCase().includes('EDUCATORE')
  );

  const presenti: Docente[] = [];

  educatori.forEach(ed => {
    const orario = orariDocenti.find(o => o.docenteId === ed.id);
    if (!orario) return;

    const cella = orario.ore.find(c => c.giorno === giorno && c.ora === ora);
    if (cella && cella.valore) {
      const v = cella.valore.toUpperCase().trim();
      // Match classe esatta (es. 1A, 2B, 3F)
      if (v === classeNorm || v.startsWith(classeNorm + ' ') || v.endsWith(' ' + classeNorm)) {
        if (!presenti.some(p => getBaseNomeDocente(p.nome) === getBaseNomeDocente(ed.nome))) {
          presenti.push(ed);
        }
      }
    }
  });

  return presenti;
}

export interface CompresenzaInfo {
  curricolari: Docente[];
  sostegni: Docente[];
  educatori: Docente[];
}

/**
 * Restituisce tutte le figure presenti in una determinata classe, giorno e ora (Curricolari, Sostegno ed Educatori)
 * Escludendo facoltativamente un determinato docente (ad esempio se stesso)
 */
export function getDocentiCompresentiInClasseNellOra(
  classe: string,
  giorno: GiornoSettimana,
  ora: number,
  docenti: Docente[],
  orariDocenti: OrarioDocente[],
  escludiDocenteIdOrNome?: string
): CompresenzaInfo {
  if (!classe) return { curricolari: [], sostegni: [], educatori: [] };
  const classeNorm = classe.toUpperCase().trim();
  const baseEscluso = escludiDocenteIdOrNome ? getBaseNomeDocente(escludiDocenteIdOrNome) : '';

  const curricolari: Docente[] = [];
  const sostegni: Docente[] = [];
  const educatori: Docente[] = [];

  const mapGiaAggiunti = new Set<string>();

  docenti.forEach(d => {
    const baseNome = getBaseNomeDocente(d.nome);
    if (baseEscluso && baseNome === baseEscluso) return;

    const orario = orariDocenti.find(o => o.docenteId === d.id);
    if (!orario) return;

    const cella = orario.ore.find(c => c.giorno === giorno && c.ora === ora);
    if (cella && cella.valore) {
      const v = cella.valore.toUpperCase().trim();
      if (v === classeNorm || v.startsWith(classeNorm + ' ') || v.endsWith(' ' + classeNorm)) {
        if (!mapGiaAggiunti.has(baseNome)) {
          mapGiaAggiunti.add(baseNome);

          if (d.isEducatore || d.materia?.toUpperCase().includes('EDUCATORE') || d.nome?.toUpperCase().includes('EDUCATORE')) {
            educatori.push(d);
          } else if (d.isSostegno || d.materia?.toUpperCase().includes('SOSTEGNO') || d.nome?.toUpperCase().includes('SOSTEGNO')) {
            sostegni.push(d);
          } else {
            curricolari.push(d);
          }
        }
      }
    }
  });

  return { curricolari, sostegni, educatori };
}

/**
 * Estrae tutte le classi uniche presenti negli orari scolastici (ordinate alfanumericamente es. 1A, 1B, 2A, 2B, 3A...)
 */
export function getClassiUniche(docenti: Docente[], orariDocenti: OrarioDocente[]): string[] {
  const classiSet = new Set<string>();

  orariDocenti.forEach(o => {
    o.ore.forEach(c => {
      if (c.valore) {
        const val = c.valore.trim().toUpperCase();
        // Ignora disposizioni, potenziamenti, buchi
        if (val && val !== 'D' && val !== 'P' && !val.startsWith('POT') && !val.includes('DISP')) {
          // Se ci sono classi multiple separate da spazio o virgola
          const matches = val.match(/\b([1-5][A-Z])\b/g);
          if (matches) {
            matches.forEach(m => classiSet.add(m));
          } else if (/^[1-5][A-Z0-9]+$/i.test(val)) {
            classiSet.add(val);
          }
        }
      }
    });
  });

  return Array.from(classiSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export interface DocenteConsiglioClasse {
  docente: Docente;
  materie: string[];
  oreSettimanali: number;
  isSostegno: boolean;
  isEducatore: boolean;
}

/**
 * Restituisce l'elenco dei docenti facenti parte del Consiglio di Classe per una determinata classe
 */
export function getDocentiConsiglioClasse(
  classe: string,
  docenti: Docente[],
  orariDocenti: OrarioDocente[]
): DocenteConsiglioClasse[] {
  if (!classe) return [];
  const classeNorm = classe.toUpperCase().trim();

  const mappa = new Map<string, DocenteConsiglioClasse>();

  docenti.forEach(d => {
    const orario = orariDocenti.find(o => o.docenteId === d.id);
    if (!orario) return;

    let oreInClasse = 0;
    orario.ore.forEach(c => {
      if (c.valore) {
        const v = c.valore.toUpperCase().trim();
        if (v === classeNorm || v.startsWith(classeNorm + ' ') || v.endsWith(' ' + classeNorm)) {
          oreInClasse++;
        }
      }
    });

    if (oreInClasse > 0) {
      const baseNome = getBaseNomeDocente(d.nome);
      const isEdu = !!(d.isEducatore || d.materia?.toUpperCase().includes('EDUCATORE') || d.nome?.toUpperCase().includes('EDUCATORE'));
      const isSost = !isEdu && !!(d.isSostegno || d.materia?.toUpperCase().includes('SOSTEGNO') || d.nome?.toUpperCase().includes('SOSTEGNO'));

      if (!mappa.has(baseNome)) {
        mappa.set(baseNome, {
          docente: d,
          materie: [d.materia || 'Docente'],
          oreSettimanali: oreInClasse,
          isSostegno: isSost,
          isEducatore: isEdu
        });
      } else {
        const item = mappa.get(baseNome)!;
        item.oreSettimanali += oreInClasse;
        if (d.materia && !item.materie.includes(d.materia)) {
          item.materie.push(d.materia);
        }
      }
    }
  });

  return Array.from(mappa.values()).sort((a, b) => {
    // Ordine: Curricolari prima, poi Sostegno, poi Educatori
    if (!a.isSostegno && !a.isEducatore && (b.isSostegno || b.isEducatore)) return -1;
    if ((a.isSostegno || a.isEducatore) && !b.isSostegno && !b.isEducatore) return 1;
    if (a.isSostegno && b.isEducatore) return -1;
    if (a.isEducatore && b.isSostegno) return 1;
    return a.docente.nome.localeCompare(b.docente.nome);
  });
}

/**
 * Restituisce la materia specifica del docente per quell'ora e giorno
 */
export function getMateriaDocenteNellOra(
  docenteId: string,
  giorno: GiornoSettimana,
  ora: number,
  docenti: Docente[],
  orariDocenti: OrarioDocente[]
): string {
  const collegatiIds = getDocentiCollegatiIds(docenteId, docenti);
  const profili = docenti.filter(d => collegatiIds.includes(d.id));

  for (const prof of profili) {
    const orario = orariDocenti.find(o => o.docenteId === prof.id);
    if (!orario) continue;
    const cella = orario.ore.find(c => c.giorno === giorno && c.ora === ora);
    if (cella && cella.valore && cella.valore.trim() !== '') {
      if (prof.isAlternativa || prof.nome.toUpperCase().includes('ALTERNATIVA')) return 'Alternativa';
      if (prof.isPotenziamento || prof.nome.toUpperCase().includes('POTENZIAMENTO')) return 'Potenziamento';
      if (prof.isSostegno || prof.nome.toUpperCase().includes('SOSTEGNO')) return 'Sostegno';
      if (prof.materia && prof.materia.trim() !== '') return prof.materia;
    }
  }

  const doc = docenti.find(d => d.id === docenteId);
  return doc?.materia || 'Docente';
}

/**
 * Calcola il totale delle ore a credito (straordinario / ore aggiuntive) maturate da un docente
 * (al netto di eventuali ore già compensate con permessi brevi)
 */
export function getOreCreditoDocente(
  docenteId: string,
  docenti: Docente[],
  sostituzioni: import('../types').SostituzioneAssegnata[],
  movimentiDebito: import('../types').MovimentoDebito[] = []
): number {
  const collegatiIds = getDocentiCollegatiIds(docenteId, docenti);
  const targetDoc = docenti.find(d => collegatiIds.includes(d.id));
  const baseNome = targetDoc ? getBaseNomeDocente(targetDoc.nome) : '';

  // 1. Ore a credito assegnate da sostituzioni (sia per ID collegato che per nome docente)
  const oreDaSostituzioni = sostituzioni.filter(s => {
    if (!s.docenteSostitutoId || s.categoria === 'NON_SOSTITUIRE') return false;
    const isStraord = s.isStraordinario || s.categoria === 'STRAORDINARIO_D';
    if (!isStraord) return false;
    
    if (collegatiIds.includes(s.docenteSostitutoId)) return true;
    const docSost = docenti.find(d => d.id === s.docenteSostitutoId);
    if (docSost && baseNome && getBaseNomeDocente(docSost.nome) === baseNome) return true;
    return false;
  }).length;

  // 2. Movimenti manuali di credito e compensazioni con permessi brevi
  const deltaCreditoManuale = movimentiDebito
    .filter(m => {
      const matchId = collegatiIds.includes(m.docenteId);
      const matchName = baseNome && docenti.find(d => d.id === m.docenteId && getBaseNomeDocente(d.nome) === baseNome);
      return (matchId || matchName);
    })
    .reduce((acc, m) => {
      if (m.descrizione?.includes('[COMPENSAZIONE_STRAORDINARIO]')) {
        return acc - Math.abs(m.deltaOre || 0);
      }
      if (m.descrizione?.includes('[STORNO_CREDITO]')) {
        return acc - Math.abs(m.deltaOre || 0);
      }
      if (m.descrizione?.includes('[AGGIUNTA_CREDITO]')) {
        return acc + Math.abs(m.deltaOre || 0);
      }
      return acc;
    }, 0);

  return Math.max(0, oreDaSostituzioni + deltaCreditoManuale);
}

export const getOreStraordinarioDocente = getOreCreditoDocente;

/**
 * Converte il codice di CategoriaSostituto nella corretta dicitura richiesta:
 * - Ora a credito / STRAORDINARIO_D -> 'disposizione'
 * - COMPRESENTE_CLASSE -> 'compresente'
 * - RECUPERO_STESSA_CLASSE / RECUPERO_GENERICO -> 'recupero'
 * - SOSTEGNO -> 'disposizione'
 * - Altre categorie liberato/potenziamento formattate in minuscolo pulito
 */
export function getDescrizioneCategoriaSostituto(categoria: string | undefined): string {
  if (!categoria) return '';
  const catUpper = categoria.toUpperCase().trim();
  
  if (catUpper === 'STRAORDINARIO_D' || catUpper === 'STRAORDINARIO D' || catUpper === 'STRAORDINARIO') {
    return 'disposizione';
  }
  if (catUpper === 'COMPRESENTE_CLASSE' || catUpper === 'COMPRESENTE CLASSE' || catUpper === 'COMPRESENZA') {
    return 'compresente';
  }
  if (catUpper === 'RECUPERO_STESSA_CLASSE' || catUpper === 'RECUPERO_GENERICO' || catUpper.includes('RECUPERO')) {
    return 'recupero';
  }
  if (catUpper === 'SOSTEGNO') {
    return 'sostituzione';
  }
  if (catUpper === 'LIBERATO_STESSA_CLASSE') {
    return 'stessa classe';
  }
  if (catUpper === 'LIBERATO_STESSA_MATERIA') {
    return 'stessa materia';
  }
  if (catUpper === 'LIBERATO_ALTRA_CLASSE' || catUpper.startsWith('LIBERATO')) {
    return 'liberato da gita';
  }
  if (catUpper === 'POTENZIAMENTO') {
    return 'potenziamento';
  }
  if (catUpper === 'SMISTAMENTO_CLASSE' || catUpper === 'SMISTAMENTO') {
    return 'smistamento';
  }
  if (catUpper === 'NON_SOSTITUIRE') {
    return 'non sostituita';
  }
  return categoria.replace(/_/g, ' ').toLowerCase();
}
