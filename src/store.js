// Data layer.
//
// Signed out: data lives in this browser (localStorage key wt:local:v2).
// Signed in:  Firestore is the source of truth —
//   users/{uid}                 { exercises: [...], templates: [...], migratedV2: true }
//   users/{uid}/workouts/{id}   one document per workout
// Live listeners keep every open device up to date, and each change writes only the
// workout it touched, so two devices can no longer overwrite each other's history.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection, deleteDoc, doc, getDocs, onSnapshot, setDoc, updateDoc, writeBatch,
} from "firebase/firestore";
import { db, onAuth, completeRedirectSignIn } from "./firebase.js";
import { DEFAULT_EXERCISES, DEFAULT_TEMPLATES } from "./constants.js";
import { mergeData, normalizeWorkout, renameInTemplates, renameInWorkout, sortWorkouts, buildExerciseIndex } from "./utils.js";

const LOCAL_KEY = "wt:local:v2";
const LEGACY_KEY = "wt:data:v1";
const DEFAULT_TEMPLATE_IDS = new Set(DEFAULT_TEMPLATES.map(t => t.id));
const DEFAULT_EXERCISE_NAMES = new Set(DEFAULT_EXERCISES.map(e => e.name.toLowerCase()));

const emptyLocal = () => ({ workouts: [], exercises: DEFAULT_EXERCISES, templates: DEFAULT_TEMPLATES });

export function readLocalData() {
  try {
    let raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      // One-time carry-over from the previous version's storage.
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) { localStorage.setItem(LOCAL_KEY, legacy); raw = legacy; }
    }
    if (!raw) return emptyLocal();
    const p = JSON.parse(raw);
    return {
      workouts: Array.isArray(p.workouts) ? sortWorkouts(p.workouts) : [],
      exercises: Array.isArray(p.exercises) ? p.exercises : DEFAULT_EXERCISES,
      templates: Array.isArray(p.templates) ? p.templates : DEFAULT_TEMPLATES,
    };
  } catch { return emptyLocal(); }
}
const writeLocalData = (d) => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ workouts: d.workouts, exercises: d.exercises, templates: d.templates })); } catch {} };
const clearLocalData = () => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(emptyLocal())); } catch {} };

// Firestore rejects `undefined`; strip it.
const clean = (o) => JSON.parse(JSON.stringify(o));

const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
async function commitInChunks(ops) {
  for (const part of chunk(ops, 400)) {
    const b = writeBatch(db);
    part.forEach(fn => fn(b));
    await b.commit();
  }
}

// Things on this device (from signed-out use) that the account doesn't have yet.
export function localOnlyItems(local, cloud) {
  const ids = new Set(cloud.workouts.map(w => w.id));
  const exNames = new Set(cloud.exercises.map(e => e.name.toLowerCase()));
  const tplIds = new Set(cloud.templates.map(t => t.id));
  return {
    workouts: local.workouts.filter(w => !ids.has(w.id)),
    exercises: local.exercises.filter(e => !exNames.has(e.name.toLowerCase()) && !DEFAULT_EXERCISE_NAMES.has(e.name.toLowerCase())),
    templates: local.templates.filter(t => !tplIds.has(t.id) && !DEFAULT_TEMPLATE_IDS.has(t.id)),
  };
}

export function useAppData() {
  const [user, setUser] = useState(undefined); // undefined while auth initializes
  const [local, setLocal] = useState(readLocalData);
  const [cloud, setCloud] = useState(null); // { workouts, exercises, templates } once loaded
  const [cloudReady, setCloudReady] = useState({ doc: false, workouts: false });
  const [sync, setSync] = useState("local"); // local | loading | synced | pending | offline | error
  const [syncError, setSyncError] = useState("");
  const [pendingLocal, setPendingLocal] = useState(null); // offer to add signed-out data to account
  const [authError, setAuthError] = useState("");
  const migrating = useRef(false);
  const offeredMerge = useRef(false);

  const uidRef = useRef(null);

  const fail = useCallback((err) => {
    console.error(err);
    setSync("error");
    setSyncError(err?.code === "permission-denied"
      ? "Cloud save was blocked by Firestore security rules (see README)."
      : (err?.message || "Sync error"));
  }, []);

  // ─── Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    completeRedirectSignIn().catch(err => { console.error(err); setAuthError(err?.message || "Sign-in failed"); });
    return onAuth(u => { uidRef.current = u?.uid || null; setUser(u || null); });
  }, []);

  // ─── Live cloud listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!user) { setCloud(null); setCloudReady({ doc: false, workouts: false }); setSync("local"); offeredMerge.current = false; setLocal(readLocalData()); return; }
    setSync("loading");
    const userRef = doc(db, "users", user.uid);
    const wRef = collection(db, "users", user.uid, "workouts");
    let latest = { workouts: [], exercises: DEFAULT_EXERCISES, templates: DEFAULT_TEMPLATES };
    const push = () => setCloud({ ...latest });

    // includeMetadataChanges: we need to hear when cached data is confirmed by the server.
    const unsubDoc = onSnapshot(userRef, { includeMetadataChanges: true }, async (snap) => {
      const fromServer = !snap.metadata.fromCache;
      if (!snap.exists()) {
        if (fromServer) {
          // First sign-in for this account: start with the defaults.
          await setDoc(userRef, { exercises: DEFAULT_EXERCISES, templates: DEFAULT_TEMPLATES, migratedV2: true }).catch(fail);
        }
        return;
      }
      const d = snap.data();
      latest.exercises = Array.isArray(d.exercises) ? d.exercises : DEFAULT_EXERCISES;
      latest.templates = Array.isArray(d.templates) ? d.templates : DEFAULT_TEMPLATES;
      push();
      if (d.migratedV2) setCloudReady(r => ({ ...r, doc: true }));

      // Move from the old single-document format (workouts array) to one doc per workout.
      // Only adds workouts that aren't already in the subcollection, so it's safe to re-run
      // (e.g. if an old cached copy of the app rewrites the document).
      if (!d.migratedV2 && fromServer && !migrating.current) {
        migrating.current = true;
        try {
          const legacy = Array.isArray(d.workouts) ? d.workouts : [];
          const existing = new Set((await getDocs(wRef)).docs.map(x => x.id));
          const idx = buildExerciseIndex(latest.exercises);
          const toAdd = legacy.map(w => normalizeWorkout(w, idx)).filter(w => !existing.has(w.id));
          await commitInChunks(toAdd.map(nw => (b) => b.set(doc(wRef, nw.id), clean(nw))));
          // The old array is left in place as a backup but no longer used.
          await updateDoc(userRef, { migratedV2: true, legacyWorkoutsNote: "Backup from v1. Live data is in the workouts subcollection." });
        } catch (e) { fail(e); } finally { migrating.current = false; }
      }
    }, fail);

    const unsubW = onSnapshot(wRef, { includeMetadataChanges: true }, (snap) => {
      latest.workouts = sortWorkouts(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      push();
      if (!snap.metadata.fromCache) setCloudReady(r => ({ ...r, workouts: true }));
      if (snap.metadata.hasPendingWrites) setSync(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "pending");
      else if (snap.metadata.fromCache) setSync(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "loading");
      else { setSync("synced"); setSyncError(""); }
    }, fail);

    return () => { unsubDoc(); unsubW(); };
  }, [user, fail]);

  // After the account's data has loaded from the server, offer to add anything that was
  // logged on this device while signed out (instead of silently dropping it).
  useEffect(() => {
    if (!user || !cloud || !cloudReady.doc || !cloudReady.workouts || offeredMerge.current) return;
    offeredMerge.current = true;
    const extra = localOnlyItems(readLocalData(), cloud);
    if (extra.workouts.length || extra.exercises.length || extra.templates.length) setPendingLocal(extra);
    else { clearLocalData(); setLocal(emptyLocal()); }
  }, [user, cloud, cloudReady]);

  // Persist signed-out data locally.
  useEffect(() => { if (!user && user !== undefined) writeLocalData(local); }, [local, user]);

  const signedIn = !!user;
  const data = signedIn ? (cloud || { workouts: [], exercises: DEFAULT_EXERCISES, templates: DEFAULT_TEMPLATES }) : local;
  const dataRef = useRef(data);
  dataRef.current = data;

  // ─── Actions ───────────────────────────────────────────────────────
  const actions = useMemo(() => {
    const uRef = () => doc(db, "users", uidRef.current);
    const wDoc = (id) => doc(db, "users", uidRef.current, "workouts", id);
    const isCloud = () => !!uidRef.current;

    const saveWorkout = (w) => {
      const nw = normalizeWorkout({ ...w, updatedAt: Date.now() }, buildExerciseIndex(dataRef.current.exercises));
      if (isCloud()) setDoc(wDoc(nw.id), clean(nw)).catch(fail);
      else setLocal(d => ({ ...d, workouts: sortWorkouts([...d.workouts.filter(x => x.id !== nw.id), nw]) }));
      return nw;
    };
    const deleteWorkout = (id) => {
      if (isCloud()) deleteDoc(wDoc(id)).catch(fail);
      else setLocal(d => ({ ...d, workouts: d.workouts.filter(w => w.id !== id) }));
    };
    const setExercises = (next) => {
      if (isCloud()) setDoc(uRef(), { exercises: clean(next) }, { merge: true }).catch(fail);
      else setLocal(d => ({ ...d, exercises: next }));
    };
    const setTemplates = (next) => {
      if (isCloud()) setDoc(uRef(), { templates: clean(next) }, { merge: true }).catch(fail);
      else setLocal(d => ({ ...d, templates: next }));
    };
    // Update an exercise and every workout/template that references it by name.
    const updateExercise = (oldName, updated) => {
      const cur = dataRef.current;
      const exercises = cur.exercises.map(e => e.name === oldName ? updated : e);
      const renamed = updated.name !== oldName;
      const mgChanged = cur.exercises.find(e => e.name === oldName)?.muscleGroup !== updated.muscleGroup;
      const touched = (renamed || mgChanged) ? cur.workouts.map(w => renameInWorkout(w, oldName, updated.name, updated.muscleGroup)).filter(Boolean) : [];
      const templates = renamed ? renameInTemplates(cur.templates, oldName, updated.name) : cur.templates;
      if (isCloud()) {
        commitInChunks([
          (b) => b.set(uRef(), clean({ exercises, templates }), { merge: true }),
          ...touched.map(w => (b) => b.set(wDoc(w.id), clean(w))),
        ]).catch(fail);
      } else {
        const byId = new Map(touched.map(w => [w.id, w]));
        setLocal(d => ({ exercises, templates, workouts: d.workouts.map(w => byId.get(w.id) || w) }));
      }
      return touched.length;
    };
    // Remove from the library; past entries keep a copy of the muscle group so they still count.
    const deleteExercise = (name) => {
      const cur = dataRef.current;
      const ex = cur.exercises.find(e => e.name === name);
      const exercises = cur.exercises.filter(e => e.name !== name);
      const touched = ex ? cur.workouts
        .filter(w => w.entries.some(e => e.exercise === name && e.muscleGroup !== ex.muscleGroup))
        .map(w => ({ ...w, entries: w.entries.map(e => e.exercise === name ? { ...e, muscleGroup: ex.muscleGroup } : e) })) : [];
      if (isCloud()) {
        commitInChunks([
          (b) => b.set(uRef(), clean({ exercises }), { merge: true }),
          ...touched.map(w => (b) => b.set(wDoc(w.id), clean(w))),
        ]).catch(fail);
      } else {
        const byId = new Map(touched.map(w => [w.id, w]));
        setLocal(d => ({ ...d, exercises, workouts: d.workouts.map(w => byId.get(w.id) || w) }));
      }
    };
    // Replace everything (used by Restore → Replace, and by Undo of a replace).
    const replaceAll = async (next) => {
      if (isCloud()) {
        const keep = new Set(next.workouts.map(w => w.id));
        await commitInChunks([
          (b) => b.set(uRef(), clean({ exercises: next.exercises, templates: next.templates }), { merge: true }),
          ...dataRef.current.workouts.filter(w => !keep.has(w.id)).map(w => (b) => b.delete(wDoc(w.id))),
          ...next.workouts.map(w => (b) => b.set(wDoc(w.id), clean(w))),
        ]).catch(fail);
      } else setLocal({ workouts: sortWorkouts(next.workouts), exercises: next.exercises, templates: next.templates });
    };
    // Add whatever `incoming` has that we don't (never overwrites or deletes).
    const mergeAll = async (incoming) => {
      const cur = dataRef.current;
      const merged = mergeData(cur, { workouts: [], exercises: [], templates: [], ...incoming });
      if (isCloud()) {
        const have = new Set(cur.workouts.map(w => w.id));
        await commitInChunks([
          (b) => b.set(uRef(), clean({ exercises: merged.exercises, templates: merged.templates }), { merge: true }),
          ...(incoming.workouts || []).filter(w => !have.has(w.id)).map(w => (b) => b.set(wDoc(w.id), clean(w))),
        ]).catch(fail);
      } else setLocal({ workouts: merged.workouts, exercises: merged.exercises, templates: merged.templates });
      return merged.added;
    };
    return { saveWorkout, deleteWorkout, setExercises, setTemplates, updateExercise, deleteExercise, replaceAll, mergeAll };
  }, [fail]);

  const resolvePendingLocal = useCallback(async (add) => {
    const extra = pendingLocal;
    setPendingLocal(null);
    if (add && extra) await actions.mergeAll(extra);
    clearLocalData();
    setLocal(emptyLocal());
  }, [pendingLocal, actions]);

  return {
    user, authLoading: user === undefined, authError, setAuthError,
    ...data, actions,
    loaded: !signedIn || (cloudReady.doc && (cloudReady.workouts || sync === "offline" || sync === "pending")) || (!!cloud && cloud.workouts.length > 0),
    sync, syncError, pendingLocal, resolvePendingLocal,
  };
}
