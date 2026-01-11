const subPage = require("./pages/subscription");
const successPage = require("./pages/success");
const cancelPage = require("./pages/cancel");

async function register({
  registerHook,
  peertubeHelpers,
  registerClientRoute,
}) {
  /**
   * Add link admin page
   */

  registerHook({
    target: "filter:left-menu.links.create.result",
    handler: (links) => {
      if (!Array.isArray(links)) {
        return links;
      }
      let myLibraryLinks;
      // Searching the 'in-my-library' entry.
      for (const link of links) {
        if (typeof link !== "object") {
          continue;
        }
        if (!("key" in link)) {
          continue;
        }
        if (link.key === "in-my-library" || link.key === "my-video-space") {
          myLibraryLinks = link;
          break;
        }
      }
      if (!myLibraryLinks) {
        return links;
      }
      if (!Array.isArray(myLibraryLinks.links)) {
        return links;
      }

      const label = "Storage Plan";
      myLibraryLinks.links.unshift({
        label,
        shortLabel: label,
        path: "/p/ncd-my-subscription",
        icon: "film",
      });
      return links;
    },
  });

  // Register routes
  registerClientRoute({
    route: "ncd-my-subscription",
    onMount: ({ rootEl }) => {
      subPage.showPage({ rootEl, peertubeHelpers });
    },
  });

  registerClientRoute({
    route: "ncd-subscription-success",
    onMount: ({ rootEl }) => {
      successPage.showPage({ rootEl, peertubeHelpers });
    },
  });

  registerClientRoute({
    route: "ncd-subscription-cancel",
    onMount: ({ rootEl }) => {
      cancelPage.showPage({ rootEl, peertubeHelpers });
    },
  });
}

export { register };
