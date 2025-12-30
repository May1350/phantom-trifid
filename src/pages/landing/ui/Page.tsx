import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui';
import { DemoDashboard } from './DemoDashboard';

export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-sm border-b border-black/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black flex items-center justify-center">
                            <span className="text-white font-black text-xl">P</span>
                        </div>
                        <span className="font-black uppercase tracking-tighter text-xl">A</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link to="/login">
                            <button className="text-sm font-bold uppercase tracking-tight hover:opacity-60 transition-opacity">
                                Log in
                            </button>
                        </Link>
                        <Link to="/signup">
                            <Button variant="primary" className="!py-2 !px-4 !text-xs">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <main>
                {/* Hero Section */}
                <section className="pt-40 pb-20 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="max-w-3xl">
                            <div className="inline-block border border-black px-2 py-1 mb-6">
                                <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Version 1.0 Release</span>
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-8">
                                Supercharge Your <br />
                                <span className="text-gray-400">Ad Performance.</span>
                            </h1>
                            <p className="text-xl md:text-2xl font-medium max-w-2xl mb-4 text-gray-600">
                                Tired of juggling 5+ tabs just to check your ad budgets?
                            </p>
                            <p className="text-lg md:text-xl max-w-2xl mb-12 text-gray-500">
                                Unify Google Ads and Meta budgets in one brutalist dashboard. Track in real-time. Never overspend again.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link to="/signup">
                                    <Button variant="primary" className="min-w-[200px] text-lg">
                                        Start Propelling
                                    </Button>
                                </Link>
                                <a href="#features" className="min-w-[200px]">
                                    <Button variant="outline" className="w-full text-lg">
                                        See Features
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>


                {/* Dashboard Preview */}
                <section className="py-24 px-6 bg-white">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-6">
                                Try It Yourself.<br />No Sign-Up Required.
                            </h2>
                            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
                                This is a fully functional demo. Click campaigns, sort columns, filter by status. Experience the real product right now.
                            </p>
                        </div>

                        {/* Interactive Demo Dashboard */}
                        <DemoDashboard />
                    </div>
                </section>

                {/* Features Grid */}
                <section id="features" className="py-24 border-y border-black/5 bg-gray-50/50">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid md:grid-cols-3 gap-12">
                            <div className="space-y-4">
                                <div className="font-mono text-xs uppercase text-gray-400 font-bold mb-4">01. Precision</div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Real-time Monitoring</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Track every cent across your campaigns with zero latency.
                                    Our direct API integrations ensure you always have the latest data.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="font-mono text-xs uppercase text-gray-400 font-bold mb-4">02. Integration</div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">unified Platform</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Ditch the multiple tabs. Monitor Google Ads and Meta Ads budgets
                                    within a single, focused dashboard designed for speed.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="font-mono text-xs uppercase text-gray-400 font-bold mb-4">03. Control</div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Agency Scalability</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Built for teams managing high-volume portfolios.
                                    Efficiently organize clients, set commissions, and predict month-end spend.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Technical Aesthetic Section */}
                <section className="py-32 px-6 bg-black text-white relative overflow-hidden">
                    <div className="max-w-7xl mx-auto relative z-10">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                            <div className="max-w-xl">
                                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-8 leading-none">
                                    Built for those <br />
                                    Who demand perfection.
                                </h2>
                                <p className="text-gray-400 text-lg mb-10">
                                    A strips away the noise. No fluff, just the metrics that matter.
                                    Optimized for technical teams who value functional excellence.
                                </p>
                                <Link to="/signup">
                                    <div className="group flex items-center gap-4 bg-white text-black p-1 pl-6 hover:bg-gray-200 transition-colors cursor-pointer">
                                        <span className="font-bold uppercase text-sm">Create Agency Account</span>
                                        <div className="bg-black text-white w-10 h-10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                                            →
                                        </div>
                                    </div>
                                </Link>
                            </div>
                            <div className="w-full md:w-1/2 border border-white/20 p-8 font-mono text-[10px] text-white/40 uppercase space-y-2 select-none">
                                <div className="flex justify-between border-b border-white/10 pb-2 mb-4">
                                    <span>System_v1.0.core</span>
                                    <span>Status: Operational</span>
                                </div>
                                <div>{'>'} initializing_engine... [ok]</div>
                                <div>{'>'} fetching_meta_api_stream... [ok]</div>
                                <div>{'>'} parsing_google_ads_data... [ok]</div>
                                <div>{'>'} optimizing_budget_projection... [ok]</div>
                                <div className="pt-4 text-white/20">////////////////////////////////////////</div>
                                <div className="pt-2 text-white/60">A_ACTIVE</div>
                            </div>
                        </div>
                    </div>
                    {/* Background Grid Accent */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-black/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-black flex items-center justify-center">
                                <span className="text-white font-black text-sm">P</span>
                            </div>
                            <span className="font-black uppercase tracking-tighter text-lg">A</span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
                            © 2025 All Rights Reserved.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-20">
                        <div className="space-y-4">
                            <h4 className="font-bold uppercase text-[10px] tracking-widest text-gray-400">Product</h4>
                            <ul className="space-y-2 text-sm font-bold uppercase transition-colors">
                                <li className="hover:opacity-60 cursor-pointer">Overview</li>
                                <li className="hover:opacity-60 cursor-pointer">Integrations</li>
                                <li className="hover:opacity-60 cursor-pointer">Security</li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold uppercase text-[10px] tracking-widest text-gray-400">Resources</h4>
                            <ul className="space-y-2 text-sm font-bold uppercase transition-colors">
                                <li className="hover:opacity-60 cursor-pointer">Docs</li>
                                <li className="hover:opacity-60 cursor-pointer">API</li>
                                <li className="hover:opacity-60 cursor-pointer">Support</li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-bold uppercase text-[10px] tracking-widest text-gray-400">Legal</h4>
                            <ul className="space-y-2 text-sm font-bold uppercase transition-colors">
                                <li className="hover:opacity-60 cursor-pointer">Privacy</li>
                                <li className="hover:opacity-60 cursor-pointer">Terms</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
