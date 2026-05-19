import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '../data');
const SESSIONS_FILE = join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const sessions = new Map();

// Load sessions from disk on startup
function loadFromDisk() {
  try {
    if (existsSync(SESSIONS_FILE)) {
      const raw = readFileSync(SESSIONS_FILE, 'utf8');
      const data = JSON.parse(raw);
      let count = 0;
      for (const [id, session] of Object.entries(data)) {
        sessions.set(id, session);
        count++;
      }
      console.log(`Loaded ${count} session(s) from disk`);
    }
  } catch (e) {
    console.error('Failed to load sessions from disk:', e.message);
  }
}

// Save all sessions to disk
function saveToDisk() {
  try {
    const data = {};
    for (const [id, session] of sessions.entries()) {
      data[id] = session;
    }
    writeFileSync(SESSIONS_FILE, JSON.stringify(data), 'utf8');
  } catch (e) {
    console.error('Failed to save sessions to disk:', e.message);
  }
}

// Load on module init
loadFromDisk();

export function createSession({ name, goal, modToken }) {
  return {
    id: null,
    name,
    goal,
    modToken,
    stage: 1,
    participants: [],
    theses: { S: [], W: [], O: [], T: [] },
    mergeProposals: [],
    scores: {},
    topTheses: { S: [], W: [], O: [], T: [] },
    matrix: { SO: [], ST: [], WO: [], WT: [] },
    actions: {},
  };
}

export function getSession(id) {
  return sessions.get(id);
}

export function saveSession(id, session) {
  sessions.set(id, { ...session, id });
  saveToDisk();
}

export function deleteSession(id) {
  sessions.delete(id);
  saveToDisk();
}

export function getAllSessions() {
  return Array.from(sessions.values());
}
