import Link from "next/link";

import {
  ListItem,
  SubHeading,
  Text,
  UnorderedList,
} from "~/components/LegalText";
import { PageHead } from "~/components/PageHead";
import Layout from "../home/components/Layout";

export default function PrivacyView() {
  const NAME = "Open Engineering";
  const CONTACT_EMAIL = "support@kan.bn";

  return (
    <Layout>
      <PageHead title="Privacy Policy | kan.bn" />
      <div className="flex flex-col items-center">
        <div className="mb-20 flex h-full w-full max-w-[720px] flex-col px-4">
          <h1 className="pt-36 text-2xl font-semibold tracking-[-0.03em] text-light-1000 lg:text-3xl dark:text-dark-1000">
            Privacy Policy
          </h1>
          <p className="mt-3 mb-12 text-sm text-light-900 dark:text-dark-800">
            Last updated: 23rd Nov 2026
          </p>

          <div className="mb-8">
            <SubHeading>Introduction</SubHeading>
            <Text>
              This policy explains how {NAME} (“we”, “us”) collects and uses
              personal data when you use Kan at kan.bn and its related websites,
              apps and APIs (the “Service”). We are the data controller for
              account and billing data. For the content you add to a workspace,
              we process it on behalf of that workspace.
            </Text>
            <Text>
              If you run Kan on your own infrastructure, we do not receive any
              of your data, and this policy does not apply.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>What we collect</SubHeading>
            <UnorderedList>
              <ListItem>
                Account data: your name, email address, avatar and login
                details, including details from Google, GitHub or other sign-in
                providers you choose to use.
              </ListItem>
              <ListItem>
                Workspace content: boards, lists, cards, comments, checklists,
                attachments and activity history that you and your teammates
                add.
              </ListItem>
              <ListItem>
                Billing data: your plan, billing history and billing contact.
                Card details are collected and stored by Stripe, not by us.
              </ListItem>
              <ListItem>
                Usage and technical data: IP address, browser and device type,
                pages visited, actions taken in the app, and error and server
                logs.
              </ListItem>
              <ListItem>
                Communications: messages you send us, for example support
                emails.
              </ListItem>
            </UnorderedList>
          </div>

          <div className="mb-8">
            <SubHeading>How we use it</SubHeading>
            <UnorderedList>
              <ListItem>
                to provide the Service, including sign-in, collaboration,
                notifications and file storage (contract)
              </ListItem>
              <ListItem>to take payments and manage plans (contract)</ListItem>
              <ListItem>
                to keep the Service secure, prevent abuse and fix problems
                (legitimate interests)
              </ListItem>
              <ListItem>
                to understand how the Service is used and improve it (legitimate
                interests)
              </ListItem>
              <ListItem>
                to send product updates and marketing emails, only where you
                have agreed or where the law allows, with an unsubscribe link in
                every email (consent or legitimate interests)
              </ListItem>
              <ListItem>
                to meet legal and tax obligations (legal obligation)
              </ListItem>
            </UnorderedList>
            <Text>
              We do not sell your personal data, and we do not use your
              workspace content to train AI models.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>AI agents and integrations</SubHeading>
            <Text>
              If you connect an AI agent or other tool to Kan, for example
              through our MCP server or API, that tool can read and change the
              content you give it access to. Content it reads is sent to the
              tool’s provider and is handled under their privacy policy, not
              ours. Agents connect using an API key, which you can revoke at any
              time from your API settings.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Who we share it with</SubHeading>
            <Text>
              We share personal data only with service providers who help us run
              the Service, under contracts that require them to protect it:
            </Text>
            <UnorderedList>
              <ListItem>Stripe, for payments and billing</ListItem>
              <ListItem>PostHog, for product analytics</ListItem>
              <ListItem>
                our hosting, database, file storage, email delivery and logging
                providers
              </ListItem>
            </UnorderedList>
            <Text>
              We may also disclose data if required by law, to protect our
              rights or users’ safety, or as part of a merger or sale of our
              business, in which case this policy will continue to apply.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Where your data is stored</SubHeading>
            <Text>
              Your data is hosted in the European Union. Some service providers,
              such as Stripe for payments, may process limited data outside the
              UK and EU. Where they do, we rely on safeguards approved under UK
              and EU data protection law, such as adequacy decisions or standard
              contractual clauses.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>How long we keep it</SubHeading>
            <Text>
              We keep your data while your account is active. When you delete
              your account or a workspace, we delete the related data within 30
              days, except where we must keep it longer for legal, tax or
              security reasons. Backups are overwritten on a rolling basis.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Security</SubHeading>
            <Text>
              We use encryption in transit, access controls and regular backups
              to protect your data. No system is completely secure, so please
              use a strong password and tell us straight away if you suspect
              unauthorised access.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Cookies</SubHeading>
            <Text>
              We use essential cookies to keep you signed in and remember your
              preferences, such as theme and language. We also use analytics to
              understand how the Service is used.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Your rights</SubHeading>
            <Text>
              Under UK and EU data protection law you can ask to access,
              correct, delete or export your personal data, object to or
              restrict how we use it, and withdraw consent at any time. Email us
              at <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>{" "}
              and we will respond within one month. You can also complain to the
              Information Commissioner’s Office (ico.org.uk).
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Children</SubHeading>
            <Text>
              The Service is not intended for anyone under 16, and we do not
              knowingly collect data from children.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Changes to this policy</SubHeading>
            <Text>
              We may update this policy. If a change is material, we will tell
              you by email or in the app before it takes effect.
            </Text>
          </div>

          <div className="mb-8">
            <SubHeading>Contact</SubHeading>
            <Text>
              Questions about your privacy? Email us at{" "}
              <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
            </Text>
          </div>
        </div>
      </div>
    </Layout>
  );
}
