import { RenderAvatarRowProps } from "@/.expo/types/avatarTypes";
import { Text, View } from "react-native";

const cuteAvatars = {
  girls: [
    { id: "g1", src: require("../../assets/images/Asset 26 (2).png") },
    { id: "g2", src: require("../../assets/images/Asset 29.png") },
    { id: "g3", src: require("../../assets/images/Asset 30.png") },
    { id: "g4", src: require("../../assets/images/Asset 47.png") },
    { id: "g5", src: require("../../assets/images/Asset 48.png") },
    { id: "g6", src: require("../../assets/images/Asset 49.png") },
    { id: "g7", src: require("../../assets/images/Asset 34.png") },
    { id: "g8", src: require("../../assets/images/Asset 35.png") },
    { id: "g9", src: require("../../assets/images/Asset 36.png") },
    { id: "g10", src: require("../../assets/images/Asset 37.png") },
    { id: "g11", src: require("../../assets/images/Asset 38.png") },
    { id: "g12", src: require("../../assets/images/Asset 39.png") },
    { id: "g13", src: require("../../assets/images/Asset 40.png") },
    { id: "g14", src: require("../../assets/images/Asset 41.png") },
    { id: "g15", src: require("../../assets/images/Asset 42.png") },
  
    

  


   
  ],
  boys: [
    { id: "b1", src: require("../../assets/images/Asset 26 (2).png") },
    { id: "b2", src: require("../../assets/images/Asset 29 (1).png") },
    { id: "b3", src: require("../../assets/images/Asset 50.png") },
    { id: "b4", src: require("../../assets/images/Asset 47 (1).png") },
    { id: "b5", src: require("../../assets/images/Asset 48 (1).png") },
    { id: "b6", src: require("../../assets/images/Asset 49 (1).png") },
    { id: "b7", src: require("../../assets/images/Asset 34 (1).png") },
    { id: "b8", src: require("../../assets/images/Asset 35 (1).png") },
    { id: "b9", src: require("../../assets/images/Asset 36 (1).png") },
    { id: "b10", src: require("../../assets/images/Asset 37 (1).png") },
    { id: "b11", src: require("../../assets/images/Asset 38 (1).png") },
    { id: "b12", src: require("../../assets/images/Asset 39 (1).png") },
    { id: "b13", src: require("../../assets/images/Asset 40 (1).png") },
    { id: "b14", src: require("../../assets/images/Asset 41 (1).png") },
    { id: "b15", src: require("../../assets/images/Asset 42 (1).png") },
  ],
};

const CuteAvatar = ({ renderAvatarRow }: RenderAvatarRowProps) => {
  return (
    <View>
      <Text className="text-[12px] font-rubik-medium text-[#475467] mb-2">GIRLS</Text>
      {renderAvatarRow(cuteAvatars.girls)}
      <Text className="text-[12px] font-rubik-medium text-[#475467] mb-2">BOYS</Text>
      {renderAvatarRow(cuteAvatars.boys)}
    </View>
  );
};

export default CuteAvatar;
