// import React, { useEffect, useRef } from "react";
// import { View, Text, Button, StyleSheet, ActivityIndicator } from "react-native";
// import { useAuth } from "@clerk/clerk-expo";
// import { useRouter } from "expo-router";

// export default function TempLogout() {
//   const { signOut, isLoaded, userId } = useAuth();
//   const router = useRouter();
//   const hasLoggedOut = useRef(false); // 👈 prevent multiple runs

//   useEffect(() => {
//     const logout = async () => {
//       if (!isLoaded || hasLoggedOut.current) return;

//       hasLoggedOut.current = true;

//       if (!userId) {
//         console.warn("⚠️ Clerk is loaded but no user is signed in.");
//         return;
//       }

//       try {
//         await signOut();
//         console.log("✅ Signed out with Clerk");

//         setTimeout(() => {
//           router.replace("/");
//         }, 1000);
//       } catch (error) {
//         console.error("❌ Error signing out with Clerk:", error);
//       }
//     };

//     logout();
//   }, [isLoaded, userId]);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.heading}>You’ve been logged out.</Text>
//       <ActivityIndicator size="large" color="#666" style={{ marginVertical: 20 }} />
//       <Button title="Go to Login" onPress={() => router.replace("/")} />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     padding: 20,
//   },
//   heading: {
//     fontSize: 20,
//     fontWeight: "600",
//     color: "#090E24",
//   },
// });






import React, { useEffect, useRef } from 'react'
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native'
import { useAuth } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'

export default function TempLogout() {
  const { signOut, isLoaded, userId } = useAuth()
  const router = useRouter()
  const hasLoggedOut = useRef(false)

  useEffect(() => {
    const logout = async () => {
      if (!isLoaded || hasLoggedOut.current) return

      hasLoggedOut.current = true

      if (!userId) {
        console.warn('⚠️ Clerk is loaded but no user is signed in.')
        router.replace('/')
        return
      }

      try {
        await signOut()
        console.log('✅ Signed out with Clerk')
        setTimeout(() => {
          router.replace('/')
        }, 1000)
      } catch (error) {
        console.error('❌ Error signing out with Clerk:', error)
      }
    }

    logout()
  }, [isLoaded, userId])

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>You’ve been logged out.</Text>
      <ActivityIndicator size="large" color="#666" style={{ marginVertical: 20 }} />
      <Button title="Go to Login" onPress={() => router.replace('/')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#090E24',
  },
})