import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";
import ConfirmModal from "../components/ConfirmModal";

interface User {
  uid: string;
  displayName: string;
  email: string;
  department?: string;
  checkedIn: boolean;
  checkedInAt?: number;
  role?: string;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  return `${Math.floor(min / 60)}時間前`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [confirm, setConfirm] = useState<{ uid: string; name: string } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => d.data() as User).sort((a, b) => a.displayName.localeCompare(b.displayName)));
    });
    return unsub;
  }, []);

  const forceCheckOut = async () => {
    if (!confirm) return;
    await setDoc(doc(db, "users", confirm.uid), { checkedIn: false, checkedInAt: null }, { merge: true });
    setConfirm(null);
  };

  const checkedIn = users.filter((u) => u.checkedIn);

  return (
    <Layout>
      {confirm && (
        <ConfirmModal
          message={`${confirm.name} を強制チェックアウトしますか？`}
          confirmLabel="チェックアウトする"
          onConfirm={forceCheckOut}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="p-8">
        <h1 className="text-xl font-bold text-white mb-1">ユーザー管理</h1>
        <p className="text-sm text-gray-500 mb-8">全{users.length}人 / チェックイン中 {checkedIn.length}人</p>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">名前</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">メール</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">所属</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">状態</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-400 font-bold text-xs flex-shrink-0">
                        {u.displayName?.charAt(0) ?? "?"}
                      </div>
                      <span className="text-white font-medium">{u.displayName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400">{u.email}</td>
                  <td className="px-5 py-3.5 text-gray-400">{u.department || "—"}</td>
                  <td className="px-5 py-3.5">
                    {u.checkedIn ? (
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          チェックイン中
                        </span>
                        {u.checkedInAt && <p className="text-[11px] text-gray-600 mt-0.5">{timeAgo(u.checkedInAt)}</p>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">オフライン</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.checkedIn && (
                      <button
                        onClick={() => setConfirm({ uid: u.uid, name: u.displayName })}
                        className="text-xs text-red-400 border border-red-900 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition"
                      >
                        強制チェックアウト
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
