async function showPage({ rootEl, peertubeHelpers }) {
    // Redirect to login page if not auth
    if (!peertubeHelpers.isLoggedIn()) return (window.location.href = "/login");

    const loading = await peertubeHelpers.translate("Loading");
    rootEl.innerHTML = loading + "...";

    const { translate } = peertubeHelpers;
    const description = await peertubeHelpers.markdownRenderer.enhancedMarkdownToHTML(settings["sell-thx-description"]);

    rootEl.innerHTML = `
        <div class="ncd-content text-center mt-5">
            <h1>${await peertubeHelpers.translate("Subscription succesfull!")}</h1>
            
            <div class="mt-5">
                <form action="#" method="POST" class="ncdSubscriptionForm">
                    <input type="hidden" id="session-id" name="session_id" value="" />
                    <button id="checkout-and-portal-button" type="submit" class="btn btn-primary">${await translate("Manage my Subscription")}</button>
                </form>
            </div>

            <p>${description}</p>
        </div>
    `;


    setTimeout(() => listenSubmitSubscription(peertubeHelpers), 1000);
}

function listenSubmitSubscription(peertubeHelpers) {
    const baseUrl = peertubeHelpers.getBaseRouterRoute();

    const params = new URLSearchParams(window.location.search);
    if(params.has("session_id")) {
        document.getElementById("session-id").value = params.get("session_id");
        localStorage.setItem("ncd-sub-session-id", params.get("session_id"));

        const formData = new FormData();
        formData.append("session_id", params.get("session_id"));

        const form = new URLSearchParams(formData);
        
        fetch(baseUrl + "/save-session-id", {
            method: "POST",
            headers: peertubeHelpers.getAuthHeader(),
            body: form,
        }).then((res) => res.json()).then((data) => {
            if(!data || !data.status || data.status !== "success") {
                peertubeHelpers.notifier.error(data.message || "Unknown error");
            }

        }).catch(err => {
            console.error(err);
            peertubeHelpers.notifier.error(err);
        })
    }

    document.querySelector(".ncdSubscriptionForm").addEventListener("submit", (e) => {
        e.preventDefault();

        try {
            const form = new URLSearchParams(new FormData(e.target));
            fetch(baseUrl + "/create-portal-session", {
                method: "POST",
                headers: peertubeHelpers.getAuthHeader(),
                body: form,
            }).then((res) => res.json()).then((data) => {
                if(!data || !data.status || data.status !== "success") {
                    peertubeHelpers.notifier.error(data.message || "Unknown error");
                    return;
                }
        
                window.location.href = data.data.redirectUrl;
            }).catch(err => {
                console.error(err);
                peertubeHelpers.notifier.error(err);
            })
            
        } catch (error) {
            peertubeHelpers.notifier.error(error);
        }
    });
}

export { showPage };