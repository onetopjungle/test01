import { Context } from "telegraf";
import db from "../database/sqlite/db";

export const addUserCommand = (ctx: Context, newUserId: number) => {

    // Kiểm tra xem newUserId có trong database không
    db.get(`SELECT * FROM users WHERE user_id = ?`, [newUserId], (err, row: any) => {
        if (err) {
            return ctx.reply("❌ Lỗi khi truy vấn database.");
        }

        if (row) {
            // Nếu người dùng đã tồn tại
            return ctx.reply("❌ Người dùng này đã tồn tại");
        } else {
            // Nếu người dùng chưa tồn tại, thêm vào database với role mặc định là 1
            db.run(
                `INSERT INTO users (user_id, role) VALUES (?, 1)`,
                [newUserId],
                (err) => {
                    if (err) {
                        return ctx.reply("❌ Lỗi khi thêm người dùng vào database.");
                    } else {
                        return ctx.reply(`✅ Người dùng với ID ${newUserId} đã được thêm vào database với role mặc định.`);
                    }
                }
            );
        }
    });
};
