export const TickPhase = {
  Start: "Start",
  Economy: "Economy",
  Market: "Market",
  End: "End",
} as const;

export type TickPhase = (typeof TickPhase)[keyof typeof TickPhase];

export const tickOrder: TickPhase[] = [
  TickPhase.Start,
  TickPhase.Economy,
  TickPhase.Market,
  TickPhase.End,
];

export function testTickOrder(): boolean {
  return (
    tickOrder.length === 4 &&
    tickOrder[0] === TickPhase.Start &&
    tickOrder[tickOrder.length - 1] === TickPhase.End
  );
}
