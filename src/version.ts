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
  version: '1.4.5',
  buildTime: '2026-09-03T15:50:00Z',
  title: 'Novità della Versione 1.4.5',
  descrizioneGenerale: 'Ottimizzazione del tabellone sostituzioni per dispositivi mobili e tablet con pulsanti di aggiunta compatti e intuitivi.',
  novita: [
    {
      titolo: 'Pulsante "+ Sostituto" Compatto su Mobile e Tablet',
      descrizione: 'Nel tabellone delle sostituzioni (sia vista a blocchi che per docente), il pulsante per aggiungere un sostituto o una compresenza mostra ora solo il simbolo "+" e l\'icona della persona, garantendo la massima pulizia grafica.',
      tag: 'Tabellone & Tablet'
    },
    {
      titolo: 'Layout e Pulsanti ad Alta Risoluzione per Tablet e Mobile',
      descrizione: 'I pulsanti d\'azione (+ Assente, + Gita, + Nomina) sono stati compattati per garantire che tutti gli strumenti (Eventi, Risorse, Avviso Bacheca) restino allineati su una sola riga senza uscire dallo schermo.',
      tag: 'Grafica & Tablet'
    },
    {
      titolo: 'Tasto Logout ed Header Ottimizzati per Smartphone',
      descrizione: 'L\'intestazione dell\'app è stata ripulita dagli elementi superflui su schermi stretti, garantendo che il pulsante Esci/Logout sia sempre immediatamente a portata di dito.',
      tag: 'Mobile iPhone/Android'
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
