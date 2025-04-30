import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { auth, firestore } from "../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Function to check if username is available
  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) return false;
    
    setCheckingUsername(true);
    try {
      // Check if username document exists in 'usernames' collection
      const usernameDocRef = doc(firestore, "usernames", username.toLowerCase());
      const usernameDoc = await getDoc(usernameDocRef);
      
      return !usernameDoc.exists();
    } catch (error) {
      console.error("Error checking username:", error);
      // For permissions errors, assume the username isn't available
      // This is safer than proceeding with uncertainty
      if (error.code === 'permission-denied') {
        Alert.alert("Permission Error", "Unable to check username availability due to permission settings. Please try again later.");
      } else {
        Alert.alert("Error", "Failed to check username availability: " + error.message);
      }
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword || !username) {
      Alert.alert("Error", "Email, username, password, and confirm password are required");
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    
    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }
    
    if (nickname && nickname.length < 2) {
      Alert.alert("Error", "Nickname must be at least 2 characters");
      return;
    }
    
    setLoading(true);
    
    try {
      // First check if username is available
      const isUsernameAvailable = await checkUsernameAvailability(username);
      
      if (!isUsernameAvailable) {
        Alert.alert("Error", "Username is already taken or could not be verified");
        setLoading(false);
        return;
      }
      
      // Create user with email and password first
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Use nickname for display name if provided, otherwise use username
      const displayName = nickname || username;
      
      // Update the user profile with the display name
      await updateProfile(user, {
        displayName: displayName
      });
      
      try {
        // Now that we're authenticated, write to Firestore
        // Store username in a separate collection for easy lookup
        await setDoc(doc(firestore, "usernames", username.toLowerCase()), {
          uid: user.uid,
          createdAt: new Date()
        });
        
        // Store in users collection with all data
        await setDoc(doc(firestore, "users", user.uid), {
          uid: user.uid,
          username: username,
          nickname: nickname || null,
          displayName: displayName,
          email: email,
          createdAt: new Date()
        });
        
        router.push("/home");
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        
        // User is created but Firestore failed
        if (firestoreError.code === 'permission-denied') {
          Alert.alert("Account Created", 
            "Your account was created but we couldn't save your profile information. Please try setting up your profile again later.",
            [{ text: "OK", onPress: () => router.push("/home") }]
          );
        } else {
          Alert.alert("Account Created", 
            "Your account was created but there was an issue saving additional profile details: " + firestoreError.message,
            [{ text: "OK", onPress: () => router.push("/home") }]
          );
        }
      }
    } catch (error) {
      console.error("Sign up error:", error);
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters.";
      }
      Alert.alert("Sign Up Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        value={email} 
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.input} 
        placeholder="Username (required)" 
        value={username} 
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      {checkingUsername && <Text style={styles.checking}>Checking username...</Text>}
      <TextInput 
        style={styles.input} 
        placeholder="Nickname (optional)" 
        value={nickname} 
        onChangeText={setNickname}
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />
      <TextInput 
        style={styles.input} 
        placeholder="Confirm Password" 
        value={confirmPassword} 
        onChangeText={setConfirmPassword} 
        secureTextEntry 
      />
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleSignUp} 
        disabled={loading || checkingUsername}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/signin")}>
        <Text style={styles.link}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  input: {
    width: "85%",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  button: {
    backgroundColor: "#4A6FFF",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    width: "85%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    color: "#4A6FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  checking: {
    color: "#666",
    fontSize: 14,
    marginBottom: 10,
  }
});