export interface AppVersionInfo {
  version: string;
  buildTime: string;
  title: string;
  novita: string[];
}

export const CURRENT_APP_VERSION: AppVersionInfo = {
  version: '1.4.3',
  buildTime: '2026-09-03T15:33:00Z',
  title: 'Versione 1.4.3',
  novita: [
    'Ottimizzato l\'header per iPhone: tasto Logout sempre visibile e comodo',
    'Rimosso pulsante ricarica duplicato grazie all\'auto-aggiornamento live',
    'Ridisegnato Bilanci & Report a 4 reparti con Drawer movimenti',
    'Supporto a soggiorni e viaggi di istruzione multi-giorno in Aggiungi Gita'
  ]
};
