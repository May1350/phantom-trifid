import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-white text-black p-8 md:p-20 font-sans selection:bg-black selection:text-white">
            <div className="max-w-3xl mx-auto border-4 border-black p-8 md:p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
                <Link to="/" className="inline-block mb-8 font-mono text-xs font-black uppercase hover:underline transition-all">
                    ← Back to Home
                </Link>

                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-12 border-b-8 border-black pb-4">
                    Privacy Policy
                </h1>

                <div className="space-y-10 font-medium">
                    <section>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-4 border-l-4 border-black pl-4">1. Data Collection</h2>
                        <p className="leading-relaxed">
                            We collect basic account information (name, email) and Google Ads API data only after explicit user authorization.
                            This data is used solely to provide budget monitoring and visualization services within the application.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-4 border-l-4 border-black pl-4">2. Usage of Google User Data</h2>
                        <p className="leading-relaxed">
                            Our application accesses Google Ads account information to display campaign spend, budget settings, and performance metrics.
                            We do not share, sell, or utilize this data for any marketing or third-party purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-4 border-l-4 border-black pl-4">3. Data Retention and Deletion</h2>
                        <p className="leading-relaxed font-mono text-sm bg-gray-50 p-4 border border-black/10">
                            Users can disconnect their Google accounts at any time via the Settings page.
                            Disconnection immediately removes all associated access tokens and cached data from our systems.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black uppercase tracking-tight mb-4 border-l-4 border-black pl-4">4. Security</h2>
                        <p className="leading-relaxed">
                            We implement industry-standard encryption and security measures to protect your tokens and data.
                            Access is restricted to authorized sessions only.
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
