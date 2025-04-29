// Gợi ý updateTokenCommand giống addUserCommand

import { Context } from "telegraf";
import { queryDb, runDb2 } from "../stores/database";
import { deleteSession, setSession } from "../stores/session";
import { isValidJWTFormat } from "../utils";

export const updateTokenCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await setSession(userId, { action: "update_token" });

  try {
    const row = await queryDb(`SELECT * FROM users WHERE user_id = ?`, [
      userId,
    ]);

    if (!row || row.length === 0) {
      await deleteSession(userId);
      return ctx.reply("🚫 Người dùng không tồn tại.");
    }

    return ctx.reply("🔑 Vui lòng nhập token mới của bạn:");
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi truy vấn database. Vui lòng thử lại sau.");
  }
};

export const updateToken = async (ctx: Context | any) => {
  const userId = ctx.from?.id;
  const messageText = ctx.message?.text?.trim();

  try {
    // kiểm tra access token hợp lệ
    if (!isValidJWTFormat(messageText)) {
      await deleteSession(userId);
      return ctx.reply("🚫 Access token không hợp lệ. Vui lòng thử lại.");
    }

    const row = await runDb2(
      `UPDATE users SET access_token = ? WHERE user_id = ?`,
      [messageText, userId],
    );

    if (!row) {
      await deleteSession(userId);
      return ctx.reply("🚫 Lỗi khi cập nhật token. Vui lòng thử lại.");
    }

    await ctx.reply("✅ Cập nhật token thành công.");

    await deleteSession(userId);
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi truy vấn database. Vui lòng thử laị.");
  }
};
