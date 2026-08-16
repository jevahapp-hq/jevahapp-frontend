import { LegalScreen, H, P, Ul } from "./LegalDocument";

export default function CopyrightPolicyScreen() {
  return (
    <LegalScreen title="Copyright Policy" updated="16 August 2026">
      <H>1. Respect for intellectual property</H>
      <P>
        Jevah exists to share original gospel media and licensed or
        public-domain works. We respect copyright, neighbouring rights,
        trademarks, and the moral rights of authors. This Policy sits
        alongside our Terms of Service and Privacy Policy. By uploading or
        using content on Jevah, you agree to it.
      </P>

      <H>2. What you may upload</H>
      <P>You may only upload material that you:</P>
      <Ul
        items={[
          "Created yourself; or",
          "Own the copyright in; or",
          "Have a written licence, release, or permission to use and to sublicense to Jevah as described in the Terms (including the right to stream, transcode, and display thumbnails).",
        ]}
      />
      <P>
        This includes the video or audio bed, any music underneath a sermon
        or vlog, artwork, thumbnails, e-book text, and fonts. A worship
        recording of a song you did not write still requires the appropriate
        composition and recording rights unless an exception clearly applies
        under Nigerian law.
      </P>

      <H>3. What you must not upload</H>
      <Ul
        items={[
          "Commercial films, albums, or books you ripped or downloaded without a licence.",
          "Another church’s or creator’s sermon, livestream, or podcast presented as yours.",
          "Beats, loops, or tracks from the internet labelled “free” unless the licence allows public streaming and you keep required credit.",
          "Jevah’s curated copyright-free catalogue re-uploaded as if it were your master.",
          "Trademarks or another ministry’s logo used in a way that suggests false endorsement.",
        ]}
      />

      <H>4. Jevah catalogue and Bible text</H>
      <P>
        Curated copyright-free or partner tracks are licensed for in-app
        listening (and only for further use if we expressly say so in the
        app). Bible translations remain under their publishers’ licences or,
        where applicable, the public domain. Offline packs and text-to-speech
        are for personal study in Jevah, not for publishing a new commercial
        Bible or audiobook.
      </P>

      <H>5. AI tools do not clear rights</H>
      <P>
        Using Jevah AI to generate a description or verse list does not
        transfer copyright to you in anyone else’s media, and does not
        constitute legal clearance. You remain responsible for the file you
        attach. We may analyse uploads for safety and likely infringement as
        described in the Privacy Policy and Terms.
      </P>

      <H>6. How to report infringement</H>
      <P>
        If you are the owner or authorised agent and you believe content on
        Jevah infringes your rights, email support@jevahapp.com with the
        subject “Copyright notice” and include:
      </P>
      <Ul
        items={[
          "Your full name, organisation (if any), email, and phone number.",
          "A description of the copyrighted work (title, author, registration number if you have one).",
          "The exact location of the material on Jevah (URL, content ID, uploader name, or screenshot).",
          "A statement that you have a good-faith belief the use is not authorised by the owner, its agent, or the law.",
          "A statement that the information in the notice is accurate, and that you are the owner or authorised to act.",
          "Your physical or electronic signature (typing your full legal name is sufficient).",
        ]}
      />
      <P>
        We may share the notice with the uploader so they can respond. We
        may ask for more evidence before acting.
      </P>

      <H>7. Takedown and restoration</H>
      <P>
        After a valid notice we may remove or restrict the content, pause
        the account’s upload privileges, and notify the user. If the user
        sends a counter-notice explaining why the material is authorised, we
        may restore it unless the complainant seeks a court order, consistent
        with applicable law. We are not a court; we decide in good faith
        based on the information we have.
      </P>

      <H>8. Repeat infringement</H>
      <P>
        Users who repeatedly upload infringing material may have content
        removed, creator status revoked, and accounts suspended or
        terminated. We may also preserve records of notices as required for
        legal and safety purposes.
      </P>

      <H>9. False or abusive claims</H>
      <P>
        Submitting a notice you know is false, or using copyright claims to
        harass another believer or competitor, may result in account action
        and, where the law allows, liability to the affected user and to
        Jevah.
      </P>

      <H>10. Our own rights</H>
      <P>
        The Jevah name, logo, software, and original editorial collections
        are protected. You may not copy the app, scrape the catalogue, or
        use our marks to imply that Jevah endorses your ministry without
        written permission.
      </P>

      <H>11. Updates</H>
      <P>
        We may update this Policy when features or law change. The “Last
        updated” date will change. Continued use means you accept the
        current version.
      </P>

      <H>12. Contact</H>
      <P>
        Copyright: support@jevahapp.com{"\n"}
        General support: support@jevahapp.com{"\n"}
        Location: Nigeria
      </P>
    </LegalScreen>
  );
}
