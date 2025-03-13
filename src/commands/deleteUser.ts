import { Context } from "telegraf";
import { deleteSession, setSession } from "../stores/session";
import { queryDb, runDb } from "../stores/database";

// 📌 Lệnh xóa user
export const deleteUserCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await setSession(userId, { action: "delete_user" });

  try {
    const row = await queryDb(
      `SELECT * FROM users WHERE user_id = ? AND role = 0`,
      [userId],
    );

    if (!row || row.length === 0) {
      await deleteSession(userId);
      return ctx.reply("🚫 Bạn không có quyền xóa người dùng.");
    }

    return ctx.reply("🔍 Vui lòng nhập ID người dùng cần xóa.");
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi truy vấn database. Vui lòng thử lại sau.");
  }
};

// 📌 Xóa user
export const deleteUser = async (ctx: Context | any) => {
  const userId = ctx.from?.id;
  const messageText = ctx.message?.text?.trim();

  // Kiểm tra ID hợp lệ (số, từ 5 đến 10 chữ số)
  if (!messageText || !/^\d{5,10}$/.test(messageText)) {
    await deleteSession(userId);
    return ctx.reply(
      "🚫 ID người dùng không hợp lệ. Vui lòng nhập số từ 5 đến 10 chữ số.",
    );
  }

  const deleteUserId = parseInt(messageText, 10);

  try {
    const existingUser = await queryDb(
      `SELECT * FROM users WHERE user_id = ?`,
      [deleteUserId],
    );

    if (!existingUser || existingUser.length === 0) {
      await deleteSession(userId);
      return ctx.reply("⚠️ Người dùng không tồn tại trong hệ thống.");
    }

    await runDb(`DELETE FROM users WHERE user_id = ?`, [deleteUserId]);

    await deleteSession(userId);
    console.log(`✅ Người dùng với ID ${deleteUserId} đã bị xóa.`);
    return ctx.reply(`✅ Người dùng với ID ${deleteUserId} đã bị xóa.`);
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi xóa người dùng. Vui lòng thử lại.");
  }
};
