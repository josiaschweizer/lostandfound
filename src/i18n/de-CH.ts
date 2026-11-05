/**
 * Alle sichtbaren Texte der App (Deutsch, Schweiz).
 * Regeln (KONZEPT_M245 Abschnitt 9): «ss» statt «ß», Anführungszeichen « »,
 * «du» auf der öffentlichen Seite, neutral in der Verwaltung, Begriffe gemäss Wording-Tabelle 9.1.
 * Neue Texte immer hier ergänzen, nie direkt in Komponenten schreiben.
 */
export const t = {
  app: {
    name: 'lostandfound',
    tagline: 'Fundsachen von Schulen, Fundbüros und weiteren Fundstellen an einem Ort.',
  },

  nav: {
    main: 'Hauptnavigation',
    search: 'Suchen',
    reportLoss: 'Verlust melden',
    found: 'Gefunden?',
    help: 'Hilfe',
    offices: 'Fundstellen',
    forOffices: 'Für Fundstellen',
    home: 'Zur Startseite',
  },

  footer: {
    project: 'Schulprojekt M245 · Prototyp',
  },

  pages: {
    home: { title: 'Verloren? Vielleicht schon gefunden.' },
    search: { title: 'Gegenstand suchen' },
    item: { title: 'Fundgegenstand' },
    offices: { title: 'Fundstellen' },
    office: { title: 'Fundstelle' },
    reportLoss: { title: 'Verlust melden' },
    myLoss: { title: 'Meine Verlustmeldung' },
    found: { title: 'Ich habe etwas gefunden' },
    myClaim: { title: 'Meine Anfrage' },
    help: { title: 'Hilfe' },
    notFound: {
      title: 'Seite nicht gefunden',
      text: 'Die Adresse ist falsch oder veraltet.',
    },
  },

  admin: {
    nav: 'Verwaltung',
    login: { title: 'Anmelden für Fundstellen' },
    overview: { title: 'Übersicht' },
    items: { title: 'Funde' },
    newItem: { title: 'Fund erfassen' },
    lossReports: { title: 'Verlustmeldungen' },
    claims: { title: 'Anfragen' },
    outbox: { title: 'Postausgang' },
    office: { title: 'Fundstelle' },
  },

  placeholder: {
    text: 'Diese Seite wird in einer der nächsten Etappen gebaut.',
  },

  errors: {
    route: {
      title: 'Da ist etwas schiefgelaufen',
      text: 'Bitte lade die Seite neu. Tritt der Fehler wieder auf, geh zur Startseite.',
      reload: 'Neu laden',
    },
  },

  setup: {
    title: 'Supabase ist noch nicht eingerichtet',
    steps: [
      '.env.example nach .env.local kopieren.',
      'Im Supabase-Dashboard unter «Project Settings → API» die URL und den anon key eintragen.',
      'Dev-Server neu starten: pnpm dev',
    ],
  },

  dbStatus: {
    label: 'Datenbank',
    checking: 'Verbindung wird geprüft …',
    ok: (count: number) => `verbunden · ${count} ${count === 1 ? 'Fundstelle' : 'Fundstellen'}`,
    noSchema: 'verbunden · Schema fehlt noch (folgt in Etappe 2)',
    error: 'nicht erreichbar',
  },
} as const
