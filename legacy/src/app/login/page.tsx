"use client";

import Link from "next/link";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from 'next/navigation'

const schema = yup.object({
	email: yup.string().email("Invalid email").required("Email required"),
	password: yup.string().required("Password required"),
});

export default function LoginPage() {
	const loginAction = useAction((api as any).auth.login);
	const [showPw, setShowPw] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { register, handleSubmit, formState: { errors } } = useForm<{email:string;password:string}>({ resolver: yupResolver(schema) })
	const router = useRouter()
	const onSubmit = async ({ email, password }: {email:string;password:string}) => {
		setError(null); setLoading(true)
		try {
			const p = loginAction({ email, password } as any)
			toast.promise(p, { loading: 'Signing in...', success: 'Welcome back!', error: (e:any)=> e.message || 'Login failed' })
			const res:any = await p
			if(res?.name && res?.userId){ localStorage.setItem('ca_user', JSON.stringify({ id: res.userId, name: res.name })); router.push('/'); }
		} catch(err:any){ setError(err.message) } finally { setLoading(false) }
	};

	return (
		<div className="flex min-h-screen w-full flex-col lg:flex-row">
			<div className="hidden lg:flex relative w-1/2 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.25),transparent_70%)] border-r">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
				<div className="relative z-10 max-w-md p-8 text-center space-y-6">
					<div className="text-6xl">🏏</div>
					<h2 className="text-3xl font-semibold tracking-tight">
						Build Your Dream Team
					</h2>
					<p className="text-sm text-muted-foreground">
						Host professional-style cricket auctions, manage squads, and track
						bidding in real time.
					</p>
					<div className="grid grid-cols-3 gap-3 text-xs">
						<div className="rounded-md border p-3 bg-background/40 backdrop-blur-sm">
							<p className="font-semibold">Flexible</p>
							<p className="text-muted-foreground">Pool</p>
						</div>
						<div className="rounded-md border p-3 bg-background/40 backdrop-blur-sm">
							<p className="font-semibold">Live</p>
							<p className="text-muted-foreground">Bidding</p>
						</div>
						<div className="rounded-md border p-3 bg-background/40 backdrop-blur-sm">
							<p className="font-semibold">Results</p>
							<p className="text-muted-foreground">Analytics</p>
						</div>
					</div>
				</div>
			</div>
			<div className="flex w-full lg:w-1/2 items-center justify-center p-6 md:p-10">
				<Card className="w-full max-w-sm shadow-lg">
					<CardHeader>
						<CardTitle>Login</CardTitle>
						<CardDescription>Access your auction dashboard</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
							<div className="grid gap-1">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="you@example.com"
									autoComplete="email"
									{...register('email')}
								/>
								{errors.email && <p className="text-xs text-destructive text-red-500">{errors.email.message}</p>}
							</div>
							<div className="grid gap-1">
								<Label htmlFor="password">Password</Label>
								<div className="relative">
									<Input
										id="password"
										type={showPw ? "text" : "password"}
										placeholder="••••••••"
										autoComplete="current-password"
										{...register('password')}
									/>
									<button
										type="button"
										className="absolute inset-y-0 right-0 flex items-center pr-3"
										onClick={() => setShowPw((prev) => !prev)}
									>
										{showPw ? (
											<Eye className="h-5 w-5 text-muted-foreground" />
										) : (
											<EyeOff className="h-5 w-5 text-muted-foreground" />
										)}
									</button>
								</div>
								{errors.password && <p className="text-xs text-destructive text-red-500">{errors.password.message}</p>}
							</div>
							<div className="flex items-center justify-between text-xs">
								<Link
									href="/forgot-password"
									className="text-muted-foreground hover:text-foreground"
								>
									Forgot password?
								</Link>
							</div>
							{error && <p className="text-xs text-destructive text-red-500">{error}</p>}
							<Button
								type="submit"
								className="w-full"
								disabled={loading}
							>
								{loading ? "Signing in..." : "Sign In"}
							</Button>
						</form>
					</CardContent>
					<CardFooter className="text-xs text-muted-foreground flex flex-col items-start gap-2">
						<span>
							New here?{" "}
							<Link
								href="/signup"
								className="underline hover:text-foreground"
							>
								Create an account
							</Link>
						</span>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
