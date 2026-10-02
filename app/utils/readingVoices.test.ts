import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assignReadingVoices,
  pickNarratorDeviceVoice,
  type DeviceVoice,
} from "./readingVoices";

const iosVoices: DeviceVoice[] = [
  {
    identifier: "com.apple.voice.compact.en-US.Samantha",
    name: "Samantha",
    quality: "Default",
    language: "en-US",
  },
  {
    identifier: "com.apple.voice.premium.en-US.Ava",
    name: "Ava",
    quality: "Enhanced",
    language: "en-US",
  },
  {
    identifier: "com.apple.voice.compact.en-GB.Daniel",
    name: "Daniel",
    quality: "Default",
    language: "en-GB",
  },
  {
    identifier: "com.apple.voice.enhanced.en-US.Zoe",
    name: "Zoe",
    quality: "Enhanced",
    language: "en-US",
  },
  {
    identifier: "com.apple.voice.compact.fr-FR.Thomas",
    name: "Thomas",
    quality: "Default",
    language: "fr-FR",
  },
];

test("on iPhone, Siri's own voices win over premium system voices", () => {
  const assigned = assignReadingVoices([
    ...iosVoices,
    {
      identifier: "com.apple.ttsbundle.siri_female_en-US_premium",
      name: "Siri Female",
      quality: "Default",
      language: "en-US",
    },
    {
      identifier: "com.apple.ttsbundle.siri_male_en-US_compact",
      name: "Siri Male",
      quality: "Default",
      language: "en-US",
    },
  ]);
  assert.equal(
    assigned.maple.identifier,
    "com.apple.ttsbundle.siri_female_en-US_premium"
  );
  assert.equal(
    assigned.cove.identifier,
    "com.apple.ttsbundle.siri_male_en-US_compact"
  );
  assert.equal(
    assigned.breeze.identifier,
    "com.apple.ttsbundle.siri_female_en-US_premium"
  );
});

test("a single Siri voice is reused so every choice still sounds like Siri", () => {
  const assigned = assignReadingVoices([
    ...iosVoices,
    {
      identifier: "com.apple.ttsbundle.siri_female_en-US_compact",
      name: "Siri",
      quality: "Enhanced",
      language: "en-US",
    },
  ]);
  assert.equal(
    assigned.maple.identifier,
    "com.apple.ttsbundle.siri_female_en-US_compact"
  );
  assert.equal(assigned.cove.identifier, assigned.maple.identifier);
  assert.equal(assigned.breeze.identifier, assigned.maple.identifier);
});

test("maps Maple, Cove, and Breeze to three different natural voices", () => {
  const assigned = assignReadingVoices(iosVoices);
  assert.equal(assigned.maple.identifier, "com.apple.voice.premium.en-US.Ava");
  assert.equal(assigned.cove.identifier, "com.apple.voice.compact.en-GB.Daniel");
  assert.equal(assigned.breeze.identifier, "com.apple.voice.enhanced.en-US.Zoe");
  assert.equal(assigned.cove.language, "en-GB");
  const ids = [
    assigned.maple.identifier,
    assigned.cove.identifier,
    assigned.breeze.identifier,
  ];
  assert.equal(new Set(ids).size, 3);
});

test("prefers an enhanced named voice over a compact one for the same role", () => {
  const assigned = assignReadingVoices([
    {
      identifier: "com.apple.voice.compact.en-US.Samantha",
      name: "Samantha",
      quality: "Default",
      language: "en-US",
    },
    {
      identifier: "com.apple.voice.premium.en-US.Ava",
      name: "Ava",
      quality: "Enhanced",
      language: "en-US",
    },
  ]);
  assert.equal(assigned.maple.identifier, "com.apple.voice.premium.en-US.Ava");
  assert.notEqual(assigned.cove.identifier, assigned.maple.identifier);
});

test("splits Android neural voice ids by speaker", () => {
  const assigned = assignReadingVoices([
    {
      identifier: "en-us-x-iog-local",
      name: "en-us-x-iog-local",
      quality: "Enhanced",
      language: "en-US",
    },
    {
      identifier: "en-us-x-iom-local",
      name: "en-us-x-iom-local",
      quality: "Enhanced",
      language: "en-US",
    },
    {
      identifier: "en-us-x-tpc-network",
      name: "en-us-x-tpc-network",
      quality: "Enhanced",
      language: "en-US",
    },
    {
      identifier: "en-us-x-sfg-local",
      name: "en-us-x-sfg-local",
      quality: "Default",
      language: "en-US",
    },
  ]);
  assert.equal(assigned.maple.identifier, "en-us-x-iog-local");
  assert.equal(assigned.cove.identifier, "en-us-x-iom-local");
  assert.equal(assigned.breeze.identifier, "en-us-x-tpc-network");
});

test("skips novelty voices that sound like a toy", () => {
  const assigned = assignReadingVoices([
    {
      identifier: "com.apple.voice.compact.en-US.Fred",
      name: "Fred",
      quality: "Default",
      language: "en-US",
    },
    {
      identifier: "com.apple.voice.compact.en-GB.Daniel",
      name: "Daniel",
      quality: "Default",
      language: "en-GB",
    },
    {
      identifier: "com.apple.voice.premium.en-US.Ava",
      name: "Ava",
      quality: "Enhanced",
      language: "en-US",
    },
    {
      identifier: "com.apple.voice.enhanced.en-US.Zoe",
      name: "Zoe",
      quality: "Enhanced",
      language: "en-US",
    },
  ]);
  assert.equal(assigned.maple.identifier, "com.apple.voice.premium.en-US.Ava");
  assert.equal(assigned.cove.identifier, "com.apple.voice.compact.en-GB.Daniel");
  assert.equal(assigned.breeze.identifier, "com.apple.voice.enhanced.en-US.Zoe");
});

test("David, Hays, and Souer pick distinct narrator voices", () => {
  const voices: DeviceVoice[] = [
    {
      identifier: "com.apple.voice.premium.en-US.Ava",
      name: "Ava",
      quality: "Enhanced",
      language: "en-US",
    },
    {
      identifier: "com.apple.voice.enhanced.en-US.Evan",
      name: "Evan",
      quality: "Enhanced",
      language: "en-US",
    },
    {
      identifier: "com.apple.voice.compact.en-GB.Daniel",
      name: "Daniel",
      quality: "Default",
      language: "en-GB",
    },
    {
      identifier: "com.apple.voice.enhanced.en-US.Zoe",
      name: "Zoe",
      quality: "Enhanced",
      language: "en-US",
    },
  ];
  assert.equal(
    pickNarratorDeviceVoice(voices, "david").identifier,
    "com.apple.voice.enhanced.en-US.Evan"
  );
  assert.equal(
    pickNarratorDeviceVoice(voices, "hays").identifier,
    "com.apple.voice.compact.en-GB.Daniel"
  );
  assert.equal(
    pickNarratorDeviceVoice(voices, "souer").identifier,
    "com.apple.voice.premium.en-US.Ava"
  );
});

test("returns empty matches when the device has no voices", () => {
  const assigned = assignReadingVoices([]);
  assert.equal(assigned.maple.identifier, undefined);
  assert.equal(assigned.cove.identifier, undefined);
  assert.equal(assigned.breeze.identifier, undefined);
});
