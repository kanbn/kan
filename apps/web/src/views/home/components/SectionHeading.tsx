export default function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="w-full max-w-[560px]">
      <p className="text-sm font-medium text-light-900 dark:text-dark-900">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-balance text-light-1000 lg:text-2xl lg:leading-[1.25] dark:text-dark-1000">
        {title}
      </h2>
    </div>
  );
}
