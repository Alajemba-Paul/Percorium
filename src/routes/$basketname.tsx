import { createFileRoute } from "@tanstack/react-router";
import { BasketView } from "@/components/basket-view";

export const Route = createFileRoute("/$basketname")({
  component: BasketNameRoute,
});

function BasketNameRoute() {
  const { basketname } = Route.useParams();
  return <BasketView payload={basketname} />;
}
