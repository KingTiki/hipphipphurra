import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export function openDatabase(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 2) { db.close(); throw new Error('The database requires a newer application version.'); }
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, day INTEGER NOT NULL, month INTEGER NOT NULL,
      year INTEGER, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY, date TEXT NOT NULL, channel TEXT NOT NULL, target TEXT NOT NULL,
      payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
      nextAttemptAt INTEGER NOT NULL DEFAULT 0, sentAt TEXT,
      UNIQUE(date, channel, target)
    );
  `);
  if (version < 2) {
    try {
      db.exec(`BEGIN;
        DROP TABLE IF EXISTS subscriptions;
        DELETE FROM deliveries WHERE channel != 'teams';
        PRAGMA user_version = 2;
        COMMIT;`);
    } catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  }
  return {
    raw: db,
    listPeople: () => db.prepare('SELECT * FROM employees ORDER BY name COLLATE NOCASE, id').all(),
    getPerson: id => db.prepare('SELECT * FROM employees WHERE id = ?').get(id),
    addPerson(person) {
      const id = randomUUID(); const now = new Date().toISOString();
      db.prepare('INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, person.name, person.day, person.month, person.year, now, now);
      return this.getPerson(id);
    },
    updatePerson(id, person) {
      db.prepare('UPDATE employees SET name = ?, day = ?, month = ?, year = ?, updatedAt = ? WHERE id = ?')
        .run(person.name, person.day, person.month, person.year, new Date().toISOString(), id);
      return this.getPerson(id);
    },
    deletePerson: id => db.prepare('DELETE FROM employees WHERE id = ?').run(id).changes > 0,
    queue(date, payload) {
      db.prepare("INSERT OR IGNORE INTO deliveries (date, channel, target, payload) VALUES (?, 'teams', 'channel', ?)")
        .run(date, JSON.stringify(payload));
    },
    due: (date, now) => db.prepare("SELECT * FROM deliveries WHERE date = ? AND channel = 'teams' AND status = 'pending' AND attempts < 3 AND nextAttemptAt <= ? ORDER BY id").all(date, now),
    attempt: (id, next) => db.prepare('UPDATE deliveries SET attempts = attempts + 1, nextAttemptAt = ? WHERE id = ?').run(next, id),
    sent: (id, now) => db.prepare("UPDATE deliveries SET status = 'sent', sentAt = ? WHERE id = ?").run(now, id),
    fail: id => db.prepare("UPDATE deliveries SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END WHERE id = ?").run(id),
    close: () => db.close(),
  };
}
