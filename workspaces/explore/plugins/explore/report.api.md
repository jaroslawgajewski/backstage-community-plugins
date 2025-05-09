## API Report File for "@backstage-community/plugin-explore"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts
/// <reference types="react" />

import { ApiRef } from '@backstage/core-plugin-api';
import { BackstagePlugin } from '@backstage/core-plugin-api';
import { default as default_2 } from 'react';
import { DependencyGraphTypes } from '@backstage/core-components';
import { DiscoveryApi } from '@backstage/core-plugin-api';
import { DomainEntity } from '@backstage/catalog-model';
import { ExploreToolsConfig } from '@backstage-community/plugin-explore-react';
import { ExternalRouteRef } from '@backstage/core-plugin-api';
import { FetchApi } from '@backstage/core-plugin-api';
import { GetExploreToolsRequest } from '@backstage-community/plugin-explore-common';
import { GetExploreToolsResponse } from '@backstage-community/plugin-explore-common';
import { IndexableDocument } from '@backstage/plugin-search-common';
import { JSX as JSX_2 } from 'react/jsx-runtime';
import { ReactNode } from 'react';
import { ResultHighlight } from '@backstage/plugin-search-common';
import { RouteRef } from '@backstage/core-plugin-api';
import { SearchResultListItemExtensionProps } from '@backstage/plugin-search-react';
import { TabProps } from '@material-ui/core/Tab';

// @public @deprecated (undocumented)
export const catalogEntityRouteRef: ExternalRouteRef<
  {
    name: string;
    kind: string;
    namespace: string;
  },
  true
>;

// @public (undocumented)
export const CatalogKindExploreContent: (props: {
  title?: string;
  kind: string;
}) => JSX_2.Element;

// @public (undocumented)
export const DomainCard: (props: { entity: DomainEntity }) => JSX_2.Element;

// @public (undocumented)
export const DomainExplorerContent: (props: {
  title?: string | undefined;
}) => JSX_2.Element;

// @public
export interface ExploreApi {
  getTools(request?: GetExploreToolsRequest): Promise<GetExploreToolsResponse>;
}

// @public (undocumented)
export const exploreApiRef: ApiRef<ExploreApi>;

// @public
export class ExploreClient implements ExploreApi {
  constructor(options: {
    discoveryApi: DiscoveryApi;
    fetchApi: FetchApi;
    exploreToolsConfig?: ExploreToolsConfig;
  });
  // (undocumented)
  getTools(request?: GetExploreToolsRequest): Promise<GetExploreToolsResponse>;
}

// @public
export const ExploreLayout: {
  (props: ExploreLayoutProps): JSX_2.Element;
  Route: (props: SubRoute) => null;
};

// @public (undocumented)
export type ExploreLayoutProps = {
  title?: string;
  subtitle?: string;
  children?: default_2.ReactNode;
};

// @public (undocumented)
export const ExplorePage: () => JSX_2.Element;

// @public (undocumented)
const explorePlugin: BackstagePlugin<
  {
    explore: RouteRef<undefined>;
  },
  {
    catalogEntity: ExternalRouteRef<
      {
        name: string;
        kind: string;
        namespace: string;
      },
      true
    >;
  },
  {}
>;
export { explorePlugin };
export { explorePlugin as plugin };

// @public (undocumented)
export const exploreRouteRef: RouteRef<undefined>;

// @public (undocumented)
export const GroupsExplorerContent: (props: {
  title?: string | undefined;
  direction?: DependencyGraphTypes.Direction | undefined;
  hideChildren?: boolean | undefined;
  namespace?: string | undefined;
}) => JSX_2.Element;

// @public (undocumented)
export type SubRoute = {
  path: string;
  title: string;
  children: JSX.Element;
  tabProps?: TabProps<
    default_2.ElementType,
    {
      component?: default_2.ElementType;
    }
  >;
};

// @public (undocumented)
export const ToolExplorerContent: (props: {
  title?: string | undefined;
}) => JSX_2.Element;

// @public (undocumented)
export const ToolSearchResultListItem: (
  props: SearchResultListItemExtensionProps<ToolSearchResultListItemProps>,
) => JSX.Element | null;

// @public
export interface ToolSearchResultListItemProps {
  // (undocumented)
  highlight?: ResultHighlight;
  // (undocumented)
  icon?: ReactNode | ((result: IndexableDocument) => ReactNode);
  // (undocumented)
  rank?: number;
  // (undocumented)
  result?: IndexableDocument;
}
```
