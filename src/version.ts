export interface NovitaDettaglio {
  titolo: string;
  descrizione: string;
  tag?: string;
}

export interface AppVersionInfo {
  version: string;
  buildTime: string;
  title: string;
  descrizioneGenerale?: string;
  novita: (string | NovitaDettaglio)[];
}

export const CURRENT_APP_VERSION: AppVersionInfo = {
  version: '1.8.7',
  buildTime: '2026-09-08T08:45:00Z',
  title: 'Novità della Versione 1.8.7',
  descrizioneGenerale: 'Storico sostituzioni numerato nel Portale Docente, materia in email e perfezionamento gestione nomine.',
  novita: [
    {
      titolo: 'Storico Sostituzioni Effettuate Numerato (#)',
      descrizione: 'Nel Portale Docente (sezione "Bilancio Ore & Movimenti") è ora disponibile il registro cronologico decrescente di tutte le supplenze assegnate e svolte, numerate progressivamente (#1, #2, ...), con data, ora, classe, docente sostituito, materia, note di servizio e stato della firma digitale.',
      tag: 'Portale Docente'
    },
    {
      titolo: 'Materia nei Riepiloghi Email {ELENCO_SOSTITUZIONI}',
      descrizione: 'Il segnaposto dinamico {ELENCO_SOSTITUZIONI} include ora la materia specifica dell\'ora di lezione per ciascun docente sostituito (es. "2ª ora | Classe 3B | Sostituisce: ROSSI MARIO (MATEMATICA)"). Aggiornato anche il generatore Google Apps Script.',
      tag: 'Email & Notifiche'
    },
    {
      titolo: 'Pulizia Totale Nomine & Supplenti in "Azzera Dati Storici"',
      descrizione: 'La funzione di azzeramento dati storici del registro rimuove ora in modo completo anche tutte le nomine a cattedra e i profili supplenti temporaneamente creati, ripristinando l\'organico di partenza.',
      tag: 'Vicepresidenza & Sicurezza'
    },
    {
      titolo: 'Campo Testo Personalizzato & Disposizioni Orarie',
      descrizione: 'Nel popup di assegnazione del sostituto è possibile inserire un testo o avviso personalizzato (es. "Entrata posticipata alle 10:00", "Uscita anticipata alle 12:00", per Assemblea Sindacale o attività speciali) con pulsanti di testo rapido precompilati.',
      tag: 'Vicepresidenza & Tabellone'
    },
    {
      titolo: 'Filtro Rigido Fascia Oraria Email Istantanee',
      descrizione: 'Le email istantanee di nuova supplenza o revoca vengono spedite esclusivamente all\'interno della fascia oraria di lavoro impostata (default 08:00 - 17:00).',
      tag: 'Email & Vicepresidenza'
    },
    {
      titolo: 'Chiusura Singola Notifica ("Ho Capito")',
      descrizione: 'Cliccando su "Ho Capito ✓" su una notifica, scompare unicamente quella specifica comunicazione senza eliminare le altre notifiche presenti nel portale.',
      tag: 'Docenti & Notifiche'
    },
    {
      titolo: 'Email Istantanea di Revoca / Annullamento',
      descrizione: 'Integrato l\'invio automatico immediato dell\'email di revoca al docente supplente quando un\'assenza viene annullata o cancellata dal registro.',
      tag: 'Email & Vicepresidenza'
    },
    {
      titolo: 'Anti-Duplicazione Email & Lock Atomico',
      descrizione: 'Eliminato l\'invio multiplo delle email di riepilogo e avviso: introdotto un blocco atomico del timer che impedisce la ripetizione della chiamata durante il minuto di scadenza e raggruppa tutte le ore assegnate al docente in 1 sola email cumulativa.',
      tag: 'Notifiche & Email'
    },
    {
      titolo: 'Icone PNG Native per iPhone e Android (Home Screen)',
      descrizione: 'Generati e collegati i file PNG nativi ad alta risoluzione (apple-touch-icon 180x180, icon-192 e icon-512 nel manifest PWA) per garantire la corretta visualizzazione della nuova icona ufficiale con Scuola & Orologio su tutti gli smartphone iOS e Android.',
      tag: 'Smartphone & iOS'
    },
    {
      titolo: 'Nuova Icona SVG Ufficiale Sostituzioni Smart',
      descrizione: 'Integrata la nuova icona vettoriale SVG in alta definizione (con Scuola, Orologio e Calendario su sfondo blu/verde smeraldo) come icona predefinita dell\'applicazione e favicon di sistema.',
      tag: 'Brand & Grafica'
    },
    {
      titolo: 'Doppio Controllo Indipendente per Loghi e Icone',
      descrizione: 'In Vicepresidenza > Personalizzazioni > Intestazione Scuola sono ora presenti due riquadri dedicati: uno per lo stemma interno mostrato sulla barra desktop e nel menu, e uno indipendente per l\'icona principale dell\'applicazione (utilizzata su Home smartphone, richiesta di installazione, splash screen e favicon della scheda del browser).',
      tag: 'Personalizzazioni & Brand'
    },
    {
      titolo: 'Favicon Scheda Browser Dinamica',
      descrizione: 'L\'icona a forma di lampo nella scheda del browser (Favicon) si aggiorna ora automaticamente in tempo reale con il logo caricato o con l\'icona tematica scelta per la scuola nelle Personalizzazioni.',
      tag: 'Browser & Personalizzazioni'
    },
    {
      titolo: 'Caricamento Logo & Icona Personalizzata Scuola',
      descrizione: 'In Vicepresidenza > Personalizzazioni > Intestazione Scuola è ora possibile caricare lo stemma o logo ufficiale della scuola (PNG, JPG, SVG) oppure scegliere tra diverse icone tematiche (Scuola, Libro, Studio, Campus, Arte, Stemma). Il logo personalizzato viene sincronizzato sul Cloud e mostrato su header, menu e favicon del browser.',
      tag: 'Personalizzazioni & Brand'
    },
    {
      titolo: 'Dicitura "(SOSTITUZIONE)" per Sostegno Spostato',
      descrizione: 'Quando un docente di sostegno in servizio su un\'altra classe viene assegnato a coprire un\'ora scoperta, nei tabelloni e nei prospetti compare ora la dicitura esatta "(SOSTITUZIONE)".',
      tag: 'Tabellone & Diciture'
    },
    {
      titolo: 'Pulsante "+ Aggiungi" a Tutta Larghezza nella Vista a Blocchi',
      descrizione: 'Nella vista a blocchi orari da mobile, il pulsante "+ Aggiungi" sfrutta ora l\'intera larghezza orizzontale della riga con la dicitura chiara ed esplicita per scandire al meglio ogni blocco.',
      tag: 'Tabellone a Blocchi'
    },
    {
      titolo: 'Supporto a Soggiorni e Gite di Più Giorni',
      descrizione: 'Dal pannello "+ Gita" è ora possibile spuntare "Più giorni / Soggiorno" per selezionare data inizio e fine: l\'app creerà automaticamente l\'uscita e libererà i docenti curricolari per tutti i giorni del periodo.',
      tag: 'Gite & Uscite'
    },
    {
      titolo: 'Ridisegno Bilanci & Report Vicepresidenza a 4 Reparti',
      descrizione: 'Nuova schermata divisa in 4 reparti chiari con conteggio rigoroso dei giorni per le assenze ordinarie, classifiche ordinate e Drawer Laterale con l\'estratto conto completo di ogni docente.',
      tag: 'Vicepresidenza'
    },
    {
      titolo: 'Sistema di Aggiornamento Live Istantaneo',
      descrizione: 'Ogni volta che rilasciamo una nuova funzionalità o correzione, l\'app mostra un avviso e con un solo tocco su "Aggiorna Ora" applica le modifiche all\'istante senza dover svuotare la cronologia.',
      tag: 'Sistema'
    }
  ]
};
