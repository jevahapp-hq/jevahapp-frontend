import { Text, TextInput, View } from "react-native";
import {
  getInputSize,
  getResponsiveFontSize,
  getResponsiveSpacing,
} from "../../../../utils/responsive";
import { FIELD_HELP, FieldLabel } from "./FieldLabel";

type TitleDescriptionFieldsProps = {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  helpKey: string | null;
  openHelp: (key: string) => void;
  onTitleChange: (text: string) => void;
};

export function TitleDescriptionFields({
  title,
  description,
  setDescription,
  helpKey,
  openHelp,
  onTitleChange,
}: TitleDescriptionFieldsProps) {
  return (
    <View>
      <FieldLabel
        label="TITLE"
        icon="text-outline"
        helpKey="title"
        openHelp={openHelp}
      />
      {helpKey === "title" ? (
        <Text
          style={{
            fontSize: getResponsiveFontSize(11, 12, 13),
            color: "#64748B",
            fontFamily: "Rubik-Regular",
            marginBottom: 8,
            lineHeight: 17,
          }}
        >
          {FIELD_HELP.title}
        </Text>
      ) : null}
      <TextInput
        placeholder="Enter title..."
        value={title}
        onChangeText={onTitleChange}
        multiline
        textAlignVertical="top"
        className="border border-gray-300 rounded-md mb-4 px-3 py-3 bg-white"
        style={{
          minHeight: getInputSize().height,
          maxHeight: 100,
          fontSize: getInputSize().fontSize,
        }}
      />

      <FieldLabel
        label="DESCRIPTION"
        icon="create-outline"
        helpKey="description"
        openHelp={openHelp}
      />
      {helpKey === "description" ? (
        <Text
          style={{
            fontSize: getResponsiveFontSize(11, 12, 13),
            color: "#64748B",
            fontFamily: "Rubik-Regular",
            marginBottom: 8,
            lineHeight: 17,
          }}
        >
          {FIELD_HELP.description}
        </Text>
      ) : null}
      <TextInput
        placeholder="Enter description..."
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        className="border border-gray-300 rounded-md mb-2 px-3 py-3 bg-white"
        style={{
          minHeight: getResponsiveSpacing(80, 100, 120),
          maxHeight: 200,
          fontSize: getInputSize().fontSize,
        }}
      />
    </View>
  );
}
