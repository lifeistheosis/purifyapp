"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { legacyIdMap } from "./seriesId";
import { rangeOf, type Selection } from "./calendar";
import { forecastSeries } from "./forecast";
import { gradeAll, overallGrade } from "./grade";
import { clearPersisted, loadPersisted } from "./persist";
import {
  PERIOD_DAYS,
  type Dataset,
  type Forecast,
  type Goal,
  type Period,
  type PeriodGrade,
  type Series,
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
 * WHERE THE DATA LIVES. On the server, in insight_series and insight_points,
 * read through /api/admin/insights. It used to live in localStorage, which
 * meant a report existed in one browser, did not follow the operator to another
 * machine, and was REPLACED by the next import rather than extended.
 *
 * IMPORTS ACCUMULATE NOW. A newer Play Console export corrects and extends what
 * is stored; it does not wipe it. The rule that makes that safe is a WHERE
 * clause on the upsert inside merge_insight_points, not anything in this file:
 * a point only wins if its export had seen at least as much as the stored one,
 * so re-importing an old file cannot revert a correction.
 *
 * STILL DOES NOT TOUCH the panel's real analytics, orders or expenses. Those
 * are server truth that a pasted file has no business deleting; an import
 * writes only the insight_* tables.
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
  /** The read itself failed, which is not the same as there being no data. */
  unavailable: boolean;
};

type Action =
  | { type: "hydrate"; dataset: Dataset | null; goals: Goal[]; unavailable?: boolean }
  | { type: "import:start" }
  | { type: "import:done" }
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
  unavailable: false,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        dataset: action.dataset,
        goals: action.goals,
        unavailable: Boolean(action.unavailable),
        hydrated: true,
      };

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

    case "import:done":
      // The dataset itself arrives through "hydrate", dispatched by the reload
      // that follows a successful save. This only ends the importing state and
      // bumps the revision, so the panel replays its entrance once the real
      // server data is already in place rather than over an empty frame.
      return {
        ...state,
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
  /** The read failed. Distinct from there being nothing imported. */
  unavailable: boolean;
  /** A dataset still sitting in this browser from before the server store. */
  legacyLocal: Dataset | null;

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

  clearDataset: () => Promise<void>;
  /** Push whatever this browser still holds up to the server, once. */
  adoptLegacyLocal: () => Promise<void>;
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

  /**
   * Whatever this browser still holds from before the server store existed.
   *
   * Read once, and NEVER pushed automatically. An old browser opened weeks
   * later must not silently shove stale rows at fresher server data; the merge
   * would reject most of it, but the operator would have no idea it happened.
   * So this is surfaced as a button and the choice stays theirs.
   *
   * Read in an effect rather than during render because localStorage does not
   * exist on the server, and touching it during the first client render would
   * produce markup that does not match what was sent.
   */
  const [legacyLocal, setLegacyLocal] = useState<Dataset | null>(null);

  /**
   * Hydrate from the server.
   *
   * Was a synchronous localStorage read; it is now a round trip, so there is a
   * moment before `hydrated` where nothing is known. Every consumer already
   * checks that flag, which is why this swap did not need changes across the
   * tabs: GoalsWidget says "Reading saved goals", and nothing renders a grade
   * from an empty dataset, so a slow network shows "not measured" rather than
   * an F.
   */
  useEffect(() => {
    let alive = true;
    adminJson<{
      available: boolean;
      dataset: Dataset | null;
      goals: Goal[];
    }>("/api/admin/insights").then((r) => {
      if (!alive) return;
      if (!r) {
        // A failed read is NOT an empty dataset. Saying so lets the UI
        // distinguish "nothing imported" from "could not tell", and stops an
        // outage looking like a project with no data.
        dispatch({ type: "hydrate", dataset: null, goals: [], unavailable: true });
        return;
      }
      dispatch({
        type: "hydrate",
        dataset: r.dataset,
        goals: r.goals ?? [],
        unavailable: !r.available,
      });

      // The legacy browser copy is looked for HERE, inside the response, and
      // only when the server turned out to have nothing. Two reasons. It keeps
      // the read out of the effect body, where a synchronous setState is a
      // cascading render. And it is the behaviour we actually want: offering to
      // push a stale browser copy at a server that already has data is how an
      // old tab overwrites a colleague's import.
      if (r.available && !r.dataset) {
        const local = loadPersisted();
        if (local.dataset && local.dataset.series.length > 0) {
          setLegacyLocal(local.dataset);
        }
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // No save effect any more. Writes go through the actions route at the moment
  // the operator acts, so there is no window where the UI shows something the
  // server has not accepted, and no way for two tabs to race each other by both
  // flushing their whole state on any change.

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
  /** Re-read the server. Every write calls this, so the UI shows what landed. */
  const reload = useCallback(async () => {
    const r = await adminJson<{
      available: boolean;
      dataset: Dataset | null;
      goals: Goal[];
    }>("/api/admin/insights");
    if (!r) {
      dispatch({ type: "hydrate", dataset: null, goals: [], unavailable: true });
      return;
    }
    dispatch({
      type: "hydrate",
      dataset: r.dataset,
      goals: r.goals ?? [],
      unavailable: !r.available,
    });
  }, []);

  // importCsv WAS HERE. The CSV import was removed on 2026-09-01: Play
  // Console exports describe days that have already finished while this panel
  // measures live analytics as they happen, so the two answered the same
  // questions differently and the stale one looked equally authoritative.
  // The UI and the server action went with it; leaving this would have been a
  // method that posts to an endpoint that no longer exists.

  /**
   * Push this browser's leftover dataset to the server, once.
   *
   * Goals ride along, and their series ids are REMAPPED on the way: they were
   * written under the old truncate-at-80 scheme, and the same header run
   * through the new parser gives the exact new id. Series.source holds that
   * header, so the mapping is mechanical rather than a guess. A goal whose
   * series is not in the local dataset keeps its id and shows as unmatched,
   * which is honest.
   */
  const adoptLegacyLocal = useCallback(async () => {
    if (!legacyLocal) return;
    dispatch({ type: "import:start" });

    const res = await fetch("/api/admin/insights/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "import",
        label: legacyLocal.label || "Recovered from this browser",
        rowCount: legacyLocal.rowCount,
        series: legacyLocal.series.map((s: Series) => ({
          id: s.id,
          label: s.label,
          kind: s.kind,
          sourceHeader: s.source,
          points: s.points,
        })),
      }),
    }).catch(() => null);

    if (!res || !res.ok) {
      dispatch({ type: "import:fail", error: "That browser copy did not save." });
      return;
    }

    const remap = legacyIdMap(legacyLocal.series.map((s: Series) => s.source));
    const local = loadPersisted();
    for (const g of local.goals) {
      await fetch("/api/admin/insights/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "goal-upsert",
          id: g.id,
          seriesId: remap.get(g.seriesId) ?? g.seriesId,
          label: g.label,
          period: g.period,
          target: g.target,
          paused: g.paused,
        }),
      }).catch(() => null);
    }

    // Cleared only after a confirmed save, so a failure leaves the browser copy
    // exactly where it was rather than losing it on the way.
    clearPersisted();
    setLegacyLocal(null);
    await reload();
    dispatch({ type: "import:done" });
  }, [legacyLocal, reload]);

  const clearDataset = useCallback(async () => {
    await fetch("/api/admin/insights/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear-dataset" }),
    }).catch(() => null);
    dispatch({ type: "dataset:clear" });
    await reload();
  }, [reload]);

  /**
   * Goal writes are optimistic, then reconciled.
   *
   * The local dispatch lands first so the grade moves under the operator's hand
   * with no round trip, which is the responsiveness the panel already had. The
   * reload that follows replaces the optimistic state with what the server
   * actually stored, so a rejected write corrects itself rather than persisting
   * as a comfortable lie.
   */
  const saveGoal = useCallback(
    async (g: Goal) => {
      await fetch("/api/admin/insights/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "goal-upsert",
          id: g.id,
          seriesId: g.seriesId,
          label: g.label,
          period: g.period,
          target: g.target,
          paused: g.paused,
        }),
      }).catch(() => null);
      await reload();
    },
    [reload],
  );

  const addGoal = useCallback(
    (goal: Omit<Goal, "id" | "createdAt">) => {
      const full: Goal = {
        ...goal,
        // Not Math.random. A collision would make two goals share an id and
        // edit each other; the counter plus the clock cannot collide within
        // one session.
        // randomUUID, not a counter. The old scheme was a timestamp plus a
        // module counter, and it justified itself with "ids never leave the
        // browser". They leave the browser now: they are the primary key of
        // insight_goals. goalSeq resets to zero on every page load, so two
        // tabs opened in the same millisecond, or one tab reloaded, could mint
        // the same id and silently edit each other's target.
        id: newGoalId(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "goal:add", goal: full });
      void saveGoal(full);
    },
    [saveGoal],
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<Omit<Goal, "id">>) => {
      dispatch({ type: "goal:update", id, patch });
      // Reads state.goals rather than a ref. These callbacks getting a new
      // identity when goals change is harmless: goals change when someone edits
      // one. The identity that had to stay stable is setSelection, because a
      // calendar cell click fires it dozens of times a session.
      const current = state.goals.find((g) => g.id === id);
      if (current) void saveGoal({ ...current, ...patch });
    },
    [saveGoal, state.goals],
  );

  const removeGoal = useCallback(
    (id: string) => {
      dispatch({ type: "goal:remove", id });
      void fetch("/api/admin/insights/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "goal-delete", id }),
      })
        .catch(() => null)
        .then(() => reload());
    },
    [reload],
  );

  const toggleGoalPause = useCallback(
    (id: string) => {
      dispatch({ type: "goal:togglePause", id });
      const current = state.goals.find((g) => g.id === id);
      if (current) void saveGoal({ ...current, paused: !current.paused });
    },
    [saveGoal, state.goals],
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
      unavailable: state.unavailable,
      legacyLocal,
      forecasts,
      grades,
      overall,
      selection: state.selection,
      selectedRange,
      clearDataset,
      adoptLegacyLocal,
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
      state.unavailable,
      state.selection,
      legacyLocal,
      forecasts,
      grades,
      overall,
      selectedRange,
      clearDataset,
      adoptLegacyLocal,
      addGoal,
      updateGoal,
      removeGoal,
      toggleGoalPause,
      setSelection,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * A goal id that is unique across machines, tabs and reloads.
 *
 * crypto.randomUUID is available in every browser this panel supports and in
 * Node 19 and up, which the repo already requires at 22.5. The fallback exists
 * only for a non-secure context, where randomUUID is undefined; it is weaker
 * and is never reached in production, which is served over https.
 */
function newGoalId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return `goal-${c.randomUUID()}`;
  return `goal-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

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
