import { Context } from "telegraf";
import { runDb } from "../stores/database";

export const offAutoCheckinCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  try {
    await runDb(`UPDATE users SET is_auto_checkin = 0 WHERE user_id = ?`, [
      userId,
    ]);
    await ctx.reply("⛔ Bạn đã tắt chế độ tự động check-in!");
  } catch (error) {
    console.error("❌ Lỗi khi tắt auto check-in:", error);
    await ctx.reply("⚠️ Có lỗi xảy ra! Vui lòng thử lại sau.");
  }
};
