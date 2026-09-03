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
  version: '1.5.3',
  buildTime: '2026-09-03T17:22:00Z',
  title: 'Novità della Versione 1.5.3',
  descrizioneGenerale: 'Gestione manuale di storni e aggiunte per il bilancio ore a credito e debito.',
  novita: [
    {
      titolo: 'Storno e Aggiunta Manuale Ore a Credito e a Debito',
      descrizione: 'In Bilanci e Report, la Vicepresidenza può ora registrare manualmente storni o aggiunte di ore a credito e debito con causale personalizzata, sia dal riquadro principale che dall\'estratto conto del singolo docente.',
      tag: 'Bilanci & Vicepresidenza'
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
      titolo: 'Dicitura Compatta "Ed." per Educatori su Mobile',
      descrizione: 'Nei tabelloni delle sostituzioni, la presenza dell\'educatore in classe mostra ora la sigla compatta "🎓 Ed.: [Nome]" su smartphone, risparmiando spazio prezioso.',
      tag: 'Mobile & Grafica'
    },
    {
      titolo: 'Pulsante "+ Aggiungi" a Capo su Mobile',
      descrizione: 'Da smartphone, il pulsante per aggiungere un ulteriore docente sostituto va ora sempre a capo a tutta larghezza, migliorando l\'ergonomia del tocco ed evitando qualsiasi sovrapposizione.',
      tag: 'Mobile & Ergonomia'
    },
    {
      titolo: 'Layout Compatto e Allineato per Più Sostituti',
      descrizione: 'Risolto ogni spostamento a zig-zag: le classi e i docenti assenti restano perfettamente allineati a sinistra, mentre le card dei docenti sostituti sono compatte e ordinate con poco padding.',
      tag: 'Grafica & Tabellone'
    },
    {
      titolo: 'Banner Aggiornamenti Interamente Cliccabile',
      descrizione: 'Toccando ovunque sulla barra viola in alto o sul nuovo pulsante "📖 Leggi Novità" si apre istantaneamente il pannello con tutte le spiegazioni delle nuove versioni.',
      tag: 'Notifiche'
    },
    {
      titolo: 'Diciture Semplificate nei Tabelloni',
      descrizione: 'Nelle celle di sostituzione ora compaiono termini uniformi e immediati: "disposizione" (per ore a credito/straordinario D e sostegno), "compresente" (senza la parola classe), e "recupero".',
      tag: 'Tabellone & Chiarezza'
    },
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
