import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";

export default function DashboardPage() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "users"), (snap) => {
      setTotalUsers(snap.size);
      setCheckedInCount(snap.docs.filter((d) => d.data().checkedIn).length);
    });
    const unsub2 = onSnapshot(collection(db, "mapPosts"), (snap) => {
      const now = Date.now();
      setPostCount(snap.docs.filter((d) => d.data().expiresAt > now).length);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const stats = [
    { label: "総ユーザー数", value: totalUsers, color: "text-indigo-400" },
    { label: "チェックイン中", value: checkedInCount, color: "text-emerald-400" },
    { label: "アクティブ投稿", value: postCount, color: "text-amber-400" },
  ];

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-xl font-bold text-white mb-1">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mb-8">QUINTBRIDGE — リアルタイム概要</p>

        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <p className="text-xs text-gray-500 mb-3">{s.label}</p>
              <p className={`text-4xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
