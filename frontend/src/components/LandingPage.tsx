import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring, useMotionValue, useMotionTemplate } from '../lib/motion';
import {
  ShieldCheck,
  TrendingUp,
  Brain,
  CheckCircle,
  ArrowRight,
  Coins,
  ArrowUpRight,
  ChevronRight,
  DollarSign,
  FileText,
  MousePointer2,
  PieChart,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

// --- Live Background Component ---
const NeuralBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
    const particleCount = 50;
    const connectionDistance = 150;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineWidth = 1 - dist / connectionDistance;
            ctx.stroke();
          }
        }
      });
      requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40 pointer-events-none" />;
};

// --- Interactive Tax Simulator (Redesigned) ---
const InteractiveTaxSimulator = () => {
  const [income, setIncome] = useState(1800000);

  // Simplified tax logic for visualization
  const oldTax = Math.max(0, (income - 500000) * 0.25);
  const newTax = Math.max(0, (income - 700000) * 0.15);
  const savings = Math.abs(oldTax - newTax);
  const maxTax = 600000; // Cap for bar height calculation

  const oldHeight = Math.min((oldTax / maxTax) * 100, 100);
  const newHeight = Math.min((newTax / maxTax) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 relative overflow-hidden max-w-sm mx-auto md:ml-auto"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Coins size={18} />
          </div>
          <span className="font-bold text-slate-800">AI Tax Optimizer</span>
        </div>
        <div className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Live
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="flex items-end justify-center gap-6 h-48 mb-6 relative">
        {/* Background Lines */}
        <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
          <div className="w-full border-t border-slate-900 border-dashed"></div>
          <div className="w-full border-t border-slate-900 border-dashed"></div>
          <div className="w-full border-t border-slate-900 border-dashed"></div>
          <div className="w-full border-t border-slate-900 border-dashed"></div>
        </div>

        {/* Old Regime Bar */}
        <div className="flex flex-col items-center gap-2 group cursor-pointer relative z-10">
          <motion.div
            className="w-12 bg-slate-200 rounded-t-xl relative group-hover:bg-slate-300 transition-colors"
            initial={{ height: 0 }}
            animate={{ height: `${oldHeight}%` }}
            transition={{ type: 'spring', stiffness: 60 }}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              ₹{(oldTax / 1000).toFixed(0)}k Tax
            </div>
          </motion.div>
          <span className="text-xs font-medium text-slate-400">Old Regime</span>
        </div>

        {/* New Regime Bar */}
        <div className="flex flex-col items-center gap-2 group cursor-pointer relative z-10">
          <motion.div
            className="w-12 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-xl relative shadow-lg shadow-blue-200"
            initial={{ height: 0 }}
            animate={{ height: `${newHeight}%` }}
            transition={{ type: 'spring', stiffness: 60, delay: 0.1 }}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] py-1 px-2 rounded opacity-100 whitespace-nowrap shadow-md">
              ₹{(newTax / 1000).toFixed(0)}k Tax
            </div>
          </motion.div>
          <span className="text-xs font-bold text-blue-600">AI Suggested</span>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-medium">Annual Income</span>
          <span className="text-slate-900 font-bold">₹{(income / 100000).toFixed(1)} Lakhs</span>
        </div>
        <input
          type="range"
          min="500000"
          max="3000000"
          step="100000"
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
        />
      </div>

      {/* Result Badge */}
      <motion.div
        key={savings}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="mt-6 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between"
      >
        <div>
          <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Projected Savings</div>
          <div className="text-xl font-bold text-emerald-700">₹{savings.toLocaleString()}</div>
        </div>
        <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
          <ArrowUpRight size={18} />
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Spotlight Card Component ---
const FeatureCard = ({
  icon: Icon,
  title,
  desc,
  delay,
}: {
  icon: any;
  title: string;
  desc: string;
  delay: number;
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      viewport={{ once: true }}
      className="group relative border border-slate-200 bg-white rounded-2xl px-6 py-8 shadow-sm hover:shadow-xl transition-shadow duration-300"
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(59, 130, 246, 0.1),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-10">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
          <Icon size={24} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress);

  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 origin-left z-50"
        style={{ scaleX }}
      />

      {/* Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
              A
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Accountable AI</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
              How it Works
            </a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">
              Pricing
            </a>
          </div>
          <button
            onClick={onGetStarted}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-full transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Login
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <NeuralBackground />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="text-left space-y-8">
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-blue-100 shadow-sm text-blue-700 text-sm font-semibold mb-6 backdrop-blur-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                </span>
                FY 2024-25 Ready
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-tight tracking-tight">
                The Future of Tax is <span className="gradient-text">Automated.</span>
              </h1>
              <p className="text-xl text-slate-600 max-w-lg mt-6 leading-relaxed">
                Meet your AI Chartered Accountant. Real-time compliance, intelligent tax planning, and audit-ready
                reports—all on autopilot.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button
                onClick={onGetStarted}
                className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </button>
              <button className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                <MousePointer2 size={18} />
                Live Demo
              </button>
            </motion.div>

            <div className="flex gap-8 pt-8 opacity-70 grayscale transition-all hover:grayscale-0">
              {['TaxNodes', 'ClearTax', 'Zoho'].map((logo) => (
                <span key={logo} className="text-slate-400 font-bold text-lg flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-500" /> {logo} compatible
                </span>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="relative"
          >
            {/* Decorative background blobs */}
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

            <InteractiveTaxSimulator />

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -right-8 top-10 bg-white p-4 rounded-xl shadow-lg border border-slate-100 hidden md:block"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Notice Risk</div>
                  <div className="font-bold text-emerald-600">0% Detected</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -left-8 bottom-20 bg-white p-4 rounded-xl shadow-lg border border-slate-100 hidden md:block"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <Brain size={20} />
                </div>
                <div>
                  <div className="text-xs text-slate-500">AI Optimization</div>
                  <div className="font-bold text-slate-900">+ ₹42,000 Saved</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">More than just a calculator.</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              A full-stack financial brain that evolves with your wealth.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="Hyper-Personalized Advice"
              desc="Our AI learns your spending patterns to suggest specific 80C, 80D, and HRA optimizations tailored to your lifestyle."
              delay={0.1}
            />
            <FeatureCard
              icon={FileText}
              title="Instant Notice Analysis"
              desc="Upload any tax notice. Our vision models extract key details and draft a legally sound response in under 30 seconds."
              delay={0.2}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Real-time Wealth Tracking"
              desc="Connect 50+ banks and investment apps. See your net worth, liabilities, and tax obligations in a single live dashboard."
              delay={0.3}
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Audit-Proof Compliance"
              desc="Every deduction is cross-verified against the latest sections of the Income Tax Act to ensure zero penalties."
              delay={0.4}
            />
            <FeatureCard
              icon={PieChart}
              title="Scenario Planning"
              desc="Ask 'What if I buy a car?' or 'What if I move to Dubai?' and see the immediate impact on your tax liability."
              delay={0.5}
            />
            <FeatureCard
              icon={Zap}
              title="One-Click Filing"
              desc="Review the AI-prepared draft, sign digitally, and file your returns directly to the government portal."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Bank-Grade Security & Encryption</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
                <ShieldCheck size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold">256-bit AES</h3>
              <p className="text-slate-400 text-sm mt-2">Military-grade data encryption for all documents.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
                <CheckCircle size={32} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold">ISO 27001</h3>
              <p className="text-slate-400 text-sm mt-2">Certified information security management systems.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
                <DollarSign size={32} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold">No Data Selling</h3>
              <p className="text-slate-400 text-sm mt-2">Your financial data belongs to you. We never sell to 3rd parties.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-12 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to automate your financial life?</h2>
              <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
                Join 10,000+ Indians who have switched to Accountable AI for smarter, faster, and stress-free taxes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onGetStarted}
                  className="px-10 py-4 bg-white text-blue-700 font-bold rounded-xl shadow-lg hover:bg-slate-50 transition-all transform hover:-translate-y-1 text-lg"
                >
                  Get Started for Free
                </button>
                <button className="px-10 py-4 bg-blue-700 border border-blue-500 text-white font-bold rounded-xl hover:bg-blue-800 transition-all flex items-center justify-center gap-2">
                  Talk to Sales <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 pt-16 pb-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">
                  A
                </div>
                <span className="text-xl font-bold text-slate-900">Accountable AI</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                The world's first fully autonomous Chartered Accountant for the modern era.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-blue-600 cursor-pointer">Tax Filing</li>
                <li className="hover:text-blue-600 cursor-pointer">Compliance</li>
                <li className="hover:text-blue-600 cursor-pointer">Notice Management</li>
                <li className="hover:text-blue-600 cursor-pointer">Pricing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-blue-600 cursor-pointer">Blog</li>
                <li className="hover:text-blue-600 cursor-pointer">Tax Calculator</li>
                <li className="hover:text-blue-600 cursor-pointer">Guides</li>
                <li className="hover:text-blue-600 cursor-pointer">Help Center</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="hover:text-blue-600 cursor-pointer">Privacy Policy</li>
                <li className="hover:text-blue-600 cursor-pointer">Terms of Service</li>
                <li className="hover:text-blue-600 cursor-pointer">Security</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
            <p>© 2026 Accountable AI. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <span>Made with ❤️ in Pune</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
