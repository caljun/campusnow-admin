import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { uid } = req.body as { uid: string };
  if (!uid) return res.status(400).json({ error: "uid required" });

  try {
    await getAuth().deleteUser(uid);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    // ユーザーがAuthに存在しない場合も正常終了とする
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "auth/user-not-found") {
      return res.status(200).json({ ok: true });
    }
    console.error(e);
    return res.status(500).json({ error: "削除に失敗しました" });
  }
}
