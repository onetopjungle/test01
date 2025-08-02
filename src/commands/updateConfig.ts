import { Context } from "telegraf";
import { queryDb, runDb2 } from "../stores/database";
import { deleteSession, setSession } from "../stores/session";

export const updateConfigCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await setSession(userId, { action: "update_config" });

  try {
    const row = await queryDb(
      `SELECT *
       FROM users
       WHERE user_id = ?`,
      [userId],
    );

    if (!row || row.length === 0) {
      await deleteSession(userId);
      return ctx.reply("🚫 Người dùng không tồn tại.");
    }

    return ctx.reply("🔑 Vui lòng nhập config mới của bạn:");
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi truy vấn database. Vui lòng thử lại sau.");
  }
};

export const updateConfig = async (ctx: Context | any) => {
  const userId = ctx.from?.id;
  const messageText = ctx.message?.text?.trim();

  try {
    // kiểm tra config hợp lệ
    if (!isCurlCommand(messageText)) {
      await deleteSession(userId);
      return ctx.reply("🚫 Config không hợp lệ. Vui lòng thử lại.");
    }

    // Trích xuất access token từ curl
    const accessTokenMatch = messageText.match(
      /-H\s+'Authorization: ([^']+)'/i,
    );
    const detech_access_token = accessTokenMatch?.[1] || null;

    if (!detech_access_token) {
      await deleteSession(userId);
      return ctx.reply("🚫 Không tìm thấy access token trong config.");
    }

    // Cập nhật access_token
    const row = await runDb2(
      `UPDATE users
       SET access_token = ?
       WHERE user_id = ?`,
      [detech_access_token, userId],
    );

    if (!row) {
      await deleteSession(userId);
      return ctx.reply("🚫 Lỗi khi cập nhật config. Vui lòng thử lại.");
    }

    const row2 = await runDb2(
      `UPDATE users
       SET meta_data = ?
       WHERE user_id = ?`,
      [messageText, userId],
    );

    if (!row2) {
      await deleteSession(userId);
      return ctx.reply("🚫 Lỗi khi cập nhật config. Vui lòng thử lại.");
    }

    await ctx.reply("✅ Cập nhật config thành công.");

    await deleteSession(userId);
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi truy vấn database. Vui lòng thử laị.");
  }
};

const isCurlCommand = (input: string): boolean => {
  const pattern = /^curl\s+(["']?-X\s+\w+["']?\s+)?(.*https?:\/\/[^\s'"]+)/i;
  return pattern.test(input.trim());
};
