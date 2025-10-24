import type { FC, SVGProps } from "react";
import { Trans } from "@lingui/react/macro";

import AirbusLogo from "/public/logos/airbus.svg";
import BitwardenLogo from "/public/logos/bitwarden.svg";
import CouchbaseLogo from "/public/logos/couchbase.svg";
import DeloitteLogo from "/public/logos/deloitte.svg";
import FastCompanyLogo from "/public/logos/fast_company.svg";
import LegoLogo from "/public/logos/lego.svg";
import LinkedinLogo from "/public/logos/linkedin.svg";
import SanaLogo from "/public/logos/sana.svg";
import WakamLogo from "/public/logos/wakam.svg";

type LogoComponent = FC<SVGProps<SVGSVGElement>>;

export default function Logos() {
  const logos: {
    id: number;
    component: LogoComponent;
    alt: string;
  }[] = [
    {
      id: 1,
      component: SanaLogo as LogoComponent,
      alt: "Sana Logo",
    },
    {
      id: 2,
      component: FastCompanyLogo as LogoComponent,
      alt: "Fast Company Logo",
    },
    {
      id: 3,
      component: BitwardenLogo as LogoComponent,
      alt: "Bitwarden Logo",
    },
    {
      id: 4,
      component: CouchbaseLogo as LogoComponent,
      alt: "Couchbase Logo",
    },
    {
      id: 5,
      component: LegoLogo as LogoComponent,
      alt: "Lego Logo",
    },
    {
      id: 6,
      component: AirbusLogo as LogoComponent,
      alt: "Airbus Logo",
    },
    {
      id: 7,
      component: DeloitteLogo as LogoComponent,
      alt: "Deloitte Logo",
    },
    {
      id: 8,
      component: WakamLogo as LogoComponent,
      alt: "Wakam Logo",
    },
    {
      id: 9,
      component: LinkedinLogo as LogoComponent,
      alt: "Linked In Logo",
    },
  ];

  return (
    <div className="w-full px-4 py-16">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium text-light-800 dark:text-dark-800">
          <Trans>
            Trusted by fast-moving teams
            <br />
            around the world
          </Trans>
        </p>
      </div>

      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-white/60 to-transparent dark:from-dark-50" />
        <div className="absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-white/60 to-transparent dark:from-dark-50" />

        <div className="animate-scroll flex" style={{ width: "max-content" }}>
          <div className="flex flex-shrink-0 items-center space-x-12">
            {logos.map((logo) => {
              const LogoComponent: LogoComponent = logo.component;
              return (
                <div
                  key={`first-${logo.id}`}
                  className="flex h-12 w-32 items-center justify-center"
                >
                  <LogoComponent
                    className="text-light-950 transition-all duration-300 hover:text-light-1000 dark:text-dark-950 hover:dark:text-dark-1000"
                    aria-label={logo.alt}
                  />
                </div>
              );
            })}
          </div>

          <div className="ml-12 flex flex-shrink-0 items-center space-x-12">
            {logos.map((logo) => {
              const LogoComponent: LogoComponent = logo.component;
              return (
                <div
                  key={`second-${logo.id}`}
                  className="flex h-12 w-32 items-center justify-center"
                >
                  <LogoComponent
                    className="text-light-950 transition-all duration-300 hover:text-light-1000 dark:text-dark-950 hover:dark:text-dark-1000"
                    aria-label={logo.alt}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
