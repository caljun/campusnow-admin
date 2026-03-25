import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

type PostType = "post" | "board" | "announcement";

interface PostInput {
  id: string;
  type: PostType;
  displayName: string;
  text: string;
  title?: string;
  anonymous?: boolean;
}

const TYPE_LABEL: Record<PostType, string> = {
  post: "投稿",
  board: "掲示板",
  announcement: "告知",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { posts } = req.body as { posts: PostInput[] };
  if (!posts || posts.length === 0) return res.status(200).json([]);

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

  const postList = posts
    .map((p) => {
      const poster = p.type === "post" && p.anonymous ? "匿名" : p.displayName;
      const header = `ID: ${p.id}\n種別: ${TYPE_LABEL[p.type]}\n投稿者: ${poster}${p.title ? `\nタイトル: ${p.title}` : ""}`;
      return `${header}\n内容: ${p.text}`;
    })
    .join("\n\n---\n\n");

  const prompt = `以下はキャンパス施設内のSNSへの投稿一覧です。各投稿について、以下の基準で問題があるかどうかを判定してください。

【問題とみなす基準】
- 誹謗中傷・暴言・侮辱的な表現
- 性的な内容
- 特定個人への攻撃・ハラスメント
- スパム・宣伝・無意味な繰り返し
- 差別的な発言

【投稿一覧】
${postList}

以下のJSON形式のみで返答してください（説明文や\`\`\`は不要）:
[{"id":"投稿ID","flagged":true/false,"reason":"問題がある場合の理由（日本語）、問題なければ空文字"}]`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = (result.text ?? "").trim();
    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "スキャンに失敗しました" });
  }
}
