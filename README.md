# PeerTube Plugin Sell Storage

## Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)

## About <a name = "about"></a>


This plugin allows you to sell storage space to your users using Stripe subscription. Payments are automated with Stripe.

## Getting Started <a name = "getting_started"></a>

This is a fork of [peertube-plugin-ncd-sell-storage](https://gitea.nicecrew.digital/matty/peertube-plugin-ncd-sell-storage). Unfortunately, the published version on NPM is outdated **at the time of writing this** and therefore does not work despite the fix being available on their Git repository. For that reason, their repository was forked and published separately with the updated code.

Additionally, this plugin removes branding and allows users to set their own billing portal for customers.

As with [peertube-plugin-ncd-sell-storage](https://gitea.nicecrew.digital/matty/peertube-plugin-ncd-sell-storage), this fork allows you to add five packages rather than three.

Check [Prerequisites](#Prerequisites) to install this plugin

### Prerequisites

- Peertube >= v4.3.0

### Installing

- Go to your instance Admin
- Navigate to the "Plugins" page
- Search for "sell-storage"
- Click Install near the plugin name

## If installing locally
 - Clone Git repository
 - cd peertube-plugin-sell-storage
 - yarn
 - yarn build
 - Install via PeerTube CLI

### Configuration
You need to configuration the plugin to work.
Create an account on https://stripe.com to start.


In your Stripe dashboard, you can test in "Test mode", and go live by unchecking "Test mode" in the top right.
To go in live mode, you need to fill form in Stripe side. We recommand you to test in Test mode the integration before go in live.

### Note: If you perform a transaction in Test Mode, you'll need to manually clear the subscription status because the webhook will not send back the correct validation response, meaning the changes will take effect but nothing will be charged. Use a dedicated test account.

First, go to the Developer tab, and navigate to "API Keys". Grab your Secret API key, and insert it in your plugin settings.

After that, always in the Developer tab, navigate to Webhook and create a webhook with the following API events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `customer.subscription.updated`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_intent.succeeded`

An example of webhook URL is available in your plugin settings. An example is also shown here:
https://your-instance.tld/plugins/sell-storage/1.1.3/router/webhook

### Note: If you update the plugin, you'll have to update the webhook link in Stripe with the new version. For example, update 1.1.3 to 1.1.4. Don't forget this!

Now, configure your billing portal, currency, page and description in the plugin settings.

Its time to add your Plans! In stripe, go to Product page, and add new product. Set a name, description and the price.
After creation, go in this new Product and grab the "API ID" near the price field.

Now, you can continue configure your Plan (1, 2, 3, 4, 5) in the plugin settings.
Repeat this process for each plans. Add new product, and grab the API ID corresponding to this price to insert it in your Product ID field, in the plugin settings.

## Usage <a name = "usage"></a>

- Navigate to "Storage Plan" underneath "My video space" in the PeerTube menu
