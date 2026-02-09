// ── UI Labels — Human-readable descriptions for all game concepts ──

export interface UILabel {
  icon: string;
  label: string;
  shortDesc: string;
  longDesc: string;
}

// ── City Services ──────────────────────────────────────
export const SERVICE_LABELS: Record<string, UILabel> = {
  bank: {
    icon: '🏦',
    label: 'Bank',
    shortDesc: 'Deposit & withdraw cash',
    longDesc: 'Earn 0.8% interest per travel day. Deposits are safe from cops and can\'t be stolen.',
  },
  shark: {
    icon: '🦈',
    label: 'Loan Shark',
    shortDesc: 'Borrow or repay debt',
    longDesc: 'Borrow cash at 4% daily interest. Debt compounds every time you travel. Pay it off fast!',
  },
  gangHQ: {
    icon: '🏴',
    label: 'Gang Turf',
    shortDesc: 'Gang-controlled territory',
    longDesc: 'Trade here to build relations with the local gang. High relations unlock perks, loans, and consignment deals.',
  },
  territory: {
    icon: '🏴',
    label: 'Your Territory',
    shortDesc: 'You control this area',
    longDesc: 'Earn daily tribute income. Stash drugs here for safekeeping. Other gangs may try to raid your territory.',
  },
  stash: {
    icon: '📦',
    label: 'Stash House',
    shortDesc: 'Store drugs safely',
    longDesc: 'Stash up to 50 units at your territory. Safe from cops and customs. Retrieve anytime you visit.',
  },
};

// ── Player Stats ───────────────────────────────────────
export const STAT_LABELS: Record<string, UILabel> = {
  cash: {
    icon: '💵',
    label: 'Cash',
    shortDesc: 'Money on hand',
    longDesc: 'Cash you\'re carrying. Used to buy drugs, pay bribes, and travel. Can be lost to cops if caught.',
  },
  debt: {
    icon: '🦈',
    label: 'Debt',
    shortDesc: 'Owed to the loan shark',
    longDesc: 'Compounds 4% every travel day. Pay it off at any bank location. Must be debt-free to win Level 1.',
  },
  bank: {
    icon: '🏦',
    label: 'Bank',
    shortDesc: 'Savings earning interest',
    longDesc: 'Earns 0.8% per travel day. Safe from cops. Deposit at any capital city with a bank.',
  },
  space: {
    icon: '🎒',
    label: 'Space',
    shortDesc: 'Inventory capacity',
    longDesc: 'How many drug units you can carry. Increased by buying coats. Decreased by losing fingers (-5 per finger).',
  },
  heat: {
    icon: '🔥',
    label: 'Heat',
    shortDesc: 'Police attention level',
    longDesc: 'Rises from trading and fighting. Higher heat = more cop encounters (up to 65%). Decays when traveling. Bribes reduce heat.',
  },
  hp: {
    icon: '❤️',
    label: 'HP',
    shortDesc: 'Health points',
    longDesc: 'Lost when fighting cops or getting mugged. At 0 HP, game over. Recovers slowly each day.',
  },
  rep: {
    icon: '⭐',
    label: 'Reputation',
    shortDesc: 'Street cred',
    longDesc: 'Earned by profitable trades. Unlocks ranks, international travel, and gang features. Trade streaks boost rep gain.',
  },
  gun: {
    icon: '🔫',
    label: 'Armed',
    shortDesc: 'You have a weapon',
    longDesc: 'Improves fight and run chances vs cops. Lost if fingers drop to 4 or below. Can be purchased from random encounters.',
  },
  rat: {
    icon: '🐀',
    label: 'Informant',
    shortDesc: 'Intel source on the street',
    longDesc: 'Gives price tips and market predictions. Pay to keep loyalty up — low loyalty and they flip on you to the cops.',
  },
  territories: {
    icon: '🏴',
    label: 'Territories',
    shortDesc: 'Areas you control',
    longDesc: 'Each territory earns daily tribute. Buy territories on gang turf when you have enough rep. Stash drugs at your territory.',
  },
  fingers: {
    icon: '✋',
    label: 'Fingers',
    shortDesc: 'Physical condition',
    longDesc: 'Start with 10. Lose them from failed consignment payments. Each lost finger: -5 space, -3% sell price. At 6: +1 travel day. At 4: lose gun. At 0: game over.',
  },
  streak: {
    icon: '🔥',
    label: 'Streak',
    shortDesc: 'Consecutive profitable trades',
    longDesc: 'Chain profitable sells for bonus rep. Higher streaks give bigger multipliers. Resets on a loss or travel without selling.',
  },
};

// ── Region Traits ──────────────────────────────────────
export const REGION_LABELS: Record<string, UILabel> = {
  nyc: {
    icon: '🗽',
    label: 'New York',
    shortDesc: 'Home base, all drugs available',
    longDesc: 'Starting region. No flight cost to return. Standard prices. NYPD is aggressive but can be bribed.',
  },
  colombia: {
    icon: '🇨🇴',
    label: 'Colombia',
    shortDesc: 'Cheap cocaine & opioids',
    longDesc: 'Cocaine at 45% discount. Corrupt police (cheap bribes). High customs risk (30%). Medellin Cartel territory.',
  },
  netherlands: {
    icon: '🇳🇱',
    label: 'Netherlands',
    shortDesc: 'Cheap ecstasy, weed & acid',
    longDesc: 'Ecstasy & acid at 45% discount, weed at 50% off. Methodical police (expensive bribes but rare encounters). The Penose run things.',
  },
  thailand: {
    icon: '🇹🇭',
    label: 'Thailand',
    shortDesc: 'Cheap heroin & speed',
    longDesc: 'Heroin at 50% discount, speed at 55% off. Corrupt police (cheap bribes). Very high customs (40%). Jao Pho territory.',
  },
  france: {
    icon: '🇫🇷',
    label: 'France',
    shortDesc: 'Cheap heroin & Ozempic',
    longDesc: 'Heroin at 45% discount. Methodical Gendarmerie (tough, organized). High customs (40%). Corsican gang territory.',
  },
};

// ── Gang Relations ─────────────────────────────────────
export const RELATION_LABELS: Record<string, UILabel> = {
  hostile: {
    icon: '💀',
    label: 'Hostile',
    shortDesc: 'They want you dead',
    longDesc: 'Below -5 relations. Gang members may attack you on sight. Increase relations by trading on their turf.',
  },
  neutral: {
    icon: '😐',
    label: 'Neutral',
    shortDesc: 'They tolerate you',
    longDesc: 'Between -5 and +5 relations. No perks or penalties. Trade on their turf to improve relations.',
  },
  friendly: {
    icon: '🤝',
    label: 'Friendly',
    shortDesc: '10% off consignment',
    longDesc: 'At +5 relations. Consignment deals are 10% cheaper. Keep trading on their turf to build trust.',
  },
  trusted: {
    icon: '💪',
    label: 'Trusted',
    shortDesc: '-5% cop encounters, +$3K loan cap',
    longDesc: 'At +15 relations. Fewer cop encounters near their turf. Higher loan limits from the gang.',
  },
  bloodBrother: {
    icon: '🩸',
    label: 'Blood Brother',
    shortDesc: 'No mugging, +10% sell price',
    longDesc: 'At +25 relations. Maximum trust. No mugging on their turf. +10% sell price on their territory.',
  },
};

// ── Event Types ────────────────────────────────────────
export const EVENT_TYPE_LABELS: Record<string, UILabel> = {
  spike: {
    icon: '📈',
    label: 'Price Spike',
    shortDesc: 'Prices surging',
    longDesc: 'A market event has caused prices to spike up to 3.5x normal. Good time to sell if you\'re holding.',
  },
  crash: {
    icon: '📉',
    label: 'Price Crash',
    shortDesc: 'Prices plummeting',
    longDesc: 'A market event has crashed prices to as low as 30% of normal. Great buying opportunity!',
  },
  danger: {
    icon: '⚠️',
    label: 'Danger',
    shortDesc: 'Something bad happened',
    longDesc: 'A dangerous event occurred — mugging, cop encounter, or gang confrontation.',
  },
  info: {
    icon: 'ℹ️',
    label: 'Info',
    shortDesc: 'General update',
    longDesc: 'A general game event or status update.',
  },
  tip: {
    icon: '🐀',
    label: 'Intel Tip',
    shortDesc: 'Your informant has intel',
    longDesc: 'Your rat has a tip about upcoming market movements. Higher intel = more accurate predictions.',
  },
  customs: {
    icon: '🛃',
    label: 'Customs',
    shortDesc: 'Border checkpoint event',
    longDesc: 'Customs inspection while traveling internationally. Risk depends on destination strictness, cargo amount, and heat.',
  },
  consignment: {
    icon: '📦',
    label: 'Consignment',
    shortDesc: 'Gang drug loan event',
    longDesc: 'Related to your consignment deal — payment due, bounty hunter sent, or settlement.',
  },
  gangLoan: {
    icon: '💰',
    label: 'Gang Loan',
    shortDesc: 'Gang money loan event',
    longDesc: 'Related to your gang loan — interest accrued, collector sent, or repayment.',
  },
  mission: {
    icon: '🎖️',
    label: 'Mission',
    shortDesc: 'Gang mission update',
    longDesc: 'Progress or completion of a gang mission assignment.',
  },
  gangWar: {
    icon: '⚔️',
    label: 'Gang War',
    shortDesc: 'War-related event',
    longDesc: 'Battle result, territory change, or war status update.',
  },
  levelUp: {
    icon: '🎉',
    label: 'Level Up',
    shortDesc: 'Milestone or rank achieved',
    longDesc: 'You\'ve reached a new rank or completed a campaign level objective.',
  },
};

// ── Drug Tiers ─────────────────────────────────────────
export const DRUG_TIER_LABELS: Record<number, string> = {
  1: 'Common — Low value, easy to move',
  2: 'Uncommon — Moderate value',
  3: 'Premium — High value, high risk',
  4: 'Rare — Very high value, limited supply',
};

// ── Campaign Objective Labels ──────────────────────────
export const CAMPAIGN_OBJECTIVES: Record<number, Array<{ key: string; label: string; check: string }>> = {
  1: [
    { key: 'nw', label: '$50K Net Worth', check: 'netWorth >= 50000' },
    { key: 'debt', label: 'Debt Free', check: 'debt <= 0' },
  ],
  2: [
    { key: 'nw', label: '$250K Net Worth', check: 'netWorth >= 250000' },
    { key: 'blood', label: 'Blood Brother', check: 'any gangRelation >= 25' },
    { key: 'terr', label: '2 Territories', check: 'territories >= 2' },
  ],
  3: [
    { key: 'rank', label: 'Drug Lord Rank', check: 'rep >= 250' },
    { key: 'terr', label: '5 Territories', check: 'territories >= 5' },
    { key: 'wars', label: '2 Gangs Defeated', check: 'defeatedGangs >= 2' },
  ],
};

// ── Cop Action Labels ──────────────────────────────────
export const COP_ACTION_LABELS = {
  run: {
    label: 'Run',
    successDesc: 'You escape and keep everything.',
    failDesc: 'Caught! Lose all drugs and pay a fine.',
  },
  fight: {
    label: 'Fight',
    successDesc: 'You win! Take some loot and reduce heat.',
    failDesc: 'You lose! Take damage, may lose drugs.',
  },
  bribe: {
    label: 'Bribe',
    successDesc: 'They look the other way. Heat reduced.',
    failDesc: 'N/A — bribes always work if you can afford them.',
  },
};
