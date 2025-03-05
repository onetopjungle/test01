import redis from "../database/redis/redis";

export const setSession = async (userId: number, data: object) => {
    await redis.set(`userSession:${userId}`, JSON.stringify(data));
};

export const getSession = async (userId: number) => {
    const session = await redis.get(`userSession:${userId}`);
    return session ? JSON.parse(session) : null;
};

export const deleteSession = async (userId: number) => {
    await redis.del(`userSession:${userId}`);
};
