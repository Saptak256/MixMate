import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Image, FlatList, Modal } from "react-native";
import { router } from "expo-router";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";

// Initialize Firestore
const db = getFirestore();

export default function HomeScreen() {
  const [imageUrl, setImageUrl] = useState("");
  const [storedImageUrl, setStoredImageUrl] = useState(null);
  const [nickname, setNickname] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [chatList, setChatList] = useState([]); // New state for chats
  
  const [modalVisible, setModalVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      // Fetch user profile data
      const userRef = collection(db, "users");
      getDocs(query(userRef, where("uid", "==", user.uid))).then((snapshot) => {
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          setStoredImageUrl(userData.profileImageUrl);
          setNickname(userData.nickname);
        }
      });

      // Fetch user's chat list (e.g., recent chats, last message)
      const chatRef = collection(db, "chats");
      const userChatQuery = query(chatRef, where("participants", "array-contains", user.uid));
      getDocs(userChatQuery).then((snapshot) => {
        const chats = [];
        snapshot.forEach((doc) => {
          const chatData = doc.data();
          const otherUser = chatData.participants.find((id) => id !== user.uid);
          
          // Fetch the other user's profile info (e.g., username, profile picture)
          const userRef = doc(db, "users", otherUser);
          getDoc(userRef).then((userDoc) => {
            const otherUserData = userDoc.data();
            const lastMessage = chatData.messages.length > 0 ? chatData.messages[chatData.messages.length - 1].text : "No messages yet";
            chats.push({
              id: doc.id,
              username: otherUserData.username,
              profileImageUrl: otherUserData.profileImageUrl,
              lastMessage,
            });
            setChatList(chats); // Update chat list
          });
        });
      });
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/signin");
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  const handleProfileImageSubmit = async () => {
    if (!imageUrl) {
      Alert.alert("Please enter a valid image URL.");
      return;
    }
    if (!isValidImageUrl(imageUrl)) {
      Alert.alert("Invalid image URL.");
      return;
    }
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { profileImageUrl: imageUrl }, { merge: true });
      setStoredImageUrl(imageUrl);
      setImageUrl("");
      Alert.alert("Profile image updated successfully!");
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Failed to update profile image", error.message);
    }
  };

  const handleRemoveProfileImage = async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { profileImageUrl: null }, { merge: true });
      setStoredImageUrl(null);
      Alert.alert("Profile image removed successfully!");
    } catch (error) {
      Alert.alert("Failed to remove profile image", error.message);
    }
  };

  const isValidImageUrl = (url) => {
    return url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  };

  const openChat = (chatId) => {
    // Navigate to the chat screen
    router.push({
      pathname: "/chat",
      params: { chatId }
    });
  };

  // Function to search users by username
  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length === 0) {
      setUserSuggestions([]);
      return;
    }

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", ">=", text), where("username", "<=", text + "\uf8ff"));
    const querySnapshot = await getDocs(q);

    const results = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });

    setUserSuggestions(results);
  };

  const openUserProfile = (selectedUser) => {
    setSearchQuery(""); // Clear search input
    setUserSuggestions([]); // Hide suggestions
    router.push({
      pathname: "/userProfile",
      params: {
        userId: selectedUser.id,
        username: selectedUser.username,
        nickname: selectedUser.nickname,
        profileImageUrl: selectedUser.profileImageUrl,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hi {nickname || "User"}</Text>
        <TouchableOpacity onPress={() => setDropdownVisible(!dropdownVisible)}>
          {storedImageUrl ? (
            <Image source={{ uri: storedImageUrl }} style={styles.profileImage} />
          ) : (
            <Image source={require("../assets/images/placeholder.png")} style={styles.profileImage} />
          )}
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      {dropdownVisible && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity onPress={() => { setModalVisible(true); setDropdownVisible(false); }} style={styles.dropdownItem}>
            <Text>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.dropdownItem}>
            <Text>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Image Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.input}
            placeholder="Paste your image URL here"
            value={imageUrl}
            onChangeText={setImageUrl}
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleProfileImageSubmit}>
            <Text style={styles.buttonText}>Set Profile Image</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeButton} onPress={handleRemoveProfileImage}>
            <Text style={styles.buttonText}>Remove Profile Image</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search users..."
        value={searchQuery}
        onChangeText={handleSearch}
      />

      {/* Live Search Suggestions */}
      {userSuggestions.length > 0 && (
        <FlatList
          data={userSuggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.suggestionItem} onPress={() => openUserProfile(item)}>
              <Image source={{ uri: item.profileImageUrl || "../assets/images/placeholder.png" }} style={styles.suggestionImage} />
              <Text style={styles.suggestionText}>{item.username}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Chat List */}
      <FlatList
        data={chatList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatBox} onPress={() => openChat(item.id)}>
            <Image source={{ uri: item.profileImageUrl || "../assets/images/placeholder.png" }} style={styles.chatImage} />
            <View style={styles.chatInfo}>
              <Text style={styles.chatUsername}>{item.username}</Text>
              <Text style={styles.lastMessage}>{item.lastMessage}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E3F2FD" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, backgroundColor: "#1E88E5" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "white" },
  profileImage: { width: 45, height: 45, borderRadius: 22.5 },
  searchBar: { height: 40, margin: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 10, paddingLeft: 10, backgroundColor: "#fff" },
  suggestionItem: { flexDirection: "row", padding: 10, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#ddd" },
  suggestionImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  suggestionText: { fontSize: 16 },
  chatBox: { flexDirection: "row", padding: 15, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  chatImage: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  chatInfo: { flex: 1 },
  chatUsername: { fontSize: 16, fontWeight: "bold" },
  lastMessage: { fontSize: 14, color: "#555" },
  dropdownMenu: { 
    position: "absolute", 
    right: 20, 
    top: 75, 
    backgroundColor: "#FFF", 
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    elevation: 5, 
    zIndex: 999,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 5 
  },
  dropdownItem: { 
    paddingVertical: 12, 
    paddingHorizontal: 18, 
    borderBottomWidth: 1, 
    borderBottomColor: "#E0E0E0" 
  },
  modalContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0,0,0,0.6)" // Dark overlay for focus
  },
  input: { 
    height: 45, 
    borderColor: "#90CAF9", 
    borderWidth: 1, 
    marginBottom: 20, 
    paddingHorizontal: 10, 
    width: "80%", 
    backgroundColor: "#fff", 
    borderRadius: 5 
  },
  submitButton: { 
    backgroundColor: "#64B5F6", 
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    borderRadius: 5 
  },
  removeButton: { 
    backgroundColor: "#FF8A65", 
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    borderRadius: 5, 
    marginTop: 10 
  },
  closeButton: { 
    backgroundColor: "#B0BEC5", 
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    borderRadius: 5, 
    marginTop: 10 
  },
  buttonText: { 
    color: "white", 
    fontWeight: "bold" 
  }
});

