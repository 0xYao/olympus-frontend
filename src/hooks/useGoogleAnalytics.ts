import { useEffect } from "react";
import ReactGA from "react-ga";
import GA4 from "react-ga4";
import { useLocation } from "react-router-dom";
import { useAccount } from "wagmi";

import { Environment } from "../helpers/environment/Environment/Environment";

const GA_API_KEY = Environment.getGoogleAnalyticsApiKey();
const GA4_API_KEY = Environment.getGA4ApiKey();

const useGoogleAnalytics = () => {
  const location = useLocation();

  const { data: account } = useAccount();

  useEffect(() => {
    const path = location.pathname + location.hash + location.search;
    const gaOptions = Object.assign(
      {
        cookieFlags: "SameSite=Strict; Secure",
      },
      account?.address ? { userId: account.address } : {},
    );
    if (process.env.NODE_ENV !== "test") {
      if (GA4_API_KEY && GA4_API_KEY.length > 1) {
        GA4.initialize([
          {
            trackingId: GA4_API_KEY,
            gaOptions,
          },
        ]);

        GA4.set({ anonymizeIp: true });
        GA4.send({ hitType: "pageview", page: path });
      }

      if (GA_API_KEY && GA_API_KEY.length > 1) {
        ReactGA.initialize(GA_API_KEY, {
          gaOptions,
        });
        ReactGA.set({ anonymizeIp: true });
        ReactGA.pageview(path);
      }
    }
  }, [location]);
};

export { useGoogleAnalytics };
