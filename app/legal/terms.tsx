import { LegalScreen, H, P, Ul } from "./LegalDocument";

export default function TermsOfServiceScreen() {
  return (
    <LegalScreen title="Terms of Service" updated="16 August 2026">
      <H>1. Agreement</H>
      <P>
        These Terms of Service (“Terms”) are a contract between you and Jevah
        App (“Jevah”, “we”, “our”, or “us”) for use of the Jevah mobile
        application, websites, and APIs (the “Service”). By creating an
        account, tapping “I agree”, or using the Service, you accept these
        Terms, our Privacy Policy, and our Copyright Policy.
      </P>
      <P>
        If you do not agree, do not use Jevah. If you use Jevah on behalf of a
        church, ministry, or organisation, you confirm you have authority to
        bind that organisation.
      </P>

      <H>2. The Service</H>
      <P>
        Jevah is a gospel media platform. Features may include:
      </P>
      <Ul
        items={[
          "Watching and listening to videos, sermons, music, and related media in a home feed, library, and reels-style player.",
          "Reading e-books and PDFs, and downloading selected media for offline use in the app.",
          "Uploading original videos, audio, sermons, images, and books, with titles, thumbnails, categories, and descriptions.",
          "Optional AI tools that suggest descriptions and Scripture references for your uploads, plus automated and human moderation.",
          "A Bible reader with multiple translations, optional offline packs, and on-device text-to-speech.",
          "A curated copyright-free / in-app music catalogue for listening and (where we expressly allow it) use under that catalogue’s licence.",
          "Community features such as comments, likes, saves, shares, and prayer posts.",
          "Creator tools for approved artists, ministers, and podcasters (application required).",
          "Account, profile, and creator analytics. Live broadcasting may be offered later; until then, live is preview or coming-soon only.",
        ]}
      />
      <P>
        We may add, change, or discontinue features, impose fair-use or
        device-based limits (including a “lite” mode on constrained devices),
        and set file-size, duration, and hourly upload caps.
      </P>

      <H>3. Eligibility</H>
      <P>
        You must be at least 13 years old to create an account. If you are
        under the age of majority in your place of residence, you may use
        Jevah only with a parent or guardian’s involvement as required by law.
        You must provide accurate registration information and must not
        impersonate another person or ministry.
      </P>

      <H>4. Accounts and security</H>
      <P>
        You may register with email or a supported sign-in provider (such as
        Google or Apple). You are responsible for your credentials, devices,
        and all activity under your account. Notify us immediately at
        support@jevahapp.com if you suspect unauthorised access. We may
        suspend accounts that appear compromised, abusive, or created through
        automated means.
      </P>
      <P>
        You may delete your account by contacting support or using in-app
        account controls where available. Deletion does not automatically
        erase content already copied or cached by others, or records we must
        keep for law, safety, or copyright.
      </P>

      <H>5. Licence to use Jevah</H>
      <P>
        We grant you a limited, personal, non-exclusive, non-transferable,
        revocable licence to install and use the Jevah app on devices you own
        or control, solely to access the Service in line with these Terms.
        You may not copy, reverse engineer, scrape at scale, resell, or wrap
        the Service in another product without our written permission.
      </P>

      <H>6. Acceptable use</H>
      <P>You agree not to:</P>
      <Ul
        items={[
          "Upload or stream content you do not own or have licence to use, including unlicensed music, films, books, or another creator’s sermons.",
          "Post illegal, hateful, pornographic, violent, harassing, defamatory, or misleading content, or content that exploits minors.",
          "Use Jevah to spam, scrape, harvest accounts, manipulate counts, or run bots.",
          "Interfere with streaming, uploads, moderation, or other users’ devices (malware, excessive requests, or circumvention of limits).",
          "Misrepresent AI-generated text as Scripture, or present Jevah’s suggestions as official church doctrine.",
          "Treat curated copyright-free tracks as your original commercial release, or redistribute them outside the permissions of their licence.",
          "Record, re-upload, or commercially exploit another user’s content without permission.",
          "Violate Nigerian law or the law of the country from which you use the Service.",
        ]}
      />

      <H>7. Your content</H>
      <P>
        You retain ownership of original content you upload. You grant Jevah a
        worldwide, non-exclusive, royalty-free licence to host, store,
        reproduce, transcode, adapt (for example thumbnails, captions, and
        streaming formats such as HLS), display, distribute, and promote that
        content on the Service and in reasonable marketing of Jevah (for
        example featuring a public video in an in-app collection). This
        licence lasts for as long as the content is on Jevah and for a
        reasonable period afterwards in backups and caches.
      </P>
      <P>
        You represent that you have all rights needed to grant this licence,
        that your content does not infringe others’ rights, and that it
        complies with these Terms. You are solely responsible for titles,
        descriptions, thumbnails, comments, and prayer posts you publish.
      </P>

      <H>8. Uploads, AI tools, and moderation</H>
      <P>
        Uploads may be processed (transcoded, scanned, stored on our cloud and
        CDN). File-size and rate limits apply (for example smaller video caps
        on lite devices, and hourly upload limits). We may reject files that
        fail processing or our guidelines.
      </P>
      <P>
        If you use Jevah AI to generate a description or verse suggestions,
        you authorise us to analyse the metadata, thumbnail, and (where
        enabled) the media file for that purpose. Output can be inaccurate.
        You must review it before publishing. AI does not grant you copyright
        in third-party material, and it does not replace legal clearance.
      </P>
      <P>
        We may approve, delay, restrict, watermark, demonetise (if
        monetisation exists), or remove content, and may suspend accounts,
        including where automated systems flag copyright, safety, or spam
        issues. “Under review” or “rejected” status means the content is not
        fully public. We are not obliged to publish anything. Appeals:
        support@jevahapp.com.
      </P>

      <H>9. Copyright-free and curated music</H>
      <P>
        Some tracks are provided by Jevah or partners for in-app playback
        (and, where we clearly label it, for use under a specific licence).
        That catalogue is not a dump of royalty-free files for you to sell,
        register with a distributor, or claim as your master recording.
        Credits, artwork, and licence terms shown in the app must be
        respected. If a track is removed from the catalogue, in-app access
        may stop.
      </P>

      <H>10. Creator programme</H>
      <P>
        Applying as a creator does not guarantee approval. We may accept,
        waitlist, or decline applications. Approved creators must still follow
        these Terms and the Copyright Policy. We may revoke creator status
        for inactivity, abuse, or rights issues. Analytics shown in the app
        are estimates for your use and may differ from third-party counts.
      </P>

      <H>11. Community, comments, and prayers</H>
      <P>
        Comments, prayer requests, and similar posts are public or visible to
        other users as designed. Do not share private medical, financial, or
        contact details you are not willing to make public. We may remove
        posts that harass, spam, or violate these Terms. Reporting tools
        exist so the community can flag problems; we will act as we reasonably
        see fit, without a duty to take any particular action.
      </P>

      <H>12. Bible and Scripture features</H>
      <P>
        Bible text is supplied for personal study and devotion. Translations
        remain the property of their publishers or, where applicable, the
        public domain. Offline packs, when offered, are licensed for your
        personal use in Jevah — not for bulk republication. Text-to-speech is
        generated on device for accessibility; it is not a commercial
        audiobook licence. Scripture displayed in the app is not a substitute
        for pastoral, medical, or professional advice. AI-suggested verses
        can be wrong; always check the passage in context.
      </P>

      <H>13. Downloads, library, and offline use</H>
      <P>
        Downloads and library saves are for your personal, non-commercial use
        in Jevah unless a specific licence says otherwise. You must not
        extract, share, or re-upload downloaded files as if they were yours.
        Offline files may stop working if the source content is removed, your
        account ends, or a licence expires. Device storage is your
        responsibility.
      </P>
      <P>
        Background audio may continue when you leave the app so that music
        and sermons can keep playing. You can stop playback from the mini
        player or system controls.
      </P>

      <H>14. Live features</H>
      <P>
        Camera and microphone access may be requested for future live
        services. Until live is generally available, related screens are
        informational. When live launches, additional rules (safety,
        recording, and takedown) may apply and will be posted in the app.
      </P>

      <H>15. Jevah’s intellectual property</H>
      <P>
        The app, name, logo, design, software, feed ranking, and original
        Jevah content are owned by us or our licensors. You may not use our
        marks in a way that suggests partnership without permission.
        Feedback you send may be used to improve the Service without
        obligation to you.
      </P>

      <H>16. Copyright complaints</H>
      <P>
        If you believe content on Jevah infringes your copyright, follow the
        Copyright Policy (accessible from sign-up and in the app) and email
        support@jevahapp.com with your contact details, a description of the
        work, the location of the material, and a good-faith statement. We
        may remove content and, for repeat infringement, terminate accounts.
        False claims may also lead to account action.
      </P>

      <H>17. Third-party services</H>
      <P>
        Sign-in providers, CDNs, cloud storage, crash reporting, document
        viewers, and Scripture or music licensors are independent. Their
        terms and privacy notices apply to their processing. Jevah is not
        responsible for outages or policy changes of those providers.
      </P>

      <H>18. Disclaimers</H>
      <P>
        THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE”. TO THE MAXIMUM
        EXTENT PERMITTED BY LAW, WE DISCLAIM WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE, UNINTERRUPTED ACCESS, AND
        NON-INFRINGEMENT. We do not warrant that uploads will be processed in
        any particular time, that AI output is correct, that every translation
        or track is error-free, or that user content is true or safe.
      </P>
      <P>
        Faith-related content is for edification and information. It is not
        professional counselling, legal, medical, or financial advice. If you
        are in crisis, contact local emergency or pastoral care services.
      </P>

      <H>19. Limitation of liability</H>
      <P>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, JEVAH AND ITS OFFICERS,
        EMPLOYEES, AND PARTNERS ARE NOT LIABLE FOR INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF DATA,
        PROFITS, GOODWILL, OR CONTENT, ARISING FROM YOUR USE OF THE SERVICE,
        USER-GENERATED CONTENT, THIRD-PARTY CATALOGUES, OR UNAUTHORISED
        ACCESS, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY.
      </P>
      <P>
        OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED
        TO THE GREATER OF (A) THE AMOUNT YOU PAID US FOR THE SERVICE IN THE
        TWELVE MONTHS BEFORE THE CLAIM (CURRENTLY ZERO IF THE APP IS FREE)
        AND (B) TEN THOUSAND NAIRA (NGN 10,000). SOME JURISDICTIONS DO NOT
        ALLOW CERTAIN LIMITATIONS; IN THOSE PLACES, OUR LIABILITY IS LIMITED
        TO THE FULLEST EXTENT PERMITTED.
      </P>

      <H>20. Indemnity</H>
      <P>
        You will defend and indemnify Jevah against claims, damages, and
        reasonable legal fees arising from your content, your use of the
        Service, your breach of these Terms, or your infringement of another
        person’s rights — including copyright in music, video, books, or
        images you upload.
      </P>

      <H>21. Suspension and termination</H>
      <P>
        You may stop using Jevah at any time. We may suspend or terminate
        access immediately if you breach these Terms, if required by law, or
        if we discontinue the Service. On termination, the licence in
        section 5 ends. Provisions that should survive (including content
        licences already exercised, copyright, disclaimers, liability limits,
        and indemnity) remain in force.
      </P>

      <H>22. Governing law and disputes</H>
      <P>
        These Terms are governed by the laws of the Federal Republic of
        Nigeria, without regard to conflict-of-law rules. Nigerian courts
        have exclusive jurisdiction, except that we may seek injunctive
        relief in any forum to protect intellectual property or safety.
        Nothing in these Terms limits rights you cannot waive as a consumer
        under mandatory Nigerian law.
      </P>

      <H>23. Changes</H>
      <P>
        We may update these Terms. We will revise the “Last updated” date
        and, for material changes, notify you in the app or by email.
        Continued use after the effective date constitutes acceptance. If
        you do not agree, you must stop using the Service and may request
        account deletion.
      </P>

      <H>24. Contact</H>
      <P>
        Jevah App{"\n"}
        Email: support@jevahapp.com{"\n"}
        Privacy: see the Privacy Policy{"\n"}
        Copyright: see the Copyright Policy{"\n"}
        Location: Nigeria
      </P>
    </LegalScreen>
  );
}
