// src/ui/components/TutorialModal.tsx
import * as React from "react";
import Modal from "./Modal";
import Button from "./Button";

const STEPS = [
  {
    title: "Welcome to SimulateBG",
    points: [
      "You run a holding company and grow your net worth over time.",
      "Use the bottom navigation to move between each section.",
    ],
  },
  {
    title: "Overview and KPIs",
    points: [
      "Overview shows your cash, debt, equity, and total companies.",
      "Use KPIs to track weekly progress and spot trends.",
    ],
  },
  {
    title: "Companies and Decisions",
    points: [
      "Buy or build companies and monitor their performance.",
      "Decisions are weekly levers that shape growth and risk.",
    ],
  },
  {
    title: "Market, Finance, Social, Profile",
    points: [
      "Market shows signals that impact pricing and demand.",
      "Finance is where you manage loans and liquidity.",
      "Social compares progress with other players; Profile is your identity.",
    ],
  },
];

type Props = {
  open: boolean;
  onComplete: () => void;
};

export default function TutorialModal({ open, onComplete }: Props) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const current = STEPS[step] ?? STEPS[0];
  const isLast = step >= STEPS.length - 1;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onComplete();
      }}
      title={current.title}
      description={`Step ${step + 1} of ${STEPS.length}`}
      size="lg"
      closeOnOverlayClick={false}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onComplete}>
            Don't show again
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (isLast) onComplete();
                else setStep((s) => Math.min(STEPS.length - 1, s + 1));
              }}
            >
              {isLast ? "Start playing" : "Next"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-[var(--text-muted)]">
        <ul className="list-disc pl-5 space-y-2">
          {current.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
