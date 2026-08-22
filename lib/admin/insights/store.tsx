"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { ingestCsv } from "./ingest";
import { forecastSeries } from "./forecast";
import { gradeAll, overallGrade } from "./grade";
import { loadPersisted, savePersisted } from "./persist";
import {
  PERIOD_DAYS,
  type Dataset,
  type Forecast,
  type Goal,
  type Period,
  type PeriodGrade,
} from "./types";

/**
 * The one place imported data, goals, forecasts and grades meet.
 *
 * THE DATA FLOW IS STRICTLY LINEAR AND IT IS ENFORCED BY SHAPE, not by
 * convention:
 *
 *     pasted CSV
 *       -> dataset          (reducer state, the only mutable thing here)
 *       -> forecasts        (useMemo of dataset)
 *       -> grades           (useMemo of dataset + goals)
 *       -> overall          (useMemo of grades)
 *
 * Only `dataset` and `goals` are state. Everything after them is derived
 * during render, so there is no way to update one and forget to update the
 * next: raising a goal recomputes its grade in the same render, and pasting a
 * new report recomputes every forecast and every grade at once. No effect
 * fires, no second render settles it, nothing can be stale.
 *
 * WHY REACT CONTEXT AND NOT REDUX TOOLKIT. Redux Toolkit is a dependency, and
 * this admin refuses dependencies it can do without: charts.tsx opens by
 * explaining that an admin panel pulling a charting library pays for it on
 * every page, and lucide-react was turned down on the same grounds. Context
 * plus useReducer is the same architecture, ships with React, and is one of
 * the three options the brief allowed.
 *
 * WHAT THIS DELIBERATELY DOES NOT TOUCH. Nothing here reads or writes
 * Supabase, and importing a report flushes only the imported dataset. The
 * brief asked to "completely flush the relevant historical data stores", and
 * the relevant store is this one: the panel's real analytics, orders, and
 * expenses are server truth that a pasted file has no business deleting.
 */

type State = {
  dataset: Dataset | null;
  goals: Goal[];
  /** Set while an import is being read, so the UI can show one coordinated state. */
  importing: boolean;
  lastError: string | null;
  /** Bumped on every successful import, so views can animate a refresh. */
  revision: number;
  hydrated: boolean;
};

type Action =
  | { type: "hydrate"; dataset: Dataset | null; goals: Goal[] }
  | { type: "import:start" }
  | { type: "import:ok"; dataset: Dataset }
  | { type: "import:fail"; error: string }
  | { type: "dataset:clear" }
  | { type: "goal:add"; goal: Goal }
  | { type: "goal:update"; id: string; patch: Partial<Omit<Goal, "id">> }
  | { type: "goal:remove"; id: string }
  | { type: "goal:togglePause"; id: string };

const EMPTY: State = {
  dataset: null,
  goals: [],
  importing: false,
  lastError: null,
  revision: 0,
  hydrated: false,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, dataset: action.dataset, goals: action.goals, hydrated: true };

    case "import:start":
      return { ...state, importing: true, lastError: null };

    case "import:ok":
      // The flush and the repopulate are ONE transition, not a clear followed
      // by a load. Two dispatches would render an empty panel between them,
      // which reads as data loss every time a report is replaced.
      return {
        ...state,
        dataset: action.dataset,
        importing: false,
        lastError: null,
        revision: state.revision + 1,
      };

    case "import:fail":
      // The previous dataset survives a failed import. Wiping it would punish
      // the operator for a bad paste by deleting the good data underneath.
      return { ...state, importing: false, lastError: action.error };

    case "dataset:clear":
      return { ...state, dataset: null, lastError: null, revision: state.revision + 1 };

    case "goal:add":
      return { ...state, goals: [...state.goals, action.goal] };

    case "goal:update":
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)),
      };

    case "goal:remove":
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };

    case "goal:togglePause":
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.id ? { ...g, paused: !g.paused } : g)),
      };

    default:
      return state;
  }
}

export type InsightsValue = {
  dataset: Dataset | null;
  goals: Goal[];
  importing: boolean;
  lastError: string | null;
  revision: number;
  hydrated: boolean;

  /** Derived. One per series in the dataset. */
  forecasts: Record<string, Forecast>;
  /** Derived. */
  grades: Record<Period, PeriodGrade>;
  /** Derived from the grades. */
  overall: ReturnType<typeof overallGrade>;

  importCsv: (text: string, name: string) => void;
  clearDataset: () => void;
  addGoal: (goal: Omit<Goal, "id" | "createdAt">) => void;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id">>) => void;
  removeGoal: (id: string) => void;
  toggleGoalPause: (id: string) => void;
};

const Ctx = createContext<InsightsValue | null>(null);

/** The horizon every forecast is computed to. A month past the last real day. */
const HORIZON = PERIOD_DAYS.monthly;

export function InsightsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY);

  // Hydrate once, on the client only. localStorage does not exist during the
  // server render, and reading it during the first client render would produce
  // markup that does not match what the server sent.
  useEffect(() => {
    const p = loadPersisted();
    dispatch({ type: "hydrate", dataset: p.dataset, goals: p.goals });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    savePersisted({ dataset: state.dataset, goals: state.goals });
  }, [state.dataset, state.goals, state.hydrated]);

  // STAGE 2. Forecasts follow the dataset and nothing else.
  const forecasts = useMemo(() => {
    const out: Record<string, Forecast> = {};
    if (!state.dataset) return out;
    for (const s of state.dataset.series) out[s.id] = forecastSeries(s, HORIZON);
    return out;
  }, [state.dataset]);

  // STAGE 3. Grades follow the dataset and the goals.
  const grades = useMemo(
    () => gradeAll(state.goals, state.dataset),
    [state.goals, state.dataset],
  );

  // STAGE 4. The headline follows the grades.
  const overall = useMemo(() => overallGrade(grades), [grades]);

  const value = useMemo<InsightsValue>(
    () => ({
      dataset: state.dataset,
      goals: state.goals,
      importing: state.importing,
      lastError: state.lastError,
      revision: state.revision,
      hydrated: state.hydrated,
      forecasts,
      grades,
      overall,

      importCsv: (text, name) => {
        dispatch({ type: "import:start" });
        const { dataset, errors } = ingestCsv(text, name, new Date().toISOString());
        if (!dataset) {
          dispatch({ type: "import:fail", error: errors[0] ?? "That could not be read." });
          return;
        }
        dispatch({ type: "import:ok", dataset });
      },

      clearDataset: () => dispatch({ type: "dataset:clear" }),

      addGoal: (goal) =>
        dispatch({
          type: "goal:add",
          goal: {
            ...goal,
            // Not Math.random. A collision would make two goals share an id and
            // edit each other; the counter plus the clock cannot collide within
            // one session, and ids never leave the browser.
            id: `goal-${Date.now().toString(36)}-${(goalSeq += 1).toString(36)}`,
            createdAt: new Date().toISOString(),
          },
        }),

      updateGoal: (id, patch) => dispatch({ type: "goal:update", id, patch }),
      removeGoal: (id) => dispatch({ type: "goal:remove", id }),
      toggleGoalPause: (id) => dispatch({ type: "goal:togglePause", id }),
    }),
    [state, forecasts, grades, overall],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

let goalSeq = 0;

/**
 * Read the engine.
 *
 * Throws outside a provider rather than returning a null-shaped default,
 * because a component silently rendering zeroes for missing state is the
 * failure mode this whole file exists to prevent.
 */
export function useInsights(): InsightsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useInsights must be used inside <InsightsProvider>");
  return v;
}
