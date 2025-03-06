import axios from "axios";
import { listAddress } from "../constant";
import { deleteSession, setSession } from "../stores/session";
import db from "../database/sqlite/db";

export const checkinCommand = async (ctx: any) => {
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
    } else {
      const parts = row?.access_token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      const exp = payload.exp;
      const now = new Date().getTime() / 1000;
      console.log("exp < now", exp < now);
      if (exp < now) {
        return ctx.reply("👀 Vui lòng nhập access token");
      }
    }

    const checkinResponse = await requestCheckin(row?.access_token);
    if (!checkinResponse) {
      return ctx.reply("Checkin thất bại");
    }

    await deleteSession(userId);
    return ctx.reply(`${checkinResponse?.data?.message}`);
  } catch (err) {
    await deleteSession(userId);
    return ctx.reply("❌ Lỗi khi checkin.");
  }
};

export const checkin = async (ctx: any) => {
  const userId = ctx.from?.id;
  const messageText = ctx.message.text;
  db.run(`UPDATE users SET access_token = ? WHERE user_id = ?`, [
    messageText,
    userId,
  ]);

  const checkinResponse = await requestCheckin(messageText);
  if (!checkinResponse) {
    return ctx.reply("Checkin thất bại");
  }
  await deleteSession(userId);
  return ctx.reply(`${checkinResponse?.data?.message}`);
};

export const requestCheckin = async (accessToken: string) => {
  const url =
    "https://api-gateway.acheckin.io/v2/mobile/user-workspaces/checkin";

  const headers = {
    Host: "api-gateway.acheckin.io",
    "Access-Control-Allow-Origin": "*",
    "x-timestamp": `${new Date().getTime()}`,
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

  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error("API call failed:", error);
  }
};
