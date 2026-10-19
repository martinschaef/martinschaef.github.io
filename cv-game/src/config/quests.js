// Optional side quests, by the flag that marks them complete. The victory screen counts
// these, and the smoke test checks every flag is actually set somewhere in the game data.
export const SIDE_QUESTS = [
    { flag: 'bugs_cleared_w1', name: "Tobert's escaped bugs" },
    { flag: 'stairs_done',     name: "Valentin's 3D stairs" },
    { flag: 'monika_done',     name: "Monika's PokéStop run" },
    { flag: 'freiburg_bounty', name: "Stephan's test lab" },
    { flag: 'paid_tanks',      name: "Laxino's game catalog" },
    { flag: 'macau_bounty',    name: 'Joogie on the casino floor' },
    { flag: 'drinks_set',      name: 'SRI reunion drinks' },
    { flag: 'fiji_done',       name: 'Road to Fiji (LPAR 2015)' },
];

// Papers that quests ask for, by exact title in publications.json. Picking one up sets
// "cite:<tag>" and appends the note. The LPAR 2015 inconsistency paper cites all six.
const LPAR_NOTE = '📎 Cited in the LPAR 2015 paper. Teme will want this for the related work.';
export const PAPER_TAGS = {
    "It's Doomed; We Can Prove It":                       { tag: 'doomed09',   note: LPAR_NOTE },
    'Doomed Program Points':                              { tag: 'doomed10',   note: LPAR_NOTE },
    'Infeasible Code Detection':                          { tag: 'infeasible', note: LPAR_NOTE },
    'Error Invariants':                                   { tag: 'errinv',     note: LPAR_NOTE },
    'Explaining Inconsistent Code':                       { tag: 'explaining', note: LPAR_NOTE },
    'Bixie: Finding and Understanding Inconsistent Code': { tag: 'bixie',      note: LPAR_NOTE },
    'Finding Inconsistencies in Programs with Loops':     { tag: 'lpar15',     note: '🌴 Accepted at LPAR 2015 in Suva, Fiji.' },
    'Gamifying Program Analysis':                         { tag: 'gamify',     note: '🌴 Also at LPAR 2015 in Fiji. A game about formal methods. Imagine that.' },
};

// Secret spots (collision JSON `spots` with "secret": true), by spot id
export const SECRETS = ['secret_gameboy', 'secret_review', 'secret_chip', 'secret_tab', 'secret_coffee'];
