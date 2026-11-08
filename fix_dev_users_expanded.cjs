const fs = require('fs');
let appCode = fs.readFileSync('components/FloatingUI.tsx', 'utf8');

const target1 = `  const [devActiveTab, setDevActiveTab] = useState<'APPROVAL' | 'MEMBERSHIP' | 'REJECTED'>('APPROVAL');`;
const replace1 = `  const [devActiveTab, setDevActiveTab] = useState<'APPROVAL' | 'MEMBERSHIP' | 'REJECTED'>('APPROVAL');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);`;
appCode = appCode.replace(target1, replace1);

const target2 = `                                            <div className="text-xs font-black text-white">{user.username}</div>
                                            <div className="text-[8px] text-zinc-500">{user.role}</div>
                                        </div>
                                        <div className={\`px-2 py-1 \${user.role === 'PENDING' ? 'bg-yellow-900/20 text-yellow-500' : 'bg-zinc-900'} rounded text-[8px] font-bold \${user.role !== 'PENDING' ? (user.membershipTier !== 'NONE' ? 'text-green-500' : 'text-red-500') : ''}\`}>`;

const replace2 = `                                            <div 
                                                className="text-xs font-black text-white cursor-pointer hover:text-purple-400 transition-colors"
                                                onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                                            >
                                                {user.username} {expandedUserId === user.id ? '▼' : '▶'}
                                            </div>
                                            <div className="text-[8px] text-zinc-500">{user.role}</div>
                                        </div>
                                        <div className={\`px-2 py-1 \${user.role === 'PENDING' ? 'bg-yellow-900/20 text-yellow-500' : 'bg-zinc-900'} rounded text-[8px] font-bold \${user.role !== 'PENDING' ? (user.membershipTier !== 'NONE' ? 'text-green-500' : 'text-red-500') : ''}\`}>`;

appCode = appCode.replace(target2, replace2);

const target3 = `                                    {devActiveTab === 'MEMBERSHIP' && (
                                        <>
                                            <div className="grid grid-cols-4 gap-2 mt-4">`;

const replace3 = `                                    {devActiveTab === 'MEMBERSHIP' && (
                                        <>
                                            {expandedUserId === user.id && (
                                                <div className="mt-3 p-3 bg-[#111] border border-zinc-800 rounded-xl space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Password:</span>
                                                        <span className="text-[10px] font-mono text-zinc-300">{user.password || 'Google Auth (No Password)'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Dibuat:</span>
                                                        <span className="text-[10px] font-mono text-zinc-300">
                                                            {user.createdAt ? new Date(user.createdAt).toLocaleString('id-ID') : 'Tidak diketahui'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-4 gap-2 mt-4">`;
appCode = appCode.replace(target3, replace3);

fs.writeFileSync('components/FloatingUI.tsx', appCode);
console.log("Fixed FloatingUI.tsx expanded details");
