/**
 * Card Grid Renderer for Generative UI
 *
 * Renders a grid of cards based on specifications from the agent.
 */

import type { CardGridComponentSpec } from "@antipopp/agno-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Card Grid Renderer
 */
export function CardGridRenderer(props: CardGridComponentSpec["props"]) {
  const {
    cards,
    columns = { default: 1, md: 2, lg: 3 },
    variant = "default",
  } = props;

  if (!cards || cards.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border bg-muted/10 p-8">
        <p className="text-muted-foreground text-sm">No items available</p>
      </div>
    );
  }

  // Build grid class based on columns
  const gridCols = {
    default: columns.default || 1,
    sm: columns.sm,
    md: columns.md || 2,
    lg: columns.lg || 3,
    xl: columns.xl,
  };

  const gridClass =
    `grid gap-4 ${gridCols.default === 1 ? "grid-cols-1" : `grid-cols-${gridCols.default}`} ${
      gridCols.sm ? `sm:grid-cols-${gridCols.sm}` : ""
    } ${gridCols.md ? `md:grid-cols-${gridCols.md}` : ""} ${gridCols.lg ? `lg:grid-cols-${gridCols.lg}` : ""} ${
      gridCols.xl ? `xl:grid-cols-${gridCols.xl}` : ""
    }`.trim();

  const cardVariantClass =
    variant === "bordered"
      ? "border-2"
      : variant === "elevated"
        ? "shadow-lg"
        : "";

  return (
    <div className={gridClass}>
      {cards.map((card) => (
        <Card className={cardVariantClass} key={card.id}>
          {card.image && (
            <div className="aspect-video w-full overflow-hidden rounded-t-lg">
              <img
                alt={card.title}
                className="h-full w-full object-cover"
                src={card.image}
              />
            </div>
          )}
          <CardHeader>
            <CardTitle>{card.title}</CardTitle>
            {card.description && (
              <CardDescription>{card.description}</CardDescription>
            )}
          </CardHeader>
          {card.metadata && Object.keys(card.metadata).length > 0 && (
            <CardContent>
              <dl className="space-y-1 text-sm">
                {Object.entries(card.metadata).map(([key, value]) => (
                  <div className="flex justify-between" key={key}>
                    <dt className="text-muted-foreground">{key}:</dt>
                    <dd className="font-medium">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          )}
          {card.actions && card.actions.length > 0 && (
            <CardFooter className="flex gap-2">
              {card.actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={() => {
                    // Emit custom event for action handling
                    if (action.onClick) {
                      window.dispatchEvent(
                        new CustomEvent("generative-ui-action", {
                          detail: { action: action.onClick, cardId: card.id },
                        })
                      );
                    }
                  }}
                  size="sm"
                  variant={action.variant || "default"}
                >
                  {action.label}
                </Button>
              ))}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}
