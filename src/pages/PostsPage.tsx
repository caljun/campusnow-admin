import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";
import ConfirmModal from "../components/ConfirmModal";
import { GoogleGenAI } from "@google/genai";

type PostType = "post" | "board" | "announcement";

interface Post {
  id: string;
  type: PostType;
  uid: string;
  displayName: string;
  text: string;
  title?: string;
  replyCount?: number;
  anonymous?: boolean;
  createdAt: number;
}

interface ScanResult {
  flagged: boolean;
  reason: string;
}

const TYPE_LABEL: Record<PostType, string> = {
  post: "投稿",
  board: "掲示板",
  announcement: "告知",
};

const TYPE_COLOR: Record<PostType, string> = {
  post: "bg-indigo-900/50 text-indigo-300",
  board: "bg-emerald-900/50 text-emerald-300",
  announcement: "bg-amber-900/50 text-amber-300",
};

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(diff / 60000);
  if (sec < 60) return `${sec}秒前`;
  if (min < 60) return `${min}分前`;
  return `${Math.floor(min / 60)}時間前`;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});
  const [scanning, setScanning] = useState(false);
  const [typeFilter, setTypeFilter] = useState<PostType | "all">("all");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "posts"), (snap) => {
      setPosts(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Post))
          .sort((a, b) => b.createdAt - a.createdAt)
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "posts", confirm.id));
      setConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  const runScan = async () => {
    if (posts.length === 0) return;
    setScanning(true);
    setScanResults({});

    try {
      const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const postList = posts
        .map((p) => {
          const header = p.type === "post"
            ? `ID: ${p.id}\n種別: 投稿\n投稿者: ${p.anonymous ? "匿名" : p.displayName}`
            : `ID: ${p.id}\n種別: ${TYPE_LABEL[p.type]}\nタイトル: ${p.title ?? ""}\n投稿者: ${p.displayName}`;
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

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const text = (result.text ?? "").trim();

      const parsed: Array<{ id: string; flagged: boolean; reason: string }> = JSON.parse(text);
      const map: Record<string, ScanResult> = {};
      parsed.forEach((r) => { map[r.id] = { flagged: r.flagged, reason: r.reason }; });
      setScanResults(map);
    } catch (e) {
      console.error(e);
      alert("スキャンに失敗しました。");
    } finally {
      setScanning(false);
    }
  };

  const displayed = typeFilter === "all" ? posts : posts.filter((p) => p.type === typeFilter);
  const flaggedCount = Object.values(scanResults).filter((r) => r.flagged).length;

  const counts = {
    all: posts.length,
    post: posts.filter((p) => p.type === "post").length,
    board: posts.filter((p) => p.type === "board").length,
    announcement: posts.filter((p) => p.type === "announcement").length,
  };

  return (
    <Layout>
      {confirm && (
        <ConfirmModal
          message={`「${confirm.label}」を削除しますか？`}
          onConfirm={handleDelete}
          onCancel={() => !deleting && setConfirm(null)}
          confirmLabel={deleting ? "削除中..." : "削除する"}
        />
      )}

      <div className="p-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">投稿管理</h1>
            <p className="text-sm text-gray-500">
              全 {loading ? "—" : posts.length} 件
              {flaggedCount > 0 && (
                <span className="ml-3 text-red-400">⚠ 要確認 {flaggedCount}件</span>
              )}
            </p>
          </div>
          <button
            onClick={runScan}
            disabled={scanning || loading || posts.length === 0}
            className="text-xs px-3 py-1.5 rounded-lg border border-indigo-700 text-indigo-400 hover:bg-indigo-900/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {scanning ? (
              <>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                スキャン中...
              </>
            ) : (
              "✦ AIスキャン"
            )}
          </button>
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-1.5 mb-4">
          {(["all", "post", "board", "announcement"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                typeFilter === t
                  ? "border-gray-600 text-gray-200 bg-gray-800"
                  : "border-gray-800 text-gray-500 hover:bg-gray-800/50"
              }`}
            >
              {t === "all" ? "すべて" : TYPE_LABEL[t]}
              <span className="ml-1.5 text-gray-600">{counts[t]}</span>
            </button>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <svg className="animate-spin w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-16 text-center text-gray-600 text-sm">投稿がありません</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">種別</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">投稿者</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">内容</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">AI判定</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">投稿時刻</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {displayed.map((post) => {
                  const result = scanResults[post.id];
                  const isFlagged = result?.flagged === true;

                  return (
                    <tr
                      key={post.id}
                      className={`hover:bg-gray-800/50 transition ${isFlagged ? "bg-red-950/20" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${TYPE_COLOR[post.type]}`}>
                          {TYPE_LABEL[post.type]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-400 font-bold text-xs flex-shrink-0">
                            {post.anonymous ? "匿" : (post.displayName?.charAt(0) ?? "?")}
                          </div>
                          <span className="text-white font-medium">
                            {post.anonymous ? "匿名" : post.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-300 max-w-xs">
                        {post.title && (
                          <p className="text-white text-xs font-medium truncate mb-0.5">{post.title}</p>
                        )}
                        <p className="truncate text-gray-400">{post.text}</p>
                        {post.type === "board" && post.replyCount != null && (
                          <p className="text-xs text-gray-600 mt-0.5">返信 {post.replyCount}件</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {!result ? (
                          <span className="text-gray-700 text-xs">—</span>
                        ) : isFlagged ? (
                          <div>
                            <span className="text-xs text-red-400 font-medium">⚠ 要確認</span>
                            {result.reason && (
                              <p className="text-xs text-red-500/70 mt-0.5 max-w-[160px] truncate" title={result.reason}>
                                {result.reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-500">✓ 問題なし</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {timeAgo(post.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() =>
                            setConfirm({
                              id: post.id,
                              label: post.title ?? post.text.slice(0, 20),
                            })
                          }
                          className="text-xs text-red-400 border border-red-900 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
