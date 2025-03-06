import { Telegraf } from "telegraf";
import dotenv from "dotenv";
dotenv.config();
const bot = new Telegraf(process.env.BOT_TOKEN || "");

// Hàm gửi tin nhắn cho người dùng
export const sendMessage = async (chatId: number, message: string) => {
  try {
    await bot.telegram.sendMessage(chatId, message);
    console.log(`${chatId}: ${message}`);
  } catch (error) {
    console.error(`${chatId}:`, error);
  }
};
