import { ActivityIndicator, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#090E24" />
      <Text style={{ marginTop: 16, color: '#090E24', fontSize: 18, fontWeight: '600' }}>
        Loading...
      </Text>
    </View>
  );
}
