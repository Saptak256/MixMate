import React from 'react';
import { View, Text, Alert, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { auth, firestore } from '../firebaseConfig';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const Profile = () => {
  const user = auth.currentUser;
  const router = useRouter();

  const handleDeleteAccount = async () => {
    if (user) {
      try {
        await deleteDoc(doc(firestore, 'users', user.uid));
        await deleteUser(user);
        Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
        router.replace('/signin');
      } catch (error) {
        Alert.alert('Error', 'Failed to delete account: ' + error.message);
      }
    }
  };

  return (
    <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.container}>
    
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={require('../assets/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
       
        <View style={{ width: 35 }} /> 
      </View>

      <View style={styles.body}>
        <Image source={require('../assets/mixlogo.png')} style={styles.logo} />
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.info}>Email: {user?.email}</Text>
        <Text style={styles.info}>Username: {user?.displayName || 'N/A'}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.buttonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 150,
    marginTop: -90,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  backIcon: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#34495E',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    fontSize: 18,
    color: '#2C3E50',
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default Profile;
