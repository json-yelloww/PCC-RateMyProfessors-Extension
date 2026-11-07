/* PCC RMP extension (Manifest V3 background service worker).
 * Only talks to Rate My Professors. No paid API key or custom server.
 */
'use strict';

const SCHOOL_ID = 'U2Nob29sLTI2NDk='; // RMP School-2649: Pasadena City College
const API_URL = 'https://www.ratemyprofessors.com/graphql';
const SUCCESS_TTL = 7 * 24 * 60 * 60 * 1000;
const MISSING_TTL = 24 * 60 * 60 * 1000;
const FAILURE_TTL = 2 * 60 * 1000;
const MAX_PARALLEL = 3;
const pending = new Map();
const jobs = [];
let running = 0;

const TEACHER_QUERY = `
  query PCCProfessorSearch($query: TeacherSearchQuery!) {
    newSearch {
      teachers(query: $query, first: 20) {
        edges {
          node {
            firstName
            lastName
            legacyId
            avgRating
            numRatings
            avgDifficulty
            wouldTakeAgainPercent
            department
            school { id name }
          }
        }
      }
    }
  }
`;

function normalizeName(name) {
  return String(name || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '').replace(/[‐‑‒–—-]/g, ' ')
    .replace(/\./g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

// Strong name matching is important: never display another instructor's rating.
function scoreName(requested, rmpName) {
  const a = normalizeName(requested).split(' ').filter(Boolean);
  const b = normalizeName(rmpName).split(' ').filter(Boolean);
  if (a.length < 2 || b.length < 2) return 0;
  if (a.join(' ') === b.join(' ')) return 100;
  if (a[0] === b[0] && a[a.length - 1] === b[b.length - 1]) return 90;
  // Last name first vs first name first (usually normalized by the content script).
  if (a.length === 2 && a[0] === b[b.length - 1] && a[1] === b[0]) return 75;
  if (a[0].length === 1 && a[0] === b[0][0] && a[a.length - 1] === b[b.length - 1]) return 60;
  return 0;
}

function chooseProfessor(name, edges) {
  const candidates = (edges || []).map((edge) => edge && edge.node).filter(Boolean)
    .filter((person) => person.school?.id === SCHOOL_ID ||
       (person.school?.name || '').toLowerCase().trim() === 'pasadena city college')
    .map((person) => ({
      person,
      score: scoreName(name, `${person.firstName} ${person.lastName}`)
    }))
    .filter((candidate) => candidate.score >= 60)
    .sort((a, b) => b.score - a.score || (b.person.numRatings || 0) - (a.person.numRatings || 0));

  if (!candidates.length) return null;
  // One initial plus surname might identify multiple different people.
  if (candidates[0].score === 60 && candidates.some((p, i) => i && p.score === 60 &&
      normalizeName(`${p.person.firstName} ${p.person.lastName}`) !==
      normalizeName(`${candidates[0].person.firstName} ${candidates[0].person.lastName}`))) {
    return null;
  }
  const p = candidates[0].person;
  if (!Number.isInteger(p.legacyId) || p.legacyId <= 0) return null;
  const numRatings = Number(p.numRatings) || 0;
  const rating = Number(p.avgRating);
  return {
    name: `${p.firstName} ${p.lastName}`,
    rating: numRatings > 0 && Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : null,
    count: numRatings,
    difficulty: Number.isFinite(p.avgDifficulty) ? p.avgDifficulty : null,
    wouldTakeAgain: Number.isFinite(p.wouldTakeAgainPercent) && p.wouldTakeAgainPercent >= 0
      ? p.wouldTakeAgainPercent : null,
    url: `https://www.ratemyprofessors.com/professor/${p.legacyId}`
  };
}

async function fetchProfessor(name) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // The public credential used by the RMP website's own GraphQL client.
        'Authorization': 'Basic dGVzdDp0ZXN0'
      },
      body: JSON.stringify({
        query: TEACHER_QUERY,
        variables: {
          query: { text: name, schoolID: SCHOOL_ID, fallback: false, departmentID: null }
        }
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`RMP returned HTTP ${response.status}`);
    const json = await response.json();
    if (json.errors?.length) throw new Error(`RMP query: ${json.errors[0].message}`);
    if (!json.data?.newSearch?.teachers?.edges) throw new Error('RMP returned an unexpected response');
    return chooseProfessor(name, json.data.newSearch.teachers.edges);
  } finally {
    clearTimeout(timer);
  }
}

function enqueue(job) {
  return new Promise((resolve, reject) => {
    jobs.push({ job, resolve, reject });
    drain();
  });
}

function drain() {
  while (running < MAX_PARALLEL && jobs.length > 0) {
    const next = jobs.shift();
    running++;
    Promise.resolve().then(next.job).then(next.resolve, next.reject)
      .finally(() => { running--; drain(); });
  }
}

async function lookup(name) {
  const normalized = normalizeName(name);
  if (!normalized || normalized.split(' ').length < 2 || normalized.length > 100) {
    return { status: 'missing', professor: null };
  }
  const storageKey = `pcc-rmp:${normalized}`;
  const stored = (await chrome.storage.local.get(storageKey))[storageKey];
  if (stored && Date.now() - stored.time <
      (stored.status === 'found' ? SUCCESS_TTL : stored.status === 'missing' ? MISSING_TTL : FAILURE_TTL)) {
    return { status: stored.status, professor: stored.professor || null, error: stored.error };
  }
  try {
    const professor = await enqueue(() => fetchProfessor(name));
    const value = { status: professor ? 'found' : 'missing', professor, time: Date.now() };
    await chrome.storage.local.set({ [storageKey]: value });
    return { status: value.status, professor: value.professor };
  } catch (error) {
    // RMP may block requests or change its GraphQL API. Never fabricate a rating.
    const message = error?.message || 'Unable to connect to RMP';
    await chrome.storage.local.set({ [storageKey]: { status: 'error', error: message, time: Date.now() } });
    return { status: 'error', professor: null, error: message };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'PCC_RMP_LOOKUP' || typeof message.name !== 'string') return false;
  const key = normalizeName(message.name);
  if (!pending.has(key)) {
    const task = lookup(message.name).finally(() => pending.delete(key));
    pending.set(key, task);
  }
  pending.get(key).then(sendResponse).catch((error) => sendResponse({
    status: 'error', professor: null, error: error?.message || 'Unknown error'
  }));
  return true; // Send asynchronous reply after the request completes.
});
