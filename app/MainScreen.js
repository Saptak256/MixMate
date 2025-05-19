import React, { useState, useEffect } from 'react';
import { View, Text, Alert, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, firestore } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

const MainScreen = () => {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [nickname, setNickname] = useState('User');
  const [isOfLegalAge, setIsOfLegalAge] = useState(false);

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setNickname(data.nickname || 'User');
          setIsOfLegalAge(data.userAgeVerified === true);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
  };

  useEffect(() => {
    fetchUserData();
    const unsubscribe = auth.onAuthStateChanged(() => {
      fetchUserData();
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/signin');
    } catch (error) {
      Alert.alert('Logout Failed', error.message);
    }
  };

  const handleDrinkSelection = (drinkType) => {
    if (drinkType === 'Cocktail' && !isOfLegalAge) {
      Alert.alert('Access Denied', 'Cocktails are only for users above the legal drinking age.');
    } else {
      router.push({ pathname: '/InputForm', params: { drinkType } });
    }
  };

  return (
    <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/mixlogo.png')} style={styles.logo} />
        <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
          <Image source={require('../assets/hamburger.png')} style={styles.hamburgerIcon} />
        </TouchableOpacity>
      </View>

      {menuVisible && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/Profile')}>
            <Text style={styles.menuItemText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/SavedRecipes')}>
            <Text style={styles.menuItemText}>Saved Recipes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/Settings')}>
            <Text style={styles.menuItemText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={styles.menuItemText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.greeting}>Hi {nickname}</Text>
        <Text style={styles.title}>What do you want to make today?</Text>

        <TouchableOpacity
          style={[styles.button, !isOfLegalAge && styles.disabledButton]}
          onPress={() => handleDrinkSelection('Cocktail')}
          disabled={!isOfLegalAge}
        >
          <Text style={styles.buttonText}>🍸 Cocktail</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => handleDrinkSelection('Mocktail')}
        >
          <Text style={styles.buttonText}>🧃 Mocktail</Text>
        </TouchableOpacity>

        {!isOfLegalAge && (
          <Text style={styles.infoText}>
            Cocktails are only for users above the legal drinking age.
          </Text>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logo: { width: 40, height: 40, resizeMode: 'contain' },
  hamburgerIcon: { width: 35, height: 35 },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  menu: {
    position: 'absolute',
    top: 55,
    right: 10,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuItem: { paddingVertical: 8 },
  menuItemText: { fontSize: 16, color: '#34495E' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34495E',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4A6FFF',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  infoText: { marginTop: 10, color: 'red', textAlign: 'center' },
  disabledButton: { backgroundColor: '#B0BEC5' },
});

export default MainScreen;
