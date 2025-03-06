import db from "../database/sqlite/db";

export const userMiddleware = async (ctx: any, next: any) => {
  const userId = ctx.from?.id;

  if (ctx?.message?.text === "/setAdmin=uBGgTNpsV8Hao7Ko") {
    db.run(
      `INSERT OR REPLACE INTO users (user_id, role) VALUES (?, 0)`,
      [userId],
      (err) => {
        if (err) {
          return ctx.reply("❌ Lỗi khi cập nhật quyền admin.");
        }

        ctx.reply("✅ Bạn đã được cấp quyền admin thành công.");
      },
    );
    return next();
  }

  // Kiểm tra người dùng
  db.get(`SELECT * FROM users WHERE user_id = ?`, [userId], (err, row: any) => {
    if (err) {
      return ctx.reply("❌ Lỗi khi truy vấn database.");
    }

    if (!row) {
      return ctx.reply("❌ Mẹ dặn: Nạp lần đầu đi con!");
    }

    return next();
  });
};
