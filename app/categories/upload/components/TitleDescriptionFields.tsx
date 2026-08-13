import { TextInput, View } from "react-native";
import {
  getInputSize,
  getResponsiveSpacing,
} from "../../../../utils/responsive";
import { FIELD_HELP, FieldLabel } from "./FieldLabel";
import { FieldHelpTip } from "./FieldHelpTip";

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
      <FieldHelpTip visible={helpKey === "title"} text={FIELD_HELP.title} />
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
      <FieldHelpTip
        visible={helpKey === "description"}
        text={FIELD_HELP.description}
      />
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
