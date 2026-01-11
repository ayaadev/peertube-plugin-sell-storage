async function showPage({ rootEl, peertubeHelpers }) {
    // Redirect to login page if not auth
    if (!peertubeHelpers.isLoggedIn()) return (window.location.href = "/login");

    const settings = await peertubeHelpers.getSettings();
    const description = await peertubeHelpers.markdownRenderer.enhancedMarkdownToHTML(settings["sell-cancel-description"]);

    rootEl.innerHTML = `
        <div class="ncd-content text-center mt-5">
            <h1>${await peertubeHelpers.translate("Subscription canceled.")}</h1>
            <p>${description}</p>
        </div>
    `;
}

export { showPage };