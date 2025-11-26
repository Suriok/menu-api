import Database from 'better-sqlite3';

const db = new Database('menu.db');
db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        data TEXT,
        created_at INTEGER,
        expires_at INTEGER  
    )
`);

export default db;