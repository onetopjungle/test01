import { Context } from "telegraf";
import db from "../database/sqlite/db";
import { deleteSession, setSession } from "../stores/session";

export const addUserCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;

  if (!userId) {
    return ctx.reply("❌ Không thể xác định ID của bạn.");
  }

  await setSession(userId, { action: "adduser" });

  // Kiểm tra quyền admin
  db.get(
    `SELECT * FROM users WHERE user_id = ? AND role = 0`,
    [userId],
    (err, row: any) => {
      if (err) {
        deleteSession(userId);
        return ctx.reply("❌ Lỗi khi truy vấn database.");
      }

      if (!row) {
        deleteSession(userId);
        return ctx.reply("❌ Bạn không có quyền tạo người dùng.");
      }

      return ctx.reply("👀 Vui lòng nhập ID người dùng mới.");
    },
  );
};

export const addUser = async (
  ctx: Context,
  userId: number,
  messageText: string,
) => {
  const newUserId = parseInt(messageText);

  // Kiểm tra ID có hợp lệ không
  if (
    isNaN(newUserId) ||
    !Number.isInteger(newUserId) ||
    newUserId < 10000 ||
    newUserId > 9999999999
  ) {
    await deleteSession(userId);
    return ctx.reply("❌ ID người dùng không hợp lệ.");
  }

  // Kiểm tra xem người dùng đó đã có trong database chưa
  db.get(
    `SELECT * FROM users WHERE user_id = ?`,
    [newUserId],
    (err, existingUser) => {
      if (err) {
        return ctx.reply("❌ Lỗi khi truy vấn.");
      }

      if (existingUser) {
        return ctx.reply("❌ Người dùng này đã tồn tại.");
      }

      // Nếu chưa có, thêm người dùng mới với role mặc định là 1
      db.run(
        `INSERT INTO users (user_id, role) VALUES (?, 1)`,
        [newUserId],
        (err) => {
          if (err) {
            return ctx.reply("❌ Lỗi khi thêm người dùng.");
          }
          return ctx.reply(`✅ Người dùng với ID ${newUserId} đã được thêm.`);
        },
      );
    },
  );

  await deleteSession(userId);
  return;
};
