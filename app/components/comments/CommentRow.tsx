import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AnimatedButton } from "../../../src/shared/components/AnimatedButton";
import { formatCount } from "../../../src/shared/utils/formatCount";
import { shortCommentTime } from "./commentHelpers";
import { RenderCommentBody } from "./renderCommentBody";
import {
  COMMENT_COMPOSER_COLORS as C,
  type CommentThreadItem,
  type OwnMenuTarget,
} from "./types";

type Props = {
  comment: CommentThreadItem;
  repliesExpanded: boolean;
  isOwn: (userId?: string) => boolean;
  isCreator: (name?: string) => boolean;
  onLike: (commentId: string) => void;
  onReply: (parentId: string, name: string) => void;
  onToggleReplies: (commentId: string) => void;
  onOpenOwnMenu: (target: OwnMenuTarget) => void;
};

function CommentRowComponent({
  comment: c,
  repliesExpanded,
  isOwn,
  isCreator,
  onLike,
  onReply,
  onToggleReplies,
  onOpenOwnMenu,
}: Props) {
  const replies = Array.isArray(c.replies) ? c.replies : [];
  const replyCount = replies.length;
  const showInline = replyCount > 0 && repliesExpanded;
  const own = isOwn(c.userId);

  return (
    <View style={styles.commentBlock}>
      <Pressable
        style={styles.commentRow}
        onLongPress={own ? () => onOpenOwnMenu(c) : undefined}
        delayLongPress={280}
      >
        {c.avatar ? (
          <Image source={{ uri: c.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {(c.userName || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.commentBody}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {c.userName || "User"}
            </Text>
            {isCreator(c.userName) ? (
              <View style={styles.creatorBadge}>
                <Text style={styles.creatorBadgeText}>Creator</Text>
              </View>
            ) : null}
            {own ? (
              <TouchableOpacity
                onPress={() => onOpenOwnMenu(c)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.ownMenuBtn}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={16}
                  color={C.meta}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <RenderCommentBody
            text={c.comment}
            imageUrl={c.imageUrl}
            mentionNames={(c.mentions || []).map((m) => m.displayName)}
          />

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{shortCommentTime(c.timestamp)}</Text>
            {c.isEdited ? <Text style={styles.editedLabel}>Edited</Text> : null}
            <TouchableOpacity
              onPress={() => onReply(c.id, c.userName || "User")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyLink}>Reply</Text>
            </TouchableOpacity>
          </View>

          {replyCount > 0 ? (
            <TouchableOpacity
              style={styles.viewRepliesBtn}
              onPress={() => onToggleReplies(c.id)}
              activeOpacity={0.7}
            >
              <View style={styles.viewRepliesLine} />
              <Text style={styles.viewRepliesText}>
                {repliesExpanded
                  ? "Hide replies"
                  : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </Text>
              <Ionicons
                name={repliesExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color={C.meta}
              />
            </TouchableOpacity>
          ) : null}

          {showInline
            ? replies.map((r) => {
                const replyOwn = isOwn(r.userId);
                return (
                  <Pressable
                    key={r.id}
                    style={styles.replyBlock}
                    onLongPress={
                      replyOwn ? () => onOpenOwnMenu(r) : undefined
                    }
                    delayLongPress={280}
                  >
                    {r.avatar ? (
                      <Image
                        source={{ uri: r.avatar }}
                        style={styles.replyAvatar}
                      />
                    ) : (
                      <View
                        style={[styles.replyAvatar, styles.avatarFallback]}
                      >
                        <Text style={styles.replyAvatarInitial}>
                          {(r.userName || "U").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.replyUserName} numberOfLines={1}>
                          {r.userName || "User"}
                        </Text>
                        {replyOwn ? (
                          <TouchableOpacity
                            onPress={() => onOpenOwnMenu(r)}
                            hitSlop={8}
                            style={styles.ownMenuBtn}
                          >
                            <Ionicons
                              name="ellipsis-horizontal"
                              size={14}
                              color={C.meta}
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <RenderCommentBody
                        text={r.comment}
                        imageUrl={r.imageUrl}
                        mentionNames={(r.mentions || []).map(
                          (m) => m.displayName
                        )}
                      />
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>
                          {shortCommentTime(r.timestamp)}
                        </Text>
                        {r.isEdited ? (
                          <Text style={styles.editedLabel}>Edited</Text>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => onReply(c.id, r.userName || "User")}
                        >
                          <Text style={styles.replyLink}>Reply</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            : null}
        </View>

        <View style={styles.likeCol}>
          <AnimatedButton
            onPress={() => onLike(c.id)}
            pressScale={0.82}
            damping={12}
            stiffness={400}
            style={styles.likeHit}
          >
            <Ionicons
              name={c.isLiked ? "heart" : "heart-outline"}
              size={18}
              color={c.isLiked ? C.heart : C.heartIdle}
            />
          </AnimatedButton>
          {c.likes > 0 ? (
            <Text style={styles.likeCount}>{formatCount(c.likes)}</Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

export const CommentRow = memo(CommentRowComponent);

const styles = StyleSheet.create({
  commentBlock: {
    paddingVertical: 12,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.inputBg,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: "700",
    color: C.meta,
  },
  commentBody: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  ownMenuBtn: {
    marginLeft: "auto",
    paddingLeft: 8,
    paddingVertical: 2,
  },
  userName: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    maxWidth: "78%",
  },
  creatorBadge: {
    marginLeft: 6,
    backgroundColor: C.creatorBg,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  creatorBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    color: C.meta,
    marginRight: 12,
  },
  editedLabel: {
    fontSize: 12,
    color: C.meta,
    marginRight: 12,
  },
  replyLink: {
    fontSize: 12,
    fontWeight: "600",
    color: C.meta,
  },
  viewRepliesBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  viewRepliesLine: {
    width: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.meta,
    marginRight: 8,
    opacity: 0.5,
  },
  viewRepliesText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.meta,
    marginRight: 4,
  },
  replyBlock: {
    flexDirection: "row",
    marginTop: 12,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.inputBg,
    marginRight: 8,
  },
  replyAvatarInitial: {
    fontSize: 10,
    fontWeight: "700",
    color: C.meta,
  },
  replyUserName: {
    fontSize: 12,
    fontWeight: "700",
    color: C.text,
  },
  likeCol: {
    alignItems: "center",
    width: 36,
    paddingTop: 2,
  },
  likeHit: {
    padding: 2,
  },
  likeCount: {
    marginTop: 2,
    fontSize: 11,
    color: C.meta,
    fontWeight: "500",
  },
});
