import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import "./i18n"
import "./index.css"
import { NotFoundPage, RouteErrorPage } from "./components/layout/error-page"
import { LoadingScreen } from "./components/layout/loading-screen"
import { routeTree } from "./routeTree.gen"

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
  defaultErrorComponent: RouteErrorPage,
  defaultPendingComponent: LoadingScreen,
  defaultPendingMs: 200,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
