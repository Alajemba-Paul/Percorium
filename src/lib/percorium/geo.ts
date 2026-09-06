import { createServerFn } from "@tanstack/react-start";
import { RESTRICTED_COUNTRIES } from "./constants";
import type { Eligibility } from "./types";

export const fetchEligibility = createServerFn({ method: "GET" }).handler(
  async (): Promise<Eligibility> => {
    const { getEdgeCountry } = await import("./geo.server");
    const country = getEdgeCountry();
    if (!country) {
      return { country: null, restricted: false, source: "unknown" };
    }
    return {
      country,
      restricted: RESTRICTED_COUNTRIES.has(country),
      source: "header",
    };
  },
);


