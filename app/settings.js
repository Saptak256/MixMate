import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from "react-native";
import { useNavigation } from "expo-router";
import { useState, useEffect } from "react";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, deleteUser } from "firebase/auth";

const db = getFirestore();
const auth = getAuth();

export default function SettingsScreen() {
  const navigation = useNavigation();
  const user = auth.currentUser;

  const [modalVisible, setModalVisible] = useState(false);
  const [nickname, setNickname] = useState("");
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          setNickname(docSnap.data().nickname || "");
        }
      });
    }
  }, []);

  const handleNicknameSave = async () => {
    if (!nickname.trim()) {
      Alert.alert("Nickname cannot be empty");
      return;
    }
    try {
      await setDoc(doc(db, "users", user.uid), { nickname }, { merge: true });
      Alert.alert("Success", "Nickname updated!");
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  
  const handleDeleteAccount = () => {
    Alert.alert("Confirm Delete", "Are you sure you want to permanently delete your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteUser(user);
            Alert.alert("Deleted", "Account deleted successfully.");
            navigation.replace("/signin");
          } catch (error) {
            Alert.alert("Error", error.message);
          }
        },
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <TouchableOpacity style={styles.option} onPress={() => setModalVisible(true)}>
        <Text style={styles.optionText}>Change Nickname</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={handleDeleteAccount}>
        <Text style={[styles.optionText, { color: "#FF3B30" }]}>Delete Account</Text>
      </TouchableOpacity>

      {/* Nickname Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Nickname</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              style={styles.input}
              placeholder="Enter nickname"
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleNicknameSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#999", marginTop: 10 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E3F2FD", padding: 20 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: "#1E88E5" },
  option: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  optionText: { fontSize: 16, color: "#333" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { backgroundColor: "#fff", borderRadius: 10, padding: 20, width: "80%", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, width: "100%", marginBottom: 15 },
  saveButton: { backgroundColor: "#4A6FFF", padding: 12, borderRadius: 8, width: "100%" },
  saveButtonText: { color: "#fff", textAlign: "center", fontSize: 16 },
});
