# PeerTube Plugin Sell Storage

## Table of Contents

- [About](#about)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Acknowledgements](#acknowledgements)

## About <a name = "about"></a>


This plugin allows you to sell storage space (video quota) to your users automatically with Stripe.

The most notable features are:
- Automatic video quota increases and decreases without human intervention.
- Dedicated page in the menu which promotes upgrading users' storage and makes it easy to see subscription information.
- Up to five different packages/subscriptions.
- The interface is unbranded, which makes this plugin accessible by every instance.
- Custom billing portal for customers to manage their subscriptions.

## Prerequisites <a name="prerequisites"></a>

- Stripe API key
- Stripe webhook (see the [Configuration](#configuration) section)
- Stripe products (up to 5) for users to subscribe to
- Peertube >= v4.3.0

## Installation <a name="installation"></a>

- Navigate to the "Settings" page on the PeerTube menu when logged in as an admin.
- Click on the "Plugins/Themes" section.
- Search for "sell-storage"
- Click "Install" near the plugin name

### If you're installing locally
 - Clone the Git repository, change directories, and build the plugin
 ```bash
git clone https://github.com/ayaadev/peertube-plugin-sell-storage.git
cd peertube-plugin-sell-storage
yarn
yarn build
 ```
 - Install via the [PeerTube CLI](https://docs.joinpeertube.org/contribute/plugins#test-your-plugin-theme).

## Configuration <a name="configuration"></a>
You need a Stripe account as stated in the [Prerequisites](#prerequisites) section.
Create an account on https://stripe.com to start.


Once you've validated your email and inputted your business details, you can test in "Test mode", and go live by unchecking "Test mode". This option is found by hovering over your business name in the top left.
<img width="712" height="433" alt="image" src="https://github.com/user-attachments/assets/f9ee2825-45ab-4ae4-8402-2c26acba01b5" />

We recommend you to test the plugin in "Test mode" before going into "Live mode" (i.e. dealing with real money).

**Note: If you perform a transaction in Test Mode, you'll need to manually clear the subscription status because the webhook will not send back the correct validation response, meaning the changes will take effect but nothing will be charged. Use a dedicated test account.**

### API Keys

You need the Secret API Key to add to the plugin configuration. Navigate to https://dashboard.stripe.com/apikeys. Copy and paste the Secret API Key into the plugin settings.

<img width="1524" height="327" alt="image" src="https://github.com/user-attachments/assets/250e4f8e-3652-4582-b710-6d57882b3fa2" />


### Webhook configuration

Go to https://dashboard.stripe.com/webhooks and create a webhook with the following API events:
- `customer.subscription.created`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `customer.subscription.updated`
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_intent.succeeded`

For the webhook URL, make sure the version in the URL matches the version of the plugin. For example, if your plugin is on version `1.1.9` use the URL:
`https://your-instance.tld/plugins/sell-storage/1.1.9/router/webhook`

An example of this with the correct version in the webhook URL is available in the plugin settings.

**Note: If you update the plugin, you'll have to update the webhook link in Stripe with the new version. For example, if you update from 1.1.3 to 1.1.9 change the webhook URL to `https://your-instance.tld/plugins/sell-storage/1.1.9/router/webhook`. Don't forget this!**

### PeerTube Plugin

Configure the following settings:
- Billing portal URL (enabled and customised at https://dashboard.stripe.com/settings/billing/portal)
- Currency
- Page description, thank you page description and cancel page description.

### Plan configuration
It's time to add your plans!

1. In stripe, go to https://dashboard.stripe.com/products and add a new product. Set a name, description and price.

2. After creation, click on the product and click on the binocular icon at the bottom right.
<img width="405" height="62" alt="image" src="https://github.com/user-attachments/assets/8b5f95f8-e20a-4cb2-b9e4-872c48ae86e5" />

&nbsp;

3. On the left side of the inspection window, click on the price key.
<img width="395" height="300" alt="image" src="https://github.com/user-attachments/assets/c20b5320-f88c-4c4f-820b-f9188b84efde" />

&nbsp;

4. On the right side of the inspection window, copy the price ID into the respective plan in the plugin settings.
<img width="436" height="319" alt="image" src="https://github.com/user-attachments/assets/017ced89-6ab5-4b53-8565-93bf1ec0c5f5" />

&nbsp;

Repeat steps 1-4 for each plan (1, 2, 3, 4, 5) in the plugin settings.

## Usage <a name = "usage"></a>

Navigate to "Storage Plan" underneath "My video space" in the PeerTube menu

<img width="212" height="258" alt="image" src="https://github.com/user-attachments/assets/05d4b7a2-0964-4bf2-9981-251f32b162b3" />

## Acknowledgements <a name = "acknowledgements"></a>

This was inspired by and modified from [peertube-plugin-ncd-sell-storage](https://gitea.nicecrew.digital/matty/peertube-plugin-ncd-sell-storage). Modifications include:
- Error free! **At the time of writing this**, the published version of ncd-sell-storage is outdated and therefore does not work despite the fix being available on their Git repository.
- Branding removed. ncd-sell-storage had hardcoded branding which was removed so this plugin is accessible by everyone.
- Custom billing portal for customers to manage their subscriptions.
- Imrpoved documentation. For example, the necessary API events for the Stripe webhook are documented and screenshots have been included.
