import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { auth, firestore } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Settings = () => {
  const router = useRouter();
  const user = auth.currentUser;
  const [nickname, setNickname] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [isOfLegalAge, setIsOfLegalAge] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNickname(data.nickname || '');
          setNewNickname(data.nickname || '');
          setIsOfLegalAge(data.userAgeVerified || false);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    if (user) fetchUserData();
  }, []);

  const handleSaveNickname = async () => {
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { nickname: newNickname });
      setNickname(newNickname);
      Alert.alert('Success', 'Nickname updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update nickname: ' + error.message);
    }
  };

  const handleToggleAgeConfirmation = async () => {
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { userAgeVerified: !isOfLegalAge });
      setIsOfLegalAge((prev) => !prev);
    } catch (error) {
      Alert.alert('Error', 'Failed to update age status: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={require('../assets/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Nickname Section */}
      <View style={styles.section}>
        <Text style={styles.label}>Change Nickname:</Text>
        <TextInput
          style={styles.input}
          value={newNickname}
          onChangeText={setNewNickname}
          placeholder="Enter new nickname"
        />
        <TouchableOpacity style={styles.button} onPress={handleSaveNickname}>
          <Text style={styles.buttonText}>Save Nickname</Text>
        </TouchableOpacity>
      </View>

      {/* Legal Age Toggle */}
      <View style={styles.section}>
        <Text style={styles.label}>Confirm Legal Drinking Age:</Text>
        <View style={styles.switchRow}>
          <Switch value={isOfLegalAge} onValueChange={handleToggleAgeConfirmation} />
          <Text style={styles.switchLabel}>
            {isOfLegalAge ? 'Confirmed' : 'Not Confirmed'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0EAFC',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#34495E',
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4A6FFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  switchLabel: {
    marginLeft: 10,
    fontSize: 16,
    color: '#2C3E50',
  },
});

export default Settings;
