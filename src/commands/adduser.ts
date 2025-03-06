import { Context } from "telegraf";
import db from "../database/sqlite/db";
import { deleteSession, setSession } from "../stores/session";
import { queryDb, runDb } from "../stores/database";

// 📌 Lệnh thêm user
export const addUserCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await setSession(userId, { action: "adduser" });

  try {
    const row = await queryDb(
      `SELECT * FROM users WHERE user_id = ? AND role = 0`,
      [userId],
    );

    if (!row) {
      await deleteSession(userId);
      return ctx.reply("❌ Bạn không có quyền tạo người dùng.");
    }

    return ctx.reply("👀 Vui lòng nhập ID người dùng mới.");
  } catch (err) {
    console.error("DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("❌ Lỗi khi truy vấn database.");
  }
};

// 📌 Thêm user mới
export const addUser = async (ctx: Context | any) => {
  const userId = ctx.from?.id;
  const messageText = ctx.message.text;

  // Kiểm tra ID hợp lệ (số, từ 5 đến 10 chữ số)
  if (!/^\d{5,10}$/.test(messageText)) {
    await deleteSession(userId);
    return ctx.reply("❌ ID người dùng không hợp lệ.");
  }

  const newUserId = parseInt(messageText);

  try {
    const existingUser = await queryDb(
      `SELECT * FROM users WHERE user_id = ?`,
      [newUserId],
    );

    if (existingUser) {
      return ctx.reply("❌ Người dùng này đã tồn tại.");
    }

    await runDb(`INSERT INTO users (user_id, role) VALUES (?, 1)`, [newUserId]);

    await deleteSession(userId);
    return ctx.reply(`✅ Người dùng với ID ${newUserId} đã được thêm.`);
  } catch (err) {
    console.error("DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("❌ Lỗi khi thêm người dùng.");
  }
};
