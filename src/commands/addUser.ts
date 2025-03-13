import { Context } from "telegraf";
import db from "../database/sqlite/db";
import { deleteSession, setSession } from "../stores/session";
import { queryDb, runDb } from "../stores/database";
import { sendMessage } from "../services/bot-service";

// 📌 Lệnh thêm user
export const addUserCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await setSession(userId, { action: "add_user" });

  try {
    const row = await queryDb(
      `SELECT * FROM users WHERE user_id = ? AND role = 0`,
      [userId],
    );

    if (!row || row.length === 0) {
      await deleteSession(userId);
      return ctx.reply("🚫 Bạn không có quyền tạo người dùng.");
    }

    return ctx.reply("👀 Vui lòng nhập ID người dùng mới (5-10 chữ số).");
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi truy vấn database. Vui lòng thử lại sau.");
  }
};

// 📌 Thêm user mới
export const addUser = async (ctx: Context | any) => {
  const userId = ctx.from?.id;
  const messageText = ctx.message?.text?.trim();

  // Kiểm tra ID hợp lệ (số, từ 5 đến 10 chữ số)
  if (!messageText || !/^\d{5,10}$/.test(messageText)) {
    await deleteSession(userId);
    return ctx.reply(
      "🚫 ID người dùng không hợp lệ. Vui lòng nhập số từ 5 đến 10 chữ số.",
    );
  }

  const newUserId = parseInt(messageText, 10);

  try {
    const existingUser = await queryDb(
      `SELECT * FROM users WHERE user_id = ?`,
      [newUserId],
    );

    if (existingUser && existingUser.length > 0) {
      await deleteSession(userId);
      console.log(`⚠️ Người dùng này đã tồn tại.`);
      return ctx.reply("⚠️ Người dùng này đã tồn tại.");
    }

    await runDb(`INSERT INTO users (user_id, role) VALUES (?, 1)`, [newUserId]);

    await deleteSession(userId);
    console.log(`✅ Người dùng với ID ${newUserId} đã được thêm thành công.`);
    await sendMessage(newUserId, `🎉 Chào mừng bạn đến với tổ lười 🫠.`);
    return ctx.replyWithHTML(
      `✅ Người dùng với ID <a href="tg://user?id=${newUserId}">${newUserId}</a> đã được thêm thành công.`,
    );
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi thêm người dùng. Vui lòng thử lại.");
  }
};
