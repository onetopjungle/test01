import { Context } from "telegraf";
import { listCommand } from "../constant";

// Hàm để escape các ký tự đặc biệt trong MarkdownV2
const escapeMarkdownV2 = (text: string) => {
  return text.replace(/([_*[\]()~>`#+\-=|{}.!\\])/g, "\\$1"); // Escape các ký tự đặc biệt trong MarkdownV2
};

export const helpCommand = async (ctx: Context) => {
  let commandList = listCommand
    .map(
      (cmd) =>
        `\`/${escapeMarkdownV2(cmd.command)}\` \\- ${escapeMarkdownV2(cmd.description)}`, // Escape lệnh và mô tả
    )
    .join("\n");

  await ctx.replyWithMarkdownV2(
    `🤖 *Hướng dẫn sử dụng bot:*
    
Bạn có thể dùng các lệnh sau:

${commandList}

💡 *Mẹo:* Bạn có thể nhập trực tiếp lệnh để bot thực hiện nhanh chóng\\!`,
  );
};
