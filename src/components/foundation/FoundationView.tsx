"use client";

import { ArrowRight } from "@carbon/icons-react";
import { Button, Column, Grid, Tag, Tile } from "@carbon/react";

interface FoundationItem {
  title: string;
  description: string;
}

interface FoundationAction {
  href: string;
  label: string;
}

interface FoundationViewProps {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  items: FoundationItem[];
  action?: FoundationAction;
}

export function FoundationView({
  eyebrow,
  title,
  description,
  status,
  items,
  action,
}: Readonly<FoundationViewProps>) {
  return (
    <div className="foundation-page">
      <section className="foundation-page__hero" aria-labelledby="page-title">
        <p className="foundation-page__eyebrow">{eyebrow}</p>
        <h1 id="page-title">{title}</h1>
        <p className="foundation-page__description">{description}</p>
        <div className="foundation-page__status">
          <Tag type="blue">Gate A</Tag>
          <span>{status}</span>
        </div>
        {action ? (
          <Button href={action.href} renderIcon={ArrowRight}>
            {action.label}
          </Button>
        ) : null}
      </section>
      <Grid className="foundation-page__grid" narrow>
        {items.map((item) => (
          <Column key={item.title} sm={4} md={4} lg={5}>
            <Tile className="foundation-page__tile">
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </Tile>
          </Column>
        ))}
      </Grid>
    </div>
  );
}
