/**
 * Rupee settlement — net everyone down to the fewest transfers.
 *
 * Greedy largest-creditor / largest-debtor matching, which is optimal in
 * transfer count for the small groups this app handles.
 */

export interface Balance {
  playerId: string;
  /** Positive = owed money, negative = owes money. */
  amount: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export function settle(balances: Balance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.amount > 0.0001)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = balances
    .filter((b) => b.amount < -0.0001)
    .map((b) => ({ ...b, amount: -b.amount }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);

    if (amount > 0.0001) {
      transfers.push({
        from: d.playerId,
        to: c.playerId,
        amount: Number(amount.toFixed(2)),
      });
    }

    c.amount -= amount;
    d.amount -= amount;
    if (c.amount <= 0.0001) ci++;
    if (d.amount <= 0.0001) di++;
  }

  return transfers;
}

/** Plain-text settlement sheet, exportable and pasteable. */
export function settlementText(
  transfers: Transfer[],
  nameOf: (id: string) => string,
  currency = 'Rs',
): string {
  if (transfers.length === 0) return 'All square — nothing to settle.';
  return transfers
    .map((t) => `${nameOf(t.from)} pays ${nameOf(t.to)} ${currency} ${t.amount.toFixed(0)}`)
    .join('\n');
}
