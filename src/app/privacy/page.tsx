import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — Harax",
  description:
    "How Harax collects, uses, stores and protects your information. Read about your rights, data retention, and how to delete your account.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="14 September 2026">
      <p>
        Harax is the community platform of Haramaya University — built by the campus, for the
        campus. This policy explains what information we collect when you use Harax, how we use
        it, and the choices you have. It applies to the Harax website, the Harax Android app, and
        every feature inside them, including posts, groups, channels, sidechat, events, and the
        Game Zone. We wrote it in plain language on purpose: your data should not require a law
        degree to understand.
      </p>

      <LegalSection n={1} title="Information we collect">
        <p>
          <strong>Account information.</strong> When you register, we collect your full name, your
          Haramaya University e-mail address, your student or staff role, and a password. Your
          password is never stored in readable form — it is hashed with a strong one-way algorithm
          (bcrypt) before it touches our database, which means not even the team that maintains
          Harax can read it.
        </p>
        <p>
          <strong>Content you create.</strong> Everything you post, comment, share or upload is
          stored so that it can be shown to other members: posts and comments, event listings,
          group and channel activity, sidechat messages, and the photos you choose to upload such
          as a profile picture, a banner image, or images attached to posts.
        </p>
        <p>
          <strong>Game Zone activity.</strong> When you play games on Harax we record your match
          results and points so that leaderboards, weekly rankings and prize history work
          correctly.
        </p>
        <p>
          <strong>Basic technical data.</strong> Like almost every website, our servers keep
          short-lived logs that include your device&apos;s IP address and browser type. We use
          these logs to keep the service stable and to fight abuse and spam, not to build an
          advertising profile — Harax runs no ads and sells nothing.
        </p>
      </LegalSection>

      <LegalSection n={2} title="How we use your information">
        <p>
          We use your information only to operate and improve Harax: to create and secure your
          account, to display your name and photo to other campus members, to deliver posts and
          messages to the people you share them with, to rank you on Game Zone leaderboards, to
          send you in-app notifications, and to keep the community safe through moderation. We do
          not sell, rent, or trade your personal information to anyone, and we do not use it for
          third-party advertising.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Who can see your information">
        <p>
          Most of what you share on Harax is visible to other signed-in members of the Haramaya
          University community — that is the entire point of a community platform. Your profile
          name, photo, banner, posts, comments, event attendance and game scores are visible to
          other members. Private information — your password (hashed), your e-mail address, and
          the contents of your sidechat conversations — is visible only to you and to the people
          you directly chat with. Members of the moderation team may review reported content,
          including messages, when handling abuse reports.
        </p>
      </LegalSection>

      <LegalSection n={4} title="How we store and protect information">
        <p>
          Harax runs on managed server infrastructure with an encrypted HTTPS connection for all
          traffic. Uploaded photos and the database live on a server volume that is backed up
          regularly. We limit access to production data to the small team that maintains the
          platform. No system is perfect, but we apply the standard protections expected of a
          service holding student data: hashed passwords, HTTPS everywhere, and least-privilege
          access.
        </p>
      </LegalSection>

      <LegalSection n={5} title="How long we keep information">
        <p>
          We keep your account and content for as long as your account is active. If you delete
          your account (see the next section), we remove or irreversibly de-identify your
          personal data — your profile, photos, posts, comments, chat messages, and game records —
          within 30 days, except where a small residual backup copy persists for at most 90 days
          until backup rotation completes. Data retained purely to keep the service secure (for
          example, records tied to banned accounts) may be kept longer.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Your rights and account deletion">
        <p>
          You can edit your name, photo and banner at any time from your profile. You can delete
          your own posts and comments. If you want to leave Harax completely, you can delete your
          account from the app: open <strong>Settings → Danger zone → Delete account</strong>.
          Deleting your account is permanent — your profile, photos, posts, messages and game
          history are erased and cannot be recovered. You may also request deletion or a copy of
          your data by contacting us (see Section 9), and we will respond within a reasonable
          time.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Children">
        <p>
          Harax is intended for members of the Haramaya University community, who are adults or
          approaching adulthood. The platform is not directed at children under 13, and we do not
          knowingly collect information from children under 13. If you believe a child under 13
          has created an account, contact us and we will remove it.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Changes to this policy">
        <p>
          If we make material changes to this policy we will announce them inside the app before
          they take effect. The &quot;Last updated&quot; date at the top of this page always
          reflects the current version. Continuing to use Harax after a change means you accept
          the updated policy.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Contact us">
        <p>
          Questions about this policy or about your data? Contact the Harax team at{" "}
          <a href="mailto:support@harax.app" className="font-bold underline decoration-primary decoration-2 underline-offset-4">
            support@harax.app
          </a>{" "}
          or through the university ICT office. We are students too — we will answer.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
