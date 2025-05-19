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
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#f00',
    padding: 10,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});