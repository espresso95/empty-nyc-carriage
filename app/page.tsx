"use client";

import { useState } from "react";

const zones = ["rear", "rear-middle", "middle", "front-middle", "front"] as const;

type Zone = (typeof zones)[number];
type Step = "setup" | "trains" | "recommendation" | "feedback";

const recommendation = {
  station: "Bedford Av",
  route: "L",
  direction: "Manhattan-bound",
  destination: "14 St-Union Sq",
  train: {
    label: "L train",
    arrivesIn: 3,
    followingGap: 7,
    tripId: "fixture-l-bedford-001",
  },
  recommendedZone: "rear-middle" as Zone,
  confidence: "medium",
  scores: {
    rear: 0.44,
    "rear-middle": 0.38,
    middle: 0.61,
    "front-middle": 0.74,
    front: 0.82,
  } satisfies Record<Zone, number>,
  why: [
    "Main entrances are weighted toward the front of the platform.",
    "This train is following a longer-than-usual gap.",
    "This hour is above normal demand for the station.",
  ],
};

const trains = [
  {
    id: recommendation.train.tripId,
    label: "L train",
    direction: recommendation.direction,
    arrivesIn: 3,
    followingGap: 7,
    estimate: "medium-high",
  },
  {
    id: "fixture-l-bedford-002",
    label: "L train",
    direction: recommendation.direction,
    arrivesIn: 8,
    followingGap: 5,
    estimate: "medium",
  },
];

export default function Home() {
  const [step, setStep] = useState<Step>("setup");
  const [boardedZone, setBoardedZone] = useState<Zone | null>(null);
  const [crowding, setCrowding] = useState<number | null>(null);

  return (
    <main className="min-h-screen overflow-hidden px-4 py-5 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.34em] text-[var(--signal-dark)]">
              Zero-label heuristic v1
            </p>
            <h1 className="mt-2 font-serif text-3xl tracking-[-0.04em] text-[var(--ink)] sm:text-5xl">
              Empty NYC Carriage
            </h1>
          </div>
          <div className="hidden rounded-full border border-[rgb(25_23_20_/_18%)] bg-[rgb(255_248_234_/_72%)] px-4 py-2 text-sm font-bold text-[var(--blue)] shadow-sm backdrop-blur sm:block">
            Estimated less crowded zone
          </div>
        </header>

        <section className="grid flex-1 gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
          <HeroPanel />

          <section className="relative rounded-[2rem] border border-[rgb(25_23_20_/_12%)] bg-[rgb(255_248_234_/_82%)] p-4 shadow-[var(--shadow)] backdrop-blur md:p-6">
            <Progress step={step} />

            {step === "setup" && <SetupStep onNext={() => setStep("trains")} />}
            {step === "trains" && (
              <TrainsStep
                onBack={() => setStep("setup")}
                onSelect={() => setStep("recommendation")}
              />
            )}
            {step === "recommendation" && (
              <RecommendationStep
                onBack={() => setStep("trains")}
                onBoarded={() => setStep("feedback")}
              />
            )}
            {step === "feedback" && (
              <FeedbackStep
                boardedZone={boardedZone}
                crowding={crowding}
                onBoardedZone={setBoardedZone}
                onCrowding={setCrowding}
                onBack={() => setStep("recommendation")}
              />
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function HeroPanel() {
  return (
    <aside className="relative min-h-[26rem] overflow-hidden rounded-[2rem] bg-[var(--rail)] p-6 text-[var(--paper)] shadow-[var(--shadow)] md:p-8">
      <div className="absolute inset-x-0 top-14 h-16 rotate-[-7deg] bg-[repeating-linear-gradient(90deg,transparent_0_20px,rgb(255_248_234_/_14%)_20px_24px)]" />
      <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-[var(--signal)] opacity-90 blur-sm" />
      <div className="absolute bottom-14 left-6 right-6 h-2 rounded-full bg-[rgb(244_234_216_/_22%)]" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-12">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[var(--mint)]">
            Bedford Av fixture
          </p>
          <h2 className="mt-5 max-w-md font-serif text-5xl leading-[0.9] tracking-[-0.06em] md:text-7xl">
            Stand where the crowd is less likely to gather.
          </h2>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <Metric label="Station" value={recommendation.station} />
          <Metric label="Route" value={recommendation.route} />
          <Metric label="Mode" value="Fixture" />
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[rgb(244_234_216_/_18%)] bg-[rgb(244_234_216_/_8%)] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[rgb(244_234_216_/_58%)]">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  const steps: Step[] = ["setup", "trains", "recommendation", "feedback"];
  const activeIndex = steps.indexOf(step);

  return (
    <div className="mb-6 grid grid-cols-4 gap-2">
      {steps.map((item, index) => (
        <div
          key={item}
          className={`h-2 rounded-full transition-colors ${
            index <= activeIndex ? "bg-[var(--signal)]" : "bg-[rgb(25_23_20_/_12%)]"
          }`}
        />
      ))}
    </div>
  );
}

function SetupStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="animate-[rise_420ms_ease-out]">
      <SectionLabel>Trip setup</SectionLabel>
      <h2 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">
        Start with the station you are boarding from.
      </h2>
      <div className="mt-8 grid gap-4">
        <ReadOnlyField label="Station" value={recommendation.station} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Route" value={`${recommendation.route} train`} />
          <ReadOnlyField label="Direction" value={recommendation.direction} />
        </div>
        <ReadOnlyField label="Optional destination" value={recommendation.destination} />
      </div>
      <button className="mt-8 w-full rounded-2xl bg-[var(--ink)] px-5 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[var(--signal-dark)]" onClick={onNext}>
        Find best platform zone
      </button>
    </div>
  );
}

function TrainsStep({ onBack, onSelect }: { onBack: () => void; onSelect: () => void }) {
  return (
    <div className="animate-[rise_420ms_ease-out]">
      <SectionLabel>Upcoming trains</SectionLabel>
      <h2 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">
        Pick the train you are likely to board.
      </h2>
      <div className="mt-7 grid gap-3">
        {trains.map((train, index) => (
          <button
            key={train.id}
            className="group rounded-3xl border border-[rgb(25_23_20_/_12%)] bg-white/55 p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--signal)] hover:bg-white"
            onClick={onSelect}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-black">{train.label} -&gt; {train.direction}</p>
                <p className="mt-2 text-sm font-bold text-[var(--muted)]">
                  Following gap: {train.followingGap} min / Crowding estimate: {train.estimate}
                </p>
              </div>
              <div className="rounded-full bg-[var(--line-l)] px-4 py-2 text-sm font-black text-white">
                {train.arrivesIn} min
              </div>
            </div>
            {index === 0 && (
              <p className="mt-4 text-sm font-black text-[var(--signal-dark)]">
                Recommended zone preview: {recommendation.recommendedZone}
              </p>
            )}
          </button>
        ))}
      </div>
      <BackButton onClick={onBack} />
    </div>
  );
}

function RecommendationStep({
  onBack,
  onBoarded,
}: {
  onBack: () => void;
  onBoarded: () => void;
}) {
  const sortedZones = [...zones].sort(
    (a, b) => recommendation.scores[a] - recommendation.scores[b],
  );

  return (
    <div className="animate-[rise_420ms_ease-out]">
      <SectionLabel>Recommendation</SectionLabel>
      <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-serif text-4xl tracking-[-0.05em] sm:text-5xl">
            Stand {recommendation.recommendedZone}.
          </h2>
          <p className="mt-3 font-bold text-[var(--muted)]">
            Confidence: {recommendation.confidence}
          </p>
        </div>
        <div className="rounded-full bg-[var(--mint)] px-4 py-2 text-sm font-black text-[var(--ink)]">
          {recommendation.train.arrivesIn} min away
        </div>
      </div>

      <TrainDiagram />

      <div className="mt-7 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl bg-white/60 p-5">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--signal-dark)]">
            Why
          </h3>
          <ul className="mt-4 space-y-3">
            {recommendation.why.map((reason) => (
              <li key={reason} className="flex gap-3 text-sm font-bold text-[var(--muted)]">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--signal)]" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-[var(--ink)] p-5 text-white">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--mint)]">
            Score order
          </h3>
          <div className="mt-4 space-y-3">
            {sortedZones.map((zone) => (
              <div key={zone}>
                <div className="flex justify-between text-sm font-black">
                  <span>{zone}</span>
                  <span>{recommendation.scores[zone].toFixed(2)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/15">
                  <div
                    className="h-2 rounded-full bg-[var(--signal)]"
                    style={{ width: `${recommendation.scores[zone] * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <BackButton onClick={onBack} />
        <button className="rounded-2xl bg-[var(--signal)] px-5 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[var(--signal-dark)]" onClick={onBoarded}>
          I boarded
        </button>
      </div>
    </div>
  );
}

function TrainDiagram() {
  return (
    <div className="mt-8 rounded-[2rem] border border-[rgb(25_23_20_/_12%)] bg-white/55 p-4">
      <div className="mb-3 flex justify-between text-xs font-black uppercase tracking-[0.24em] text-[var(--muted)]">
        <span>Rear</span>
        <span>Front</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {zones.map((zone) => {
          const selected = zone === recommendation.recommendedZone;
          return (
            <div
              key={zone}
              className={`relative min-h-24 rounded-2xl border p-3 text-center text-xs font-black transition ${
                selected
                  ? "border-[var(--signal)] bg-[var(--signal)] text-white"
                  : "border-[rgb(25_23_20_/_10%)] bg-[var(--paper)] text-[var(--muted)]"
              }`}
            >
              <div className="absolute left-1/2 top-2 h-2 w-8 -translate-x-1/2 rounded-full bg-current opacity-35" />
              <div className="flex h-full items-center justify-center">{zone}</div>
              {selected && <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-2xl text-[var(--signal)]">^</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeedbackStep({
  boardedZone,
  crowding,
  onBoardedZone,
  onCrowding,
  onBack,
}: {
  boardedZone: Zone | null;
  crowding: number | null;
  onBoardedZone: (zone: Zone) => void;
  onCrowding: (rating: number) => void;
  onBack: () => void;
}) {
  const complete = boardedZone && crowding;

  return (
    <div className="animate-[rise_420ms_ease-out]">
      <SectionLabel>Feedback</SectionLabel>
      <h2 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">
        Log the ride in under 10 seconds.
      </h2>

      <div className="mt-7">
        <h3 className="font-black">Which zone did you board?</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {zones.map((zone) => (
            <ChoiceButton
              key={zone}
              selected={boardedZone === zone}
              onClick={() => onBoardedZone(zone)}
            >
              {zone}
            </ChoiceButton>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <h3 className="font-black">How crowded was it?</h3>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <ChoiceButton
              key={rating}
              selected={crowding === rating}
              onClick={() => onCrowding(rating)}
            >
              {rating}
            </ChoiceButton>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs font-bold text-[var(--muted)]">
          <span>empty</span>
          <span>could not board</span>
        </div>
      </div>

      <div className="mt-8 rounded-3xl bg-white/60 p-5">
        <p className="font-black">
          {complete ? "Observation ready for storage in Phase 2." : "Static fixture only for Phase 0."}
        </p>
        <p className="mt-2 text-sm font-bold text-[var(--muted)]">
          Phase 0 proves the flow. Phase 2 will persist this against a prediction request.
        </p>
      </div>

      <BackButton onClick={onBack} />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted)]">
        {label}
      </span>
      <div className="mt-2 rounded-2xl border border-[rgb(25_23_20_/_12%)] bg-white/55 px-4 py-4 text-lg font-black">
        {value}
      </div>
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--signal-dark)]">
      {children}
    </p>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="mt-5 rounded-2xl border border-[rgb(25_23_20_/_14%)] px-5 py-4 text-base font-black text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-white/70"
      onClick={onClick}
    >
      Back
    </button>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`rounded-2xl px-3 py-3 text-sm font-black transition hover:-translate-y-0.5 ${
        selected
          ? "bg-[var(--ink)] text-white"
          : "border border-[rgb(25_23_20_/_12%)] bg-white/55 text-[var(--ink)]"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
