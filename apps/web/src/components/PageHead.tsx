import Head from "next/head";
import { useRouter } from "next/router";
import { env } from "next-runtime-env";

const DEFAULT_DESCRIPTION =
  "The open source alternative to Trello. A powerful, flexible kanban app that helps you organise work, track progress, and deliver results—all in one place.";
const DEFAULT_IMAGE = "/hero-light.png";

export const PageHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
}: {
  title: string;
  description?: string;
  image?: string;
}) => {
  const router = useRouter();
  const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "";
  const canonicalUrl = `${baseUrl}${router.asPath.split("?")[0]}`;
  const imageUrl = `${baseUrl}${image}`;

  return (
    <Head>
      <title>{title}</title>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1"
      />
      <link rel="manifest" href="/manifest.json" />
      <meta name="description" content={description} />
      {baseUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {baseUrl && <meta property="og:url" content={canonicalUrl} />}
      {baseUrl && <meta property="og:image" content={imageUrl} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {baseUrl && <meta name="twitter:image" content={imageUrl} />}
    </Head>
  );
};
