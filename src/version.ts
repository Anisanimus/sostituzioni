export interface AppVersionInfo {
  version: string;
  buildTime: string;
  title: string;
  novita: string[];
}

export const CURRENT_APP_VERSION: AppVersionInfo = {
  version: '1.4.4',
  buildTime: '2026-09-03T15:38:00Z',
  title: 'Versione 1.4.4',
  novita: [
    'Pulsanti compatti (+ Assente, + Gita, + Nomina): perfetta visualizzazione su tablet',
    'Tutti i pulsanti azioni e avvisi ora restano perfettamente allineati e visibili',
    'Ottimizzato l\'header per smartphone: tasto Logout sempre comodo'
  ]
};
