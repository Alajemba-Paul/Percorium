import { createFileRoute } from "@tanstack/react-router";
import { BasketView } from "@/components/basket-view";

export const Route = createFileRoute("/b_/$payload")({
  component: BasketPayloadRoute,
});

function BasketPayloadRoute() {
  const { payload } = Route.useParams();
  return <BasketView payload={payload} />;
}
