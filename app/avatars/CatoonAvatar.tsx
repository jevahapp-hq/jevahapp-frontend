import React from "react";
import { ImageSourcePropType } from "react-native";
  import { RenderAvatarRowProps } from "@/.expo/types/avatarTypes";

const cartoonAvatars: { id: string; src: ImageSourcePropType }[] = [
  { id: "c1", src: require("../../assets/images/1.png") },
  { id: "c2", src: require("../../assets/images/_Avatar Images.png") },
  { id: "c3", src: require("../../assets/images/_Avatar Images (1).png") },
  { id: "c4", src: require("../../assets/images/_Avatar Images (2).png") },
  { id: "c5", src: require("../../assets/images/_Avatar Images (3).png") },
  { id: "c6", src: require("../../assets/images/_Avatar Images (4).png") },
  { id: "c7", src: require("../../assets/images/9.png") },
  { id: "c8", src: require("../../assets/images/_Avatar Images (6).png") },
  { id: "c9", src: require("../../assets/images/11.png") },
  { id: "c10", src: require("../../assets/images/_Avatar Images (12).png") },
  { id: "c11", src: require("../../assets/images/_Avatar Images (13).png") },
  { id: "c12", src: require("../../assets/images/_Avatar Images (14).png") },
  { id: "c13", src: require("../../assets/images/_Avatar Images (8).png") },
  { id: "c14", src: require("../../assets/images/_Avatar Images (9).png") },
  { id: "c15", src: require("../../assets/images/Asset 26 (1).png") },
  { id: "c16", src: require("../../assets/images/Asset 27 (1).png") },
  { id: "c17", src: require("../../assets/images/Asset 28 (1).png") },
  { id: "c18", src: require("../../assets/images/11.png") },
];

const CartoonAvatar = ({ renderAvatarRow }: RenderAvatarRowProps) => {
  return renderAvatarRow(cartoonAvatars);
};

export default CartoonAvatar;





