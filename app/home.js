import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Image, FlatList, Modal } from "react-native";
import { router } from "expo-router";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";

const db = getFirestore();

export default function HomeScreen() {
  const [imageUrl, setImageUrl] = useState("");
  const [storedImageUrl, setStoredImageUrl] = useState(null);
  const [nickname, setNickname] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [chatList, setChatList] = useState([]);
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

      // Set up real-time listener for chats
      const chatRef = collection(db, "chats");
      const userChatQuery = query(chatRef, where("participants", "array-contains", user.uid));
      
      const unsubscribe = onSnapshot(userChatQuery, async (snapshot) => {
        const chatsPromises = snapshot.docs.map(async (document) => {
          const chatData = document.data();
          const otherUserId = chatData.participants.find((id) => id !== user.uid);

          // Get other user information
          const userRef = doc(db, "users", otherUserId);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const otherUserData = userDoc.data();
            let lastMessageText = chatData.lastMessage?.text || "No messages yet";
            let unreadCount = chatData.unreadCounts?.[user.uid] || 0;
            
            // Check if all participants have read the last message
            let allParticipantsRead = false;
            if (chatData.lastMessage?.readBy && chatData.participants) {
              allParticipantsRead = chatData.participants.every(
                participantId => chatData.lastMessage.readBy.includes(participantId)
              );
            }
            
            let isMessageFromUser = chatData.lastMessage?.senderId === user.uid;

            return {
              id: document.id,
              username: otherUserData.username || "User",
              profileImageUrl: otherUserData.profileImageUrl,
              lastMessage: lastMessageText,
              timestamp: chatData.lastMessage?.timestamp || chatData.createdAt,
              unreadCount,
              lastMessageRead: allParticipantsRead,
              isMessageFromUser
            };
          }
          return null;
        });

        const chats = (await Promise.all(chatsPromises))
          .filter(chat => chat !== null)
          .sort((a, b) => {
            const aTime = a.timestamp?.toDate() || new Date(0);
            const bTime = b.timestamp?.toDate() || new Date(0);
            return bTime - aTime;
          });

        setChatList(chats);
      }, (error) => {
        console.error("Error in chat listener:", error);
      });

      // Clean up listener when component unmounts
      return () => unsubscribe();
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
    if (!imageUrl || !isValidImageUrl(imageUrl)) {
      Alert.alert("Invalid image URL.");
      return;
    }
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { profileImageUrl: imageUrl }, { merge: true });
      setStoredImageUrl(imageUrl);
      setImageUrl("");
      setModalVisible(false);
      Alert.alert("Profile image updated successfully!");
    } catch (err) {
      Alert.alert("Failed to update profile image", err.message);
    }
  };

  const handleRemoveProfileImage = async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { profileImageUrl: null }, { merge: true });
      setStoredImageUrl(null);
      Alert.alert("Profile image removed!");
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const isValidImageUrl = (url) => url.match(/\.(jpeg|jpg|gif|png|webp)$/i);

  const openChat = async (chatId) => {
    await resetUnreadCount(chatId);
    router.push({ pathname: "/chat", params: { chatId } });
  };

  const resetUnreadCount = async (chatId) => {
    try {
      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);

      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const unreadCounts = chatData.unreadCounts || {};
        unreadCounts[user.uid] = 0;

        await setDoc(chatRef, { unreadCounts }, { merge: true });
      }
    } catch (err) {
      console.error("Error resetting unread count:", err);
    }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (!text) return setUserSuggestions([]);

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", ">=", text), where("username", "<=", text + "\uf8ff"));
      const snap = await getDocs(q);
      const results = [];

      snap.forEach((doc) => {
        if (doc.data().uid !== user.uid) {
          results.push({ id: doc.id, ...doc.data() });
        }
      });

      setUserSuggestions(results);
    } catch (err) {
      console.error("Error searching:", err);
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    
    const messageDate = timestamp.toDate();
    const now = new Date();
    
    // Same day - show time
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Within a week - show day name
    const diffDays = Math.floor((now - messageDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const openUserProfile = (selectedUser) => {
    setSearchQuery("");
    setUserSuggestions([]);
    router.push({
      pathname: "/userProfile",
      params: {
        userId: selectedUser.uid,
        username: selectedUser.username,
        nickname: selectedUser.nickname,
        profileImageUrl: selectedUser.profileImageUrl
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hi {nickname || "User"}</Text>
        <TouchableOpacity onPress={() => setDropdownVisible(!dropdownVisible)}>
          <Image
            source={storedImageUrl ? { uri: storedImageUrl } : require("../assets/images/placeholder.png")}
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>

      {/* Dropdown */}
      {dropdownVisible && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity onPress={() => { setModalVisible(true); setDropdownVisible(false); }} style={styles.dropdownItem}>
            <Text>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDropdownVisible(false); router.push("/settings"); }} style={styles.dropdownItem}>
          <Text>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={styles.dropdownItem}>
            <Text>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.input}
            placeholder="Paste your image URL"
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

      {/* Search */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search users..."
        value={searchQuery}
        onChangeText={handleSearch}
      />

      {/* Suggestions */}
      {userSuggestions.length > 0 && (
        <FlatList
          data={userSuggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.suggestionItem} onPress={() => openUserProfile(item)}>
              <Image
                source={item.profileImageUrl ? { uri: item.profileImageUrl } : require("../assets/images/placeholder.png")}
                style={styles.suggestionImage}
              />
              <Text style={styles.suggestionText}>{item.username}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Chats */}
      {chatList.length > 0 ? (
        <FlatList
          data={chatList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatBox} onPress={() => openChat(item.id)}>
            <Image
              source={item.profileImageUrl ? { uri: item.profileImageUrl } : require("../assets/images/placeholder.png")}
              style={styles.chatImage}
            />
            
            <View style={styles.chatContent}>
              <View style={styles.chatTopRow}>
                <Text style={styles.chatUsername} numberOfLines={1}>{item.username}</Text>
                <Text style={styles.messageTime}>{formatMessageTime(item.timestamp)}</Text>
              </View>
          
              <View style={styles.chatBottomRow}>
                <Text style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">{item.lastMessage}</Text>
          
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBubble}>
                    <Text style={styles.unreadText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
                  </View>
                )}
              </View>
          
              {item.isMessageFromUser && (
                <Text style={[styles.seenStatus, item.lastMessageRead ? styles.seenText : styles.sentText]}>
                  {item.lastMessageRead ? "Read" : "Sent"}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          
          )}
        />
      ) : (
        <View style={styles.emptyChatList}>
          <Text style={styles.emptyChatText}>No chats yet</Text>
          <Text style={styles.emptyChatSubtext}>Search for users to start chatting</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E3F2FD" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, backgroundColor: "#1E88E5" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "white" },
  profileImage: { width: 45, height: 45, borderRadius: 22.5 },
  searchBar: { height: 40, margin: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 10, paddingLeft: 10, backgroundColor: "#fff" },
  suggestionItem: { flexDirection: "row", padding: 10, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#ddd", backgroundColor: "#fff" },
  suggestionImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  suggestionText: { fontSize: 16 },
  chatBox: { flexDirection: "row", padding: 15, borderBottomWidth: 1, borderBottomColor: "#ddd", backgroundColor: "#fff", alignItems: "center" },
  chatImage: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  chatInfo: { flex: 1 },
  chatUsername: { fontSize: 16, fontWeight: "bold" },
  seenStatus: { 
    fontSize: 12, 
    marginTop: 2
  },
  seenText: {
    color: "#64B5F6"  // Blue color for "Read"
  },
  sentText: {
    color: "#9E9E9E"  // Gray color for "Sent"
  },
  emptyChatList: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyChatText: { fontSize: 18, fontWeight: "bold", color: "#888" },
  emptyChatSubtext: { fontSize: 14, color: "#888", marginTop: 10 },
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
  },
  rightInfo: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: 10,
  },
  
  messageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  
  chatContent: {
    flex: 1,
    justifyContent: "center"
  },
  chatTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  chatBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  messageTime: {
    fontSize: 12,
    color: "#888",
    marginLeft: 10
  },
  unreadBubble: {
    backgroundColor: "#1E88E5",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginLeft: 8,
    minWidth: 24,
    alignItems: "center"
  },
  unreadText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold"
  },
  lastMessage: {
    fontSize: 14,
    color: "#555",
    flex: 1
  }
});