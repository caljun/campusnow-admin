import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";

interface User {
  uid: string;
  displayName: string;
  email: string;
  department?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-xl font-bold text-white mb-1">ユーザー管理</h1>
        <p className="text-sm text-gray-500 mb-8">全 {loading ? "—" : users.length} 人</p>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
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
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">名前</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">メール</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium">所属</th>
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
