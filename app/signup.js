import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { auth, firestore } from "../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) return false;

    setCheckingUsername(true);
    try {
      const usernameDocRef = doc(firestore, "usernames", username.toLowerCase());
      const usernameDoc = await getDoc(usernameDocRef);
      return !usernameDoc.exists();
    } catch (error) {
      console.error("Error checking username:", error);
      Alert.alert("Error", "Could not check username availability.");
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
      const isUsernameAvailable = await checkUsernameAvailability(username);
      if (!isUsernameAvailable) {
        Alert.alert("Error", "Username is already taken");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const displayName = nickname || username;

      await updateProfile(user, {
        displayName: displayName,
      });

      await setDoc(doc(firestore, "usernames", username.toLowerCase()), {
        uid: user.uid,
        createdAt: new Date(),
      });

      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        username: username,
        nickname: nickname || null,
        displayName: displayName,
        email: email,
        createdAt: new Date(),
      });

      router.push("/AgeVerification");
    } catch (error) {
      console.error("Sign up error:", error);
      let errorMessage = error.message;
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      }
      Alert.alert("Sign Up Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Image source={require("../assets/mixlogo.png")} style={styles.logo} />
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
            style={[styles.button, (loading || checkingUsername) && { opacity: 0.8 }]}
            onPress={handleSignUp}
            disabled={loading || checkingUsername}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/signin")}>
            <Text style={styles.link}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 20,
    resizeMode: "contain",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4A6FFF",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "85%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
  },
  checking: {
    color: "#999",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  button: {
    backgroundColor: "#4A6FFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "85%",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  link: {
    marginTop: 16,
    color: "#4A6FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
