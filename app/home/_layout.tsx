import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';

export default function HomeLayout() {
  const { isSignedIn } = useAuth();

  // If the user is not signed in, redirect them to the welcome page
  if (!isSignedIn) {
    return <Redirect href="/home/home" />;
  }

  return <Stack />;
}
