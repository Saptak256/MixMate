import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { auth, firestore } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

const AgeVerification = () => {
  const handleAgeVerification = async (isOfLegalAge) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        await setDoc(userRef, { userAgeVerified: isOfLegalAge }, { merge: true });
      } catch (error) {
        console.error('Error storing age verification status:', error);
      }
    }

    router.push({ pathname: '/MainScreen', params: { userAgeVerified: isOfLegalAge } });
  };

  return (
    <LinearGradient
      colors={["#E0EAFC", "#CFDEF3"]}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <Text style={styles.headerText}>Age Verification</Text>
        <Text style={styles.text}>
          Are you of legal drinking age in your country?
        </Text>

        <TouchableOpacity
          style={[styles.button, styles.buttonYes]}
          onPress={() => handleAgeVerification(true)}
        >
          <Text style={styles.buttonText}>Yes, I am above legal age</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonNo]}
          onPress={() => handleAgeVerification(false)}
        >
          <Text style={styles.buttonText}>No, I am below legal age</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  text: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    width: '85%',
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  buttonYes: {
    backgroundColor: '#4CAF50',
  },
  buttonNo: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AgeVerification;
