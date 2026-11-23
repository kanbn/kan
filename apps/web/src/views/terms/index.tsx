import Link from "next/link";

import {
  ListItem,
  SubHeading,
  Text,
  UnorderedList,
} from "~/components/LegalText";
import { PageHead } from "~/components/PageHead";
import Layout from "../home/components/Layout";

export default function TermsView() {
  const NAME = "Open Engineering";
  const CONTACT_EMAIL = "support@kan.bn";

  return (
    <Layout>
      <PageHead title="Terms of Service | kan.bn" />
      <div className="flex flex-col items-center">
        <div className="mb-20 flex h-full w-full max-w-[720px] flex-col px-4">
          <h1 className="pt-36 text-2xl font-semibold tracking-[-0.03em] text-light-1000 lg:text-3xl dark:text-dark-1000">
            Terms of Service
          </h1>
          <p className="mt-3 mb-12 text-sm text-light-900 dark:text-dark-800">
            Last updated: 23rd Nov 2026
          </p>

          <div className="mb-8">
            <SubHeading>Introduction</SubHeading>
            <Text>
              These Terms of Service (“Terms”) govern your use of Kan, the
              hosted service at kan.bn and its related websites, apps and APIs
              (the “Service”), operated by {NAME} (“we”, “us”). By creating an
              account or using the Service you agree to these Terms and to our{" "}
              <Link href="/privacy">Privacy Policy</Link>. If you are using the
              Service on behalf of an organisation, you agree to these Terms on
              its behalf.
            </Text>
            <Text>
              Kan is also available as open source software. If you run Kan on
              your own infrastructure, your use of that software is governed by
              its open source licence, not by these Terms.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Accounts</SubHeading>
            <Text>
              You must be at least 16 years old to use the Service. You are
              responsible for the information you give us being accurate, for
              keeping your login details and API keys secure, and for all
              activity under your account, including actions taken by any AI
              agent or integration you connect. Tell us straight away at{" "}
              <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link> if
              you think your account has been compromised.
            </Text>
            <Text>
              Workspace admins control who can join their workspace and what
              members can access. If you join a workspace owned by someone else,
              its admins may be able to see and manage the content you add to
              it.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Plans, trials and billing</SubHeading>
            <Text>
              Kan offers a free plan and paid plans. Paid plans are billed per
              user, in advance, monthly or annually, and renew automatically
              until cancelled. Payments are processed by Stripe and you
              authorise us to charge your chosen payment method for each billing
              period.
            </Text>
            <Text>
              Paid plans may start with a 14-day free trial. A payment method is
              required to start a trial. Unless you cancel before the trial
              ends, your subscription will begin and you will be charged at the
              end of the trial.
            </Text>
            <Text>
              You can change plans or cancel at any time from your workspace
              settings. Cancellation takes effect at the end of the current
              billing period. Except where required by law, payments are
              non-refundable.
            </Text>
            <Text>
              We may change our prices. We will give you reasonable notice
              before a change affects you, and it will take effect from your
              next billing period.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Your content</SubHeading>
            <Text>
              You own the boards, cards, comments, files and other content you
              add to the Service. You give us a licence to store, process and
              display that content only as needed to run and improve the Service
              for you. You are responsible for having the rights to the content
              you upload.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>AI agents and integrations</SubHeading>
            <Text>
              The Service lets you connect AI agents and other tools, for
              example through our MCP server or API. A connected agent acts on
              your behalf with your permissions, and you are responsible for
              what it does. Content an agent reads is sent to that agent’s
              provider, whose own terms and privacy policy apply. We are not
              responsible for third-party agents, tools or services.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Acceptable use</SubHeading>
            <Text>You agree not to use the Service to:</Text>
            <UnorderedList>
              <ListItem>break the law or infringe anyone’s rights</ListItem>
              <ListItem>
                upload malware or content that is unlawful, abusive or harassing
              </ListItem>
              <ListItem>
                send spam or unsolicited messages, including through invites
              </ListItem>
              <ListItem>
                attempt to access accounts or data you are not authorised to
                access, or probe, disrupt or overload the Service
              </ListItem>
              <ListItem>
                get around plan limits, rate limits or security measures
              </ListItem>
            </UnorderedList>
          </div>

          <div id="fair-use" className="mb-8 scroll-mt-24">
            <SubHeading>Fair use</SubHeading>
            <Text>
              Where a plan includes “unlimited” boards, cards, members or file
              uploads, this covers normal use of Kan for planning and managing
              work. It does not cover using the Service as general file hosting,
              as a backup store, or for automated bulk storage.
            </Text>
            <Text>
              We apply reasonable rate limits to the API, our MCP server and
              other integrations to keep the Service fast and reliable for
              everyone, including where requests come from AI agents or
              automations.
            </Text>
            <Text>
              If your usage is far above typical levels or affects other users,
              we will contact you first to agree a fix or a more suitable plan
              before limiting your account, unless immediate action is needed to
              protect the Service.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Our intellectual property</SubHeading>
            <Text>
              The Kan source code is licensed under AGPL-3.0. The Kan name, logo
              and branding, and the hosted Service itself, remain ours. If you
              send us feedback or suggestions, we may use them without any
              obligation to you.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Availability and changes</SubHeading>
            <Text>
              We work to keep the Service available and your data safe, but we
              do not guarantee the Service will be uninterrupted or error-free.
              We may change, add or remove features. If we discontinue the
              Service, we will give you reasonable notice and a way to export
              your data.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Suspension and termination</SubHeading>
            <Text>
              You can stop using the Service and delete your account at any
              time. We may suspend or close accounts that break these Terms or
              put the Service or other users at risk. Where reasonable, we will
              tell you first and give you a chance to fix the problem and export
              your data.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Disclaimer and liability</SubHeading>
            <Text>
              The Service is provided “as is”. To the extent permitted by law,
              we make no warranties beyond those stated in these Terms, and we
              are not liable for indirect or consequential losses, or for loss
              of profits, revenue or data. Our total liability to you in any
              12-month period is limited to the amount you paid us in that
              period. Nothing in these Terms limits liability that cannot be
              limited by law, including for death or personal injury caused by
              negligence, or for fraud.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Changes to these Terms</SubHeading>
            <Text>
              We may update these Terms. If a change is material, we will tell
              you by email or in the app at least 30 days before it takes
              effect. If you keep using the Service after that, you accept the
              updated Terms.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Governing law</SubHeading>
            <Text>
              These Terms are governed by the laws of England and Wales, and the
              courts of England and Wales have exclusive jurisdiction. If any
              part of these Terms is found to be unenforceable, the rest remains
              in effect.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Contact</SubHeading>
            <Text>
              Questions about these Terms? Email us at{" "}
              <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
            </Text>
          </div>
        </div>
      </div>
    </Layout>
  );
}
