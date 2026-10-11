'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Star } from 'lucide-react'

const plans = [
	{
		name: 'Free Starter',
		price: 0,
		period: 'Forever',
		blurb: 'Perfect for small auctions and testing the waters',
		popular: false,
		cta: 'Start Free',
		link: '/auction-setup?plan=free',
		features: [
			'Up to 2 Teams',
			'Up to 22 Players',
			'Basic Auction Features',
			'Standard Player Database',
			'Basic Team Statistics',
			'Manual Auction Control',
			'Export Results (Basic)'
		],
		missing: [
			'Advanced Analytics',
			'Custom Team Logos',
			'Priority Support'
		]
	},
	{
		name: 'Professional',
		price: 299,
		period: 'One‑time',
		blurb: 'For serious cricket auction enthusiasts',
		popular: true,
		cta: 'Get Professional',
		link: '/auction-setup?plan=professional',
		features: [
			'Up to 8 Teams',
			'Unlimited Players',
			'Advanced Auction Features',
			'Premium Player Database',
			'Detailed Team Analytics',
			'Real-time Bidding Stats',
			'Export Results (Advanced)',
			'Custom Team Branding',
			'Performance Insights',
			'Priority Support'
		],
		missing: []
	},
	{
		name: 'Enterprise',
		price: 999,
		period: 'One‑time',
		blurb: 'For tournaments & large-scale events',
		popular: false,
		cta: 'Contact Sales',
		link: '/contact?plan=enterprise',
		features: [
			'Unlimited Teams',
			'Unlimited Players',
			'Tournament Mode',
			'Multi-League Support',
			'Advanced Analytics Dashboard',
			'API Access',
			'White‑label Solutions',
			'Custom Integrations',
			'Dedicated Support',
			'Training & Onboarding'
		],
		missing: []
	}
]

const faqs = [
	{ q: 'How does the cricket auction system work?', a: 'We simulate real cricket auctions with random player selection, team bidding and manual sell/unsold control. Configure teams, budgets and run immersive live bidding.' },
	{ q: 'Can I upgrade my plan later?', a: 'Yes. Upgrading preserves all existing auction data, teams and settings instantly.' },
	{ q: 'What payment methods do you accept?', a: 'Major cards, UPI, net banking, PayPal and popular digital wallets.' },
	{ q: 'Is there a limit on auction duration?', a: 'No. You control pacing manually – ideal for short sessions or full‑day events.' },
	{ q: 'Can I customize team names and players?', a: 'Professional & Enterprise allow custom team branding and player list imports.' },
	{ q: 'Do you offer refunds?', a: '30‑day money‑back guarantee on paid plans. No questions asked.' }
]

export default function Pricing() {
	return (
		<div className="space-y-24">
			{/* Hero */}
			<section className="pt-4 md:pt-8 text-center space-y-8">
				<motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:.6 }} className="space-y-6">
					<Badge variant="secondary" className="px-4 py-1 text-xs tracking-wide">PRICING</Badge>
					<h1 className="text-5xl md:text-6xl font-bold tracking-tight">
						Choose Your <span className="bg-gradient-to-r from-indigo-300 via-sky-200 to-emerald-200 bg-clip-text text-transparent">Perfect Plan</span>
					</h1>
					<p className="text-muted-foreground text-lg max-w-2xl mx-auto">From casual backyard drafts to professional style tournaments – scale when you need more power.</p>
					<div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
						{['No hidden fees','30‑day guarantee','Instant access'].map(item => (
							<div key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {item}</div>
						))}
					</div>
				</motion.div>
			</section>

			{/* Plan Cards */}
			<section>
				<motion.div initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:.6 }} className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
					{plans.map((plan, i) => (
						<motion.div key={plan.name} initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1 }}>
							<Card className={`relative h-full flex flex-col ${plan.popular ? 'border-primary shadow-lg shadow-primary/10' : ''}`}>
								{plan.popular && (
									<div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
										<Star className="h-3.5 w-3.5 fill-primary" /> Popular
									</div>
								)}
								<CardHeader>
									<CardTitle className="flex flex-col gap-2">
										<span className="text-xl">{plan.name}</span>
										<span className="text-4xl font-bold tracking-tight">₹{plan.price}<span className="ml-2 text-base font-medium text-muted-foreground">{plan.period}</span></span>
									</CardTitle>
									<CardDescription>{plan.blurb}</CardDescription>
								</CardHeader>
								<CardContent className="flex-1">
									<ul className="space-y-2 text-sm">
										{plan.features.map(f => (
											<li key={f} className="flex items-start gap-2">
												<Check className="mt-0.5 h-4 w-4 text-emerald-400" />
												<span>{f}</span>
											</li>
										))}
										{plan.missing.map(m => (
											<li key={m} className="flex items-start gap-2 text-muted-foreground line-through opacity-60">
												<X className="mt-0.5 h-4 w-4 text-red-400" />
												<span>{m}</span>
											</li>
										))}
									</ul>
								</CardContent>
								<CardFooter>
									<Button asChild className="w-full" variant={plan.popular ? 'default':'outline'}>
										<Link href={plan.link}>{plan.cta}</Link>
									</Button>
								</CardFooter>
							</Card>
						</motion.div>
					))}
				</motion.div>
			</section>

			{/* Comparison Table */}
			<section className="space-y-10">
				<div className="text-center space-y-4">
					<h2 className="text-3xl font-semibold tracking-tight">Compare Features</h2>
					<p className="text-muted-foreground max-w-xl mx-auto text-sm">Quick overview of what scales across tiers.</p>
				</div>
				<div className="overflow-x-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-muted/40">
							<tr className="text-left">
								<th className="p-4 font-medium">Feature</th>
								{plans.map(p => (<th key={p.name} className="p-4 font-medium text-center">{p.name}</th>))}
							</tr>
						</thead>
						<tbody>
              {[
                { feature: 'Maximum Teams', values: ['2','8','Unlimited'] },
                { feature: 'Player Database', values: ['Standard','Premium','Custom'] },
                { feature: 'Advanced Analytics', values: ['—','✓','✓'] },
                { feature: 'API Access', values: ['—','—','✓'] }
              ].map(row => (
                <tr key={row.feature} className="border-t">
                  <td className="p-4 font-medium whitespace-nowrap">{row.feature}</td>
                  {row.values.map(val => {
                    let content: React.ReactNode = val
                    if (val === '✓') content = <Check className="mx-auto h-4 w-4 text-emerald-400" />
                    else if (val === '—') content = <X className="mx-auto h-4 w-4 text-muted-foreground" />
                    return (
                      <td key={`${row.feature}-${val}-${Math.random().toString(36).slice(2,6)}`} className="p-4 text-center">
                        {content}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
					</table>
				</div>
			</section>

			{/* FAQ */}
			<section className="space-y-12">
				<div className="text-center space-y-4">
					<h2 className="text-3xl font-semibold tracking-tight">Frequently Asked Questions</h2>
					<p className="text-muted-foreground max-w-xl mx-auto text-sm">Answers to common questions about the platform.</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					{faqs.map((f,i) => (
						<motion.div key={f.q} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:i*0.05 }} className="rounded-lg border bg-card/50 p-5">
							<h3 className="font-medium mb-2 flex items-start gap-2"><span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-primary" />{f.q}</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
						</motion.div>
					))}
				</div>
			</section>

			{/* CTA */}
			<section className="rounded-xl border bg-gradient-to-br from-indigo-950/40 via-slate-900/40 to-emerald-900/30 p-10 text-center space-y-6">
				<h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to run your auction?</h2>
				<p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">Start free now or jump straight into Professional for full analytics & customization.</p>
				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<Button asChild size="lg" className="px-8"><Link href="/auction-setup?plan=free">Try Free</Link></Button>
					<Button asChild size="lg" variant="outline" className="px-8"><Link href="/auction-setup?plan=professional">Get Professional</Link></Button>
				</div>
			</section>
		</div>
	)
}
