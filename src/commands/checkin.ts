import axios from "axios";
import { listAddress } from "../constant";
import { deleteSession, setSession } from "../stores/session";
import { queryDb, runDb } from "../stores/database";
import { Context } from "telegraf";
import { isValidJWTFormat } from "../utils";
import { isNil } from "lodash";

// Lệnh checkin
export const checkinCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await setSession(userId, { action: "checkin" });

  try {
    const row = await queryDb(`SELECT * FROM users WHERE user_id = ?`, [
      userId,
    ]);

    if (!row?.access_token) {
      return ctx.reply("👀 Vui lòng nhập access token");
    }

    // Kiểm tra token hết hạn
    const payload = JSON.parse(
      Buffer.from(row.access_token.split(".")[1], "base64").toString(),
    );

    if (payload.exp < Date.now() / 1000) {
      return ctx.reply("👀 Vui lòng nhập access token mới.");
    }

    const response = await requestCheckin(row.access_token);
    await deleteSession(userId);
    return ctx.reply(
      response?.data?.message || response?.response?.data?.message,
    );
  } catch (err) {
    console.error("Checkin error:", err);
    await deleteSession(userId);
    return ctx.reply("❌ Lỗi khi checkin.");
  }
};

export const checkin = async (ctx: Context | any) => {
  const userId = ctx.from?.id;
  const messageText = ctx.message.text;

  if (!isValidJWTFormat(messageText)) {
    await deleteSession(userId);
    return ctx.reply("❌ Access token không hợp lệ. Vui lòng thử lại");
  }

  try {
    await runDb(`UPDATE users SET access_token = ? WHERE user_id = ?`, [
      messageText,
      userId,
    ]);

    const response = await requestCheckin(messageText);
    if (isNil(response?.data?.message) || isNaN(response?.data?.message)) {
      await deleteSession(userId);
      //delete access token
      await runDb(`UPDATE users SET access_token = ? WHERE user_id = ?`, [
        null,
        userId,
      ]);
      return ctx.reply("❌ Lỗi khi checkin.");
    }
    await deleteSession(userId);
    return ctx.reply(
      response?.data?.message || response?.response?.data?.message,
    );
  } catch (err) {
    console.error("Checkin error:", err);
    await deleteSession(userId);
    return ctx.reply("❌ Lỗi khi checkin.");
  }
};

// Gọi API checkin
export const requestCheckin = async (accessToken: string) => {
  try {
    const headers = {
      Host: "api-gateway.acheckin.io",
      "Access-Control-Allow-Origin": "*",
      "x-timestamp": `${Date.now()}`,
      provider: "GOOGLE",
      Accept: "*/*",
      Authorization: accessToken,
      "x-workspace-host": "mirailabs.acheckin.io",
      "x-signature":
        "soula0gjfOluN7mWztVxHpuBy0HzPF4EdrU4uuLjB0ZONDsjmBO3pEKtkxKt3hRI+F+VKoHf7uDqnmPhGzv+vg==",
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      "x-workspace-id": "562c982f-3153-449e-98e8-f1431c434e9c",
      "User-Agent": "ACheckin%20HRM/15 CFNetwork/3826.400.120 Darwin/24.3.0",
      "x-device-id": "EC5638D2-39DA-4777-8394-A772567E1C80",
      Connection: "keep-alive",
      "Content-Type": "application/json",
    };

    const pickAddress =
      listAddress[Math.floor(Math.random() * listAddress.length)];

    const data = {
      latitude: pickAddress.latitude,
      longitude: pickAddress.longitude,
      device_name: "iPhone",
    };

    const response = await axios.post(
      "https://api-gateway.acheckin.io/v2/mobile/user-workspaces/checkin",
      data,
      { headers },
    );
    return response.data;
  } catch (error) {
    console.error("API call failed:", error);
    return error;
  }
};
