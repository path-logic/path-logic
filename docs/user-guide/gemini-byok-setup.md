# Gemini Flash AI Integration Guide (BYOK)

Path Logic integrates Google's advanced **Gemini 2.5 Flash** model directly inside your browser. To protect your privacy and keep the application completely free and open-source, Path Logic uses a **Bring Your Own Key (BYOK)** model.

This means that you supply your own API key, and all AI requests are billed directly to your Google account (using Google's generous **Free Tier**).

---

## How to Get Your Free Gemini API Key

Even if you are not a software developer, obtaining a key is free, safe, and takes less than a minute. Google provides a simplified console called **Google AI Studio** specifically for this purpose.

1. **Visit Google AI Studio**:
   Go to [aistudio.google.com](https://aistudio.google.com/) and log in with your normal Google/Gmail account.

2. **Accept Terms**:
   If this is your first time visiting, accept the terms of service. Google AI Studio is free to use.

3. **Get Your Key**:
    - Click the blue **Get API Key** button in the top-left corner of the sidebar.
    - Click **Create API Key**.
    - Click **Create API key in new project** (this automatically sets up a free, isolated space for your key).

4. **Copy the Key**:
   Copy the generated key (a long string of characters starting with `AIzaSy`).

5. **Save in Path Logic**:
    - Open Path Logic and go to **Settings** (gear icon in the navigation bar).
    - Scroll to the **AI Integration** section.
    - Paste your copied key into the password field and click **Save Key**.

---

## Frequently Asked Questions

### Is it really free?

**Yes.** Google provides a highly generous **Free Tier** for Gemini 2.5 Flash. As of today, the free tier allows:

- Up to **15 requests per minute**
- Up to **1,500 requests per day**

For normal personal finance use (such as category mapping and search queries), you will never exceed these limits and will never be charged.

### Where is my key stored? Is it safe?

**Yes, it is 100% secure.** Your API key is stored locally on your own machine inside Path Logic's encrypted WebAssembly SQLite database. It is never uploaded to Path Logic's servers, and no third party (including the developers of Path Logic) has access to it. The key only travels directly from your browser to Google's official API servers.

### Can I turn AI off?

**Yes.** If you do not supply an API key (or if you delete the key from the Settings page), all AI features are automatically disabled, and the app will continue to run as a standard local-first ledger.

### What if I hit a rate limit?

If you exceed Google's free tier rate limits, you might see a "Rate Limit Exceeded" error. This is a temporary limit. You can either wait a minute for the rate limit to reset, or opt-in to pay-as-you-go billing in your Google Cloud account if you need higher limits.
