# QueryLens Frontend

The active React application lives in `client/src`. This module boundary documents the product-facing frontend responsibility: a responsive query workspace, D3 execution-plan graph, plan comparison, explainable recommendations, and historical performance trends.

The dashboard calls the typed `queryLens` API through tRPC and never executes user SQL in the browser.
