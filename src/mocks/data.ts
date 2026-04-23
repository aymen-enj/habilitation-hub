import type {
  AccessRequest,
  Agent,
  Application,
  AuditEvent,
  Delegation,
  Module,
  Profile,
  User,
} from "./types";

export const users: User[] = [
  { id: "u-admin", name: "Salma Bennani", email: "s.bennani@cnss.ma", role: "ADMIN" },
  { id: "u-mgr", name: "Karim El Amrani", email: "k.elamrani@cnss.ma", role: "MANAGER" },
  { id: "u-val", name: "Nadia Tazi", email: "n.tazi@cnss.ma", role: "VALIDATOR" },
  { id: "u-aud", name: "Yassine Idrissi", email: "y.idrissi@cnss.ma", role: "AUDIT_VIEWER" },
];

export const delegations: Delegation[] = [
  { id: "d-cas", name: "Délégation Casablanca" },
  { id: "d-rab", name: "Délégation Rabat" },
  { id: "d-fes", name: "Délégation Fès" },
  { id: "d-mar", name: "Délégation Marrakech" },
  { id: "d-tan", name: "Délégation Tanger" },
];

export const applications: Application[] = [
  { id: "app-rh", name: "SIRH", domain: "RH" },
  { id: "app-paie", name: "Paie & Rémunération", domain: "RH" },
  { id: "app-fin", name: "Comptabilité Générale", domain: "Finance" },
  { id: "app-bud", name: "Budget & Engagements", domain: "Finance" },
  { id: "app-it", name: "Portail IT Admin", domain: "IT" },
];

export const profiles: Profile[] = [
  { id: "pr-rh-cons", applicationId: "app-rh", name: "Consultation" },
  { id: "pr-rh-gest", applicationId: "app-rh", name: "Gestionnaire RH" },
  { id: "pr-rh-admin", applicationId: "app-rh", name: "Administrateur RH" },
  { id: "pr-paie-gest", applicationId: "app-paie", name: "Gestionnaire Paie" },
  { id: "pr-paie-cons", applicationId: "app-paie", name: "Consultation Paie" },
  { id: "pr-fin-compt", applicationId: "app-fin", name: "Comptable" },
  { id: "pr-fin-resp", applicationId: "app-fin", name: "Responsable Finance" },
  { id: "pr-bud-gest", applicationId: "app-bud", name: "Gestionnaire Budget" },
  { id: "pr-it-sup", applicationId: "app-it", name: "Support N1" },
  { id: "pr-it-admin", applicationId: "app-it", name: "Administrateur Système" },
];

export const modules: Module[] = [
  { id: "m-rh-cons-1", profileId: "pr-rh-cons", name: "Dossier agent (lecture)" },
  { id: "m-rh-gest-1", profileId: "pr-rh-gest", name: "Gestion des absences" },
  { id: "m-rh-gest-2", profileId: "pr-rh-gest", name: "Gestion des contrats" },
  { id: "m-rh-admin-1", profileId: "pr-rh-admin", name: "Paramétrage RH" },
  { id: "m-paie-gest-1", profileId: "pr-paie-gest", name: "Édition bulletins" },
  { id: "m-paie-gest-2", profileId: "pr-paie-gest", name: "Clôture mensuelle" },
  { id: "m-paie-cons-1", profileId: "pr-paie-cons", name: "Consultation bulletins" },
  { id: "m-fin-compt-1", profileId: "pr-fin-compt", name: "Saisie écritures" },
  { id: "m-fin-resp-1", profileId: "pr-fin-resp", name: "Validation écritures" },
  { id: "m-bud-gest-1", profileId: "pr-bud-gest", name: "Engagements budgétaires" },
  { id: "m-it-sup-1", profileId: "pr-it-sup", name: "Tickets utilisateurs" },
  { id: "m-it-admin-1", profileId: "pr-it-admin", name: "Gestion comptes AD" },
];

const today = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return iso(d);
};
const daysAhead = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const agents: Agent[] = [
  {
    id: "ag-001", matricule: "CNSS-10421", firstName: "Hicham", lastName: "Bouazza",
    delegationId: "d-cas", domain: "RH", status: "ACTIF", managerId: "u-mgr",
    habilitations: [
      { id: "h1", applicationId: "app-rh", profileId: "pr-rh-gest", moduleId: "m-rh-gest-1", startDate: daysAgo(120), endDate: daysAhead(245) },
      { id: "h2", applicationId: "app-paie", profileId: "pr-paie-cons", moduleId: "m-paie-cons-1", startDate: daysAgo(60), endDate: daysAhead(305) },
    ],
  },
  {
    id: "ag-002", matricule: "CNSS-10833", firstName: "Fatima Zahra", lastName: "Cherkaoui",
    delegationId: "d-rab", domain: "RH", status: "ACTIF", managerId: "u-mgr",
    habilitations: [
      { id: "h3", applicationId: "app-rh", profileId: "pr-rh-admin", moduleId: "m-rh-admin-1", startDate: daysAgo(200), endDate: daysAhead(165) },
    ],
  },
  {
    id: "ag-003", matricule: "CNSS-11102", firstName: "Mehdi", lastName: "El Fassi",
    delegationId: "d-cas", domain: "Finance", status: "ACTIF", managerId: "u-mgr",
    habilitations: [
      { id: "h4", applicationId: "app-fin", profileId: "pr-fin-compt", moduleId: "m-fin-compt-1", startDate: daysAgo(95), endDate: daysAhead(270) },
    ],
  },
  {
    id: "ag-004", matricule: "CNSS-11240", firstName: "Khadija", lastName: "Mansouri",
    delegationId: "d-fes", domain: "Finance", status: "ACTIF",
    habilitations: [
      { id: "h5", applicationId: "app-fin", profileId: "pr-fin-resp", moduleId: "m-fin-resp-1", startDate: daysAgo(300), endDate: daysAhead(60) },
      { id: "h6", applicationId: "app-bud", profileId: "pr-bud-gest", moduleId: "m-bud-gest-1", startDate: daysAgo(150), endDate: daysAhead(215) },
    ],
  },
  {
    id: "ag-005", matricule: "CNSS-11355", firstName: "Omar", lastName: "Berrada",
    delegationId: "d-mar", domain: "IT", status: "ACTIF",
    habilitations: [
      { id: "h7", applicationId: "app-it", profileId: "pr-it-admin", moduleId: "m-it-admin-1", startDate: daysAgo(400), endDate: daysAhead(330) },
    ],
  },
  {
    id: "ag-006", matricule: "CNSS-11489", firstName: "Sanae", lastName: "Lahlou",
    delegationId: "d-tan", domain: "IT", status: "ACTIF",
    habilitations: [
      { id: "h8", applicationId: "app-it", profileId: "pr-it-sup", moduleId: "m-it-sup-1", startDate: daysAgo(75), endDate: daysAhead(290) },
    ],
  },
  {
    id: "ag-007", matricule: "CNSS-11522", firstName: "Adil", lastName: "Kettani",
    delegationId: "d-rab", domain: "RH", status: "INACTIF",
    habilitations: [],
  },
  {
    id: "ag-008", matricule: "CNSS-11688", firstName: "Houda", lastName: "Sebti",
    delegationId: "d-cas", domain: "Finance", status: "ACTIF", managerId: "u-mgr",
    habilitations: [
      { id: "h9", applicationId: "app-bud", profileId: "pr-bud-gest", moduleId: "m-bud-gest-1", startDate: daysAgo(45), endDate: daysAhead(320) },
    ],
  },
  {
    id: "ag-009", matricule: "CNSS-11790", firstName: "Younes", lastName: "Saidi",
    delegationId: "d-fes", domain: "RH", status: "ACTIF",
    habilitations: [
      { id: "h10", applicationId: "app-rh", profileId: "pr-rh-cons", moduleId: "m-rh-cons-1", startDate: daysAgo(20), endDate: daysAhead(345) },
    ],
  },
  {
    id: "ag-010", matricule: "CNSS-11854", firstName: "Imane", lastName: "Ouazzani",
    delegationId: "d-mar", domain: "RH", status: "ACTIF",
    habilitations: [
      { id: "h11", applicationId: "app-paie", profileId: "pr-paie-gest", moduleId: "m-paie-gest-1", startDate: daysAgo(180), endDate: daysAhead(185) },
      { id: "h12", applicationId: "app-paie", profileId: "pr-paie-gest", moduleId: "m-paie-gest-2", startDate: daysAgo(180), endDate: daysAhead(185) },
    ],
  },
  {
    id: "ag-011", matricule: "CNSS-11910", firstName: "Tarik", lastName: "Belkadi",
    delegationId: "d-tan", domain: "Finance", status: "SUSPENDU",
    habilitations: [],
  },
  {
    id: "ag-012", matricule: "CNSS-12044", firstName: "Soukaina", lastName: "Naciri",
    delegationId: "d-cas", domain: "IT", status: "ACTIF",
    habilitations: [
      { id: "h13", applicationId: "app-it", profileId: "pr-it-sup", moduleId: "m-it-sup-1", startDate: daysAgo(30), endDate: daysAhead(335) },
    ],
  },
  {
    id: "ag-013", matricule: "CNSS-12180", firstName: "Rachid", lastName: "Drissi",
    delegationId: "d-rab", domain: "Finance", status: "ACTIF",
    habilitations: [
      { id: "h14", applicationId: "app-fin", profileId: "pr-fin-compt", moduleId: "m-fin-compt-1", startDate: daysAgo(220), endDate: daysAhead(145) },
    ],
  },
  {
    id: "ag-014", matricule: "CNSS-12266", firstName: "Leila", lastName: "Rahmouni",
    delegationId: "d-fes", domain: "RH", status: "ACTIF",
    habilitations: [
      { id: "h15", applicationId: "app-rh", profileId: "pr-rh-gest", moduleId: "m-rh-gest-2", startDate: daysAgo(110), endDate: daysAhead(255) },
    ],
  },
  {
    id: "ag-015", matricule: "CNSS-12340", firstName: "Anas", lastName: "Hajji",
    delegationId: "d-mar", domain: "IT", status: "ACTIF",
    habilitations: [
      { id: "h16", applicationId: "app-it", profileId: "pr-it-admin", moduleId: "m-it-admin-1", startDate: daysAgo(360), endDate: daysAhead(5) },
    ],
  },
];

export const accessRequests: AccessRequest[] = [
  {
    id: "req-001", createdAt: daysAgo(1), requesterId: "u-mgr", beneficiaryId: "ag-001",
    applicationId: "app-paie", profileId: "pr-paie-gest", moduleId: "m-paie-gest-1",
    startDate: daysAhead(2), endDate: daysAhead(180),
    justification: "Renfort équipe paie pour la clôture trimestrielle.",
    status: "PENDING",
  },
  {
    id: "req-002", createdAt: daysAgo(2), requesterId: "u-mgr", beneficiaryId: "ag-009",
    applicationId: "app-rh", profileId: "pr-rh-gest", moduleId: "m-rh-gest-1",
    startDate: daysAhead(1), endDate: daysAhead(120),
    justification: "Prise en charge dossiers absences délégation Fès.",
    status: "PENDING",
  },
  {
    id: "req-003", createdAt: daysAgo(3), requesterId: "u-mgr", beneficiaryId: "ag-013",
    applicationId: "app-bud", profileId: "pr-bud-gest", moduleId: "m-bud-gest-1",
    startDate: daysAhead(5), endDate: daysAhead(200),
    justification: "Suivi des engagements budgétaires Q2.",
    status: "PENDING",
  },
  {
    id: "req-004", createdAt: daysAgo(5), requesterId: "u-admin", beneficiaryId: "ag-006",
    applicationId: "app-it", profileId: "pr-it-admin", moduleId: "m-it-admin-1",
    startDate: daysAgo(2), endDate: daysAhead(360),
    justification: "Promotion au poste d'administrateur système délégation Tanger.",
    status: "APPROVED",
    decisionComment: "Promotion validée par la DRH. Habilitation accordée.",
    decidedAt: daysAgo(2), decidedById: "u-val",
  },
  {
    id: "req-005", createdAt: daysAgo(7), requesterId: "u-mgr", beneficiaryId: "ag-008",
    applicationId: "app-fin", profileId: "pr-fin-compt", moduleId: "m-fin-compt-1",
    startDate: daysAgo(4), endDate: daysAhead(180),
    justification: "Élargissement du périmètre comptable agent.",
    status: "APPROVED",
    decisionComment: "Validé après revue avec le responsable finance.",
    decidedAt: daysAgo(4), decidedById: "u-val",
  },
  {
    id: "req-006", createdAt: daysAgo(10), requesterId: "u-mgr", beneficiaryId: "ag-007",
    applicationId: "app-rh", profileId: "pr-rh-admin", moduleId: "m-rh-admin-1",
    startDate: daysAgo(8), endDate: daysAhead(180),
    justification: "Demande d'accès admin RH.",
    status: "REJECTED",
    decisionComment: "Bénéficiaire en statut inactif. Refus jusqu'à régularisation.",
    decidedAt: daysAgo(8), decidedById: "u-val",
  },
  {
    id: "req-007", createdAt: daysAgo(15), requesterId: "u-admin", beneficiaryId: "ag-002",
    applicationId: "app-paie", profileId: "pr-paie-gest", moduleId: "m-paie-gest-2",
    startDate: daysAgo(12), endDate: daysAhead(90),
    justification: "Appui clôture mensuelle.",
    status: "APPROVED",
    decisionComment: "Habilitation temporaire accordée.",
    decidedAt: daysAgo(12), decidedById: "u-val",
  },
  {
    id: "req-008", createdAt: daysAgo(20), requesterId: "u-mgr", beneficiaryId: "ag-011",
    applicationId: "app-fin", profileId: "pr-fin-resp", moduleId: "m-fin-resp-1",
    startDate: daysAgo(18), endDate: daysAgo(2),
    justification: "Mission temporaire Q1.",
    status: "EXPIRED",
  },
  {
    id: "req-009", createdAt: daysAgo(4), requesterId: "u-mgr", beneficiaryId: "ag-014",
    applicationId: "app-rh", profileId: "pr-rh-gest", moduleId: "m-rh-gest-2",
    startDate: daysAhead(3), endDate: daysAhead(150),
    justification: "Gestion contrats nouveaux recrutements.",
    status: "PENDING",
  },
  {
    id: "req-010", createdAt: daysAgo(6), requesterId: "u-admin", beneficiaryId: "ag-012",
    applicationId: "app-it", profileId: "pr-it-sup", moduleId: "m-it-sup-1",
    startDate: daysAgo(3), endDate: daysAhead(360),
    justification: "Intégration support N1 — délégation Casablanca.",
    status: "APPROVED",
    decisionComment: "Validé.",
    decidedAt: daysAgo(3), decidedById: "u-val",
  },
];

export const auditEvents: AuditEvent[] = [
  { id: "ev-001", timestamp: daysAgo(1), type: "REQUEST_CREATED", actorId: "u-mgr", actorName: "Karim El Amrani", target: "req-001", details: "Demande créée pour Hicham Bouazza — Paie & Rémunération." },
  { id: "ev-002", timestamp: daysAgo(2), type: "REQUEST_CREATED", actorId: "u-mgr", actorName: "Karim El Amrani", target: "req-002", details: "Demande créée pour Younes Saidi — SIRH." },
  { id: "ev-003", timestamp: daysAgo(2), type: "REQUEST_APPROVED", actorId: "u-val", actorName: "Nadia Tazi", target: "req-004", details: "Demande approuvée — Promotion administrateur système." },
  { id: "ev-004", timestamp: daysAgo(3), type: "REQUEST_CREATED", actorId: "u-mgr", actorName: "Karim El Amrani", target: "req-003", details: "Demande créée pour Rachid Drissi — Budget & Engagements." },
  { id: "ev-005", timestamp: daysAgo(3), type: "REQUEST_APPROVED", actorId: "u-val", actorName: "Nadia Tazi", target: "req-010", details: "Demande approuvée — Support N1 IT." },
  { id: "ev-006", timestamp: daysAgo(4), type: "REQUEST_APPROVED", actorId: "u-val", actorName: "Nadia Tazi", target: "req-005", details: "Demande approuvée — Comptable Finance." },
  { id: "ev-007", timestamp: daysAgo(4), type: "REQUEST_CREATED", actorId: "u-mgr", actorName: "Karim El Amrani", target: "req-009", details: "Demande créée pour Leila Rahmouni — SIRH." },
  { id: "ev-008", timestamp: daysAgo(5), type: "REQUEST_CREATED", actorId: "u-admin", actorName: "Salma Bennani", target: "req-004", details: "Demande créée pour Sanae Lahlou — Portail IT." },
  { id: "ev-009", timestamp: daysAgo(6), type: "LOGIN", actorId: "u-aud", actorName: "Yassine Idrissi", target: "session", details: "Connexion auditeur." },
  { id: "ev-010", timestamp: daysAgo(6), type: "REQUEST_CREATED", actorId: "u-admin", actorName: "Salma Bennani", target: "req-010", details: "Demande créée pour Soukaina Naciri." },
  { id: "ev-011", timestamp: daysAgo(7), type: "REQUEST_CREATED", actorId: "u-mgr", actorName: "Karim El Amrani", target: "req-005", details: "Demande créée pour Houda Sebti." },
  { id: "ev-012", timestamp: daysAgo(8), type: "REQUEST_REJECTED", actorId: "u-val", actorName: "Nadia Tazi", target: "req-006", details: "Demande rejetée — bénéficiaire inactif." },
  { id: "ev-013", timestamp: daysAgo(10), type: "REQUEST_CREATED", actorId: "u-mgr", actorName: "Karim El Amrani", target: "req-006", details: "Demande créée pour Adil Kettani." },
  { id: "ev-014", timestamp: daysAgo(12), type: "REQUEST_APPROVED", actorId: "u-val", actorName: "Nadia Tazi", target: "req-007", details: "Demande approuvée — Clôture mensuelle paie." },
  { id: "ev-015", timestamp: daysAgo(15), type: "REQUEST_CREATED", actorId: "u-admin", actorName: "Salma Bennani", target: "req-007", details: "Demande créée pour Fatima Zahra Cherkaoui." },
  { id: "ev-016", timestamp: daysAgo(18), type: "LOGIN", actorId: "u-val", actorName: "Nadia Tazi", target: "session", details: "Connexion validateur." },
  { id: "ev-017", timestamp: daysAgo(20), type: "REQUEST_CREATED", actorId: "u-mgr", actorName: "Karim El Amrani", target: "req-008", details: "Demande créée pour Tarik Belkadi." },
  { id: "ev-018", timestamp: daysAgo(22), type: "LOGIN", actorId: "u-admin", actorName: "Salma Bennani", target: "session", details: "Connexion administrateur." },
  { id: "ev-019", timestamp: daysAgo(25), type: "LOGIN", actorId: "u-mgr", actorName: "Karim El Amrani", target: "session", details: "Connexion manager." },
  { id: "ev-020", timestamp: daysAgo(28), type: "LOGOUT", actorId: "u-val", actorName: "Nadia Tazi", target: "session", details: "Déconnexion validateur." },
  { id: "ev-021", timestamp: daysAgo(30), type: "REQUEST_APPROVED", actorId: "u-val", actorName: "Nadia Tazi", target: "req-arch-1", details: "Demande historique approuvée." },
  { id: "ev-022", timestamp: daysAgo(32), type: "REQUEST_REJECTED", actorId: "u-val", actorName: "Nadia Tazi", target: "req-arch-2", details: "Demande historique rejetée — périmètre hors scope." },
  { id: "ev-023", timestamp: daysAgo(35), type: "REQUEST_CREATED", actorId: "u-mgr", actorName: "Karim El Amrani", target: "req-arch-3", details: "Demande historique créée." },
  { id: "ev-024", timestamp: daysAgo(40), type: "LOGIN", actorId: "u-aud", actorName: "Yassine Idrissi", target: "session", details: "Connexion auditeur." },
  { id: "ev-025", timestamp: daysAgo(45), type: "LOGIN", actorId: "u-admin", actorName: "Salma Bennani", target: "session", details: "Connexion administrateur." },
];
