import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, updateDoc, arrayUnion, Timestamp, serverTimestamp } from "firebase/firestore";
import { auth } from "../firebaseConfig";

// Initialize Firestore
const db = getFirestore();

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const flatListRef = useRef(null);
  const currentUser = auth.currentUser;

  // Fetch chat information including the other participant
  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        // Get chat document
        const chatRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatRef);
        
        if (!chatDoc.exists()) {
          console.error("Chat not found!");
          return;
        }
        
        const chatData = chatDoc.data();
        setChatInfo(chatData);
        
        // Find the other user's ID
        const otherUserId = chatData.participants.find(
          participantId => participantId !== currentUser.uid
        );
        
        if (otherUserId) {
          // Get the other user's information
          const userRef = doc(db, "users", otherUserId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            setOtherUser(userDoc.data());
          }
        }
      } catch (error) {
        console.error("Error fetching chat info:", error);
      }
    };
    
    if (chatId) {
      fetchChatInfo();
    }
  }, [chatId]);

  // Reset unread count and mark messages as read when entering the chat
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!chatId || !currentUser) return;
      
      try {
        const chatRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatRef);
        
        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          // Get the current unreadCounts or initialize empty object
          const unreadCounts = chatData.unreadCounts || {};
          
          // Reset current user's unread count to 0
          unreadCounts[currentUser.uid] = 0;
          
          // Check if we need to update read status of last message
          if (chatData.lastMessage && chatData.lastMessage.senderId !== currentUser.uid) {
            // Update Firestore with read status
            await updateDoc(chatRef, { 
              unreadCounts,
              'lastMessage.readBy': arrayUnion(currentUser.uid)
            });
          } else {
            // Just update unread counts
            await updateDoc(chatRef, { unreadCounts });
          }
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    };
    
    markMessagesAsRead();
  }, [chatId, currentUser]);

  // Listen for new messages
  useEffect(() => {
    if (!chatId) return;
    
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Update read status for messages from other users
      fetchedMessages.forEach(async (message) => {
        if (message.senderId !== currentUser.uid && (!message.readBy || !message.readBy.includes(currentUser.uid))) {
          const messageRef = doc(db, "chats", chatId, "messages", message.id);
          await updateDoc(messageRef, {
            readBy: arrayUnion(currentUser.uid)
          });
        }
      });
      
      setMessages(fetchedMessages);
      setLoading(false);

      // Scroll to bottom when new messages arrive
      if (fetchedMessages.length > 0 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      // Get the current chat data to access participants
      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        console.error("Chat not found!");
        return;
      }
      
      const chatData = chatDoc.data();
      
      // Update unread counts for all participants except the sender
      const unreadCounts = chatData.unreadCounts || {};
      chatData.participants.forEach(participantId => {
        if (participantId !== currentUser.uid) {
          // Increment unread count for other participants
          unreadCounts[participantId] = (unreadCounts[participantId] || 0) + 1;
        }
      });

      // Add message to subcollection with read status initialized
      const messagesRef = collection(db, "chats", chatId, "messages");
      await addDoc(messagesRef, {
        text: newMessage,
        senderId: currentUser.uid,
        timestamp: Timestamp.now(),
        readBy: [currentUser.uid] // Initially read by sender only
      });

      // Update the main chat document with the latest message and unread counts
      await updateDoc(chatRef, {
        lastMessage: {
          text: newMessage,
          timestamp: Timestamp.now(),
          senderId: currentUser.uid,
          readBy: [currentUser.uid] // Initially read by sender only
        },
        unreadCounts: unreadCounts
      });

      setNewMessage(""); // Clear input
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text>Loading chat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {otherUser ? `Chat with ${otherUser.nickname || otherUser.username}` : "Chat"}
      </Text>
      
      {messages.length === 0 ? (
        <View style={styles.emptyChat}>
          <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSent = item.senderId === currentUser.uid;
            const allRead = item.readBy && chatInfo?.participants?.every(id => item.readBy.includes(id));
            
            return (
              <View>
                <View style={[
                  styles.messageBubble, 
                  isSent ? styles.sent : styles.received
                ]}>
                  <Text style={[
                    styles.messageText,
                    !isSent && styles.receivedText
                  ]}>
                    {item.text}
                  </Text>
                  <View style={styles.messageFooter}>
                    <Text style={[
                      styles.timestamp,
                      !isSent && styles.receivedTimestamp
                    ]}>
                      {item.timestamp?.toDate().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>

                {/* Read/Sent Status - shown below message bubble */}
                {isSent && (
                  <Text style={styles.readStatusOutside}>
                    {allRead ? "Read" : "Sent"}
                  </Text>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.messagesList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, !newMessage.trim() && styles.disabledButton]} 
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#E3F2FD" },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: "#E3F2FD" },
  header: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 10, paddingVertical: 10 },
  messagesList: { paddingBottom: 10 },
  messageBubble: { 
    padding: 10, 
    borderRadius: 10, 
    marginVertical: 5, 
    maxWidth: "75%",
    minWidth: 60,
    position: 'relative',
    paddingBottom: 25, // Increased space for timestamp + read status
  },
  sent: { backgroundColor: "#1976D2", alignSelf: "flex-end" },
  received: { backgroundColor: "#D3D3D3", alignSelf: "flex-start" },
  messageText: { color: "white" },
  receivedText: { color: "black" }, // Ensure text is visible on light background
  messageFooter: {
    position: 'absolute',
    bottom: 5,
    right: 10,
    flexDirection: 'column', // Changed from 'row' to 'column'
    alignItems: 'flex-end',  // Align text to the right within the bubble
    gap: 1, // Optional: small vertical spacing
  },
  timestamp: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    marginRight: 0, // Removed unnecessary spacing
  },
  readStatus: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2, // Adds slight spacing between timestamp and read status
  },
  receivedTimestamp: {
    color: "rgba(0, 0, 0, 0.5)",
  },
  inputContainer: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  input: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: "#ccc", 
    borderRadius: 10, 
    padding: 10, 
    backgroundColor: "#fff",
    maxHeight: 100,
  },
  sendButton: { marginLeft: 10, padding: 10, backgroundColor: "#1976D2", borderRadius: 8 },
  disabledButton: { backgroundColor: "#90CAF9" },
  sendButtonText: { color: "white" },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyChatText: { color: '#888', fontSize: 16 },
  readStatusOutside: {
    fontSize: 10,
    color: "rgba(0, 0, 0, 0.7)",
    alignSelf: "flex-end",
    marginTop: 2,
    marginBottom: 5,
    marginRight: 10,
  },
});