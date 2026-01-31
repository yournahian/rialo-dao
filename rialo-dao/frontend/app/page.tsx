"use client";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, Variants, AnimatePresence, useAnimationControls } from 'framer-motion';
import { ArrowRight, Globe, Layers, Users, Twitter, Github, Disc, Moon, Sun, Plus, X, ChevronLeft, ChevronRight, Trophy, Flame, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useWriteContract, useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt } from 'wagmi';
import Link from 'next/link';
import { useTheme } from './providers';
import { supabase } from './supabase'; 

// --- CONTRACT CONFIG ---
const CONTRACT_ADDRESS = "0x5d851da0Aa55D39c60d8729147405311b3D6Ddb2" as const;

const ABI = [
  { "inputs": [{"internalType": "string","name": "_title","type": "string"}], "name": "createProposal", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{"internalType": "uint256","name": "_id","type": "uint256"},{"internalType": "bool","name": "_vote","type": "bool"}], "name": "vote", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{"internalType": "uint256","name": "","type": "uint256"}], "name": "proposals", "outputs": [{"internalType": "string","name": "title","type": "string"},{"internalType": "uint256","name": "yesVotes","type": "uint256"},{"internalType": "uint256","name": "noVotes","type": "uint256"},{"internalType": "bool","name": "exists","type": "bool"}], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "proposalCount", "outputs": [{"internalType": "uint256","name": "","type": "uint256"}], "stateMutability": "view", "type": "function" }
] as const;

// --- COMPONENT: TOP VOTED TICKER ---
function TopVotedTicker({ count, theme, hiddenIds }: { count: bigint, theme: any, hiddenIds: string[] }) {
  const controls = useAnimationControls();
  
  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1));
  const { data: proposals } = useReadContracts({
    contracts: ids.map(id => ({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'proposals',
      args: [id],
    }))
  });

  const topProposals = proposals
    ?.map((p, index) => ({ id: ids[index], data: p.result as [string, bigint, bigint, boolean] | undefined }))
    .filter(item => item.data && item.data[3])
    .filter(item => !hiddenIds.includes(item.id.toString()))
    .sort((a, b) => {
      const votesA = Number(a.data![1]) + Number(a.data![2]);
      const votesB = Number(b.data![1]) + Number(b.data![2]);
      return votesB - votesA;
    })
    .slice(0, 10) || [];

  useEffect(() => {
    controls.start({
      x: ["0%", "-50%"],
      transition: { ease: "linear", duration: 20, repeat: Infinity }
    });
  }, [controls, topProposals]);

  if (topProposals.length === 0) return null;
  const displayItems = [...topProposals, ...topProposals];

  return (
    <div className="relative w-full overflow-hidden py-12">
      <div className="flex items-center gap-2 mb-8 opacity-50 px-6 md:px-12">
        <Flame size={18} className={theme.isDark ? "text-orange-400" : "text-red-500"} />
        <span className="text-xs font-bold uppercase tracking-widest">Top Voted Proposals (Trend)</span>
      </div>

      <motion.div 
        className="flex gap-6 px-6 cursor-grab active:cursor-grabbing"
        animate={controls}
        onHoverStart={() => controls.stop()} 
        onHoverEnd={() => controls.start({ x: ["0%", "-50%"], transition: { ease: "linear", duration: 20, repeat: Infinity } })} 
        drag="x" 
        dragConstraints={{ left: -1000, right: 0 }}
      >
        {displayItems.map((item, i) => {
          const yes = Number(item.data![1]);
          const no = Number(item.data![2]);
          const total = yes + no || 1;
          
          return (
            <div key={`${item.id}-${i}`} className={`flex-shrink-0 w-[300px] p-6 rounded-2xl border ${theme.cardBg} transition-all hover:scale-[1.02]`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${theme.iconBorder}`}>#{item.id.toString()}</div>
                <Trophy size={16} className="text-[#eab308]" />
              </div>
              <h4 className="font-bold text-lg mb-4 line-clamp-2 h-[3.5rem]">{item.data![0]}</h4>
              <div className="text-xs font-mono opacity-60 mb-2 flex justify-between"><span>Total Votes</span><span>{yes + no}</span></div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${theme.divide}`}>
                <div style={{ width: `${(yes / total) * 100}%` }} className={theme.isDark ? "h-full bg-[#e8e3d5]" : "h-full bg-[#010101]"} />
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

// --- ANIMATION VARIANTS ---
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] } }
};

const staggerContainer: Variants = {
  visible: { transition: { staggerChildren: 0.2 } }
};

export default function Home() {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  
  // --- GLOBAL THEME & STATE ---
  const { isDark, toggleTheme } = useTheme();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [localVotes, setLocalVotes] = useState({ yes: 0, no: 0 });
  const [currentProposalId, setCurrentProposalId] = useState<bigint>(BigInt(1)); 
  const [hiddenIds, setHiddenIds] = useState<string[]>([]); 

  // --- FETCH BLACKLIST ---
  useEffect(() => {
    async function fetchHidden() {
      try {
        const { data } = await supabase.from('hidden_proposals').select('proposal_id');
        if (data) setHiddenIds(data.map(row => row.proposal_id.toString()));
      } catch (err) { console.error("Error fetching blacklist", err); }
    }
    fetchHidden();
  }, []);

  // --- READ DATA ---
  const { data: countData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'proposalCount',
  });

  useEffect(() => {
    if (countData) setCurrentProposalId(countData); 
  }, [countData]);

  const { data: proposalData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'proposals',
    args: [currentProposalId], 
  });

  useEffect(() => {
    if (proposalData) {
      setLocalVotes({ yes: Number(proposalData[1]), no: Number(proposalData[2]) });
    }
  }, [proposalData]);

  // --- ACTIONS ---
  const handleVote = (vote: boolean) => {
    writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'vote', args: [currentProposalId, vote] });
  };

  const handleCreate = () => {
    if (!newTitle) return;
    writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'createProposal', args: [newTitle] });
    setNewTitle("");
    setIsCreateOpen(false);
  };

  const handlePrev = () => { if (currentProposalId > BigInt(1)) setCurrentProposalId(prev => prev - BigInt(1)); };
  const handleNext = () => { if (countData && currentProposalId < countData) setCurrentProposalId(prev => prev + BigInt(1)); };

  // --- THEME OBJECT (FIXED) ---
  const theme = {
    isDark,
    bg: isDark ? "bg-[#010101]" : "bg-[#e8e3d5]",
    text: isDark ? "text-[#e8e3d5]" : "text-[#010101]",
    border: isDark ? "border-[#e8e3d5]/20" : "border-[#010101]/10",
    divide: isDark ? "divide-[#e8e3d5]/20" : "divide-[#010101]/10",
    cardBg: isDark ? "bg-[#010101] border-[#e8e3d5]/20" : "bg-[#e8e3d5] border-[#010101]/10",
    hoverBg: isDark ? "rgba(232, 227, 213, 0.1)" : "rgba(1, 1, 1, 0.05)", // <--- ADDED THIS LINE
    iconBorder: isDark ? "border-[#e8e3d5] text-[#e8e3d5]" : "border-[#010101] text-[#010101]",
    inputBg: isDark ? "bg-[#e8e3d5]/10 text-[#e8e3d5]" : "bg-[#010101]/5 text-[#010101]",
    navBtn: isDark ? "hover:bg-[#e8e3d5] hover:text-[#010101]" : "hover:bg-[#010101] hover:text-[#e8e3d5]",
    navBtnDisabled: "opacity-20 cursor-not-allowed",
    buttonPrimary: isDark ? "bg-[#e8e3d5] text-[#010101]" : "bg-[#010101] text-[#e8e3d5]",
    buttonSecondary: isDark ? "border-[#e8e3d5] text-[#e8e3d5]" : "border-[#010101] text-[#010101]",
  };

  const isCurrentBanned = hiddenIds.includes(currentProposalId.toString());

  return (
    <div className={`min-h-screen font-sans selection:bg-[#a9ddd3] selection:text-[#010101] transition-colors duration-500 overflow-x-hidden ${theme.bg} ${theme.text}`}>
      
      {/* BACKGROUND ORBS */}
      <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="fixed top-0 right-0 w-[600px] h-[600px] bg-[#a9ddd3] rounded-full blur-[150px] opacity-40 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <motion.div animate={{ scale: [1, 1.1, 1], x: [0, 50, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="fixed bottom-0 left-0 w-[700px] h-[700px] bg-[#a9ddd3] rounded-full blur-[180px] opacity-20 translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      {/* NAVBAR */}
      <nav className={`relative z-10 flex justify-between items-center px-6 md:px-12 py-8 border-b ${theme.border}`}>
        <div className="text-2xl font-bold tracking-tighter flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isDark ? "bg-[#e8e3d5]" : "bg-[#010101]"}`} />
          RIALO<span className="opacity-40 font-light">DAO</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
            <Link href="/proposals" className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">
                All Proposals
            </Link>
            <a href="#" className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">Treasury</a>
            <a href="#" className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">Docs</a>
        </div>
        
        <div className="flex items-center gap-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={toggleTheme} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${theme.iconBorder} hover:opacity-60`}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </motion.button>
            <ConnectButton showBalance={false} />
        </div>
      </nav>

      {/* CREATE PROPOSAL OVERLAY */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-lg p-8 rounded-3xl shadow-2xl ${isDark ? "bg-[#010101] border border-[#e8e3d5]/20" : "bg-[#e8e3d5] border border-[#010101]/10"}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">New Proposal</h3>
                <button onClick={() => setIsCreateOpen(false)} className="opacity-50 hover:opacity-100"><X /></button>
              </div>
              <input type="text" placeholder="What should we vote on?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={`w-full p-4 rounded-xl text-lg outline-none mb-6 placeholder-opacity-50 ${theme.inputBg}`} />
              <button onClick={handleCreate} disabled={isPending || !newTitle} className={`w-full py-4 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${theme.buttonPrimary} disabled:opacity-50`}>
                {isPending ? "Confirming..." : "Launch Proposal"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">
        {/* HERO */}
        <motion.section initial="hidden" animate="visible" variants={staggerContainer} className="px-6 md:px-12 pt-32 pb-24 max-w-7xl mx-auto">
          <motion.h1 variants={fadeInUp} className="text-7xl md:text-9xl font-bold leading-[0.85] tracking-tighter mb-16">
            THE FUTURE <br /> IS OPEN.
          </motion.h1>

          <motion.div variants={fadeInUp} className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <motion.button onClick={() => setIsCreateOpen(true)} whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.95 }} className={`w-20 h-20 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${theme.iconBorder} ${isDark ? "hover:bg-[#e8e3d5] hover:text-[#010101]" : "hover:bg-[#010101] hover:text-[#e8e3d5]"}`}>
              <Plus size={32} />
            </motion.button>
            <p className="max-w-sm text-lg font-medium opacity-70 leading-relaxed">
              Have an idea? Click the <b>+</b> button to create a new proposal on-chain instantly.
            </p>
          </motion.div>
        </motion.section>

        {/* GRID LINKING TO PAGE */}
        <section className={`border-y ${theme.border} grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x ${theme.divide}`}>
          {[
            { title: "All Proposals", icon: Globe, desc: "Browse the full list of governance proposals.", link: "/proposals" },
            { title: "Treasury", icon: Layers, desc: "Transparent tracking of DAO assets & funding.", link: "#" },
            { title: "Delegates", icon: Users, desc: "Delegate your voting power to trusted leaders.", link: "#" }
          ].map((item, i) => (
            <Link key={i} href={item.link}>
                <motion.div 
                whileHover={{ backgroundColor: theme.hoverBg }}
                className="p-12 group cursor-pointer transition-colors h-full"
                >
                <div className="mb-8 opacity-40 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300 origin-left">
                    <item.icon size={40} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">{item.title}</h3>
                <p className="text-sm opacity-60 leading-relaxed max-w-[80%]">{item.desc}</p>
                </motion.div>
            </Link>
          ))}
        </section>

        {/* ACTIVE VOTE SECTION (MODERATED) */}
        <section className="px-6 md:px-12 py-32 max-w-7xl mx-auto flex flex-col lg:flex-row gap-20">
          <div className="flex-1">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className={`inline-block px-4 py-1 border rounded-full text-xs font-bold mb-6 tracking-widest uppercase bg-[#a9ddd3] text-[#010101] border-[#010101]`}>
              Live Vote
            </motion.div>
            
            {isCurrentBanned ? (
                <div className="opacity-60 space-y-4">
                    <h2 className="text-6xl font-bold mb-2 tracking-tighter opacity-50 flex items-center gap-4">
                        <AlertTriangle size={64} /> Hidden
                    </h2>
                    <p className="text-xl max-w-md">This proposal has been hidden by community moderation.</p>
                </div>
            ) : (
                <>
                    <h2 className="text-6xl font-bold mb-2 tracking-tighter min-h-[1.2em]">
                        {proposalData ? proposalData[0] : "Loading..."}
                    </h2>
                    <p className="text-xl opacity-60 mb-8 max-w-md">
                        Proposal #{currentProposalId.toString()}: Voting is currently active on the Base Sepolia testnet.
                    </p>
                </>
            )}

            <div className="flex gap-4 mb-12 mt-8">
                <button onClick={handlePrev} disabled={currentProposalId <= BigInt(1)} className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${theme.iconBorder} ${currentProposalId <= BigInt(1) ? theme.navBtnDisabled : theme.navBtn}`}><ChevronLeft /></button>
                <button onClick={handleNext} disabled={!countData || currentProposalId >= countData} className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${theme.iconBorder} ${(!countData || currentProposalId >= countData) ? theme.navBtnDisabled : theme.navBtn}`}><ChevronRight /></button>
            </div>

            <div className={`h-[1px] w-full relative overflow-hidden ${isDark ? "bg-[#e8e3d5]/20" : "bg-[#010101]/10"}`}>
                <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className={`absolute top-0 left-0 w-1/2 h-full ${isDark ? "bg-[#e8e3d5]" : "bg-[#010101]"}`} />
            </div>
          </div>

          <motion.div initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="flex-1">
            <div className={`rounded-[2rem] p-10 shadow-2xl relative overflow-hidden border ${theme.cardBg}`}>
                <div className="flex justify-between items-start mb-10 relative">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${isDark ? "bg-[#e8e3d5] text-[#010101]" : "bg-[#010101] text-[#e8e3d5]"}`}>R</div>
                        <div>
                            <div className="font-bold text-lg">Rialo Foundation</div>
                            <div className="text-xs opacity-50 uppercase tracking-wider">Proposal #{currentProposalId.toString()}</div>
                        </div>
                    </div>
                    <span className={`px-4 py-1.5 text-xs font-bold rounded-full ${isDark ? "bg-[#e8e3d5] text-[#010101]" : "bg-[#010101] text-[#e8e3d5]"}`}>
                        {isCurrentBanned ? "HIDDEN" : "ACTIVE"}
                    </span>
                </div>

                {isCurrentBanned ? (
                    <div className="h-[200px] flex items-center justify-center text-center opacity-40 text-sm font-mono border border-dashed border-current rounded-xl">
                        CONTENT MODERATED
                    </div>
                ) : (
                    <div className="space-y-6 mb-10 relative">
                        <div>
                        <div className="flex justify-between text-sm font-bold mb-2"><span>Yes</span><span>{localVotes.yes}</span></div>
                        <div className={`h-3 w-full rounded-full overflow-hidden border ${isDark ? "bg-[#e8e3d5]/10 border-[#e8e3d5]/20" : "bg-[#010101]/5 border-[#010101]/10"}`}>
                            <motion.div initial={{ width: 0 }} whileInView={{ width: `${(localVotes.yes / ((localVotes.yes + localVotes.no) || 1)) * 100}%` }} transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1.0] }} className={isDark ? "h-full bg-[#e8e3d5]" : "h-full bg-[#010101]"} />
                        </div>
                        </div>
                        <div>
                        <div className="flex justify-between text-sm font-bold mb-2"><span>No</span><span>{localVotes.no}</span></div>
                        <div className={`h-3 w-full rounded-full overflow-hidden border ${isDark ? "bg-[#e8e3d5]/10 border-[#e8e3d5]/20" : "bg-[#010101]/5 border-[#010101]/10"}`}>
                            <motion.div initial={{ width: 0 }} whileInView={{ width: `${(localVotes.no / ((localVotes.yes + localVotes.no) || 1)) * 100}%` }} transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1.0] }} className="h-full bg-[#a9ddd3] opacity-80" />
                        </div>
                        </div>
                    </div>
                )}

                {!isConnected ? (
                     <div className={`text-center py-6 text-sm opacity-50 border-t border-dashed ${isDark ? "border-[#e8e3d5]/30" : "border-[#010101]/30"}`}>Connect wallet to cast your vote</div>
                ) : (
                    <div className="flex gap-4">
                        <motion.button 
                            whileTap={{ scale: 0.95 }} 
                            onClick={() => handleVote(true)} 
                            disabled={isPending || isCurrentBanned} 
                            className={`flex-1 py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90 ${theme.buttonPrimary} disabled:opacity-50`}
                        >
                            VOTE YES
                        </motion.button>
                        <motion.button 
                            whileTap={{ scale: 0.95 }} 
                            onClick={() => handleVote(false)} 
                            disabled={isPending || isCurrentBanned} 
                            className={`flex-1 border py-4 rounded-xl font-bold text-sm bg-transparent transition-all hover:opacity-70 ${theme.buttonSecondary} disabled:opacity-50`}
                        >
                            VOTE NO
                        </motion.button>
                    </div>
                )}
            </div>
          </motion.div>
        </section>

        {/* --- SECTION: TOP VOTED TICKER (Horizontal Scroll) --- */}
        <section className={`py-16 border-t ${theme.border}`}>
            {countData ? <TopVotedTicker count={countData} theme={theme} hiddenIds={hiddenIds} /> : <div className="text-center opacity-50">Loading Trends...</div>}
        </section>

        {/* FOOTER (Always Dark) */}
        <footer className="bg-[#010101] text-[#e8e3d5] pt-20 pb-10 px-6 md:px-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full overflow-hidden whitespace-nowrap py-4 border-b opacity-30 border-[#e8e3d5]/10">
            <motion.div 
              animate={{ x: [0, -1000] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="inline-block text-xs font-mono uppercase tracking-[0.2em]"
            >
               Rialo DAO • Governance • Community • Transparency • Rialo DAO • Governance • Community • Transparency • Rialo DAO • Governance • Community • Transparency •
            </motion.div>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mt-10">
            <div className="col-span-1 md:col-span-2">
              <h2 className="text-3xl font-bold tracking-tighter mb-6">RIALO DAO</h2>
              <p className="opacity-60 max-w-sm text-sm leading-relaxed">
                Empowering the next generation of decentralized applications through community-driven governance.
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-6 text-[#a9ddd3]">Platform</h4>
              <ul className="space-y-4 text-sm opacity-60">
                <li><a href="/proposals" className="hover:opacity-100 transition-colors">Proposals</a></li>
                <li><a href="#" className="hover:opacity-100 transition-colors">Voting Guide</a></li>
                <li><a href="#" className="hover:opacity-100 transition-colors">Delegation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-6 text-[#a9ddd3]">Connect</h4>
              <div className="flex gap-4">
                <motion.a 
                  href="https://x.com/rialohq" 
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full border flex items-center justify-center transition-all border-[#e8e3d5]/20 hover:bg-[#e8e3d5] hover:text-[#010101]"
                >
                  <Twitter size={18} />
                </motion.a>

                <motion.a 
                  href="https://github.com/yournahian" 
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.2, rotate: -10 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full border flex items-center justify-center transition-all border-[#e8e3d5]/20 hover:bg-[#e8e3d5] hover:text-[#010101]"
                >
                  <Github size={18} />
                </motion.a>

                <motion.a 
                  href="#" 
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full border flex items-center justify-center transition-all border-[#e8e3d5]/20 hover:bg-[#e8e3d5] hover:text-[#010101]"
                >
                  <Disc size={18} />
                </motion.a>
              </div>
            </div>
          </div>

          <div className="border-t mt-20 pt-8 flex flex-col md:flex-row justify-between items-center opacity-40 text-xs border-[#e8e3d5]/10">
            <p>© 2026 Rialo Foundation. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}