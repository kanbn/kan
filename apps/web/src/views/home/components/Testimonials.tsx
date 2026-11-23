import Image from "next/image";
import { t } from "@lingui/core/macro";
import { IoLogoReddit } from "react-icons/io";

import SectionHeading from "./SectionHeading";

const testimonials = [
  {
    name: "Bobby Compüters",
    handle: "@bobbycomputers",
    image: "/testimonials/avatars/bobby_computers.jpg",
    link: "https://x.com/bobbycomputers",
    text: "Holy crap I love this app. It's brutally minimal but somehow has everything I need.",
  },
  {
    name: "headlessdev_",
    handle: "r/selfhosted",
    logo: <IoLogoReddit size={18} />,
    colour: "#ff4500",
    link: "https://www.reddit.com/r/selfhosted/comments/1l1f2st/i_made_an_opensource_alternative_to_trello/",
    text: "This is the best thing I've seen here in a long time",
  },
  {
    name: "singiamtel",
    handle: "Hacker News",
    logo: "Y",
    colour: "#ff6600",
    link: "https://news.ycombinator.com/item?id=44157177",
    text: "The project seems nice, but how good is that domain name",
  },
];

const Testimonials = () => {
  return (
    <div className="flex flex-col px-4 pb-24">
      <SectionHeading
        eyebrow={t`Testimonials`}
        title={t`Less clutter, more love.`}
      />

      <figure className="mt-10 rounded-3xl border border-light-300 bg-light-50 p-6 sm:p-8 lg:p-12 dark:border-dark-200 dark:bg-dark-50">
        <blockquote className="max-w-[720px] text-base font-medium tracking-[-0.01em] text-balance text-light-1000 sm:text-lg lg:text-2xl lg:leading-[1.35] dark:text-dark-1000">
          “It feels new and electrifying, and yet simultaneously quite familiar.
          The extent to which it has been able to build upon the original Trello
          vision is staggering.”
        </blockquote>
        <figcaption className="mt-6 flex items-center gap-3 text-sm">
          <Image
            src="/testimonials/avatars/jrraphael.png"
            alt="JR Raphael"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="text-light-1000 dark:text-dark-1000">
            JR Raphael
          </span>
          <a
            href="https://www.fastcompany.com/91376028/trello-alternative-kan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-light-900 underline-offset-4 hover:underline dark:text-dark-800"
          >
            Fast Company
          </a>
        </figcaption>
      </figure>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <figure
            key={testimonial.handle}
            className="flex flex-col justify-between gap-6 rounded-2xl border border-light-300 bg-light-50 p-6 dark:border-dark-200 dark:bg-dark-50"
          >
            <blockquote className="text-sm leading-relaxed text-light-950 dark:text-dark-900">
              {testimonial.text}
            </blockquote>
            <figcaption className="flex items-center gap-3 text-sm">
              {testimonial.image ? (
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full font-semibold text-white"
                  style={{ backgroundColor: testimonial.colour }}
                >
                  {testimonial.logo}
                </span>
              )}
              <span className="text-light-1000 dark:text-dark-1000">
                {testimonial.name}
              </span>
              <a
                href={testimonial.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-light-900 underline-offset-4 hover:underline dark:text-dark-800"
              >
                {testimonial.handle}
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
};

export default Testimonials;
