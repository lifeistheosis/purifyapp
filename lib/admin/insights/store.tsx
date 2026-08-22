"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { ingestCsv } from "./ingest";
import { rangeOf, type Selection } from "./calendar";
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
 * `dataset`, `goals` and `selection` are state; everything after them is
 * derived during render, so there is no way to update one and forget to update
 * the next. Raising a goal recomputes its grade in the same render, pasting a
 * new report recomputes every forecast and every grade at once, and picking a
 * week on the calendar re-scopes what the grades measure. No effect fires, no
 * second render settles it, nothing can be stale.
 *
 * Selection was the third piece of state and is worth naming as a departure:
 * this header used to say only two things were state. A chosen timeframe is not
 * derivable from anything, so it had to become real state rather than be faked
 * out of a ref. It is deliberately NOT persisted: a selection restored days
 * later would silently scope the whole panel to a window nobody remembers
 * choosing, which is the sort of quiet wrongness the rest of this engine exists
 * to avoid.
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
  /** The timeframe the calendar has scoped the panel to, or null for "all". */
  selection: Selection | null;
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
  | { type: "goal:togglePause"; id: string }
  | { type: "selection:set"; selection: Selection | null };

const EMPTY: State = {
  dataset: null,
  goals: [],
  selection: null,
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

    case "dataset:clear":
      // Selection goes with the data it described. A range left pointing at a
      // report that has been forgotten scopes the panel to a window with
      // nothing in it, which reads as "we earned nothing that week".
      return {
        ...state,
        dataset: null,
        selection: null,
        lastError: null,
        revision: state.revision + 1,
      };

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

    case "selection:set":
      return { ...state, selection: action.selection };

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

  /** What the calendar has scoped the panel to, or null for the default windows. */
  selection: Selection | null;
  /** Derived. The inclusive day range of the selection, or null. */
  selectedRange: { from: string; to: string } | null;

  importCsv: (text: string, name: string) => void;
  clearDataset: () => void;
  addGoal: (goal: Omit<Goal, "id" | "createdAt">) => void;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id">>) => void;
  removeGoal: (id: string) => void;
  toggleGoalPause: (id: string) => void;
  setSelection: (selection: Selection | null) => void;
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

  // STAGE 3. Grades follow the dataset, the goals, AND the selection. Adding
  // selection to this one dependency list is the whole of the bi-directional
  // behaviour: clicking a week on the calendar re-grades against that week in
  // the same render, on every surface that reads grades, with nothing to
  // refresh and no effect to fire.
  const grades = useMemo(
    () =>
      gradeAll(
        state.goals,
        state.dataset,
        state.selection ? { kind: state.selection.kind, range: rangeOf(state.selection) } : null,
      ),
    [state.goals, state.dataset, state.selection],
  );

  // STAGE 4. The headline follows the grades.
  const overall = useMemo(() => overallGrade(grades), [grades]);

  // The selection, resolved to two day labels. Derived rather than stored so a
  // month selection cannot go stale about how many days that month has.
  const selectedRange = useMemo(
    () => (state.selection ? rangeOf(state.selection) : null),
    [state.selection],
  );

  /*
   * ACTION CREATORS ARE useCallbacks, and that is not tidiness.
   *
   * They used to be defined inline inside the value memo, which depended on
   * `state` as a whole object. Every dispatch therefore produced a new context
   * value AND six new function identities, re-rendering every consumer. That
   * was invisible while the only actions were importing a report and editing a
   * goal, which happen a handful of times a day.
   *
   * A calendar breaks that assumption: clicking cells is the primary
   * interaction, and each click would have re-rendered GrowthTab, GoalsTab,
   * GoalsWidget and DataImport, none of which read the selection. Stable
   * identities plus field-level memo dependencies keep a cell click to the
   * components that actually care.
   */
  const importCsv = useCallback((text: string, name: string) => {
    dispatch({ type: "import:start" });
    const { dataset, errors } = ingestCsv(text, name, new Date().toISOString());
    if (!dataset) {
      dispatch({ type: "import:fail", error: errors[0] ?? "That could not be read." });
      return;
    }
    dispatch({ type: "import:ok", dataset });
  }, []);

  const clearDataset = useCallback(() => dispatch({ type: "dataset:clear" }), []);

  const addGoal = useCallback((goal: Omit<Goal, "id" | "createdAt">) => {
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
    });
  }, []);

  const updateGoal = useCallback(
    (id: string, patch: Partial<Omit<Goal, "id">>) =>
      dispatch({ type: "goal:update", id, patch }),
    [],
  );
  const removeGoal = useCallback((id: string) => dispatch({ type: "goal:remove", id }), []);
  const toggleGoalPause = useCallback(
    (id: string) => dispatch({ type: "goal:togglePause", id }),
    [],
  );
  const setSelection = useCallback(
    (selection: Selection | null) => dispatch({ type: "selection:set", selection }),
    [],
  );

  // Depends on individual fields, never on `state` as a whole. The action
  // creators above are stable, so they contribute nothing to this list.
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
      selection: state.selection,
      selectedRange,
      importCsv,
      clearDataset,
      addGoal,
      updateGoal,
      removeGoal,
      toggleGoalPause,
      setSelection,
    }),
    [
      state.dataset,
      state.goals,
      state.importing,
      state.lastError,
      state.revision,
      state.hydrated,
      state.selection,
      forecasts,
      grades,
      overall,
      selectedRange,
      importCsv,
      clearDataset,
      addGoal,
      updateGoal,
      removeGoal,
      toggleGoalPause,
      setSelection,
    ],
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
