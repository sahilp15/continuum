import { googleLoginEnabled } from "@/lib/env";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <AuthForm mode="sign-in" returnTo={returnTo ?? "/home"} googleEnabled={googleLoginEnabled} />
  );
}
