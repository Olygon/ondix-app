import "server-only";

import { cancelSubscriberSubscription } from "@/lib/subscription/service";

export async function cancelActiveCompanySubscriptionOrchestration() {
  await cancelSubscriberSubscription();
}

