// const moment = require('moment');
const pjson = require("./package.json");
const express = require('express');
const Stripe = require('stripe')
let ALL_PLANS = [];
let STRIPE_KEY;

async function register({
  registerHook,
  registerSetting,
  settingsManager,
  storageManager,
  videoCategoryManager,
  videoLicenceManager,
  videoLanguageManager,
  getRouter,
  peertubeHelpers
}) {
  registerMenuSettings(registerSetting);
  const router = getRouter();
  STRIPE_KEY = await settingsManager.getSetting('stripe-secret-key');

  // On reload settings
  settingsManager.onSettingsChange(settings => {
    STRIPE_KEY = settings['stripe-secret-key']

    loadPlans(settings, settingsManager);
  });
  loadPlans(null, settingsManager);


  router.post("/save-session-id", async (req, res) => {
    try {
      // Get current user
      const user = await peertubeHelpers.user.getAuthUser(res);
      if (!user) {
        res.json({ status: "failure", message: "You are not allowed to do that." });
        return;
      }
 
      const { session_id } = req.body;
      if(!session_id) {
        res.json({ status: "failure", message: "No session ID to save." });
        return;
      }

      storageManager.storeData("ncd-sub-session-id-" + user.id, session_id)
      
      res.json({
        status: "success",
        data: { session_id }
      });

    } catch (error) {
      peertubeHelpers.logger.error(error.message, { error });
      res.json({ status: "failure", message: error.message });
    }
  });


  router.get("/get-session-id", async (req, res) => {

    try {
      // Get current user
      const user = await peertubeHelpers.user.getAuthUser(res);
      if (!user) {
        res.json({ status: "failure", message: "You are not allowed to do that." });
        return;
      }

      const session_id = await storageManager.getData("ncd-sub-session-id-" + user.id) || null;
      const sub_plan = await storageManager.getData("ncd-sub-plan-" + user.id) || null;

      res.json({
        status: "success",
        data: { session_id: session_id, sub_plan: sub_plan }
      });
      
    } catch (error) {
      peertubeHelpers.logger.error(error.message, { error });
      res.json({ status: "failure", message: error.message });
    }
  })


  router.post('/create-checkout-session', async (req, res) => {
    try {
      // Get current user
      const user = await peertubeHelpers.user.getAuthUser(res);
      if (!user) {
        res.json({ status: "failure", message: "You are not allowed to do that." });
        return;
      }

      const sub_plan = await storageManager.getData("ncd-sub-plan-" + user.id) || null;
      if(sub_plan) {
        res.json({ status: "failure", message: "You already have a subscription plan. Please unsuscribe first!" });
        return;
      }

      const stripe = Stripe(STRIPE_KEY);
      const INSTANCE_URL = "https://" + req.get('host');
      const { lookup_key } = req.body;

      if(!lookup_key) {
        res.json({ status: "failure", message: "No plan selected" });
      }
  
      const session = await stripe.checkout.sessions.create({
        billing_address_collection: 'auto',
        line_items: [
          {
            price: lookup_key,
            // For metered billing, do not pass quantity
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            user_id: user.id
          }
        },
        mode: 'subscription',
        success_url: `${INSTANCE_URL}/p/ncd-subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${INSTANCE_URL}/p/ncd-subscription-cancel`,
      });
    
      res.json({
        status: "success",
        data: { redirectUrl: session.url }
      });

    } catch(error) {
      peertubeHelpers.logger.error(error.message, { error });
      res.json({ status: "failure", message: error.message });
    }

  });


  router.post('/create-portal-session', async (req, res) => {
    try {
      // Get current user
      const user = await peertubeHelpers.user.getAuthUser(res);
      if (!user) {
        res.json({ status: "failure", message: "You are not allowed to do that." });
        return;
      }

      const stripe = Stripe(STRIPE_KEY);
      const INSTANCE_URL = "https://" + req.get('host');

      // For demonstration purposes, we're using the Checkout session to retrieve the customer ID.
      // Typically this is stored alongside the authenticated user in your database. (psql) users -> userID ->
      const { session_id } = req.body;
      const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
    
      // This is the url to which the customer will be redirected when they are done
      // managing their billing with the portal.
      const returnUrl = INSTANCE_URL + "/p/ncd-my-subscription";
    
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: checkoutSession.customer,
        return_url: returnUrl,
      });
    
      res.json({
        status: "success",
        data: { redirectUrl: portalSession.url }
      });

    } catch(error) {
      peertubeHelpers.logger.error(error.message, { error });
      res.json({ status: "failure", message: error.message });
    }
  });



  router.post(
    '/webhook',
    // express.raw({ type: 'application/json' }),
    async (request, response) => {
      try {
        let event = request.body;
        peertubeHelpers.logger.debug("[ncd-sell-storage/webhook] Received data", { event })
  
        let subscription;
        let status;
  
        // Handle the event
        switch (event.type) {
          case 'customer.subscription.trial_will_end':
            subscription = event.data.object;
            status = subscription.status;
            peertubeHelpers.logger.info(`Subscription status is ${status}.`);
  
            // Then define and call a method to handle the subscription trial ending.
            if(!status !== "active")
              await handleSubscriptionEnd(subscription, peertubeHelpers, storageManager);
            break;
          case 'customer.subscription.deleted':
            subscription = event.data.object;
            status = subscription.status;
            peertubeHelpers.logger.info(`Subscription status is ${status}.`);
  
            // Then define and call a method to handle the subscription deleted.
            if(!status !== "active")
              await handleSubscriptionEnd(subscription, peertubeHelpers, storageManager);
            break;
          case 'customer.subscription.created':
            subscription = event.data.object;
            status = subscription.status;
            peertubeHelpers.logger.info(`Subscription status is ${status}.`);
  
            // Then define and call a method to handle the subscription created.
            if(status === "trialing" || status === "active")
              await handleSubscriptionStart(subscription, peertubeHelpers, storageManager);
            break;
          case 'customer.subscription.updated':
            subscription = event.data.object;
            status = subscription.status;
            peertubeHelpers.logger.info(`Subscription status is ${status}.`);
  
            // Then define and call a method to handle the subscription update.
            if(status === "trialing" || status === "active")
              await handleSubscriptionStart(subscription, peertubeHelpers, storageManager);
            else
              await handleSubscriptionEnd(subscription, peertubeHelpers);
            break;
          default:
            // Unexpected event type
            peertubeHelpers.logger.error(`Unhandled event type ${event.type}.`);
        }
  
        // Return a 200 response to acknowledge receipt of the event
        response.send();
        
      } catch (error) {
        peertubeHelpers.logger.error(error.message, { error });
        response.sendStatus(500);
      }
    }
  );


}

async function unregister() {
  return
}

module.exports = {
  register,
  unregister
}


async function loadPlans(settings, settingsManager) {
  ALL_PLANS = [];
  
  for(let i = 1; i <= 5; i++) {
    const name = settings ? settings["plan-" + i + "-name"] : await settingsManager.getSetting("plan-" + i + "-name");
    const key = settings ? settings["plan-" + i + "-key"] : await settingsManager.getSetting("plan-" + i + "-key");;
    const storage = settings ? settings["plan-" + i + "-storage"] : await settingsManager.getSetting("plan-" + i + "-storage");;
    const price = settings ? settings["plan-" + i + "-price"] : await settingsManager.getSetting("plan-" + i + "-price");;

    ALL_PLANS.push({
        name: name,
        key: key,
        storage: storage,
        price: price
    });
  }
}


async function handleSubscriptionStart(subscription, peertubeHelpers, storageManager) {
  
  try {
    const sub_id = subscription.items.data[0].subscription;
    const stripe = Stripe(STRIPE_KEY);

    const sub_obj = await stripe.subscriptions.retrieve(sub_id);
    if(!sub_obj) {
      throw new Error("[handleSubscriptionStart] Invalid subscription provided.");
    }

    if(sub_obj.status !== "active") {
      throw new Error("[handleSubscriptionStart] Provided subscription is NOT active.");
    }

    const price = subscription.plan.id;
    const user_id = subscription.metadata.user_id;

    const plan = ALL_PLANS.find(x => x.key == price);
    if(!plan) {
      peertubeHelpers.logger.error("[handleSubscriptionStart] No plan found mathing this subscription", { ALL_PLANS, subscription });
      return;
    }

    storageManager.storeData("ncd-sub-plan-" + user_id, plan);
    const quota = plan.storage * 1024 * 1024 * 1024;

    const results = await peertubeHelpers.database.query(
      'UPDATE "user" SET "videoQuota" = $quota WHERE "id" = $id',
      {
        type: 'UPDATE',
        bind: { quota: quota, id: user_id }
      }
    );

    peertubeHelpers.logger.info(`[handleSubscriptionStart] Updated video quota to ${quota} for user id ${user_id}`, { plan, subscription })

  } catch (error) {
    peertubeHelpers.logger.error(error.message, { error });
  }
}


async function handleSubscriptionEnd(subscription, peertubeHelpers, storageManager) {
  try {
    const sub_id = subscription.items.data[0].subscription;
    const stripe = Stripe(STRIPE_KEY);

    const sub_obj = await stripe.subscriptions.retrieve(sub_id);
    if(!sub_obj) {
      throw new Error("[handleSubscriptionStart] Invalid subscription provided.");
    }

    if(sub_obj.status == "active") {
      throw new Error("[handleSubscriptionStart] Provided subscription is active. Can't end it now.");
    }

    const user_id = subscription.metadata.user_id;
    storageManager.storeData("ncd-sub-plan-" + user_id, null);

    const configs = await peertubeHelpers.config.getServerConfig();
    const quota = configs.user.videoQuota;

    const results = await peertubeHelpers.database.query(
      'UPDATE "user" SET "videoQuota" = $quota WHERE "id" = $id',
      {
        type: 'UPDATE',
        bind: { quota: quota, id: user_id }
      }
    );

    peertubeHelpers.logger.info(`[handleSubscriptionEnd] Updated video quota to ${quota} for user id ${user_id}`, { subscription })

  } catch (error) {
    peertubeHelpers.logger.error(error.message, { error });
  }
}


function registerMenuSettings(registerSetting) {

  // Stripe settings
  registerSetting({
    type: 'html',
    html: '<h3>Stripe Settings</h3>'
  })

  registerSetting({
    name: "stripe-secret-key",
    label: "Stripe secret API key",
    type: "input",
    private: true,
    descriptionHTML: "Your Stripe secret API key. Signup on <a href='https://www.stripe.com' target='blank_'>Stripe.com</a>",
    default: ""
  });

  registerSetting({
    name: "stripe-billing-portal",
    label: "Stripe Billing Portal",
    type: "input",
    private: false,
    descriptionHTML: "The Stripe billing portal where customers can manage their subscriptions. Enabled at: https://dashboard.stripe.com/settings/billing/portal",
    default: ""
  });

  registerSetting({
    type: 'html',
    html: '<h4>Stripe Webhook</h4><p>You need to create a webhook in stripe. Set the stripe webhook endpoint to <b>https://your-instance.tld/plugins/sell-storage/'+pjson.version+'/router/webhook</b></p>'
  })

  registerSetting({
    name: "sell-currency",
    label: "Currency",
    type: "input",
    private: false,
    descriptionHTML: "Currency to show in price",
    default: "€"
  });

  registerSetting({
    name: "sell-description",
    label: "Page description",
    type: "markdown-enhanced",
    private: false,
    descriptionHTML: "You can explain what you want, it is showed on the page. Leave it empty to show default localized description.",
    default: "If you need more storage space, please contact us using the contact form."
  });

  registerSetting({
    name: "sell-thx-description",
    label: "Thank you page description",
    type: "markdown-enhanced",
    private: false,
    descriptionHTML: "If you want to show a text on the Success page after payment",
    default: "Thanks for your support!"
  });

  registerSetting({
    name: "sell-cancel-description",
    label: "Cancel page description",
    type: "markdown-enhanced",
    private: false,
    descriptionHTML: "If you want to show a text on the Cancel page after payment canceled",
    default: "Have a great rest of your day!"
  });


  // Products settings
  registerSetting({
    type: 'html',
    html: '<br><h3>Manage Subscription</h3>'
  })

  
  // Plan 1
  registerSetting({
    type: 'html',
    html: '<br><h4>Plan 1</h4>'
  })
  registerSetting({
    name: "plan-1-name",
    label: "Plan name",
    type: "input",
    private: false,
    descriptionHTML: "Specify the name of your plan",
    default: "Starter Plan",
  });

  registerSetting({
    name: "plan-1-storage",
    label: "Available storage (in GB)",
    type: "input",
    private: false,
    descriptionHTML: "Specify the amount of available space storage",
    default: 150,
  });

  registerSetting({
    name: "plan-1-price",
    label: "Plan price /month",
    type: "input",
    private: false,
    descriptionHTML: "Specify the price per month users pay for this plan",
    default: 5,
  });

  registerSetting({
    name: "plan-1-key",
    label: "Product ID (API ID)",
    type: "input",
    private: false,
    descriptionHTML: "Specify the product ID that represent the product in Stripe (Ex: price_1LlHY6KHtJzgTzXzZTBRHkPs)",
    default: "starter",
  });


  // Plan 2
  registerSetting({
    type: 'html',
    html: '<br><h4>Plan 2</h4>'
  })
  registerSetting({
    name: "plan-2-name",
    label: "Plan name",
    type: "input",
    private: false,
    descriptionHTML: "Specify the name of your plan",
    default: "Community Plan",
  });

  registerSetting({
    name: "plan-2-storage",
    label: "Available storage (in GB)",
    type: "input",
    private: false,
    descriptionHTML: "Specify the amount of available space storage",
    default: 300,
  });

  registerSetting({
    name: "plan-2-price",
    label: "Plan price /month",
    type: "input",
    private: false,
    descriptionHTML: "Specify the price per month users pay for this plan",
    default: 10,
  });

  registerSetting({
    name: "plan-2-key",
    label: "Product ID (API ID)",
    type: "input",
    private: false,
    descriptionHTML: "Specify the product ID that represent the product in Stripe (Ex: price_1LlHY6KHtJzgTzXzZTBRHkPs)",
    default: "community",
  });

  // Plan 3
  registerSetting({
    type: 'html',
    html: '<br><h4>Plan 3</h4>'
  })
  registerSetting({
    name: "plan-3-name",
    label: "Plan name",
    type: "input",
    private: false,
    descriptionHTML: "Specify the name of your plan",
    default: "Professional Plan",
  });

  registerSetting({
    name: "plan-3-storage",
    label: "Available storage (in GB)",
    type: "input",
    private: false,
    descriptionHTML: "Specify the amount of available space storage",
    default: 1000,
  });

  registerSetting({
    name: "plan-3-price",
    label: "Plan price /month",
    type: "input",
    private: false,
    descriptionHTML: "Specify the price per month users pay for this plan",
    default: 15,
  });

  registerSetting({
    name: "plan-3-key",
    label: "Product ID (API ID)",
    type: "input",
    private: false,
    descriptionHTML: "Specify the product ID that represent the product in Stripe (Ex: price_1LlHY6KHtJzgTzXzZTBRHkPs)",
    default: "profesionnal",
  });

    // Plan 4
    registerSetting({
      type: 'html',
      html: '<br><h4>Plan 4</h4>'
    })
    registerSetting({
      name: "plan-4-name",
      label: "Plan name",
      type: "input",
      private: false,
      descriptionHTML: "Specify the name of your plan",
      default: "Professional Plan",
    });
  
    registerSetting({
      name: "plan-4-storage",
      label: "Available storage (in GB)",
      type: "input",
      private: false,
      descriptionHTML: "Specify the amount of available space storage",
      default: 1000,
    });
  
    registerSetting({
      name: "plan-4-price",
      label: "Plan price /month",
      type: "input",
      private: false,
      descriptionHTML: "Specify the price per month users pay for this plan",
      default: 15,
    });
  
    registerSetting({
      name: "plan-4-key",
      label: "Product ID (API ID)",
      type: "input",
      private: false,
      descriptionHTML: "Specify the product ID that represent the product in Stripe (Ex: price_1LlHY6KHtJzgTzXzZTBRHkPs)",
      default: "profesionnal",
    });

      // Plan 5
  registerSetting({
    type: 'html',
    html: '<br><h4>Plan 5</h4>'
  })
  registerSetting({
    name: "plan-5-name",
    label: "Plan name",
    type: "input",
    private: false,
    descriptionHTML: "Specify the name of your plan",
    default: "Professional Plan",
  });

  registerSetting({
    name: "plan-5-storage",
    label: "Available storage (in GB)",
    type: "input",
    private: false,
    descriptionHTML: "Specify the amount of available space storage",
    default: 1000,
  });

  registerSetting({
    name: "plan-5-price",
    label: "Plan price /month",
    type: "input",
    private: false,
    descriptionHTML: "Specify the price per month users pay for this plan",
    default: 15,
  });

  registerSetting({
    name: "plan-5-key",
    label: "Product ID (API ID)",
    type: "input",
    private: false,
    descriptionHTML: "Specify the product ID that represent the product in Stripe (Ex: price_1LlHY6KHtJzgTzXzZTBRHkPs)",
    default: "profesionnal",
  });
}
