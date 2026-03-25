import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

type PostType = "post" | "board" | "announcement";

interface ReplyInput {
  id: string;
  displayName: string;
  text: string;
}

interface PostInput {
  id: string;
  type: PostType;
  displayName: string;
  text: string;
  title?: string;
  anonymous?: boolean;
  replies?: ReplyInput[];
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

      // 掲示板は「タイトル」「スレッド本文」「返信」を分けて判定してほしいため、
      // 返信を含めて明示的に渡す。
      const threadBody = `スレッド本文: ${p.text}`;
      const repliesBlock =
        p.type === "board" && p.replies && p.replies.length > 0
          ? `\n返信一覧:\n${p.replies
              .map((r, idx) => {
                const who = r.displayName ? `${r.displayName}` : "（不明）";
                return `- [${idx + 1}] ${who}\n  返信本文: ${r.text}`;
              })
              .join("\n")}`
          : "";

      return `${header}\n${threadBody}${repliesBlock}`;
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
[
  {
    "id": "投稿ID",
    "flagged": true/false,
    "reason": "問題がある場合の理由（日本語）、問題なければ空文字"
  }
]

【掲示板（種別: 掲示板）の注意】
掲示板は、入力が「タイトル」「スレッド本文」「返信一覧」に分かれています。
reasonは必ず、問題の中心が次のどれかを先頭に明記してください（1つ選ぶ/複数なら複数を併記）:
- "題名:"
- "スレッド本文:"
- "返信:"
例: "返信: 返信[2]に暴言・侮辱表現があります"`;

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = (result.text ?? "").trim();
    // モデルが前後に説明文を付けて返すケースがあるため、
    // JSON配列部分（[...]）だけを切り出してパースする。
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    const jsonText = start >= 0 && end >= start ? text.slice(start, end + 1) : text;
    const parsed = JSON.parse(jsonText);
    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "スキャンに失敗しました" });
  }
}
