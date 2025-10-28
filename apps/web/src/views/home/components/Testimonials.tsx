import Image from "next/image";
import { t } from "@lingui/core/macro";
import { twMerge } from "tailwind-merge";

interface Testimonial {
  name: string;
  handle: string;
  image?: string;
  colour?: string;
  text: string | React.ReactNode;
  role?: string;
  link?: string;
  rowSpan?: number;
}

const TestimonialCard = ({
  testimonial,
  rowSpan,
}: {
  testimonial: Testimonial;
  rowSpan?: number;
}) => {
  // Generate initials for avatar
  const initials = testimonial.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={twMerge(
        "group relative rounded-2xl border border-light-200 bg-light-50 p-6 transition-all duration-200 hover:shadow-sm dark:border-dark-200 dark:bg-dark-50",
        rowSpan === 2 ? "md:row-span-2" : "",
      )}
    >
      <div className="flex items-start gap-3">
        {testimonial.image ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <Image
              src={testimonial.image}
              alt={testimonial.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-light-50 dark:text-dark-1000"
            style={
              testimonial.colour
                ? { backgroundColor: testimonial.colour }
                : undefined
            }
          >
            {initials}
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-light-1000 dark:text-dark-1000">
              {testimonial.name}
            </p>
          </div>
          {testimonial.link ? (
            <a
              href={testimonial.link}
              target="_blank"
              rel="noopener noreferrer"
              className="-mt-1 block text-sm text-light-800 transition-colors hover:text-light-900 dark:text-dark-800 dark:hover:text-dark-900"
            >
              {testimonial.handle}
            </a>
          ) : (
            <p className="-mt-0.5 block text-sm text-light-800 dark:text-dark-800">
              {testimonial.handle}
            </p>
          )}
          {testimonial.role && (
            <p className="text-xs text-light-600 dark:text-dark-600">
              {testimonial.role}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm leading-relaxed text-light-950 dark:text-dark-900">
        <p>{testimonial.text}</p>
      </div>
    </div>
  );
};

const Testimonials = () => {
  const testimonials: Testimonial[] = [
    {
      name: "Bobby Compüters",
      handle: "@bobbycomputers",
      image: "/testimonials/avatars/bobby_computers.jpg",
      text: (
        <>
          Holy crap I love this app. It's brutally minimal but somehow has
          everything I need.
        </>
      ),
      link: "https://x.com/bobbycomputers",
    },
    {
      name: "JR Raphael",
      handle: "@JRRaphael",
      image: "/testimonials/avatars/jrraphael.png",
      link: "https://www.fastcompany.com/91376028/trello-alternative-kan",
      rowSpan: 2,
      text: (
        <>
          The interesting thing about signing into Kan for the first time is
          that it feels new and electrifying—and yet simultaneously quite
          familiar, especially if you’ve spent any time in Trello over the
          years.
          <br />
          <br />
          As someone who connected more with Trello’s original vision and mostly
          just tolerated the more recent pivots and additions, it’s a bit of a
          revelation to use.
          <br />
          <br />
          At its core, Kan gives you a super-minimalist and frills-free
          Trello-style Kanban board. And the extent to which it has been able to
          build upon the original Trello vision is staggering.
        </>
      ),
    },
    {
      name: "singiamtel",
      handle: "@singiamtel",
      colour: "#ff6600",
      text: <>The project seems nice, but how good is that domain name</>,
      link: "https://news.ycombinator.com/item?id=44157177",
    },

    {
      name: "Jan Stgmnn",
      handle: "@JanStgmnn",
      image: "/testimonials/avatars/jan_stgmnn.jpg",
      link: "https://x.com/JanStgmnn",
      text: (
        <>
          Just wanted to say, that I really love the project. It's so easy to
          use and has a really nice UI!
        </>
      ),
    },
    {
      name: "Fox",
      handle: "@dscfox",
      image: "/testimonials/avatars/fox.png",
      link: "https://discord.gg/e6ejRb6CmT",
      rowSpan: 2,
      text: (
        <>
          I've been looking at alternatives for months, but everything came up
          short.
          <br />
          <br />
          Some were direct clones, but lacked features I was dependent on.
          Others were rich in features, but strayed too far away from the
          simplicity of Trello.
          <br />
          <br />
          This seems like the best alternative to Trello for me.
        </>
      ),
    },
    {
      name: "Hanno Braun",
      handle: "@hannobraun",
      image: "/testimonials/avatars/hanno_braun.webp",
      link: "https://discord.gg/e6ejRb6CmT",
      text: (
        <>
          I've been very impressed with the app so far! It's great to have such
          a nice open source alternative to Trello.
        </>
      ),
    },
    {
      name: "headlessdev_",
      handle: "@headlessdev_",
      image: "/testimonials/avatars/headless_dev.png",
      link: "https://www.reddit.com/r/selfhosted/comments/1l1f2st/i_made_an_opensource_alternative_to_trello/",
      text: <>This is the best thing I've seen here in a long time</>,
    },
    {
      name: "EHB",
      handle: "@ehb3839",
      image: "/testimonials/avatars/ehb.webp",
      link: "https://www.reddit.com/r/selfhosted/comments/1l1f2st/i_made_an_opensource_alternative_to_trello/",
      text: (
        <>
          It's exactly what I've been looking for recently. The simplicity of
          the overall app is a pleasure to use.
        </>
      ),
    },
    {
      name: "Tasneema Waquar",
      handle: "@tasneema_waquar",
      image: "/testimonials/avatars/tasneema_waquar.jpeg",
      link: "https://www.producthunt.com/products/kan-bn/reviews",
      text: (
        <>
          The design of this project management tool is impressive. The
          interface is intuitive, free of unnecessary clutter, and comes with a
          solid selection of templates.
        </>
      ),
    },
    {
      name: "BRAVO68WEB",
      handle: "@bravo68web",
      image: "/testimonials/avatars/bravo68web.jpeg",
      link: "https://discord.gg/e6ejRb6CmT",
      text: <>I have fallen in love with the project.</>,
    },
  ];

  return (
    <>
      <div className="flex flex-col items-center justify-center px-4 pb-24">
        <div className="flex items-center gap-2 rounded-full border bg-light-50 px-4 py-1 text-center text-xs text-light-1000 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-900 lg:text-sm">
          <p>{t`Testimonials`}</p>
        </div>

        <p className="mt-2 text-center text-3xl font-bold text-light-1000 dark:text-dark-1000 lg:text-4xl">
          {t`Loved by teams worldwide`}
        </p>
        <p className="text-md lg:text-md mt-3 max-w-[500px] text-center text-light-950 dark:text-dark-900">
          {t`See what our users are saying about Kan`}
        </p>

        <div className="mx-auto mt-16 w-full max-w-7xl">
          <div className="grid grid-cols-1 gap-4 [mask-image:linear-gradient(to_bottom,black_90%,transparent_98%)] md:auto-rows-fr md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={`testimonial-${index}`}
                testimonial={testimonial}
                rowSpan={testimonial.rowSpan}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Testimonials;
