import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";
import ConfirmModal from "../components/ConfirmModal";

interface User {
  uid: string;
  displayName: string;
  email: string;
  department?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ uid: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(
        snap.docs
          .map((d) => d.data() as User)
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleDeleteUser = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      const { uid } = confirm;

      // 1. このユーザーの投稿を全件取得
      const postsSnap = await getDocs(query(collection(db, "posts"), where("uid", "==", uid)));

      // 2. 掲示板投稿のrepliesを削除
      await Promise.all(
        postsSnap.docs
          .filter((p) => p.data().type === "board")
          .map(async (p) => {
            const repliesSnap = await getDocs(collection(db, "posts", p.id, "replies"));
            await Promise.all(repliesSnap.docs.map((r) => deleteDoc(r.ref)));
          })
      );

      // 3. 投稿を全件削除
      await Promise.all(postsSnap.docs.map((p) => deleteDoc(p.ref)));

      // 4. Firestoreのユーザードキュメント削除
      await deleteDoc(doc(db, "users", uid));

      // 5. Firebase Auth アカウント削除
      await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });

      setConfirm(null);
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました。");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      {confirm && (
        <ConfirmModal
          message={`${confirm.name} のアカウントを削除しますか？\nこのユーザーの投稿・掲示板・返信もすべて削除されます。`}
          confirmLabel={deleting ? "削除中..." : "削除する"}
          onConfirm={handleDeleteUser}
          onCancel={() => { if (!deleting) setConfirm(null); }}
        />
      )}

      <div className="p-4 sm:p-8">
        <h1 className="text-xl font-bold text-white mb-1">ユーザー管理</h1>
        <p className="text-sm text-gray-500 mb-8">全 {loading ? "—" : users.length} 人</p>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
          {loading ? (
            <div className="py-16 flex justify-center">
              <svg className="animate-spin w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-gray-600 text-sm">ユーザーがいません</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-3 sm:px-5 py-3 text-xs text-gray-500 font-medium">名前</th>
                  <th className="text-left px-3 sm:px-5 py-3 text-xs text-gray-500 font-medium">メール</th>
                  <th className="hidden sm:table-cell text-left px-3 sm:px-5 py-3 text-xs text-gray-500 font-medium">所属</th>
                  <th className="px-3 sm:px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-gray-800/50 transition">
                    <td className="px-3 sm:px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-400 font-bold text-xs flex-shrink-0">
                          {u.displayName?.charAt(0) ?? "?"}
                        </div>
                        <span className="text-white font-medium">{u.displayName}</span>
                      </div>
                      {/* スマホでは所属カラムを隠すので、名前欄の下に表示 */}
                      {u.department && <p className="sm:hidden text-xs text-gray-500 mt-1">{u.department}</p>}
                    </td>
                    <td className="px-3 sm:px-5 py-3.5 text-gray-400">{u.email}</td>
                    <td className="hidden sm:table-cell px-3 sm:px-5 py-3.5 text-gray-400">{u.department || "—"}</td>
                    <td className="px-3 sm:px-5 py-3.5 text-right">
                      <button
                        onClick={() => setConfirm({ uid: u.uid, name: u.displayName })}
                        className="text-xs text-red-400 border border-red-900 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
