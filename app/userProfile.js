import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { router } from "expo-router";
import { auth, firestore } from "../firebaseConfig";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"; // Import necessary methods from Firestore
import { useState } from "react";

export default function UserProfile() {
  const { userId, username, nickname, profileImageUrl } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const currentUser = auth.currentUser;

  const startChat = async () => {
    if (!currentUser || !userId) return;
    
    try {
      setLoading(true);
      
      // Check if chat already exists
      const chatsRef = collection(firestore, "chats"); // Use firestore
      const q = query(
        chatsRef, 
        where("participants", "array-contains", currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      let existingChatId = null;
      
      // Find if there's an existing chat with these two users
      querySnapshot.forEach((document) => {
        const chatData = document.data();
        if (chatData.participants.includes(userId)) {
          existingChatId = document.id;
        }
      });
      
      // If chat exists, navigate to it
      if (existingChatId) {
        router.push({
          pathname: "/chat",
          params: { chatId: existingChatId }
        });
        return;
      }
      
      // Create a new chat if it doesn't exist
      const newChatRef = await addDoc(chatsRef, {
        participants: [currentUser.uid, userId],
        createdAt: new Date(),
        messages: []
      });
      
      router.push({
        pathname: "/chat",
        params: { chatId: newChatRef.id }
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Failed to start chat. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={profileImageUrl 
          ? { uri: profileImageUrl } 
          : require("../assets/images/placeholder.png")} 
        style={styles.profileImage} 
      />
      <Text style={styles.username}>{username}</Text>
      <Text style={styles.nickname}>{nickname}</Text>
      <TouchableOpacity 
        style={[styles.chatButton, loading && styles.disabledButton]}
        onPress={startChat}
        disabled={loading}
      >
        <Text style={styles.chatButtonText}>
          {loading ? "Loading..." : "Begin Chatting"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#E3F2FD" },
  profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  username: { fontSize: 22, fontWeight: "bold" },
  nickname: { fontSize: 18, color: "gray" },
  chatButton: { marginTop: 20, padding: 12, backgroundColor: "#1976D2", borderRadius: 8 },
  disabledButton: { backgroundColor: "#90CAF9" },
  chatButtonText: { color: "white", fontSize: 16 },
});
