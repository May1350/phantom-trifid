import React from 'react';
import { Link } from 'react-router-dom';

export const TermsOfService: React.FC = () => {
    return (
        <div className="min-h-screen bg-white text-black p-8 md:p-20 font-sans selection:bg-black selection:text-white">
            <div className="max-w-3xl mx-auto border-4 border-black p-8 md:p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] text-sm">
                <Link to="/" className="inline-block mb-8 font-mono text-xs font-black uppercase hover:underline transition-all">
                    ← Back to Home
                </Link>

                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-12 border-b-8 border-black pb-4">
                    Terms of Service
                </h1>

                <div className="space-y-10">
                    <section>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-4">1. Acceptable Use</h2>
                        <p className="leading-relaxed">
                            By using this application, you agree to comply with all applicable local and international laws.
                            The service is provided "as is" for budget management and monitoring purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-4">2. Account Responsibility</h2>
                        <p className="leading-relaxed">
                            You are responsible for maintaining the confidentiality of your account credentials and for all activities
                            that occur under your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-4">3. Limitation of Liability</h2>
                        <p className="leading-relaxed italic">
                            We are not liable for any financial decisions made based on the data displayed in this dashboard.
                            Always verify critical budget changes directly within the Google Ads or Meta Ads platforms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-4">4. Termination</h2>
                        <p className="leading-relaxed">
                            We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability,
                            for any reason whatsoever, including breach of the Terms.
                        </p>
                    </section>
                </div>

                <div className="mt-20 pt-8 border-t border-black/5 text-[10px] font-mono uppercase text-gray-400">
                    Last Updated: January 2026
                </div>
            </div>
        </div>
    );
};
