import sqlite3 from "sqlite3";
import { queryDb, runDb } from "../../stores/database";
import { sendMessage } from "../../services/bot-service";

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
  async (err) => {
    if (err) {
      console.error("Lỗi khi tạo bảng:", err);
    } else {
      await createAdminUser();
    }
  },
);

// Hàm tạo user admin nếu chưa tồn tại
const createAdminUser = async () => {
  const adminUserId = 5706663809;
  const adminRole = 0; // 0 = admin, 1 = user

  try {
    const existingUser = await queryDb(
      `SELECT * FROM users WHERE user_id = ?`,
      [adminUserId],
    );

    if (!existingUser) {
      await runDb(`INSERT INTO users (user_id, role) VALUES (?, ?)`, [
        adminUserId,
        adminRole,
      ]);
      await sendMessage(adminUserId, "👑 User admin đã được tạo thành công!");
    } else {
      console.log("😁 User admin đã tồn tại không tạo mới.");
    }
  } catch (error) {
    console.error("❌ Lỗi khi tạo user admin:", error);
  }
};

export default db;
