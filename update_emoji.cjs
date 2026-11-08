const fs = require('fs');
let code = fs.readFileSync('components/FloatingUI.tsx', 'utf8');

const target = `{i === 0 ? <span className="text-[6px] text-zinc-500">⚡</span> : (i === 1 ? <span className="text-[6px] text-zinc-500">📈</span> : <span className="text-[6px] text-zinc-500">📝</span>)}`;

const replace = `{i === 0 ? (
                                    <svg className="w-2 h-2 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                ) : (i === 1 ? (
                                    <svg className="w-2 h-2 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
                                ) : (
                                    <svg className="w-2 h-2 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                                ))}`;

code = code.replace(target, replace);
fs.writeFileSync('components/FloatingUI.tsx', code);
console.log("Updated emoji to svg icons!");
