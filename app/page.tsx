"use client";

import { useState, useTransition } from "react";
import { createObservationAction, createPredictionAction, loadDashboardAction } from "@/app/actions";
import type { DashboardSummary } from "@/src/lib/dashboard/summary";
import { bedfordRecommendation, bedfordTrains } from "@/src/lib/fixtures/bedford";
import type { MlReadinessSummary } from "@/src/lib/ml/readiness";
import { PLATFORM_DISPLAY_ZONES, type Zone } from "@/src/lib/prediction/scorer";

const zones = PLATFORM_DISPLAY_ZONES;
type Step = "setup" | "trains" | "recommendation" | "feedback" | "dashboard";
type PersistenceState = {
  status: "idle" | "saving" | "persisted" | "unavailable" | "error";
  message: string;
  id?: string;
};
type DashboardState = {
  status: "idle" | "loading" | "loaded" | "unavailable" | "error";
  message: string;
  summary?: DashboardSummary;
  mlReadiness?: MlReadinessSummary;
};
const recommendation = bedfordRecommendation;
const trains = bedfordTrains;

export default function Home() {
  const [step, setStep] = useState<Step>("setup");
  const [boardedZone, setBoardedZone] = useState<Zone | null>(null);
  const [crowding, setCrowding] = useState<number | null>(null);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [predictionPersistence, setPredictionPersistence] = useState<PersistenceState>({
    status: "idle",
    message: "Prediction has not been stored yet.",
  });
  const [observationPersistence, setObservationPersistence] = useState<PersistenceState>({
    status: "idle",
    message: "Feedback has not been stored yet.",
  });
  const [dashboard, setDashboard] = useState<DashboardState>({
    status: "idle",
    message: "Dashboard has not been loaded yet.",
  });
  const [isPending, startTransition] = useTransition();

  function handleTrainSelect() {
    setStep("recommendation");
    setPredictionPersistence({
      status: "saving",
      message: "Storing prediction request...",
    });

    startTransition(async () => {
      const result = await createPredictionAction();

      if (result.ok) {
        setPredictionId(result.id);
        setPredictionPersistence({
          status: "persisted",
          message: "Prediction request stored.",
          id: result.id,
        });
      } else {
        setPredictionPersistence({
          status: "unavailable",
          message: result.error,
        });
      }
    });
  }

  function handleSaveObservation() {
    if (!boardedZone || !crowding) {
      return;
    }

    setObservationPersistence({
      status: "saving",
      message: "Storing feedback...",
    });

    startTransition(async () => {
      const result = await createObservationAction({
        predictionRequestId: predictionId,
        boardedZone,
        crowdingRating: crowding,
        seatAvailable: crowding <= 2,
        betterZoneObserved: null,
      });

      if (result.ok) {
        setObservationPersistence({
          status: "persisted",
          message: "Feedback observation stored.",
          id: result.id,
        });
      } else {
        setObservationPersistence({
          status: "unavailable",
          message: result.error,
        });
      }
    });
  }

  function handleLoadDashboard() {
    setStep("dashboard");
    setDashboard({
      status: "loading",
      message: "Loading your dashboard...",
    });

    startTransition(async () => {
      const result = await loadDashboardAction();

      if (result.ok) {
        setDashboard({
          status: "loaded",
          message:
            result.summary.observationCount > 0
              ? "Dashboard loaded from your saved observations."
              : "No saved observations yet.",
          summary: result.summary,
          mlReadiness: result.mlReadiness,
        });
      } else {
        setDashboard({
          status: "unavailable",
          message: result.error,
        });
      }
    });
  }

  return (
    <main className="min-h-screen overflow-hidden px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col">
        <header className="flex flex-col justify-between gap-4 py-3 sm:flex-row sm:items-center sm:py-4">
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
                onSelect={handleTrainSelect}
              />
            )}
            {step === "recommendation" && (
              <RecommendationStep
                persistence={predictionPersistence}
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
                onSave={handleSaveObservation}
                persistence={observationPersistence}
                saving={isPending && observationPersistence.status === "saving"}
                onDashboard={handleLoadDashboard}
              />
            )}
            {step === "dashboard" && (
              <DashboardStep
                dashboard={dashboard}
                onBack={() => setStep("feedback")}
                onRefresh={handleLoadDashboard}
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
  const steps: Step[] = ["setup", "trains", "recommendation", "feedback", "dashboard"];
  const activeIndex = steps.indexOf(step);

  return (
    <div className="mb-6 grid grid-cols-5 gap-2">
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
  persistence,
  onBack,
  onBoarded,
}: {
  persistence: PersistenceState;
  onBack: () => void;
  onBoarded: () => void;
}) {
  const sortedZones = [...zones].sort(
    (a, b) => recommendation.scores[a] - recommendation.scores[b],
  );
  const maxScore = Math.max(...zones.map((zone) => recommendation.scores[zone]));

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
      <PersistenceNotice state={persistence} />

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
                    style={{ width: `${(recommendation.scores[zone] / maxScore) * 100}%` }}
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
  onSave,
  onDashboard,
  persistence,
  saving,
}: {
  boardedZone: Zone | null;
  crowding: number | null;
  onBoardedZone: (zone: Zone) => void;
  onCrowding: (rating: number) => void;
  onBack: () => void;
  onSave: () => void;
  onDashboard: () => void;
  persistence: PersistenceState;
  saving: boolean;
}) {
  const complete = Boolean(boardedZone && crowding);

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
          {complete ? "Observation ready to store." : "Choose a zone and rating to store feedback."}
        </p>
        <p className="mt-2 text-sm font-bold text-[var(--muted)]">
          Feedback is stored only when the prediction request was persisted first.
        </p>
      </div>

      <PersistenceNotice state={persistence} />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <BackButton onClick={onBack} />
        <button
          className="rounded-2xl bg-[var(--signal)] px-5 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[var(--signal-dark)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          disabled={!complete || saving}
          onClick={onSave}
        >
          {saving ? "Saving..." : "Save feedback"}
        </button>
        <button
          className="rounded-2xl bg-[var(--ink)] px-5 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[var(--blue)]"
          onClick={onDashboard}
        >
          View dashboard
        </button>
      </div>
    </div>
  );
}

function DashboardStep({
  dashboard,
  onBack,
  onRefresh,
}: {
  dashboard: DashboardState;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const summary = dashboard.summary;
  const mlReadiness = dashboard.mlReadiness;

  return (
    <div className="animate-[rise_420ms_ease-out]">
      <SectionLabel>Personal dashboard</SectionLabel>
      <h2 className="mt-2 font-serif text-4xl tracking-[-0.05em] sm:text-5xl">
        Check whether the heuristic is helping your rides.
      </h2>

      <DashboardNotice dashboard={dashboard} />

      {summary && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardMetric
              label="Observations"
              value={String(summary.observationCount)}
              detail="Saved feedback rows"
            />
            <DashboardMetric
              label="Most common route"
              value={summary.mostCommonRoute ?? "none"}
              detail="From your observations"
            />
            <DashboardMetric
              label="Follow rate"
              value={formatPercent(summary.recommendationFollowRate)}
              detail="Boarded recommended zone"
            />
            <DashboardMetric
              label="Best rec"
              value={summary.bestPerformingRecommendation ?? "none"}
              detail="Lowest average crowding"
            />
          </div>

          {mlReadiness && (
            <section className="mt-5 rounded-3xl bg-[linear-gradient(135deg,var(--blue),#173553)] p-5 text-white">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--mint)]">
                    ML readiness
                  </h3>
                  <p className="mt-2 font-serif text-3xl tracking-[-0.05em]">
                    {formatReadinessStage(mlReadiness.stage)}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm font-bold text-white/72">
                    {mlReadiness.nextMilestone === null
                      ? "Enough personal labels exist to start experimenting with a small model."
                      : `${mlReadiness.nextMilestone - mlReadiness.labelsCollected} more labels until: ${mlReadiness.nextMilestoneLabel}`}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/12 px-4 py-3 text-left sm:text-right">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">
                    Labels
                  </p>
                  <p className="mt-1 text-3xl font-black">{mlReadiness.labelsCollected}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {mlReadiness.baselineComparisons.map((baseline) => (
                  <div key={baseline.label} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/55">
                      {formatBaselineLabel(baseline.label)}
                    </p>
                    <p className="mt-2 text-xl font-black">
                      {formatCrowding(baseline.averageCrowding)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-white/62">
                      {baseline.observationCount} observed / {formatPercent(baseline.comfortableRideRate)} comfortable
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs font-bold text-white/58">
                Baselines use observed boarded zones only; they are an early proxy, not a counterfactual model.
              </p>
            </section>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-3xl bg-[var(--ink)] p-5 text-white">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--mint)]">
                Following vs not
              </h3>
              <div className="mt-5 grid gap-3">
                <CrowdingCompareRow
                  label="Followed recommendation"
                  value={summary.averageCrowdingWhenFollowing}
                />
                <CrowdingCompareRow
                  label="Boarded elsewhere"
                  value={summary.averageCrowdingOtherwise}
                />
              </div>
            </section>

            <section className="rounded-3xl bg-white/60 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--signal-dark)]">
                Your best boarded zones
              </h3>
              <div className="mt-4 space-y-3">
                {summary.crowdingByBoardedZone.map((zone) => (
                  <div key={zone.zone}>
                    <div className="flex items-center justify-between gap-3 text-sm font-black">
                      <span>{zone.zone}</span>
                      <span>{formatCrowding(zone.averageCrowding)}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                      {zone.observationCount} observation{zone.observationCount === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl bg-white/60 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--signal-dark)]">
                Route patterns
              </h3>
              <div className="mt-4 space-y-3">
                {summary.routePatterns.length === 0 && (
                  <p className="text-sm font-bold text-[var(--muted)]">No route patterns yet.</p>
                )}
                {summary.routePatterns.map((route) => (
                  <div
                    key={route.routeId}
                    className="flex items-center justify-between rounded-2xl border border-[rgb(25_23_20_/_10%)] bg-white/55 px-4 py-3"
                  >
                    <span className="text-lg font-black">{route.routeId}</span>
                    <span className="text-sm font-bold text-[var(--muted)]">
                      {route.observationCount} rides / {formatCrowding(route.averageCrowding)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl bg-white/60 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--signal-dark)]">
                Recent observations
              </h3>
              <div className="mt-4 space-y-3">
                {summary.recentObservations.length === 0 && (
                  <p className="text-sm font-bold text-[var(--muted)]">No saved feedback yet.</p>
                )}
                {summary.recentObservations.map((observation) => (
                  <div
                    key={`${observation.observedAt}-${observation.routeId}-${observation.boardedZone}`}
                    className="rounded-2xl border border-[rgb(25_23_20_/_10%)] bg-white/55 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">
                        {observation.stationName ?? observation.stationId} / {observation.routeId}
                      </p>
                      <p className="text-sm font-black text-[var(--signal-dark)]">
                        {observation.crowdingRating}/5
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                      Recommended {observation.recommendedZone}, boarded {observation.boardedZone}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <BackButton onClick={onBack} />
        <button
          className="rounded-2xl bg-[var(--signal)] px-5 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[var(--signal-dark)] disabled:cursor-wait disabled:opacity-60"
          disabled={dashboard.status === "loading"}
          onClick={onRefresh}
        >
          {dashboard.status === "loading" ? "Loading..." : "Refresh dashboard"}
        </button>
      </div>
    </div>
  );
}

function DashboardNotice({ dashboard }: { dashboard: DashboardState }) {
  const tone =
    dashboard.status === "loaded"
      ? "border-[rgb(26_120_84_/_22%)] bg-[rgb(142_207_182_/_24%)] text-[rgb(19_95_66)]"
      : dashboard.status === "loading"
        ? "border-[rgb(32_79_122_/_20%)] bg-[rgb(32_79_122_/_9%)] text-[var(--blue)]"
        : "border-[rgb(180_61_33_/_20%)] bg-[rgb(255_106_61_/_10%)] text-[var(--signal-dark)]";

  return (
    <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-black ${tone}`}>
      {dashboard.message}
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-[rgb(25_23_20_/_10%)] bg-white/60 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs font-bold text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function CrowdingCompareRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-black">{label}</span>
        <span className="text-xl font-black">{formatCrowding(value)}</span>
      </div>
    </div>
  );
}

function PersistenceNotice({ state }: { state: PersistenceState }) {
  const tone =
    state.status === "persisted"
      ? "border-[rgb(26_120_84_/_22%)] bg-[rgb(142_207_182_/_24%)] text-[rgb(19_95_66)]"
      : state.status === "saving"
        ? "border-[rgb(32_79_122_/_20%)] bg-[rgb(32_79_122_/_9%)] text-[var(--blue)]"
        : "border-[rgb(180_61_33_/_20%)] bg-[rgb(255_106_61_/_10%)] text-[var(--signal-dark)]";

  return (
    <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-black ${tone}`}>
      {state.message}
      {state.id && <span className="ml-2 font-bold opacity-70">ID: {state.id}</span>}
    </div>
  );
}

function formatCrowding(value: number | null): string {
  return value === null ? "none" : `${value.toFixed(1)}/5`;
}

function formatPercent(value: number | null): string {
  return value === null ? "none" : `${Math.round(value * 100)}%`;
}

function formatReadinessStage(stage: MlReadinessSummary["stage"]): string {
  if (stage === "train-small-model") {
    return "Ready for small-model experiments";
  }

  if (stage === "compare-baselines") {
    return "Ready to compare baselines";
  }

  return "Collecting labels";
}

function formatBaselineLabel(label: MlReadinessSummary["baselineComparisons"][number]["label"]): string {
  if (label === "heuristic-followed") {
    return "Heuristic followed";
  }

  if (label === "always-middle") {
    return "Always middle";
  }

  return "Always rear";
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
