import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";

export default function DashboardPage() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [postCount, setPostCount] = useState<number | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "users"), (snap) => {
      setTotalUsers(snap.size);
    });
    const unsub2 = onSnapshot(collection(db, "posts"), (snap) => {
      setPostCount(snap.docs.filter((d) => d.data().type === "post").length);
      setBoardCount(snap.docs.filter((d) => d.data().type === "board").length);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const stats = [
    { label: "総ユーザー数", value: totalUsers, color: "text-indigo-400" },
    { label: "投稿件数", value: postCount, color: "text-amber-400" },
    { label: "掲示板スレッド", value: boardCount, color: "text-emerald-400" },
  ];

  return (
    <Layout>
      <div className="p-4 sm:p-8">
        <h1 className="text-xl font-bold text-white mb-1">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mb-8">QUINTBRIDGE — リアルタイム概要</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <p className="text-xs text-gray-500 mb-3">{s.label}</p>
              {s.value === null ? (
                <div className="h-10 flex items-center">
                  <svg className="animate-spin w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              ) : (
                <p className={`text-4xl font-bold ${s.color}`}>{s.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
