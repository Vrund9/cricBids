import type { Metadata } from 'next'
import Link from 'next/link'
import { CONTACT_EMAIL, PRIVACY_UPDATED } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What BidWicket collects when you run or join a cricket player auction, why, who can see it, and how to get it changed or deleted.',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'BidWicket Privacy Policy', url: '/privacy' },
}

const SECTIONS = [
  { id: 'who', title: 'Who we are' },
  { id: 'collect', title: 'What we collect' },
  { id: 'use', title: 'How we use it' },
  { id: 'visible', title: 'Who can see what' },
  { id: 'providers', title: 'Services we rely on' },
  { id: 'device', title: 'Cookies and your device' },
  { id: 'retention', title: 'How long we keep data' },
  { id: 'rights', title: 'Your choices and rights' },
  { id: 'children', title: 'Young players' },
  { id: 'security', title: 'Security' },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact us' },
]

const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-lime-glow hover:underline">{CONTACT_EMAIL}</a>

export default function PrivacyPage() {
  return (
    <main className="relative overflow-hidden pt-32 pb-24">
      <div className="grid-bg absolute inset-x-0 top-0 -z-10 h-[500px]" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-lime-glow">Legal</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-ink-400">Last updated {PRIVACY_UPDATED}</p>
        <p className="mt-6 text-lg text-ink-200">
          BidWicket helps cricket organisers run player auctions. To do that we handle details about organisers, team owners and players. This page explains, in plain words, what we collect, why, who can see it and how you can get it changed or deleted.
        </p>

        <nav aria-label="On this page" className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">On this page</p>
          <ol className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <li key={s.id}><a href={`#${s.id}`} className="text-ink-200 hover:text-white">{i + 1}. {s.title}</a></li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-12 text-[15px] leading-7 text-ink-200">
          <Section id="who" n={1} title="Who we are">
            <p>
              BidWicket (<Link href="/" className="text-lime-glow hover:underline">bidwicket.co.in</Link>) is online software for running cricket player auctions, operated from India. In this policy, “we” and “us” mean BidWicket. An <b>organiser</b> is anyone who creates an account and runs a tournament; a <b>player</b> is anyone whose details are added to a tournament, by the organiser or through a registration link.
            </p>
            <p>
              For player details, the organiser decides what to collect and why, and we process those details on their behalf to run the auction. For organiser accounts, we decide what we collect, as described below.
            </p>
          </Section>

          <Section id="collect" n={2} title="What we collect">
            <h3>Organiser accounts</h3>
            <ul>
              <li>Name and email address.</li>
              <li>Your password, stored only as a one-way hash; we can never see it.</li>
              <li>If you sign in with Google: your name, email address, profile picture and Google account ID, shared by Google with your permission.</li>
              <li>When you last signed in, and a counter that signs out your older devices when you sign in on a new one.</li>
            </ul>
            <h3>Tournament data organisers add</h3>
            <ul>
              <li>Tournament details: name, venue, date, description, logo and auction rules.</li>
              <li>Teams: names, short names, colours, logos and owner names.</li>
              <li>Players: name, playing role, batting and bowling style, category, mobile number, email, city, age, photo, base price, answers to the organiser’s own registration questions, and any extra columns in an uploaded Excel file.</li>
              <li>The auction itself: bids, sold and unsold players, prices and final squads.</li>
            </ul>
            <h3>Players who use a registration link</h3>
            <p>Whatever the form asks for: usually name, mobile number, playing role and photo, plus any questions the organiser added. Required fields are marked on the form.</p>
            <h3>Purchases</h3>
            <p>
              What you bought (for example extra teams or Pro), the amount, any discount or reward points used, and when. If we take card or UPI payments, they are handled by a payment provider; we never see or store your full card or bank details.
            </p>
            <h3>Feedback</h3>
            <p>Anything you send through the feedback form, and the page you sent it from.</p>
            <h3>Usage and technical data</h3>
            <ul>
              <li>
                Privacy-friendly analytics (Vercel Web Analytics and Speed Insights): which pages are visited, the referring site, rough location (country), device and browser type, and page load speed. It uses no cookies, and we strip private link codes from page addresses before anything is recorded, so a team’s bidding link or a registration link is never stored in analytics.
              </li>
              <li>Basic product events, such as an account being created, a tournament being created, an auction starting or finishing, and a player registering. These events carry no names or contact details.</li>
              <li>Our hosting providers keep standard server logs (IP address, time, the page or API called, and errors) to keep the service secure and working.</li>
            </ul>
          </Section>

          <Section id="use" n={3} title="How we use it">
            <ul>
              <li>To run the service: sign you in, save tournaments, run live auctions, show results and produce Excel and PDF exports.</li>
              <li>To send emails you need, such as password-reset links.</li>
              <li>To apply what you bought and any discounts or reward points.</li>
              <li>To answer feedback and support requests.</li>
              <li>To keep BidWicket secure and prevent abuse, including limiting repeated requests and suspending accounts that misuse it.</li>
              <li>To understand, in aggregate, which features are used and how fast pages load, so we can improve the product.</li>
            </ul>
            <p>We do <b>not</b> sell personal data, show third-party ads, or use player details for marketing.</p>
          </Section>

          <Section id="visible" n={4} title="Who can see what">
            <ul>
              <li><b>Organisers</b> see everything in their own tournaments, including player mobile numbers and emails, and can export it to Excel or PDF.</li>
              <li>
                <b>Anyone with a tournament’s live link</b> (for example on a projector) and <b>team owners with a bidding link</b> see the auction: player name, photo, role, playing style, age, city, prices, bids and squads. <b>Mobile numbers and emails are never shown on these screens.</b>
              </li>
              <li>Live, bidding and registration links are private links: anyone who has one can open it, so organisers should share them only with the people they’re meant for. Organisers can create a new link at any time, which stops the old one working.</li>
              <li>Pages behind the share links are marked so search engines don’t list them.</li>
              <li>Our team can access data only when needed to provide support, fix problems or prevent abuse.</li>
            </ul>
          </Section>

          <Section id="providers" n={5} title="Services we rely on">
            <p>We use trusted providers to run BidWicket. They process data only to provide their service to us:</p>
            <ul>
              <li><b>Vercel</b>: hosts the website, and provides Web Analytics and Speed Insights.</li>
              <li><b>Render</b>: runs our application server (Singapore region).</li>
              <li><b>Neon</b>: hosts our PostgreSQL database.</li>
              <li><b>Cloudinary</b>: stores and resizes uploaded photos and logos.</li>
              <li><b>Google</b>: provides “Continue with Google” sign-in, if you use it.</li>
              <li><b>An email delivery provider</b>: sends account emails such as password resets.</li>
            </ul>
            <p>
              Because of this, your data may be stored or processed outside India, including in Singapore and other countries where these providers operate. We may also disclose data if the law requires it, or to protect the rights and safety of our users or BidWicket.
            </p>
          </Section>

          <Section id="device" n={6} title="Cookies and your device">
            <p>
              We don’t use advertising or tracking cookies. BidWicket stores a few small items in your browser’s local storage: your sign-in session, and preferences like light or dark theme, sound on or off, dismissed tips and your Excel column choices. You can clear them at any time in your browser settings; you’ll just need to sign in again.
            </p>
          </Section>

          <Section id="retention" n={7} title="How long we keep data">
            <ul>
              <li>Account and tournament data is kept while your account is active, so you can come back to past auctions and results.</li>
              <li>Organisers can delete individual players, teams or whole tournaments at any time; deleting a tournament removes its players, teams, bids and results.</li>
              <li>To delete your whole account, email <Mail /> from your account’s email address. We’ll delete it within 30 days. Copies in backups are removed as those backups expire.</li>
              <li>We may keep records of purchases for as long as tax and accounting laws require.</li>
            </ul>
          </Section>

          <Section id="rights" n={8} title="Your choices and rights">
            <p>
              Under Indian law, including the Digital Personal Data Protection Act, 2023, and wherever else data protection laws apply to you, you can ask to see the personal data we hold about you, correct it, have it deleted, withdraw your consent, and raise a complaint.
            </p>
            <ul>
              <li><b>Organisers</b> can view and edit their account and tournaments in the app, or email us for anything else.</li>
              <li><b>Players</b>: the organiser who ran your tournament controls your details, so contact them first to change or remove them. If you can’t reach them, email us with the tournament name and we’ll help.</li>
            </ul>
            <p>We reply to every request within 30 days. If you’re unhappy with our reply, you can complain to the Data Protection Board of India.</p>
          </Section>

          <Section id="children" n={9} title="Young players">
            <p>
              BidWicket accounts are for adults (18 and over). Tournaments sometimes include younger players; when an organiser adds a player under 18, or lets them register, the organiser is responsible for getting permission from a parent or guardian first. If you’re a parent and want a child’s details removed, email <Mail />.
            </p>
          </Section>

          <Section id="security" n={10} title="Security">
            <p>
              All traffic is encrypted with HTTPS. Passwords are hashed, private links use long random codes that can be reset, and admin access is limited and logged. No system is perfectly secure, but if we learn of a breach that affects your data we’ll tell you and the authorities as the law requires.
            </p>
          </Section>

          <Section id="changes" n={11} title="Changes to this policy">
            <p>When we change this policy we’ll update the date at the top. For important changes we’ll also tell organisers by email or in the app before they take effect.</p>
          </Section>

          <Section id="contact" n={12} title="Contact us">
            <p>
              For privacy questions, requests or complaints (including as our grievance contact), email <Mail />. You can also read <Link href="/about" className="text-lime-glow hover:underline">about BidWicket</Link>.
            </p>
          </Section>
        </div>
      </div>
    </main>
  )
}

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-2xl font-bold text-white">
        <span className="mr-2 text-ink-400">{n}.</span>{title}
      </h2>
      <div className="mt-4 space-y-4 [&_b]:text-white [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-white [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:marker:text-ink-500">{children}</div>
    </section>
  )
}
