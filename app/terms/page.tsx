'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} />
        Back to Markets
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: February 14, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-sm text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using CaribPredict ("the Platform"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Platform. CaribPredict is operated for
            informational and entertainment purposes within the Caribbean community.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">2. Eligibility</h2>
          <p>
            You must be at least 18 years of age to use CaribPredict. By using the Platform, you represent and
            warrant that you are at least 18 years old and have the legal capacity to enter into this agreement.
            You are responsible for ensuring that your use of the Platform complies with the laws of your jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">3. Account Registration</h2>
          <p>
            To participate in prediction markets, you must create an account with a valid email address. You are
            responsible for maintaining the confidentiality of your account credentials and for all activities
            that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">4. Prediction Markets</h2>
          <p>
            CaribPredict operates prediction markets where users can buy and sell shares in the outcomes of
            real-world events related to the Caribbean region. Market prices reflect the collective probability
            assessment of participants and should not be interpreted as financial advice.
          </p>
          <p className="mt-2">
            Markets are resolved by platform administrators based on publicly verifiable information sources.
            Resolution decisions are final once confirmed. The platform reserves the right to void or cancel
            markets in cases of ambiguity, manipulation, or unforeseen circumstances.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">5. Deposits and Withdrawals</h2>
          <p>
            CaribPredict uses Bitcoin (satoshis) as the unit of account. Deposits and withdrawals are processed
            through the Bitcoin Lightning Network via BTCPay Server. All transactions are subject to network
            confirmation times. The platform is not responsible for losses due to incorrect wallet addresses,
            network issues, or other factors outside our control.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">6. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Use the Platform for money laundering or any illegal activity</li>
            <li>Manipulate markets through wash trading, collusion, or other deceptive practices</li>
            <li>Create multiple accounts to circumvent platform rules</li>
            <li>Attempt to exploit bugs or vulnerabilities in the platform</li>
            <li>Use automated systems or bots without prior written approval</li>
            <li>Harass, abuse, or threaten other users through the comment system</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">7. Fees</h2>
          <p>
            CaribPredict may charge transaction fees on trades. The current fee structure, if any, is displayed
            at the time of each transaction. The platform reserves the right to modify fees with reasonable notice
            to users.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">8. Risk Disclosure</h2>
          <p>
            Prediction market trading involves risk. You may lose some or all of your deposited funds. Past
            market performance is not indicative of future results. You should only trade with funds you can
            afford to lose. CaribPredict does not provide financial, investment, or gambling advice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">9. Intellectual Property</h2>
          <p>
            All content on CaribPredict, including market questions, descriptions, logos, and design elements,
            is the property of CaribPredict or its licensors. User-generated content (comments, usernames)
            remains the property of the respective users, with a license granted to CaribPredict for display
            purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">10. Limitation of Liability</h2>
          <p>
            CaribPredict is provided "as is" without warranties of any kind. To the maximum extent permitted by
            law, CaribPredict and its operators shall not be liable for any indirect, incidental, special, or
            consequential damages arising from your use of the Platform, including but not limited to loss of
            funds, data, or profits.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">11. Modifications</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will be posted on this page with
            an updated revision date. Your continued use of the Platform after changes constitutes acceptance
            of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">12. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us at{' '}
            <a href="mailto:support@caribpredict.com" className="text-blue-600 hover:text-blue-800 underline">
              support@caribpredict.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
