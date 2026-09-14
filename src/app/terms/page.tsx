import type { Metadata } from "next";
import { LegalShell, LegalSection } from "@/components/legal/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service — Harax",
  description:
    "The rules for using Harax, the Haramaya University community platform: accounts, community standards, content ownership, Game Zone fair play, and liability.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="14 September 2026">
      <p>
        Welcome to Harax. These terms are the agreement between you and the Harax team about how
        you may use the platform. By creating an account, you accept them. They are deliberately
        short and readable — the short version is: be a decent member of the campus community,
        do not use Harax to harm anyone, and understand that Harax is a student-built service
        provided on a best-effort basis.
      </p>

      <LegalSection n={1} title="What Harax is">
        <p>
          Harax is an online community platform built for the Haramaya University community: a
          feed for posts, event listings, groups, channels, private sidechat messaging, and a
          Game Zone with online multiplayer games, points, weekly leaderboards and prizes for the
          top players. Harax is an independent, student-built project; it is not an official
          communication channel of Haramaya University, and the university is not responsible for
          content posted by members.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Who may use Harax">
        <p>
          You may use Harax if you are a member of the Haramaya University community — students,
          staff and alumni — and you are at least 13 years old. One person, one account: do not
          create accounts for other people, and do not share your account credentials. You are
          responsible for everything that happens through your account, so keep your password to
          yourself.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Community standards">
        <p>
          Harax works because campus members treat each other well. You agree not to use the
          platform to harass, threaten, or bully anyone; not to post content that is hateful,
          violent, sexually explicit, or illegal; not to spread deliberately false information
          about people, groups or the university; not to impersonate anyone; and not to spam,
          scrape or otherwise abuse the service. Moderators may remove content that breaks these
          standards and suspend or ban accounts that repeatedly do. If you see something wrong,
          report it — moderation tools exist in the app for exactly that.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Your content">
        <p>
          You keep ownership of everything you create on Harax — your posts, photos, comments and
          messages remain yours. By sharing content on the platform, you grant Harax the limited
          permission needed to store and display it to other members as part of running the
          service (for example, showing your post in a friend&apos;s feed or your photo on your
          profile). That permission ends when you delete the content or your account, subject to
          normal backups that expire over time. Do not upload content that infringes someone
          else&apos;s rights — including photos of people who did not agree to be posted.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Game Zone, points and prizes">
        <p>
          Game Zone results, points, leaderboards and weekly rankings are provided for fun and
          community competition. Points and rankings may reset weekly by design. Weekly prizes,
          where offered, are announced in the app, and the Harax team&apos;s record of winners is
          final. Cheating, exploiting bugs, using bots or multiple accounts to farm points, or
          manipulating match results is strictly forbidden and will result in point resets and
          possible bans. Prizes have no cash alternative unless explicitly stated, and the team
          may cancel or adjust a prize round if abuse is detected.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Availability and changes">
        <p>
          We work hard to keep Harax online, but it is a student-run service: features may
          change, and occasional downtime for maintenance or exams is a fact of life. We may add,
          modify or remove parts of the platform over time. If we ever make a change that
          materially affects these terms, we will announce it in the app first.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Disclaimer and limitation of liability">
        <p>
          Harax is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
          any kind, express or implied. To the maximum extent permitted by applicable law, the
          Harax team is not liable for indirect or consequential damages, or for losses arising
          from content posted by members, downtime, data loss, or disputes between members. Your
          use of the platform is at your own risk.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Termination">
        <p>
          You can delete your account at any time from <strong>Settings → Danger zone → Delete
          account</strong> — see our Privacy Policy for what happens to your data. We may suspend
          or ban accounts that violate these terms or endanger the community. Sections 4, 7 and 9
          survive account deletion.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Governing law and contact">
        <p>
          These terms are governed by the laws of the Federal Democratic Republic of Ethiopia.
          Questions? Contact the Harax team at{" "}
          <a href="mailto:support@harax.app" className="font-bold underline decoration-primary decoration-2 underline-offset-4">
            support@harax.app
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
