# China: where Purify can be offered

Looked into on 2026-11-22, at his question: "and I remember we had issues dropping purify in china and that we need some type of license for China can you look into that? (also we needed a LLC to get it)". Brainstorm only: nothing was changed, in the app or in the stores. This is a reading of public pages by a chat, not a lawyer's advice.

**His decision, 2026-11-22 18:08 UTC: "that's fine no mainland china".** Purify is not offered in mainland China. Nothing changes in the stores: it is not listed there today. Hong Kong, Taiwan and Macau stay as they are.

## What was checked

- **The repository holds no note of it.** A search of `docs/` for China, mainland and ICP found only the saints' notes. The record of the LLC is about the stores' accounts: the D-U-N-S number was what moved them from his own name to the company (`docs/1.9-build/OWNER-STEPS.md`, C0 and after).
- **Where the app is listed today.** Asked of Apple's public store by its address in `lib/appUpdate/release.ts`: the United States, Hong Kong, Taiwan and Macau answer with the app's page; China mainland answers 404. So Purify is not on the China mainland store.
- **Apple's own rule**, from App Store Connect Help (the App information reference and the China mainland compliance page), read through a fetch that gave a summary of pages cut short, so the wording is close and not checked letter for letter:
  - "Apps with religious content must secure an Internet Religious Information Permit from China's National Religious Affairs Administration (NRAA)."
  - Apps with books and magazine content must secure an internet publishing permit.
  - China's ministry "requires that some apps possess a valid Internet Content Provider (ICP) Filing Number."
  - Existing apps in China mainland must complete compliance declarations by 31 January 2027 to stay listed. Purify is not listed there, so this does not reach it.
  - Apple's pages do not say who may hold an ICP filing number.
- **China's rule for religion online** (the Measures for the Administration of Internet Religious Information Services, in force from 1 March 2022), from news reports and published translations; the translated text itself could not be opened today: a licence is required to offer religious content online; it is given to organizations set up in mainland China; and overseas organizations and individuals, and organizations they set up in China, may not offer such services. Reports add that it is given within the five religions the state recognizes, and the Orthodox Church is not one of them nationally.
- **What reports say of the ICP filing:** from late 2023 Apple asks for it for apps in China mainland, and it takes a company in China or a local publisher.
- **Android.** Google Play does not serve mainland China. Android there means the Chinese stores, which ask for a company in China and its filings.

## What it comes to

1. The licence he remembers is, for an app like Purify, the religious information permit, with an ICP filing number and likely a publishing permit beside it.
2. A company in the United States cannot hold it. By the reports, neither can a company a foreigner sets up in China. So the LLC does not open mainland China; it opened the company's own store accounts.
3. Leaving mainland China off is the sound position: the app cannot be licensed there, a listing without the permit is taken down, and a reader there can be put at risk by an unlicensed religious app.
4. Chinese-speaking readers are reached today through Hong Kong, Taiwan and Macau, where the app is listed, and through the website.
5. For 2.0: a reader's answers about their faith kept with an account (`docs/plans/reader-map.md`, section 9) are most dangerous for readers in places like this one. It is one more reason the choice is asked for, never required, and removable.

## Not known

- What the issue was when it was first tried: no record was found, and this chat cannot see App Store Connect.
- The law's own text and anything changed in it since 2022.
- Whether the website opens reliably from mainland China.

## Sources

- Apple, App Store Connect Help, App information: https://developer.apple.com/help/app-store-connect/reference/app-information/
- Apple, App Store Connect Help, China mainland compliance: https://developer.apple.com/help/app-store-connect/manage-compliance-information/view-china-mainland-compliance-information
- MacRumors, 3 October 2023: https://www.macrumors.com/2023/10/03/apple-adopts-tighter-china-app-store-rules/
- TechSpot: https://www.techspot.com/news/100368-new-chinese-law-forces-apple-lock-down-regional.html
- Global Times, December 2021: https://www.globaltimes.cn/page/202112/1242971.shtml
- Jurist, December 2021: https://www.jurist.org/news/2021/12/china-issues-regulations-restricting-online-religious-content/
- South China Morning Post: https://amp.scmp.com/news/china/politics/article/3160689/chinas-latest-crackdown-religion-bans-foreigners-spreading
- The Christian Post, on an app removed in 2024: https://www.christianpost.com/news/praycom-removed-from-app-store-in-china.html
- Not opened (403): https://www.chinalawtranslate.com/en/internet-religious-information/
