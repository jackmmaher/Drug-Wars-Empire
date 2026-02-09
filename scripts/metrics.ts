/**
 * Simulation metrics collection and reporting.
 */

export interface DaySnapshot {
  day: number;
  level: number;
  cash: number;
  bank: number;
  debt: number;
  netWorth: number;
  heat: number;
  rep: number;
  territories: number;
  trades: number;
}

export interface RunResult {
  seed: number;
  strategy: string;
  mode: 'campaign' | 'classic';
  finalNetWorth: number;
  finalCash: number;
  finalBank: number;
  finalDebt: number;
  finalRep: number;
  finalTerritories: number;
  totalTrades: number;
  daysPlayed: number;
  won: boolean;
  l1Won: boolean;
  l2Won: boolean;
  l3Won: boolean;
  campaignWon: boolean;
  diedEarly: boolean;
  daySnapshots: DaySnapshot[];
  profitSources: {
    trading: number;
    bankInterest: number;
    territory: number;
    consignment: number;
  };
}

export class MetricsCollector {
  runs: RunResult[] = [];

  addRun(run: RunResult) {
    this.runs.push(run);
  }

  private median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  private pct(count: number, total: number): string {
    if (total === 0) return '0.0%';
    return (count / total * 100).toFixed(1) + '%';
  }

  private $(n: number): string {
    if (n < 0) return `-${this.$(-n)}`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e4) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${Math.round(n).toLocaleString()}`;
  }

  /** Get net worth at a specific level+day across all runs */
  private getNetWorthsAtDay(level: number, day: number): number[] {
    return this.runs
      .map(r => {
        const snap = r.daySnapshots.find(s => s.level === level && s.day === day);
        return snap?.netWorth;
      })
      .filter((v): v is number => v !== undefined);
  }

  generateReport(): string {
    const n = this.runs.length;
    if (n === 0) return 'No runs to report.';

    const strategy = this.runs[0].strategy;
    const mode = this.runs[0].mode;
    const lines: string[] = [];

    lines.push('=== SIMULATION REPORT ===');
    lines.push(`Strategy: ${strategy} | Mode: ${mode} | N=${n}`);
    lines.push('');

    // Win rates
    if (mode === 'campaign') {
      const l1Wins = this.runs.filter(r => r.l1Won).length;
      const l2Wins = this.runs.filter(r => r.l2Won).length;
      const l3Wins = this.runs.filter(r => r.l3Won).length;
      const campWins = this.runs.filter(r => r.campaignWon).length;
      lines.push('--- Win Rates ---');
      lines.push(`L1 win: ${this.pct(l1Wins, n)}  |  L2 win: ${this.pct(l2Wins, n)}  |  L3 win: ${this.pct(l3Wins, n)}  |  Full campaign: ${this.pct(campWins, n)}`);
    } else {
      const wins = this.runs.filter(r => r.won).length;
      lines.push('--- Win Rates ---');
      lines.push(`Win: ${this.pct(wins, n)}`);
    }
    lines.push('');

    // Net worth curves
    lines.push('--- Net Worth Curve (median) ---');
    if (mode === 'campaign') {
      for (const level of [1, 2, 3]) {
        const d10 = this.getNetWorthsAtDay(level, 10);
        const d20 = this.getNetWorthsAtDay(level, 20);
        const d30 = this.getNetWorthsAtDay(level, 30);
        if (d10.length > 0 || d20.length > 0 || d30.length > 0) {
          lines.push(`L${level} Day 10: ${this.$(this.median(d10))}  |  Day 20: ${this.$(this.median(d20))}  |  Day 30: ${this.$(this.median(d30))}`);
        }
      }
    } else {
      const d10 = this.getNetWorthsAtDay(1, 10);
      const d20 = this.getNetWorthsAtDay(1, 20);
      const d30 = this.getNetWorthsAtDay(1, 30);
      lines.push(`Day 10: ${this.$(this.median(d10))}  |  Day 20: ${this.$(this.median(d20))}  |  Day 30: ${this.$(this.median(d30))}`);
    }
    lines.push('');

    // Profit source breakdown
    const totalTrading = this.runs.reduce((s, r) => s + r.profitSources.trading, 0);
    const totalBank = this.runs.reduce((s, r) => s + r.profitSources.bankInterest, 0);
    const totalTerritory = this.runs.reduce((s, r) => s + r.profitSources.territory, 0);
    const totalConsignment = this.runs.reduce((s, r) => s + r.profitSources.consignment, 0);
    const totalIncome = totalTrading + totalBank + totalTerritory + totalConsignment;
    lines.push('--- Profit Source Breakdown ---');
    if (totalIncome > 0) {
      lines.push(`Trading: ${this.pct(totalTrading, totalIncome)}  |  Bank interest: ${this.pct(totalBank, totalIncome)}  |  Territory: ${this.pct(totalTerritory, totalIncome)}  |  Consignment: ${this.pct(totalConsignment, totalIncome)}`);
    } else {
      lines.push('No income data.');
    }
    lines.push('');

    // Final stats
    const finalNWs = this.runs.map(r => r.finalNetWorth);
    const finalTrades = this.runs.map(r => r.totalTrades);
    lines.push('--- Final Stats (median) ---');
    lines.push(`Net Worth: ${this.$(this.median(finalNWs))}  |  Trades: ${Math.round(this.median(finalTrades))}`);
    lines.push(`P10 NW: ${this.$(this.percentile(finalNWs, 10))}  |  P90 NW: ${this.$(this.percentile(finalNWs, 90))}`);
    lines.push('');

    // Economy flags
    lines.push('--- Economy Flags ---');
    if (mode === 'campaign') {
      const l2d20nw = this.getNetWorthsAtDay(2, 20);
      const over1M = l2d20nw.filter(v => v > 1_000_000).length;
      if (l2d20nw.length > 0) {
        lines.push(`[${over1M / l2d20nw.length > 0.5 ? '!' : 'ok'}] ${this.pct(over1M, l2d20nw.length)} of runs exceed $1M by L2 Day 20`);
      }
    }
    if (totalIncome > 0) {
      const bankPct = totalBank / totalIncome;
      lines.push(`[${bankPct > 0.2 ? '!' : 'ok'}] Bank interest = ${(bankPct * 100).toFixed(1)}% of total income`);
    }
    const medianTradeProfit = this.median(this.runs.map(r => r.totalTrades > 0 ? r.profitSources.trading / r.totalTrades : 0));
    lines.push(`[info] Median profit per trade: ${this.$(medianTradeProfit)}`);

    const deaths = this.runs.filter(r => r.diedEarly).length;
    lines.push(`[info] Early deaths: ${this.pct(deaths, n)}`);

    return lines.join('\n');
  }
}
