import type { SocialProvidersProps } from "~/utils/social-providers";
import LoginView from "~/views/auth/login";

export { getSocialProvidersProps as getServerSideProps } from "~/utils/social-providers";

export default function LoginPage(props: SocialProvidersProps) {
  return <LoginView {...props} />;
}
