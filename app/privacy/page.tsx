'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} />
        Back to Markets
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: February 14, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">1. Information We Collect</h2>
          <p>
            CaribPredict collects the minimum information necessary to operate the platform:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Account Information:</strong> Email address and chosen username when you create an account.</li>
            <li><strong>Transaction Data:</strong> Records of deposits, withdrawals, and trades you make on the platform.</li>
            <li><strong>Usage Data:</strong> Pages visited, markets viewed, and interactions with the platform to improve our service.</li>
            <li><strong>Device Information:</strong> Browser type, device type, and IP address for security and fraud prevention.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Provide and maintain the prediction market platform</li>
            <li>Process Bitcoin deposits and withdrawals</li>
            <li>Prevent fraud, manipulation, and unauthorized access</li>
            <li>Communicate important updates about your account or the platform</li>
            <li>Improve the platform experience based on usage patterns</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">3. Data Storage and Security</h2>
          <p>
            Your data is stored securely using Supabase, which provides enterprise-grade PostgreSQL database
            hosting with row-level security, encryption at rest, and encrypted connections. We implement
            appropriate technical and organizational measures to protect your personal data against unauthorized
            access, alteration, or destruction.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">4. Bitcoin and Payment Data</h2>
          <p>
            We do not store your Bitcoin wallet addresses or private keys. Payments are processed through
            BTCPay Server, a self-hosted, open-source Bitcoin payment processor. BTCPay Server generates
            unique invoice addresses for each transaction. We only store transaction records (amounts, timestamps,
            and confirmation status) for accounting purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">5. Information Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share limited
            information in the following circumstances:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Public Profile:</strong> Your username and trading statistics may be visible on leaderboards.</li>
            <li><strong>Comments:</strong> Comments you post are visible to all users alongside your username.</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights.</li>
            <li><strong>Service Providers:</strong> We use Supabase (database), Vercel (hosting), and BTCPay Server (payments).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">6. Cookies and Tracking</h2>
          <p>
            CaribPredict uses essential cookies for authentication and session management. We do not use
            third-party advertising cookies or tracking pixels. Authentication tokens are stored securely
            in your browser to maintain your session.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and associated data</li>
            <li>Export your trading history</li>
            <li>Withdraw consent for non-essential data processing</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at{' '}
            <a href="mailto:privacy@caribpredict.com" className="text-blue-600 hover:text-blue-800 underline">
              privacy@caribpredict.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">8. Data Retention</h2>
          <p>
            We retain your account and transaction data for as long as your account is active. Trading records
            are kept for a minimum of 5 years for audit and compliance purposes. If you request account deletion,
            we will remove your personal data within 30 days, except where retention is required by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">9. Children's Privacy</h2>
          <p>
            CaribPredict is not intended for users under 18 years of age. We do not knowingly collect
            personal information from minors. If we learn that we have collected data from a minor,
            we will promptly delete it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page with
            an updated revision date. We encourage you to review this policy periodically.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">11. Contact</h2>
          <p>
            For privacy-related questions or concerns, contact us at{' '}
            <a href="mailto:privacy@caribpredict.com" className="text-blue-600 hover:text-blue-800 underline">
              privacy@caribpredict.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
