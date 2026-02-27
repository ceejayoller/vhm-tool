"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/state/authStore";
import { sendOtpCode, verifyOtpCode } from "@/lib/api";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

const RESEND_COOLDOWN_SECONDS = 60;

type LoginStep = "email" | "otp";

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleSendCode = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await sendOtpCode(email.trim().toLowerCase());
      setStep("otp");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleVerifyCode = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await verifyOtpCode(
        email.trim().toLowerCase(),
        otpCode.trim(),
      );
      login(result.bearer_token, result.user);
      router.replace("/");
    } catch {
      setError("Verification failed. Please check your code and try again.");
    } finally {
      setLoading(false);
    }
  }, [email, otpCode, login, router]);

  const handleBack = useCallback(() => {
    setStep("email");
    setOtpCode("");
    setError(null);
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) handleSendCode();
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim()) handleVerifyCode();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">VHM Tool</CardTitle>
        <CardDescription>
          {step === "email"
            ? "Sign in with your Kaiko email"
            : `Enter the 6-digit code sent to ${email}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@kaiko.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={
                loading || !email.trim() || resendCooldown > 0
              }
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {loading
                ? "Sending..."
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Send Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                autoFocus
                autoComplete="one-time-code"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || !otpCode.trim()}
              >
                {loading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {loading ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
