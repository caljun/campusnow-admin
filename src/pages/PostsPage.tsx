import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";
import ConfirmModal from "../components/ConfirmModal";

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

interface Reply {
  id: string;
  uid: string;
  displayName: string;
  text: string;
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

// ── Board detail modal ──────────────────────────────────────────
function BoardDetailModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [confirmReply, setConfirmReply] = useState<Reply | null>(null);
  const [deletingReply, setDeletingReply] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "posts", post.id, "replies"), (snap) => {
      setReplies(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Reply))
          .sort((a, b) => a.createdAt - b.createdAt)
      );
      setLoadingReplies(false);
    });
    return unsub;
  }, [post.id]);

  const handleDeleteReply = async () => {
    if (!confirmReply) return;
    setDeletingReply(true);
    try {
      await deleteDoc(doc(db, "posts", post.id, "replies", confirmReply.id));
      setConfirmReply(null);
    } finally {
      setDeletingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {confirmReply && (
        <ConfirmModal
          message={`「${confirmReply.text.slice(0, 30)}」を削除しますか？`}
          confirmLabel={deletingReply ? "削除中..." : "削除する"}
          onConfirm={handleDeleteReply}
          onCancel={() => { if (!deletingReply) setConfirmReply(null); }}
        />
      )}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-emerald-900/50 text-emerald-300">掲示板</span>
            <span className="text-xs text-gray-500">{timeAgo(post.createdAt)}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Original post */}
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-white font-semibold text-sm mb-1">{post.title}</p>
          <p className="text-gray-300 text-sm leading-relaxed">{post.text}</p>
          <p className="text-xs text-gray-600 mt-2">{post.displayName}</p>
        </div>

        {/* Replies */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
            返信 {loadingReplies ? "—" : replies.length}件
          </p>
          {loadingReplies ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : replies.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-8">返信がありません</p>
          ) : (
            replies.map((reply) => (
              <div key={reply.id} className="bg-gray-800 rounded-xl px-4 py-3 flex gap-3 items-start group">
                <div className="w-7 h-7 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-400 font-bold text-xs flex-shrink-0">
                  {reply.displayName?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-300">{reply.displayName}</span>
                    <span className="text-xs text-gray-600">{timeAgo(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{reply.text}</p>
                </div>
                <button
                  onClick={() => setConfirmReply(reply)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-xs text-red-500 border border-red-900 px-2 py-1 rounded-lg hover:bg-red-900/30 transition"
                >
                  削除
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────
export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; type: PostType; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scanResults, setScanResults] = useState<Record<string, ScanResult>>({});
  const [scanning, setScanning] = useState(false);
  const [typeFilter, setTypeFilter] = useState<PostType | "all">("all");
  const [boardDetail, setBoardDetail] = useState<Post | null>(null);

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
      if (confirm.type === "board") {
        const repliesSnap = await getDocs(collection(db, "posts", confirm.id, "replies"));
        await Promise.all(repliesSnap.docs.map((r) => deleteDoc(r.ref)));
      }
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
      // 掲示板（board）は「題名」「スレッド本文」「返信」を分けて判定したいので、
      // スキャン時に返信もまとめて取得して backend に渡す。
      const repliesByPostId: Record<string, Reply[]> = {};
      const boardPosts = posts.filter((p) => p.type === "board");
      if (boardPosts.length > 0) {
        await Promise.all(
          boardPosts.map(async (p) => {
            const repliesSnap = await getDocs(collection(db, "posts", p.id, "replies"));
            const replies = repliesSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as Reply))
              .sort((a, b) => a.createdAt - b.createdAt);
            repliesByPostId[p.id] = replies;
          })
        );
      }

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts: posts.map(({ id, type, displayName, text, title, anonymous }) => ({
            id,
            type,
            displayName,
            text,
            title,
            anonymous,
            replies:
              type === "board"
                ? (repliesByPostId[id] ?? []).map((r) => ({
                    id: r.id,
                    displayName: r.displayName,
                    text: r.text,
                  }))
                : undefined,
          })),
        }),
      });
      if (!res.ok) throw new Error("scan failed");
      const parsed: Array<{ id: string; flagged: boolean; reason: string }> = await res.json();
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
          message={`「${confirm.label}」を削除しますか？${confirm.type === "board" ? "\n返信もすべて削除されます。" : ""}`}
          onConfirm={handleDelete}
          onCancel={() => { if (!deleting) setConfirm(null); }}
          confirmLabel={deleting ? "削除中..." : "削除する"}
        />
      )}
      {boardDetail && (
        <BoardDetailModal post={boardDetail} onClose={() => setBoardDetail(null)} />
      )}

      <div className="p-4 sm:p-8">
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

        <div className="flex flex-wrap gap-2 mb-4">
          {(["all", "post", "board", "announcement"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs sm:text-xs px-3 py-2 rounded-lg border transition whitespace-nowrap ${
                typeFilter === t
                  ? "border-gray-600 text-gray-200 bg-gray-800"
                  : "border-gray-800 text-gray-500 hover:bg-gray-800/50"
              }`}
            >
              {t === "all" ? "すべて" : TYPE_LABEL[t]}
              <span className="ml-1.5 text-gray-600 hidden sm:inline">{counts[t]}</span>
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
                  <th className="text-left px-3 sm:px-5 py-3 text-xs text-gray-500 font-medium">種別</th>
                  <th className="text-left px-3 sm:px-5 py-3 text-xs text-gray-500 font-medium">投稿者</th>
                  <th className="text-left px-3 sm:px-5 py-3 text-xs text-gray-500 font-medium">内容</th>
                  <th className="hidden sm:table-cell text-left px-3 sm:px-5 py-3 text-xs text-gray-500 font-medium">AI判定</th>
                  <th className="hidden sm:table-cell text-left px-3 sm:px-5 py-3 text-xs text-gray-500 font-medium">投稿時刻</th>
                  <th className="px-3 sm:px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {displayed.map((post) => {
                  const result = scanResults[post.id];
                  const isFlagged = result?.flagged === true;
                  const isBoard = post.type === "board";

                  return (
                    <tr
                      key={post.id}
                      onClick={() => isBoard && setBoardDetail(post)}
                      className={`transition ${isFlagged ? "bg-red-950/20" : ""} ${isBoard ? "hover:bg-gray-800/50 cursor-pointer" : "hover:bg-gray-800/30"}`}
                    >
                      <td className="px-3 sm:px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${TYPE_COLOR[post.type]}`}>
                          {TYPE_LABEL[post.type]}
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-400 font-bold text-xs flex-shrink-0">
                            {post.anonymous ? "匿" : (post.displayName?.charAt(0) ?? "?")}
                          </div>
                          <span className="text-white font-medium">
                            {post.anonymous ? "匿名" : post.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-5 py-3.5 text-gray-300 max-w-xs">
                        {post.title && (
                          <p className="text-white text-xs font-medium truncate mb-0.5">{post.title}</p>
                        )}
                        <p className="truncate text-gray-400">{post.text}</p>
                        {isBoard && (
                          <p className="text-xs text-emerald-600 mt-0.5">
                            返信 {post.replyCount ?? 0}件 — クリックで表示
                          </p>
                        )}
                        {/* スマホでは投稿時刻カラムを隠すので、ここに表示 */}
                        <p className="sm:hidden text-xs text-gray-500 mt-0.5">{timeAgo(post.createdAt)}</p>
                        {isFlagged && result?.reason && (
                          <p
                            className="sm:hidden text-xs text-red-400 mt-1 break-words"
                            title={result.reason}
                          >
                            AI要確認: {result.reason}
                          </p>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-5 py-3.5">
                        {!result ? (
                          <span className="text-gray-700 text-xs">—</span>
                        ) : isFlagged ? (
                          <div>
                            <span className="text-xs text-red-400 font-medium">⚠ 要確認</span>
                            {result.reason && (
                              <p
                                className="text-xs text-red-500/70 mt-0.5 max-w-[240px] whitespace-normal break-words"
                                title={result.reason}
                              >
                                {result.reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-500">✓ 問題なし</span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-5 py-3.5 text-gray-500 text-xs whitespace-normal sm:whitespace-nowrap">
                        {timeAgo(post.createdAt)}
                      </td>
                      <td className="px-3 sm:px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            setConfirm({
                              id: post.id,
                              type: post.type,
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
