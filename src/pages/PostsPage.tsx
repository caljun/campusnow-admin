import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";
import ConfirmModal from "../components/ConfirmModal";

interface Post {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  createdAt: number;
  expiresAt: number;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(diff / 60000);
  if (sec < 60) return `${sec}秒前`;
  if (min < 60) return `${min}分前`;
  return `${Math.floor(min / 60)}時間前`;
}

function timeLeft(ms: number): string {
  const diff = ms - Date.now();
  if (diff <= 0) return "期限切れ";
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(diff / 60000);
  if (sec < 60) return `${sec}秒後に削除`;
  return `${min}分後に削除`;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [showExpired, setShowExpired] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mapPosts"), (snap) => {
      setPosts(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Post))
          .sort((a, b) => b.createdAt - a.createdAt)
      );
    });
    return unsub;
  }, []);

  const handleDelete = async () => {
    if (!confirm) return;
    await deleteDoc(doc(db, "mapPosts", confirm.id));
    setConfirm(null);
  };

  const now = Date.now();
  const active = posts.filter((p) => p.expiresAt > now);
  const expired = posts.filter((p) => p.expiresAt <= now);
  const displayed = showExpired ? posts : active;

  return (
    <Layout>
      {confirm && (
        <ConfirmModal
          message={`「${confirm.text}」を削除しますか？`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="p-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">投稿管理</h1>
            <p className="text-sm text-gray-500">アクティブ {active.length}件 / 期限切れ {expired.length}件</p>
          </div>
          <button
            onClick={() => setShowExpired((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${
              showExpired ? "border-gray-600 text-gray-300 bg-gray-800" : "border-gray-700 text-gray-500 hover:bg-gray-800"
            }`}
          >
            {showExpired ? "期限切れを非表示" : "期限切れも表示"}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {displayed.length === 0 ? (
            <div className="py-16 text-center text-gray-600 text-sm">投稿がありません</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">投稿者</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">内容</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">投稿時刻</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">残り時間</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {displayed.map((post) => {
                  const isExpired = post.expiresAt <= now;
                  return (
                    <tr key={post.id} className={`hover:bg-gray-800/50 transition ${isExpired ? "opacity-40" : ""}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-400 font-bold text-xs flex-shrink-0">
                            {post.displayName?.charAt(0) ?? "?"}
                          </div>
                          <span className="text-white font-medium">{post.displayName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-300 max-w-xs">
                        <p className="truncate">{post.text}</p>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{timeAgo(post.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs ${isExpired ? "text-gray-600" : "text-amber-400"}`}>
                          {timeLeft(post.expiresAt)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setConfirm({ id: post.id, text: post.text })}
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
