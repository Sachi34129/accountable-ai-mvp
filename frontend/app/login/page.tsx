"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, ShieldCheck } from "lucide-react"

export default function LoginPage() {
    const [userId, setUserId] = useState("")
    const router = useRouter()

    useEffect(() => {
        const storedUserId = localStorage.getItem("userId")
        if (storedUserId) {
            router.push("/")
        }
    }, [router])

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (userId.trim()) {
            localStorage.setItem("userId", userId.trim())
            router.push("/")
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                <CardHeader className="text-center space-y-1">
                    <div className="flex justify-center mb-2">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Bot className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Virtual CA</CardTitle>
                    <CardDescription>
                        Enter your User ID to access your financial dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="userId">User ID</Label>
                            <Input
                                id="userId"
                                placeholder="e.g. user123"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <Button type="submit" className="w-full h-11 text-base font-medium" disabled={!userId.trim()}>
                            Sign In
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col items-center space-y-2 pt-0 pb-6">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-slate-100 px-3 py-1.5 rounded-full">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Secure & Accountable AI
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
