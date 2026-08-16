import { LegalScreen, H, P, Ul } from "./LegalDocument";

export default function PrivacyPolicyScreen() {
  return (
    <LegalScreen title="Privacy Policy" updated="16 August 2026">
      <H>1. Who we are</H>
      <P>
        Jevah App (“Jevah”, “we”, “our”, or “us”) is a faith-centred media
        platform that lets people watch, listen to, read, upload, and share
        gospel content — including videos, sermons, music, e-books, community
        prayers, and Scripture. This Privacy Policy explains what personal data
        we collect, why we collect it, how we use it, and the rights you have
        under the Nigeria Data Protection Act 2023 (NDPA) and other applicable
        law.
      </P>
      <P>
        By creating an account or using Jevah, you agree to this Policy. If you
        do not agree, please do not use the app. Related documents: our Terms
        of Service and Copyright Policy.
      </P>
      <P>
        Controller contact: support@jevahapp.com. We operate from Nigeria.
      </P>

      <H>2. Scope</H>
      <P>
        This Policy applies to the Jevah mobile application, related websites,
        and our APIs (including api.jevahapp.com). It covers registered users,
        visitors who browse public content, creators, and people who contact
        support.
      </P>

      <H>3. Information we collect</H>
      <P>
        We collect only what we need to run the service. Depending on how you
        use Jevah, that may include:
      </P>
      <P>
        Account and identity. Name, email address, phone number (if you
        provide it), username, password or authentication tokens, profile
        photo or chosen avatar, and optional profile fields such as location
        or bio. If you sign in with Google, Apple, or another supported
        provider, we receive the identifier and profile details that provider
        shares with us (typically name, email, and avatar).
      </P>
      <P>
        Content you create. Videos, audio, sermons, e-books/PDFs, images,
        thumbnails, titles, descriptions, categories, comments, prayer posts,
        captions, and any Bible references you attach. Upload metadata may
        include file type, size, duration, and processing status.
      </P>
      <P>
        Creator applications. If you apply as an artist, minister, or
        podcaster, we collect the information in your application (identity,
        ministry or artist details, and supporting materials) so we can review
        and operate creator tools.
      </P>
      <P>
        Usage and engagement. What you watch, listen to, save, like, share,
        comment on, download, or skip; search queries; feed position;
        playback progress; and similar interaction events. We use this to
        operate For You ranking, libraries, view counts, and creator
        analytics — not to sell advertising profiles.
      </P>
      <P>
        Device and technical data. Device type, operating system, app version,
        language, time zone, network type, IP address, crash logs, and
        performance diagnostics. We may set a client profile (for example a
        “lite” mode on lower-memory devices) so the app stays stable.
      </P>
      <P>
        On-device data. Authentication tokens in secure storage; feed, author,
        and media caches; downloaded videos, audio, and e-books; optional
        offline Bible translation packs; and upload drafts. This stays on your
        device unless it is needed to provide the feature (for example
        uploading a draft, or syncing a like).
      </P>
      <P>
        Communications. Messages you send to support, reports of content or
        users, and push-notification preference if you enable alerts.
      </P>
      <P>
        We do not require precise GPS location to use Jevah. Any “location”
        on a profile is text you choose to write. We do not sell personal
        data.
      </P>

      <H>4. How we use your information</H>
      <Ul
        items={[
          "Create and secure your account, and keep you signed in.",
          "Show your name, avatar, and public profile on content you publish.",
          "Host, transcode, stream, and deliver media (including via CDN).",
          "Generate suggested titles, descriptions, or Scripture references when you use Jevah AI on an upload.",
          "Moderate uploads and community posts for safety, copyright, and community standards (including automated and human review).",
          "Operate the home feed, library, search, comments, likes, saves, shares, and creator analytics.",
          "Provide the Bible reader, translation picker, optional offline packs, and on-device text-to-speech.",
          "Provide the copyright-free / curated music catalogue for in-app listening.",
          "Remember playback, downloads, and drafts so the app works offline or after a restart.",
          "Send service messages (security, moderation, product changes) and, if you opt in, push notifications.",
          "Diagnose crashes, abuse, and fraud; improve performance and accessibility (including reduced-motion).",
          "Comply with law, enforce our Terms and Copyright Policy, and respond to valid legal requests.",
        ]}
      />

      <H>5. Legal bases (NDPA)</H>
      <P>
        We process personal data where: (a) you have given consent (for
        example optional AI description generation, camera/library access, or
        push notifications); (b) processing is necessary to perform our
        contract with you (account, upload, playback, library); (c) we have a
        legitimate interest that is not overridden by your rights (security,
        moderation, product improvement, aggregated analytics); or (d) we
        must comply with a legal obligation.
      </P>
      <P>
        You may withdraw consent where processing is consent-based, without
        affecting the lawfulness of processing before withdrawal. Some
        features will not work without the related data (for example we cannot
        publish a video without storing the file).
      </P>

      <H>6. Artificial intelligence and automated checks</H>
      <P>
        When you use “generate description” or similar AI tools, we send the
        title, content type, category, thumbnail, and — when the file is
        small enough and your device allows it — a copy or extract of the
        media to our servers so a model can suggest a description and related
        Bible verses. Suggestions are assistive only. You remain responsible
        for the final text and for owning the rights to the media.
      </P>
      <P>
        Uploads may also pass through automated safety and copyright-related
        checks (“Jevah AI Protected” / moderation). Content can be approved,
        placed under review, or rejected. Automated decisions that affect
        publication may be reviewed if you contact support. We do not use
        your private messages (we do not offer private DMs as a core product)
        to train public models for unrelated third parties.
      </P>

      <H>7. Media storage, CDN, and public display</H>
      <P>
        Media you publish is stored on our cloud infrastructure (object
        storage and content delivery networks) so others can stream or
        download it in the app. Public content is associated with your
        display name and avatar. Unlisted or rejected content is restricted
        according to moderation status. Thumbnails and playback URLs (including
        adaptive streaming such as HLS where available) are generated to
        deliver video and audio reliably.
      </P>

      <H>8. Device permissions</H>
      <P>
        Jevah asks for permissions only when a feature needs them:
      </P>
      <Ul
        items={[
          "Photo and video library — pick media to upload, set a profile photo, or save downloads.",
          "Camera — capture a profile photo or media for upload.",
          "Microphone — reserved for live or recording features when those features are enabled.",
          "Storage / media files (Android) — read selected files and write downloads.",
          "Network — stream content and sync your account.",
          "Background audio — continue music or sermon playback when the app is in the background.",
        ]}
      />
      <P>
        You can refuse or later revoke a permission in system settings. The
        related feature will then be unavailable.
      </P>

      <H>9. On-device storage and “cookies”</H>
      <P>
        The mobile app does not use browser cookies in the website sense. It
        does store data locally, including secure tokens, feed caches,
        interaction state, download files, Bible packs, and crash breadcrumbs.
        Clearing app data or uninstalling the app deletes most of this from
        the device. Server-side account and published content remain until
        you delete your account or we erase them under our retention rules.
      </P>

      <H>10. Who we share data with</H>
      <P>
        We do not sell your personal data. We share it only with:
      </P>
      <Ul
        items={[
          "Infrastructure providers that host APIs, databases, object storage, and CDNs (so media can stream worldwide).",
          "Authentication providers (currently Clerk, and Google or Apple if you choose those sign-in methods).",
          "Error and reliability tools (for example Sentry) so we can fix crashes. These tools receive device and diagnostic data, not your media library.",
          "Scripture and catalogue sources needed to display Bible translations or curated copyright-free tracks, under their own licences.",
          "PDF/e-book viewers that may load a document URL in a third-party viewer when you open a book.",
          "Professional advisers and authorities when required by law, court order, or to protect users, Jevah, or the public.",
          "A successor entity if we merge, restructure, or transfer the service, under equivalent protections.",
        ]}
      />
      <P>
        Other users see the public information you publish (name, avatar,
        content, comments, prayers). They do not receive your password or
        payment details (we do not currently process card payments in-app).
      </P>

      <H>11. International transfers</H>
      <P>
        Servers, CDNs, and some processors may be located outside Nigeria.
        Where we transfer personal data internationally, we take steps
        required by the NDPA so that the data remains protected (contractual
        safeguards and access controls).
      </P>

      <H>12. Retention</H>
      <P>
        We keep account data while your account is open. Published media,
        comments, and engagement records are kept while they are needed to
        operate the service, show attribution, and handle disputes. Moderation
        and copyright records may be kept longer where we have a legal or
        safety reason. Caches, drafts, and Bible packs on your device last
        until you clear them, exceed storage limits, or uninstall. Backups
        are overwritten on a rolling schedule. When you delete an account, we
        erase or anonymise personal data except where law requires us to
        retain it (for example fraud or copyright complaints).
      </P>

      <H>13. Security</H>
      <P>
        We use HTTPS, token-based authentication, encrypted transport,
        restricted staff access, and secure on-device storage for tokens. No
        method of transmission or storage is perfectly secure. Please use a
        strong unique password, keep your device updated, and tell us at
        support@jevahapp.com if you suspect unauthorised access.
      </P>

      <H>14. Your rights</H>
      <P>
        Subject to the NDPA and other applicable law, you may:
      </P>
      <Ul
        items={[
          "Access the personal data we hold about you.",
          "Correct inaccurate or incomplete data (you can also edit much of it in Profile).",
          "Request deletion of your account and associated personal data.",
          "Object to or restrict certain processing, and withdraw consent where processing is consent-based.",
          "Request a portable copy of data you provided to us, where technically feasible.",
          "Lodge a complaint with the Nigeria Data Protection Commission (NDPC) if you believe we have infringed your rights.",
        ]}
      />
      <P>
        Email support@jevahapp.com with the subject “Privacy request”. We may
        need to verify your identity. We will respond within the timeframes
        required by law.
      </P>

      <H>15. Children</H>
      <P>
        Jevah is not directed at children under 13. We do not knowingly
        collect personal data from children under 13. If you believe a child
        has created an account, contact us and we will delete it. Parents and
        guardians in Nigeria should supervise minors’ use of the app in line
        with applicable child-protection and data-protection rules. If we
        offer a specific youth experience later, we will update this Policy.
      </P>

      <H>16. Third-party content and licences</H>
      <P>
        Bible translations may be public-domain or licensed by their
        publishers. Offline packs, where offered, are stored on your device
        for personal study. Licensed translations will not be offered for
        download where the licence forbids it. Copyright-free or curated
        music is provided for in-app listening under the catalogue’s licence
        — it is not a grant for you to republish those tracks as your own.
        Third-party sites opened from the app (for example a document viewer)
        are governed by their own privacy notices.
      </P>

      <H>17. Analytics, crash reporting, and profiling</H>
      <P>
        We record product analytics (plays, likes, saves, shares, comments,
        session diagnostics) to operate counts, creator dashboards, ranking,
        and reliability. We use crash reporting to find bugs. We do not sell
        this information to advertisers. Ranking (“For You”) uses engagement
        signals so the feed is relevant; it is not credit scoring or a
        solely automated legal decision about you.
      </P>

      <H>18. Push notifications</H>
      <P>
        If you enable push notifications in settings, we process a device
        token to send updates you asked for (for example activity on your
        content). You can turn this off in the app or in system settings.
      </P>

      <H>19. Changes to this Policy</H>
      <P>
        We may update this Policy to reflect new features (for example live
        streaming when it launches), law, or processors. We will change the
        “Last updated” date and, where changes are material, notify you in
        the app or by email. Continued use after the effective date means
        you accept the updated Policy.
      </P>

      <H>20. Contact</H>
      <P>
        Privacy and data-protection requests: support@jevahapp.com{"\n"}
        Copyright reports: support@jevahapp.com (see also the Copyright
        Policy){"\n"}
        Location: Nigeria
      </P>
    </LegalScreen>
  );
}
