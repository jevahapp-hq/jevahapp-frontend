import assert from "node:assert/strict";
import { test } from "node:test";
import { useCopyrightFreeOverlayStore } from "./useCopyrightFreeOverlayStore";

test("open mounts the full now-playing sheet", () => {
  useCopyrightFreeOverlayStore.setState({
    surface: "mini",
    visible: false,
    song: null,
    songs: [],
    initialAction: null,
  });
  useCopyrightFreeOverlayStore.getState().open({ id: "song-1", title: "Isi mmiri" });
  const state = useCopyrightFreeOverlayStore.getState();
  assert.equal(state.surface, "full");
  assert.equal(state.visible, true);
  assert.equal(state.song?.id, "song-1");
});

test("dismiss removes the popup song so it is gone", () => {
  useCopyrightFreeOverlayStore.getState().open({ id: "song-1", title: "Isi mmiri" });
  useCopyrightFreeOverlayStore.getState().dismiss();
  const state = useCopyrightFreeOverlayStore.getState();
  assert.equal(state.surface, "mini");
  assert.equal(state.visible, false);
  assert.equal(state.song, null);
});
