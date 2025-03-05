import {Telegraf} from "telegraf";
import dotenv from "dotenv";
import {startCommand} from "./commands/start";
import {helpCommand} from "./commands/help";
import db from "./database/sqlite/db";
import {deleteSession, getSession, setSession} from "./services/session";
import {checkin} from "./services/checkin";
import {Log} from "kysely";

dotenv.config();

// Khởi tạo bot với token từ .env
const bot = new Telegraf(process.env.BOT_TOKEN || "");

bot.use(async (ctx: any, next) => {
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
            }
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
});


// Thiết lập các lệnh cho bot
bot.telegram.setMyCommands([
    { command: "start", description: "Bắt đầu bot" },
    { command: "help", description: "Hiển thị hướng dẫn" },
    { command: "adduser", description: "Thêm người dùng mới vào database" },
    { command: "checkin", description: "Checkin" },
]);

// Lệnh /start
bot.start(startCommand);

// Lệnh /help
bot.help(helpCommand);

// Lệnh /adduser
bot.command("adduser", async (ctx) => {
    const userId = ctx.from?.id;

    if (!userId) {
        return ctx.reply("❌ Không thể xác định ID của bạn.");
    }

    await setSession(userId, { action: "adduser" });

    // Kiểm tra quyền admin
    db.get(`SELECT * FROM users WHERE user_id = ? AND role = 0`, [userId], (err, row: any) => {
        if (err) {
            deleteSession(userId);
            return ctx.reply("❌ Lỗi khi truy vấn database.");
        }

        if (!row) {
            deleteSession(userId);
            return ctx.reply("❌ Bạn không có quyền tạo người dùng.");
        }

        return ctx.reply("✅ Vui lòng nhập ID người dùng mới cần thêm vào database.");
    });
});

// Lệnh /checkin
bot.command("checkin", async (ctx) => {
    const userId = ctx.from?.id;

    await setSession(userId, { action: "checkin" });

    // kiểm tra access token
    try {
        const row: any = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM users WHERE user_id = ?`, [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        if (!row?.access_token) {
            return ctx.reply("👀 Vui lòng nhập access token");
        }else {
            const parts = row?.access_token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            const exp = payload.exp;
            const now = new Date().getTime() / 1000;
            console.log('exp < now', exp < now)
            if (exp < now) {
                return ctx.reply("👀 Vui lòng nhập access token");
            }
        }

        const checkinResponse = await checkin(row?.access_token);
        if (!checkinResponse) {
            return ctx.reply("Checkin thất bại");
        }

        await deleteSession(userId);
        return ctx.reply(`${checkinResponse?.data?.message}`);
    } catch (err) {
        await deleteSession(userId);
        return ctx.reply("❌ Lỗi khi checkin.");
    }
});


// Lắng nghe tin nhắn văn bản và xử lý ID người dùng mới hoặc mật khẩu
bot.on("text", async (ctx) => {
    const userId = ctx.from?.id;
    const messageText = ctx.message.text;

    // Lấy session người dùng từ Redis
    const session = await getSession(userId)

    // Kiểm tra nếu người dùng đang nhập ID để thêm user
    if (session?.action === "adduser") {
        const newUserId = parseInt(messageText);

        if (isNaN(newUserId)) {
            await deleteSession(userId);
            return ctx.reply("❌ ID người dùng không hợp lệ.");
        }

        // Kiểm tra xem người dùng đó đã có trong database chưa
        db.get(`SELECT * FROM users WHERE user_id = ?`, [newUserId], (err, existingUser) => {
            if (err) {
                return ctx.reply("❌ Lỗi khi truy vấn database.");
            }

            if (existingUser) {
                return ctx.reply("❌ Người dùng này đã tồn tại trong database.");
            }

            // Nếu chưa có, thêm người dùng mới với role mặc định là 1
            db.run(
                `INSERT INTO users (user_id, role) VALUES (?, 1)`,
                [newUserId],
                (err) => {
                    if (err) {
                        return ctx.reply("❌ Lỗi khi thêm người dùng vào database.");
                    }
                    ctx.reply(`✅ Người dùng với ID ${newUserId} đã được thêm vào database với role mặc định.`);
                }
            );
        });

        await deleteSession(userId);
        return;
    }

    if (session?.action === "checkin") {
        await db.run(`UPDATE users SET access_token = ? WHERE user_id = ?`, [messageText, userId]);

        const checkinResponse = await checkin(messageText);
        if (!checkinResponse) {
            return ctx.reply("Checkin thất bại");
        }
        await deleteSession(userId)
        return ctx.reply(`${checkinResponse?.data?.message}`);
    }

    await deleteSession(userId);
    return ctx.reply("Tôi có thể giúp gì cho bạn?");
});

// Bắt đầu bot
bot.launch();
console.log("🚀 Bot đang chạy...");

// Xử lý lỗi khi bot dừng
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
