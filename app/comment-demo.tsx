import { ScrollView } from 'react-native';
import CommentDemo from './components/CommentDemo';

export default function CommentDemoScreen() {
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <CommentDemo />
    </ScrollView>
  );
}
