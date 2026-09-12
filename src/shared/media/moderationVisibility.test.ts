import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canViewerDeleteMedia,
  canViewerSeeMedia,
  isUnderReview,
  shouldShowMediaActionsMenu,
} from "./moderationVisibility";

const OWNER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbb";

const underReviewMine = {
  moderationStatus: "under_review",
  uploadedBy: { _id: OWNER },
};

const approvedMine = {
  moderationStatus: "approved",
  uploadedBy: { _id: OWNER },
};

const approvedOther = {
  moderationStatus: "approved",
  uploadedBy: { _id: OTHER },
};

test("shows the More Options menu for every moderation state", () => {
  assert.equal(shouldShowMediaActionsMenu(underReviewMine), true);
  assert.equal(shouldShowMediaActionsMenu({ moderationStatus: "pending" }), true);
  assert.equal(shouldShowMediaActionsMenu(approvedMine), true);
  assert.equal(shouldShowMediaActionsMenu({ moderationStatus: "rejected" }), true);
});

test("does not hide the menu solely because content is under review", () => {
  assert.equal(
    shouldShowMediaActionsMenu({ moderationStatus: "under_review" }),
    shouldShowMediaActionsMenu({ moderationStatus: "approved" })
  );
});

test("delete is owner-only regardless of review status", () => {
  assert.equal(canViewerDeleteMedia(underReviewMine, OWNER), true);
  assert.equal(canViewerDeleteMedia(underReviewMine, OTHER), false);
  assert.equal(canViewerDeleteMedia(approvedMine, OWNER), true);
  assert.equal(canViewerDeleteMedia(approvedOther, OWNER), false);
  assert.equal(canViewerDeleteMedia(underReviewMine, null), false);
  assert.equal(
    canViewerDeleteMedia({ moderationStatus: "approved" }, OWNER),
    false
  );
  assert.equal(
    canViewerDeleteMedia({ moderationStatus: "under_review" }, OWNER),
    false
  );
});

test("strangers cannot see another user's under-review video", () => {
  assert.equal(canViewerSeeMedia(underReviewMine, OWNER), true);
  assert.equal(canViewerSeeMedia(underReviewMine, OTHER), false);
  assert.equal(canViewerSeeMedia(approvedOther, OWNER), true);
});

test("treats pending as under review for banner/layout", () => {
  assert.equal(isUnderReview({ moderationStatus: "under_review" }), true);
  assert.equal(isUnderReview({ moderationStatus: "pending" }), true);
  assert.equal(isUnderReview({ moderationStatus: "approved" }), false);
});
