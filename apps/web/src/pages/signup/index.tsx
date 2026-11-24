import type { SocialProvidersProps } from "~/utils/social-providers";
import SignupView from "~/views/auth/signup";

export { getSocialProvidersProps as getServerSideProps } from "~/utils/social-providers";

export default function SignupPage(props: SocialProvidersProps) {
  return <SignupView {...props} />;
}
