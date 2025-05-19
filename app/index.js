import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient"; // Install: expo install expo-linear-gradient

export default function Welcome() {
  return (
    <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.container}>
      {/* Optional logo */}
      <Image source={require('../assets/mixlogo.png')} style={styles.logo} />

      <Text style={styles.title}>Welcome to MixMate</Text>
      <Text style={styles.subtitle}>Your personal cocktail & mocktail assistant</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/signin")}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => router.push("/signup")}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Sign Up</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#34495E",
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#4A6FFF",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: "80%",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#4A6FFF",
  },
  secondaryButtonText: {
    color: "#4A6FFF",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
    resizeMode: "contain",
  },
});
