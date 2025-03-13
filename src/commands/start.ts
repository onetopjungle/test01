import { Context } from "telegraf";
import { queryDb } from "../stores/database";
import { format } from "date-fns";
import { jwtDecode } from "jwt-decode";

// Hàm để escape các ký tự đặc biệt trong MarkdownV2
const escapeMarkdownV2 = (text: string) => {
  return text
    .replace(/([_*[\]()~>`#+\-=|{}.!\\])/g, "\\$1") // Escape các ký tự đặc biệt trong MarkdownV2
    .replace(/!/g, "\\!"); // Escape dấu '!' nếu có
};

// Hàm chuyển đổi timestamp thành định dạng ngày tháng giờ phút giây
const formatExpirationDate = (timestamp: number) => {
  const expirationDate = new Date(timestamp * 1000); // Chuyển đổi từ giây sang mili giây
  return format(expirationDate, "dd/MM/yyyy HH:mm:ss"); // Định dạng với date-fns
};

export const startCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) {
    return ctx.reply("⚠️ Không thể lấy thông tin người dùng.");
  }

  try {
    // Lấy thông tin người dùng từ DB
    const user = await queryDb(
      `SELECT user_id, role, access_token, is_auto_checkin FROM users WHERE user_id = ?`,
      [userId],
    );

    if (!user) {
      return ctx.reply(
        `🔍 Không tìm thấy thông tin người dùng. Vui lòng thử lại.`,
      );
    }

    let expirationDate = "Không có thông tin hết hạn";

    if (user.access_token) {
      // Giải mã JWT token để lấy thời gian hết hạn
      const decodedToken: any = jwtDecode(user.access_token); // Giải mã JWT
      expirationDate = decodedToken.exp
        ? formatExpirationDate(decodedToken.exp)
        : "Không có thông tin hết hạn";
    }

    // Lấy tên người dùng và escape tất cả các ký tự đặc biệt
    const userName = escapeMarkdownV2(ctx.from?.first_name || "người dùng");

    // Xây dựng thông điệp và escape tất cả các ký tự đặc biệt
    const message = `🎉 Chào mừng ${userName} 

✨ Bạn đã đăng nhập thành công. Đây là thông tin của bạn:

- 📛 ID người dùng: ${user.user_id}
- 🏷️ Vai trò: ${user.role === 1 ? "User" : "Admin"}
- ✅ Status check-in: ${user.is_auto_checkin === 1 ? "Auto" : "Manual"}
- ⏳ Thời gian hết hạn token: ${expirationDate}

Hãy sử dụng các lệnh để bắt đầu hành trình với bot`;

    // Escape dấu '!' nếu có
    const escapedMessage = escapeMarkdownV2(message);

    // Hiển thị thông điệp đã được escape đúng cách
    await ctx.replyWithMarkdownV2(escapedMessage);
  } catch (error) {
    console.error("❌ Lỗi khi lấy thông tin người dùng:", error);
    await ctx.reply("⚠️ Đã xảy ra lỗi khi lấy thông tin người dùng.");
  }
};
