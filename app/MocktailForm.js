import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';

const MocktailForm = () => {
  const router = useRouter();

  const [baseFlavor, setBaseFlavor] = useState('');
  const [mood, setMood] = useState('');
  const [sweetnessLevel, setSweetnessLevel] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [glassType, setGlassType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultSections, setResultSections] = useState({});
  const [isModalVisible, setModalVisible] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [recipes, setRecipes] = useState([]);

  const handleGenerateMocktail = async () => {
    setLoading(true);
    // Mocktail generation logic will go here
    setLoading(false);
  };

  const handleOpenModal = () => {
    setRecipeName(`Recipe ${recipes.length + 1}`);
    setModalVisible(true);
  };

  const handleSaveRecipe = async () => {
    const recipe = {
      name: recipeName,
      introduction: resultSections['Introduction'],
      ingredients: resultSections['Ingredients'],
      steps: resultSections['Steps'],
      precautions: resultSections['Precautions'],
      bonusTips: resultSections['Bonus Tips'],
    };

    try {
      const existingRecipes = await AsyncStorage.getItem('savedRecipes');
      const recipes = existingRecipes ? JSON.parse(existingRecipes) : [];
      recipes.push(recipe);
      await AsyncStorage.setItem('savedRecipes', JSON.stringify(recipes));
      Alert.alert('Success', 'Recipe saved successfully!');
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to save recipe');
    }
  };

  return (
    <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Customize Your Mocktail</Text>
        <Text style={styles.subtitle}>Fill in the details below to create your perfect mix</Text>

        <View style={styles.formCard}>
          <Text style={styles.label}>Base Flavor</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={baseFlavor}
              onValueChange={(itemValue) => setBaseFlavor(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select Base Flavor" value="" />
              <Picker.Item label="Fruity" value="fruity" />
              <Picker.Item label="Minty" value="minty" />
              <Picker.Item label="Creamy" value="creamy" />
            </Picker>
          </View>

          <Text style={styles.label}>Mood</Text>
          <TextInput
            style={styles.input}
            placeholder="Relaxing, Energetic, Celebratory, etc."
            placeholderTextColor="#A0AEC0"
            value={mood}
            onChangeText={setMood}
          />

          <Text style={styles.label}>Sweetness Level</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={sweetnessLevel}
              onValueChange={(itemValue) => setSweetnessLevel(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select Sweetness Level" value="" />
              <Picker.Item label="Low" value="low" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="High" value="high" />
            </Picker>
          </View>

          <Text style={styles.label}>Available Ingredients</Text>
          <TextInput
            style={styles.input}
            placeholder="List your available ingredients"
            placeholderTextColor="#A0AEC0"
            value={ingredients}
            onChangeText={setIngredients}
          />

          <Text style={styles.label}>Glass Type</Text>
          <TextInput
            style={styles.input}
            placeholder="Highball, Martini, Rocks, etc."
            placeholderTextColor="#A0AEC0"
            value={glassType}
            onChangeText={setGlassType}
          />

          <Text style={styles.label}>Difficulty Preference</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={difficulty}
              onValueChange={(itemValue) => setDifficulty(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select Difficulty" value="" />
              <Picker.Item label="Easy" value="easy" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="Fancy" value="fancy" />
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleGenerateMocktail}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Generating...' : 'Generate My Mocktail'}
          </Text>
        </TouchableOpacity>

        {Object.keys(resultSections).length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Your Custom Mocktail</Text>
            {/* Display result sections */}
            {Object.entries(resultSections).map(([title, content]) => (
              <View key={title} style={styles.resultCard}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardContent}>{content}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.button}
              onPress={handleOpenModal}
            >
              <Text style={styles.buttonText}>Save Recipe</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A6FFF" />
            <Text style={styles.loadingText}>Creating your perfect mocktail...</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Recipe</Text>
            <TextInput
              style={styles.modalInput}
              value={recipeName}
              onChangeText={setRecipeName}
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSaveRecipe}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 30,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#34495E",
    textAlign: "center",
    marginBottom: 25,
  },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: "#2D3748",
    backgroundColor: "#F7FAFC",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#F7FAFC",
    overflow: "hidden",
  },
  picker: {
    color: "#2D3748",
    height: 55,
  },
  button: {
    backgroundColor: "#4A6FFF",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    alignItems: "center",
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#4A6FFF",
    fontSize: 16,
    fontWeight: "500",
  },
  resultsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    textAlign: "center",
    marginBottom: 10,
  },
  resultCard: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 5,
  },
  cardContent: {
    fontSize: 16,
    color: "#34495E",
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: "#2D3748",
    backgroundColor: "#F7FAFC",
  },
  modalButton: {
    backgroundColor: "#4A6FFF",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    alignItems: "center",
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default MocktailForm; 