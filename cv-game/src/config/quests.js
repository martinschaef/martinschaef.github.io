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
];

// Secret spots (collision JSON `spots` with "secret": true), by spot id
export const SECRETS = ['secret_gameboy', 'secret_review', 'secret_chip', 'secret_tab', 'secret_coffee'];
