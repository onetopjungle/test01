import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./bot_data.db", (err) => {
  if (err) {
    console.error("Lỗi khi kết nối đến database:", err);
  } else {
    console.log("Đã kết nối đến SQLite database.");
  }
});

// Tạo bảng users nếu chưa tồn tại
db.run(
  `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        user_id INTEGER UNIQUE,
        role INTEGER DEFAULT 1,
        access_token TEXT DEFAULT NULL
    )`,
  (err) => {
    if (err) {
      console.error("Lỗi khi tạo bảng:", err);
    }
  },
);

export default db;
