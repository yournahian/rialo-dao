"use client";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Sun, Moon, Search, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import Link from 'next/link';
import { useTheme } from '../providers';
import { supabase } from '../supabase'; // <--- IMPORT SUPABASE CLIENT

// --- CONTRACT CONFIG ---
const CONTRACT_ADDRESS = "0x5d851da0Aa55D39c60d8729147405311b3D6Ddb2" as const;

const ABI = [
  { "inputs": [{"internalType": "uint256","name": "","type": "uint256"}], "name": "proposals", "outputs": [{"internalType": "string","name": "title","type": "string"},{"internalType": "uint256","name": "yesVotes","type": "uint256"},{"internalType": "uint256","name": "noVotes","type": "uint256"},{"internalType": "bool","name": "exists","type": "bool"}], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "proposalCount", "outputs": [{"internalType": "uint256","name": "","type": "uint256"}], "stateMutability": "view", "type": "function" },
  { "inputs": [{"internalType": "uint256","name": "_id","type": "uint256"},{"internalType": "bool","name": "_vote","type": "bool"}], "name": "vote", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
] as const;

// --- PROPOSAL CARD ---
function ProposalCard({ id, theme }: { id: bigint, theme: any }) {
  const { isConnected } = useAccount();
  
  const { data, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'proposals',
    args: [id],
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) refetch();
  }, [isConfirmed, refetch]);

  const handleVote = (vote: boolean) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'vote',
      args: [id, vote],
    });
  };

  if (!data) return null;

  const yes = Number(data[1]);
  const no = Number(data[2]);
  const total = yes + no || 1;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={`p-8 rounded-2xl border transition-all hover:shadow-xl flex flex-col justify-between ${theme.cardBg}`}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
            <span className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full border ${theme.border} opacity-60`}>
            #{id.toString()}
            </span>
            {yes > no ? <CheckCircle2 size={18} className="text-[#a9ddd3]" /> : <div className="w-4 h-4 rounded-full border border-current opacity-20" />}
        </div>
        
        <h3 className="text-2xl font-bold mb-6 leading-tight min-h-[3rem] line-clamp-3">{data[0]}</h3>
        
        <div className="space-y-3 opacity-80 mb-8">
            <div>
            <div className="flex justify-between text-xs font-bold mb-1 opacity-60"><span>Yes</span><span>{yes}</span></div>
            <div className={`h-1.5 w-full rounded-full overflow-hidden ${theme.divide}`}>
                <div style={{ width: `${(yes / total) * 100}%` }} className={theme.isDark ? "h-full bg-[#e8e3d5]" : "h-full bg-[#010101]"} />
            </div>
            </div>
            <div>
            <div className="flex justify-between text-xs font-bold mb-1 opacity-60"><span>No</span><span>{no}</span></div>
            <div className={`h-1.5 w-full rounded-full overflow-hidden ${theme.divide}`}>
                <div style={{ width: `${(no / total) * 100}%` }} className="h-full bg-[#a9ddd3]" />
            </div>
            </div>
        </div>
      </div>

      <div className={`pt-6 mt-auto border-t ${theme.border}`}>
        {!isConnected ? (
             <div className="text-center text-xs opacity-40 font-mono uppercase tracking-widest">Connect Wallet to Vote</div>
        ) : (
            <div className="flex gap-3">
                <button 
                    onClick={() => handleVote(true)}
                    disabled={isPending}
                    className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2 ${theme.buttonPrimary}`}
                >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : "YES"}
                </button>
                <button 
                    onClick={() => handleVote(false)}
                    disabled={isPending}
                    className={`flex-1 py-3 border rounded-lg text-xs font-bold bg-transparent transition-all hover:opacity-60 disabled:opacity-50 ${theme.buttonSecondary}`}
                >
                   NO
                </button>
            </div>
        )}
      </div>
    </motion.div>
  );
}

// --- MAIN PAGE ---
export default function ProposalsPage() {
  const { isDark, toggleTheme } = useTheme(); 
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- 1. STATE FOR BLACKLIST ---
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  // --- 2. FETCH BLACKLIST FROM SUPABASE ---
  useEffect(() => {
    async function fetchHidden() {
      try {
        const { data, error } = await supabase
          .from('hidden_proposals')
          .select('proposal_id');
        
        if (data) {
          // Convert the numbers from database to strings for easy comparison
          setHiddenIds(data.map(row => row.proposal_id.toString()));
        }
      } catch (err) {
        console.error("Failed to fetch blacklist:", err);
      }
    }
    fetchHidden();
  }, []);

  // --- 3. FETCH BLOCKCHAIN DATA ---
  const { data: countData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'proposalCount',
  });

  const theme = {
    isDark,
    bg: isDark ? "bg-[#010101]" : "bg-[#e8e3d5]",
    text: isDark ? "text-[#e8e3d5]" : "text-[#010101]",
    border: isDark ? "border-[#e8e3d5]/20" : "border-[#010101]/10",
    divide: isDark ? "divide-[#e8e3d5]/20" : "divide-[#010101]/10",
    cardBg: isDark ? "bg-[#010101] border-[#e8e3d5]/20" : "bg-[#e8e3d5] border-[#010101]/10",
    iconBorder: isDark ? "border-[#e8e3d5] text-[#e8e3d5]" : "border-[#010101] text-[#010101]",
    buttonPrimary: isDark ? "bg-[#e8e3d5] text-[#010101]" : "bg-[#010101] text-[#e8e3d5]",
    buttonSecondary: isDark ? "border-[#e8e3d5] text-[#e8e3d5]" : "border-[#010101] text-[#010101]",
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-[#a9ddd3] selection:text-[#010101] transition-colors duration-500 overflow-x-hidden ${theme.bg} ${theme.text}`}>
      
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#a9ddd3] rounded-full blur-[150px] opacity-30 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
      <nav className={`relative z-10 flex justify-between items-center px-6 md:px-12 py-8 border-b ${theme.border}`}>
        <div className="flex items-center gap-8">
            <Link href="/" className={`flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity`}>
                <ArrowLeft size={16} /> Back Home
            </Link>
        </div>
        
        <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${theme.iconBorder} hover:opacity-60`}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <ConnectButton showBalance={false} />
        </div>
      </nav>

      <header className="px-6 md:px-12 py-20 max-w-7xl mx-auto">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8">ALL <br/> PROPOSALS</h1>
        <div className={`flex items-center gap-4 p-4 rounded-full border max-w-md ${theme.border}`}>
            <Search className="opacity-40" />
            <input 
                type="text" 
                placeholder="Search proposal ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent outline-none w-full placeholder-opacity-40" 
            />
        </div>
      </header>

      <main className={`px-6 md:px-12 pb-32 max-w-7xl mx-auto`}>
        {countData ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: Number(countData) }, (_, i) => BigInt(i + 1))
                  .reverse()
                  // --- 4. FILTERING LOGIC ---
                  .filter(id => !hiddenIds.includes(id.toString())) // Remove Blacklisted IDs
                  .filter(id => id.toString().includes(searchTerm) || searchTerm === "") // Search Logic
                  .map((id) => (
                    <ProposalCard key={id.toString()} id={id} theme={theme} />
                ))}
             </div>
        ) : (
            <div className="opacity-50 text-xl">Loading blockchain data...</div>
        )}
      </main>
    </div>
  );
}