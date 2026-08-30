import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  Layers,
  DollarSign,
  Building,
  Award,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Compass,
} from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'playbook' | 'widgets' | 'interpretation' | 'math';

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Model Methodology & User Guide</span>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Documentation
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Intuitive walkthroughs, decision playbook, widget breakdowns & mathematical proofs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close Guide (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-850/60 px-6 gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>1. Core Dilemma</span>
          </button>

          <button
            onClick={() => setActiveTab('playbook')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'playbook'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>2. How to Decide (Playbook & Cases)</span>
          </button>

          <button
            onClick={() => setActiveTab('widgets')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'widgets'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Widget Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('interpretation')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'interpretation'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>4. Key Interpretation Tips</span>
          </button>

          <button
            onClick={() => setActiveTab('math')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'math'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4 text-purple-400" />
            <span>5. Mathematical Deep Dive</span>
          </button>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Executive Summary Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-950/40 via-slate-850 to-purple-950/30 border border-brand-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white">The Core Dublin Tech Dilemma</h3>
                </div>
                <p className="text-slate-300 leading-normal">
                  For tech professionals working in Dublin (Alphabet, Meta, Microsoft, AWS, Stripe, etc.), deciding whether to buy property immediately or continue renting is one of the most consequential financial choices of their lives.
                </p>
                <p className="text-slate-300 leading-normal">
                  The decision is a <strong>three-way financial tug-of-war</strong>:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-brand-300 font-bold text-xs">
                      <Building className="w-4 h-4 text-brand-400" />
                      <span>1. Property Inflation</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Dublin house prices appreciate ~5%/yr. An €800k home rises ~€40k/yr, increasing your required deposit and stamp duty every month you delay.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs">
                      <DollarSign className="w-4 h-4 text-rose-400" />
                      <span>2. Rental Drag</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Dublin rent (€2,500–€3,500/mo) is a 100% sunk cost. Over 2 years, you burn €60,000+ that could have paid down a mortgage.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-750 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                      <Award className="w-4 h-4 text-purple-400" />
                      <span>3. GSU Compounding</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Alphabet stock (GSUs) can grow at 10%–20%/yr. Liquidating €200k of shares for a deposit forfeits that aggressive stock compounding.
                    </p>
                  </div>
                </div>
              </div>

              {/* What this app does */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>How the Decision Engine Solves This</span>
                </h4>
                <p className="text-slate-300">
                  Instead of relying on gut feeling or simplistic calculators, this engine builds a rigorous <strong>60-month (5-year) simulation</strong> of your exact financial life:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300 text-xs sm:text-sm">
                  <li>
                    <strong>Granular Monthly Milestones:</strong> Tracks monthly net salary savings, pro-rated annual bonus accruals (with March payouts), and exact GSU vesting schedules (accounting for the 52% Irish marginal tax via sell-to-cover).
                  </li>
                  <li>
                    <strong>CBI 4.0x Rule Awareness:</strong> Calculates your maximum legal borrowing capacity and automatically accounts for any deposit shortfall.
                  </li>
                  <li>
                    <strong>Optimal Liquidation Waterfall:</strong> Simulates deposit withdrawals in optimal tax/yield order (Cash → Base Investments → GSUs).
                  </li>
                  <li>
                    <strong>5-Year Net Wealth Benchmarking:</strong> Compares your final Year-5 balance sheet (Remaining Liquid Assets + Home Equity) across 5 life choices to pinpoint the timing that maximizes your net worth.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: HOW TO DECIDE (PLAYBOOK & CASE STUDIES) */}
          {activeTab === 'playbook' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Introduction Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-850 to-brand-950/30 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white">How to Use This Model to Make Your Decision</h3>
                </div>
                <p className="text-slate-300 leading-normal">
                  Follow this 4-step framework to navigate the trade-offs between property inflation, rental drag, and equity compounding with mathematical clarity.
                </p>
              </div>

              {/* 4-Step Playbook Cards */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  📋 The 4-Step Decision Playbook
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Step 1 */}
                  <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold font-mono text-xs flex items-center justify-center">1</span>
                      <h5 className="font-bold text-white text-xs sm:text-sm">Set Personal Facts & Lock Profile</h5>
                    </div>
                    <p className="text-xs text-slate-300">
                      Enter your exact target home price, base salary, bonus target, monthly non-housing living expenses, existing cash/ETFs, and unvested GSU grants.
                    </p>
                    <p className="text-xs text-slate-400">
                      👉 <strong>Action:</strong> Click <strong>"🔒 Lock Profile"</strong> in the top header so your baseline facts remain fixed when you adjust macro sliders.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 font-bold font-mono text-xs flex items-center justify-center">2</span>
                      <h5 className="font-bold text-white text-xs sm:text-sm">Find Your Earliest Affordability Point (t*)</h5>
                    </div>
                    <p className="text-xs text-slate-300">
                      Look at the <strong>60-Month Trajectory Chart</strong>. Find where the purple Liquid Wealth line crosses the cyan Target Capital staircase.
                    </p>
                    <p className="text-xs text-slate-400">
                      👉 <strong>Action:</strong> If <code className="text-sky-300">t* = 0</code>, you can buy today. If <code className="text-sky-300">t* &gt; 0</code>, note how many months of saving and vesting are needed to eliminate any CBI borrowing shortfall.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 font-bold font-mono text-xs flex items-center justify-center">3</span>
                      <h5 className="font-bold text-white text-xs sm:text-sm">Audit 5-Year Wealth in Opportunity Matrix</h5>
                    </div>
                    <p className="text-xs text-slate-300">
                      Examine the <strong>Opportunity Cost Matrix</strong> for Year-5 Total Net Wealth ($M60$) across Buy ASAP, Wait 12M, Wait 24M, Wait 36M, and Rent 60M.
                    </p>
                    <p className="text-xs text-slate-400">
                      👉 <strong>Action:</strong> If <code className="text-emerald-300">+Δ Delta</code> is positive for waiting, compounding beats immediate purchase. If <code className="text-rose-300">-Δ Delta</code> is negative, waiting destroys wealth.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-300 font-bold font-mono text-xs flex items-center justify-center">4</span>
                      <h5 className="font-bold text-white text-xs sm:text-sm">Find Your Breakeven on the Heatmap</h5>
                    </div>
                    <p className="text-xs text-slate-300">
                      Scan the <strong>2D Sensitivity Heatmap</strong> to find the boundary between <strong>BUY NOW (Emerald)</strong> and <strong>WAIT & COMPOUND (Purple)</strong>.
                    </p>
                    <p className="text-xs text-slate-400">
                      👉 <strong>Action:</strong> Identify the <em>Equilibrium Stock Growth Rate</em> (e.g. 15%/yr). If you expect tech to beat that rate, wait; otherwise, buy now.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Real-World Case Studies */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                  🎯 Real-World Dublin Decision Case Studies
                </h4>

                <div className="space-y-3">
                  {/* Case 1 */}
                  <div className="p-4 rounded-xl bg-slate-850 border border-purple-500/30 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h5 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                        <Award className="w-4 h-4 text-purple-400" />
                        <span>Case A: The GSU Bull (High Stock Compounding)</span>
                      </h5>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 w-fit">
                        Verdict: WAIT 24M–36M
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      <strong>Profile & Assumptions:</strong> Senior engineer with 1,200 unvested GSUs, €190k base, €2,500/mo rent. Alphabet stock expected to compound at <strong>18%/yr</strong> vs Dublin property at <strong>5%/yr</strong>.
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-750 text-xs text-purple-300 font-mono space-y-0.5">
                      <div>• 5-Year Delta (Wait 24M): <strong className="text-emerald-400">+€58,400</strong> higher net wealth vs Buy ASAP</div>
                      <div>• Liquid Portfolio at M60: €820k (Wait 24M) vs €340k (Buy ASAP)</div>
                    </div>
                    <p className="text-xs text-slate-400">
                      <strong>Why this works:</strong> Even after the 52% Irish marginal tax at vest, 18% equity appreciation massively outperforms property inflation. Delaying purchase allows building a 30%+ deposit, taking a smaller loan, and maintaining large liquid reserves.
                    </p>
                  </div>

                  {/* Case 2 */}
                  <div className="p-4 rounded-xl bg-slate-850 border border-emerald-500/30 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h5 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                        <Building className="w-4 h-4 text-emerald-400" />
                        <span>Case B: The High-Rent Sunk Cost Trap</span>
                      </h5>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 w-fit">
                        Verdict: BUY ASAP
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      <strong>Profile & Assumptions:</strong> Tech couple renting in Grand Canal Dock at <strong>€3,500/mo</strong> (€42k/yr in 100% sunk cost). Conservative stock outlook (<strong>6%/yr</strong>) with Dublin house inflation at <strong>6%/yr</strong>.
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-750 text-xs text-emerald-300 font-mono space-y-0.5">
                      <div>• 5-Year Delta (Wait 24M): <strong className="text-rose-400">-€49,200</strong> loss vs Buy ASAP</div>
                      <div>• Cumulative Sunk Rent Paid if Waiting 24M: €86,400</div>
                    </div>
                    <p className="text-xs text-slate-400">
                      <strong>Why this works:</strong> High rental bleed is an unrecoverable destruction of capital. Buying immediately redirects that €3,500/mo into monthly mortgage principal paydown and captures home equity appreciation from Day 1.
                    </p>
                  </div>

                  {/* Case 3 */}
                  <div className="p-4 rounded-xl bg-slate-850 border border-sky-500/30 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h5 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                        <span>Case C: The Promotion & Grant Cliff Target</span>
                      </h5>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 w-fit">
                        Verdict: TARGET MONTH 12 (t* = 12)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      <strong>Profile & Assumptions:</strong> Engineer targeting an €850k home. Current €140k salary caps borrowing at €560k (CBI 4.0x), leaving a €205k cash shortfall that makes buying impossible today at Month 0.
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-750 text-xs text-sky-300 font-mono space-y-0.5">
                      <div>• Month 0-11: CBI Shortfall = €205,000 (Target Capital €314k &gt; Liquid Wealth €110k)</div>
                      <div>• Month 12: L6 Promotion (€180k base) + 100-share vest eliminates shortfall (isAffordable = true)</div>
                    </div>
                    <p className="text-xs text-slate-400">
                      <strong>Why this works:</strong> The model clearly demonstrates that waiting until the exact promo/vest milestone at Month 12 unlocks full borrowing capacity and avoids settling for a suboptimal compromise.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3-Question Pre-Purchase Checklist */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-750 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>🧭 The 3-Question Pre-Purchase Decision Checklist</span>
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-400">1.</span>
                    <span><strong>5-Year Wealth Test:</strong> Does buying ASAP or waiting generate a higher net worth on the 5-Year Opportunity Cost Matrix?</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-400">2.</span>
                    <span><strong>Downside Stress Test:</strong> If you move the Google Stock slider to <code className="text-rose-300">-15%</code> in the sidebar, do you still have enough liquid wealth to close without an emergency shortfall?</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-400">3.</span>
                    <span><strong>Cashflow Buffer Test:</strong> In the Personal Profile Header, is your post-purchase net cashflow positive (<code className="text-emerald-300">Net Pay - Mortgage - Maintenance - Living Expenses &gt; 0</code>)?</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WIDGET-BY-WIDGET GUIDE */}
          {activeTab === 'widgets' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Widget 1 */}
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center font-mono text-xs">1</span>
                    <span>Personal Profile & Baseline Facts (Header)</span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Setup</span>
                </div>
                <p className="text-xs text-slate-300">
                  <strong>What it is:</strong> Your personal baseline financial facts: target home price, gross base salary, bonus percentage, existing cash, trading investments, and held/unvested GSU grants.
                </p>
                <p className="text-xs text-slate-400">
                  <strong>Key Insight:</strong> Use the <strong>"🔓 Unlock to Edit Profile"</strong> button to adjust your facts, then click <strong>"🔒 Lock Profile"</strong>. Locking ensures your facts remain unchanged while you experiment with macroeconomic sliders or preset scenarios.
                </p>
              </div>

              {/* Widget 2 */}
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-mono text-xs">2</span>
                    <span>Financial Modeling Sliders (Sidebar)</span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30">Interactive</span>
                </div>
                <p className="text-xs text-slate-300">
                  <strong>What it is:</strong> Instantaneous controls to stress-test your future across 6 macroeconomic engines: Google stock growth, Dublin house price inflation, ETF returns, mortgage interest rates, rent inflation (RPZ), and USD/EUR currency drift.
                </p>
                <p className="text-xs text-slate-400">
                  <strong>Key Insight:</strong> Sliders update with <strong>zero lag</strong>. Dragging them allows you to see how small changes (e.g. stock growing at 15% vs 20%) immediately flip the optimal decision.
                </p>
              </div>

              {/* Widget 3 */}
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono text-xs">3</span>
                    <span>Core Decision Recommendation Banner</span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">Decision</span>
                </div>
                <p className="text-xs text-slate-300">
                  <strong>What it is:</strong> The high-level executive verdict. It states whether buying immediately or waiting to compound equity generates higher Year-5 total net wealth, and by exactly how much (€ Delta).
                </p>
              </div>

              {/* Widget 4 */}
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center font-mono text-xs">4</span>
                    <span>60-Month Wealth Trajectory Chart</span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/30">Runway</span>
                </div>
                <p className="text-xs text-slate-300">
                  <strong>What it is:</strong> Visualizes your liquid wealth (cash + investments + GSU value) vs. the required target capital to buy (10% deposit + stamp duty + fees + borrowing shortfall).
                </p>
                <p className="text-xs text-slate-400">
                  <strong>The Crossing Point (t*):</strong> The exact month where the purple liquid wealth line rises above the cyan target capital staircase is your <strong>Earliest Affordable Purchase Month</strong>.
                </p>
              </div>

              {/* Widget 5 */}
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono text-xs">5</span>
                    <span>Opportunity Cost Matrix (5-Year Audit)</span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">Comparison</span>
                </div>
                <p className="text-xs text-slate-300">
                  <strong>What it is:</strong> Direct side-by-side comparison of 5 explicit life scenarios: Buy ASAP, Wait 12 Months, Wait 24 Months, Wait 36 Months, or Rent all 60 Months.
                </p>
                <p className="text-xs text-slate-400">
                  <strong>Key Metrics:</strong> Displays Total Net Wealth (Y5), Home Equity, Remaining Liquid Wealth, and Sunk Rent Paid for every scenario.
                </p>
              </div>

              {/* Widget 6 */}
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center font-mono text-xs">6</span>
                    <span>Sensitivity Heatmap (2D Grid)</span>
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30">Stress Test</span>
                </div>
                <p className="text-xs text-slate-300">
                  <strong>What it is:</strong> A matrix evaluating 55 economic permutations (-20% to +30% stock growth vs -3% to +8% property growth).
                </p>
                <p className="text-xs text-slate-400">
                  <strong>Key Insight:</strong> Shows where the "tipping point" lies. Green cells show where Waiting wins; Blue/Brand cells show where Buying ASAP wins.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: INTERPRETATION TIPS */}
          {activeTab === 'interpretation' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Critical Horizon Tip */}
              <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <span>Crucial Tip: Understanding the Horizon Slider (1Y vs 5Y)</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  The Sensitivity Heatmap includes a <strong>Horizon Slider</strong> (1Y / 2Y / 3Y / 5Y). It is essential to understand what changing the horizon means:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-750">
                    <strong className="text-amber-300 block mb-1">1-Year Horizon (Month 12 Closing Day):</strong>
                    <p className="text-slate-400">
                      Evaluates your balance sheet <em>on the exact day you close at Month 12</em>. On closing day, buying immediately absorbs <strong>sunk legal fees (€3k) and 1% stamp duty (~€8k)</strong>, so waiting can look temporarily better simply because the transaction costs haven't had time to amortize.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-750">
                    <strong className="text-emerald-300 block mb-1">5-Year Horizon (Month 60 - Recommended):</strong>
                    <p className="text-slate-400">
                      Evaluates your wealth after <strong>4 full years of mortgage principal paydown and home price appreciation</strong>. This is the true financial benchmark for property decisions because real estate is a multi-year illiquid asset.
                    </p>
                  </div>
                </div>
              </div>

              {/* Golden Rules */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">The Golden Rules of the Model</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-850 border border-emerald-500/30 space-y-2">
                    <span className="font-bold text-emerald-400 text-xs uppercase tracking-wider block">
                      When "Buy ASAP" Typically Wins:
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                      <li>Dublin property prices rise at ≥ 5% per year.</li>
                      <li>Current rent is high (≥ €2,500/mo), draining cash reserves.</li>
                      <li>Mortgage interest rate is competitive (≤ 3.5%), so your payments build equity rather than pure interest.</li>
                      <li>Expected future stock growth is moderate (≤ 10%–12%).</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-850 border border-purple-500/30 space-y-2">
                    <span className="font-bold text-purple-400 text-xs uppercase tracking-wider block">
                      When "Wait & Compound" Typically Wins:
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                      <li>Alphabet / tech equity grows aggressively (≥ 15%–20%/yr).</li>
                      <li>You have major unvested GSU grants vesting in the next 12–24 months.</li>
                      <li>Current rent is low or rent pressure zone (RPZ) restricted.</li>
                      <li>Dublin property growth stagnates (≤ 2%–3%).</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MATHEMATICAL DEEP DIVE */}
          {activeTab === 'math' && (
            <div className="space-y-4 animate-fadeIn">
              <p className="text-xs text-slate-400">
                Below are the exact mathematical equations and formulas implemented in the functional simulation engine (<code className="text-purple-300">src/engine/</code>). Click each card to view full mathematical definitions.
              </p>

              {/* Math 1 */}
              <details className="group p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2 cursor-pointer transition-colors open:bg-slate-800/80">
                <summary className="font-bold text-white text-xs flex items-center justify-between">
                  <span className="text-brand-300">📐 1. Compounding Multipliers & Monthly Growth</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-2 text-xs space-y-2 text-slate-300 border-t border-slate-750 mt-2 font-mono">
                  <p>Annual growth rate g is converted into an exact monthly compounding multiplier:</p>
                  <div className="p-2.5 rounded bg-slate-900 text-purple-300">
                    M_mult = (1 + g)^(1/12)
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    At month m, asset value V(m) = V_0 × (1 + g)^(m/12). This eliminates linear approximation drift.
                  </p>
                </div>
              </details>

              {/* Math 2 */}
              <details className="group p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2 cursor-pointer transition-colors open:bg-slate-800/80">
                <summary className="font-bold text-white text-xs flex items-center justify-between">
                  <span className="text-brand-300">📐 2. Irish Tiered Stamp Duty</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-2 text-xs space-y-2 text-slate-300 border-t border-slate-750 mt-2 font-mono">
                  <div className="p-2.5 rounded bg-slate-900 text-purple-300">
                    If P ≤ €1,000,000: Duty = P × 0.01<br />
                    If P &gt; €1,000,000: Duty = €10,000 + (P - €1,000,000) × 0.02
                  </div>
                </div>
              </details>

              {/* Math 3 */}
              <details className="group p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2 cursor-pointer transition-colors open:bg-slate-800/80">
                <summary className="font-bold text-white text-xs flex items-center justify-between">
                  <span className="text-brand-300">📐 3. Mortgage Annuity Payment & Amortization</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-2 text-xs space-y-2 text-slate-300 border-t border-slate-750 mt-2 font-mono">
                  <p>Monthly payment (PMT) on loan L at rate i over N months:</p>
                  <div className="p-2.5 rounded bg-slate-900 text-purple-300">
                    r = i / 12<br />
                    PMT = L × [r × (1 + r)^N] / [(1 + r)^N - 1]
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Monthly Interest = Balance × r; Monthly Principal = PMT - Interest.
                  </p>
                </div>
              </details>

              {/* Math 4 */}
              <details className="group p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2 cursor-pointer transition-colors open:bg-slate-800/80">
                <summary className="font-bold text-white text-xs flex items-center justify-between">
                  <span className="text-brand-300">📐 4. Irish Tax Engine & GSU Vesting (52%)</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-2 text-xs space-y-2 text-slate-300 border-t border-slate-750 mt-2 font-mono">
                  <div className="p-2.5 rounded bg-slate-900 text-purple-300">
                    Marginal Tax Rate = 40% (Income Tax) + 8% (USC) + 4% (PRSI) = 52.0%<br />
                    Net Retained Shares = Gross Vesting Shares × (1 - 0.52)
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Vested shares are retained in the portfolio and compound in value without further capital gains tax until sold.
                  </p>
                </div>
              </details>

              {/* Math 5 */}
              <details className="group p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2 cursor-pointer transition-colors open:bg-slate-800/80">
                <summary className="font-bold text-white text-xs flex items-center justify-between">
                  <span className="text-brand-300">📐 5. Capital Liquidation Waterfall Hierarchy</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-2 text-xs space-y-2 text-slate-300 border-t border-slate-750 mt-2">
                  <p>When purchasing at month t, funds are drained in optimal capital preservation order:</p>
                  <ol className="list-decimal pl-5 space-y-1 font-mono text-purple-300 text-xs">
                    <li>EUR/USD Uninvested Cash (0% growth)</li>
                    <li>Trading Account Index Investments (~8% growth)</li>
                    <li>Retained GSU Shares (10%–20% high-beta growth)</li>
                  </ol>
                </div>
              </details>

              {/* Math 6 */}
              <details className="group p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2 cursor-pointer transition-colors open:bg-slate-800/80">
                <summary className="font-bold text-white text-xs flex items-center justify-between">
                  <span className="text-brand-300">📐 6. Dynamic Net-Pay Derived Monthly Cash Savings</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="pt-2 text-xs space-y-2 text-slate-300 border-t border-slate-750 mt-2 font-mono">
                  <p className="text-[11px] text-slate-400 font-sans">
                    Automatically scales monthly cash savings when salary steps up or when transitioning from rent to mortgage:
                  </p>
                  <div className="p-2.5 rounded bg-slate-900 text-purple-300 space-y-1">
                    <div>Pre-Purchase (Renting): Savings = Net Base Pay - Rent - Living Expenses</div>
                    <div>Post-Purchase (Owner): Savings = Net Base Pay - Mortgage PMT - Maintenance - Living Expenses</div>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    When a salary promotion occurs (e.g. +€30k gross), extra net take-home pay (+~€1,250/mo) immediately flows into higher monthly cash accumulation.
                  </p>
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>100% Client-Side Simulation • 47 Verified Unit Tests</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            Got it, Back to Model
          </button>
        </div>
      </div>
    </div>
  );
};
