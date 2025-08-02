import sqlite3 from "sqlite3";
import { queryDb, runDb } from "../../stores/database";
import { sendMessage } from "../../services/bot-service";

const db = new sqlite3.Database("./bot_data.db", (err) => {
  if (err) {
    console.error("❌ [Database] Lỗi khi kết nối:", err);
  } else {
    console.log("✅ [Database] Đã kết nối thành công!");
  }
});

// Tạo bảng users nếu chưa tồn tại
db.run(
  `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        role INTEGER DEFAULT 1,
        access_token TEXT DEFAULT NULL,
        is_auto_checkin INTEGER DEFAULT 1,
        meta_data TEXT DEFAULT NULL
    )`,
  async (err) => {
    if (err) {
      console.error("❌ [Database] Lỗi khi tạo bảng:", err);
    } else {
      console.log("📌 [Database] Bảng users đã được tạo hoặc đã tồn tại.");
      await createAdminUser();
    }
  },
);

// Hàm tạo user admin nếu chưa tồn tại
const createAdminUser = async () => {
  const adminUserId = 7564303681;
  const adminRole = 0; // 0 = admin, 1 = user

  try {
    console.log("🔍 [Admin] Đang kiểm tra user admin...");
    const existingUser = await queryDb(
      `SELECT * FROM users WHERE user_id = ?`,
      [adminUserId],
    );

    if (!existingUser) {
      await runDb(`INSERT INTO users (user_id, role) VALUES (?, ?)`, [
        adminUserId,
        adminRole,
      ]);
      console.log("👑 [Admin] User admin đã được tạo thành công!");

      await sendMessage(
        adminUserId,
        "🎉 Admin đã được tạo thành công! Bạn có quyền truy cập đầy đủ hệ thống.",
      );
    } else {
      console.log("✅ [Admin] User admin đã tồn tại.");
      await sendMessage(adminUserId, "🔔 Bạn đã là admin của hệ thống.");
    }
  } catch (error) {
    console.error("❌ [Admin] Lỗi khi tạo user admin:", error);
    await sendMessage(
      adminUserId,
      "🚨 Có lỗi xảy ra khi tạo admin. Vui lòng kiểm tra lại!",
    );
  }
};

export default db;
