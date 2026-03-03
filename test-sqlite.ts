import Database from 'better-sqlite3';
try {
  const db = new Database('test.db');
  db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER)');
  console.log('SQLite works');
} catch (e) {
  console.error('SQLite error:', e);
}
