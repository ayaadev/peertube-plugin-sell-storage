async function showPage({ rootEl, peertubeHelpers }) {
    // Redirect to login page if not auth
    if (!peertubeHelpers.isLoggedIn()) return (window.location.href = "/login");

    const { translate } = peertubeHelpers;
    const loading = await peertubeHelpers.translate("Loading");
    rootEl.innerHTML = loading + "...";

    // Get settings
    const settings = await peertubeHelpers.getSettings();
    const billingPortal = settings["stripe-billing-portal"];
    const currency = settings['sell-currency'];
    const description = await peertubeHelpers.markdownRenderer.enhancedMarkdownToHTML(settings["sell-description"]);
    const plans = [];

    for (let i = 1; i <= 5; i++) {
        const name = settings["plan-" + i + "-name"];
        const key = settings["plan-" + i + "-key"];
        const storage = settings["plan-" + i + "-storage"];
        const price = settings["plan-" + i + "-price"];

        plans.push({
            name: name,
            key: key,
            storage: storage,
            price: price
        });
    }

    // Fetch session id and subscribed plan (if any)
    let session_id = null, sub_plan = null;
    const response = await fetch(peertubeHelpers.getBaseRouterRoute() + "/get-session-id", {
        method: "GET",
        headers: peertubeHelpers.getAuthHeader(),
    });
    const data = await response.json();

    // If have error
    if (!data || !data.status || (data.status && data.status !== "success")) {
        peertubeHelpers.notifier.error(data.message || "Unknown error");
    } else {
        session_id = data?.data?.session_id;
        sub_plan = data?.data?.sub_plan;
    }

    rootEl.innerHTML = `
        <div class="ncd-content text-center">
        <h1>${await peertubeHelpers.translate("Choose your Storage Plan")}</h1>
	<h5>${description.length ? description : await peertubeHelpers.translate("You want to support us, or need more space? You're in the right place.")}</h5>
            <div class="mt-5" style="max-width: 90%; margin: 0 auto;">
                <div class="row">
                    ${(await Promise.all(plans.map(async (plan) =>
        `<div class="col-sm-12 col-md-6 col-lg-4"  style="margin-bottom: 1rem;">
                            <div class="card">
                                <div class="card-body">
                                    <form method="POST" action="#" class="ncdSubscriptionForm">
                                        <h3 class="card-title">${plan.name}</h3>
                                        <h4>${currency}${plan.price} /${await peertubeHelpers.translate("month")}</h4>
                                        <p class="card-text">${plan.storage} ${await peertubeHelpers.translate("GB Storage")}</p>

                                        <input type="hidden" name="lookup_key" value="${plan.key}">
                                        <button class="btn btn-primary" type="submit">${await peertubeHelpers.translate("Subscribe")}</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    `))).join("")}
                </div>
            </div>
            
            ${session_id ? `
            <div class="mt-5">
                <form method="POST" action="#" id="formManageSub">
                    <input type="hidden" id="session-id" name="session_id" value="${session_id}" />
                    <button id="checkout-and-portal-button" type="submit" class="btn btn-primary">${await translate("Manage my Subscription")}</button>
                </form>
            </div>
            ` : ""}
            

            ${sub_plan ? `
                <p><i><b>${await translate("Your current plan")}</b>: ${sub_plan.name}, ${currency}${sub_plan.price} /${await peertubeHelpers.translate("month")}, ${sub_plan.storage} ${await peertubeHelpers.translate("GB Storage")}</i></p>

                <div>
                <a href="${billingPortal}" target="_blank" style="font-size: 1.25rem; background-color: #0083f5; color: white; border-radius: 0.25rem; padding: 0.5rem 0.75rem; margin-top: 1.25rem;">Manage Subcription</a>
                <div>
            ` : ""}
                    
        </div>
    `;


    const checkForListen = () => {
        document.querySelectorAll(".ncdSubscriptionForm").length === 5 ? listenSubmitSubscription(peertubeHelpers) : setTimeout(() => checkForListen(), 1000);
    };
    checkForListen();
}

function listenSubmitSubscription(peertubeHelpers) {
    const baseUrl = peertubeHelpers.getBaseRouterRoute();

    // Sub
    document.querySelectorAll(".ncdSubscriptionForm").forEach(el => {
        el.addEventListener("submit", (e) => {
            e.preventDefault();

            try {
                const form = new URLSearchParams(new FormData(e.target));
                fetch(baseUrl + "/create-checkout-session", {
                    method: "POST",
                    headers: peertubeHelpers.getAuthHeader(),
                    body: form,
                }).then((res) => res.json()).then((data) => {
                    if (!data || !data.status || data.status !== "success") {
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
    })


    // Manage sub
    document.getElementById("formManageSub")?.addEventListener("submit", (e) => {
        e.preventDefault();

        try {
            const form = new URLSearchParams(new FormData(e.target));
            fetch(baseUrl + "/create-portal-session", {
                method: "POST",
                headers: peertubeHelpers.getAuthHeader(),
                body: form,
            }).then((res) => res.json()).then((data) => {
                if (!data || !data.status || data.status !== "success") {
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
