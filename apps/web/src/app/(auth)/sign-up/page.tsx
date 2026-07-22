import { googleLoginEnabled } from "@/lib/env";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Create your account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <AuthForm mode="sign-up" returnTo={returnTo ?? "/home"} googleEnabled={googleLoginEnabled} />
  );
}
