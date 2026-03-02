// import { useAuth } from '@clerk/clerk-expo'
// import { Redirect, Stack } from 'expo-router'

// export default function AuthLayout() {
//   const { isSignedIn } = useAuth()

//   if (isSignedIn) {
//     return <Redirect href="/categories/HomeScreen" />
//   }

//   return <Stack />
// }





import { useAuth } from '@clerk/clerk-expo'
import { Redirect, Stack } from 'expo-router'

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return null // or a loading component
  }

  if (isSignedIn) {
    return <Redirect href="/categories/HomeScreen" />
  }

  return <Stack />
}