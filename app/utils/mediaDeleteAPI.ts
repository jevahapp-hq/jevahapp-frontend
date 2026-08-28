// Media Deletion API Service — facade over ./mediaDelete/.
export { adminDeleteContent, deleteMedia } from "./mediaDelete/deleteOperations";
export { isAdmin, isMediaOwner } from "./mediaDelete/ownership";
export type {
  DeleteMediaError,
  DeleteMediaResponse,
} from "./mediaDelete/types";
