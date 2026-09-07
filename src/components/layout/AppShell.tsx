"use client";

import {
  Content,
  Header,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  SkipToContent,
  Theme,
} from "@carbon/react";
import { copy } from "@/i18n/ko";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Theme theme="g100">
      <Header aria-label={copy.productName}>
        <SkipToContent />
        <HeaderName href="/" prefix="">
          {copy.productName}
        </HeaderName>
        <HeaderNavigation aria-label={copy.navigation.label}>
          <HeaderMenuItem href="/">{copy.navigation.dashboard}</HeaderMenuItem>
          <HeaderMenuItem href="/settings">
            {copy.navigation.settings}
          </HeaderMenuItem>
        </HeaderNavigation>
      </Header>
      <Content className="app-content" id="main-content">
        {children}
      </Content>
    </Theme>
  );
}
