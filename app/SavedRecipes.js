import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

const SavedRecipes = () => {
  const router = useRouter();
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editRecipeName, setEditRecipeName] = useState('');
  const [editIndex, setEditIndex] = useState(null);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const savedRecipes = await AsyncStorage.getItem('savedRecipes');
        if (savedRecipes) {
          setRecipes(JSON.parse(savedRecipes));
        }
      } catch (error) {
        console.error('Error fetching recipes:', error);
      }
    };

    fetchRecipes();
  }, []);

  const handleDeleteRecipe = async (index) => {
    try {
      const updatedRecipes = [...recipes];
      updatedRecipes.splice(index, 1);
      setRecipes(updatedRecipes);
      await AsyncStorage.setItem('savedRecipes', JSON.stringify(updatedRecipes));
      Alert.alert('Success', 'Recipe deleted successfully!');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      Alert.alert('Error', 'Failed to delete recipe');
    }
  };

  const handleOpenEditModal = (index, currentName) => {
    setEditRecipeName(currentName);
    setEditIndex(index);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (editIndex !== null) {
      try {
        const updatedRecipes = [...recipes];
        updatedRecipes[editIndex].name = editRecipeName;
        setRecipes(updatedRecipes);
        await AsyncStorage.setItem('savedRecipes', JSON.stringify(updatedRecipes));
        Alert.alert('Success', 'Recipe name updated successfully!');
        setEditModalVisible(false);
      } catch (error) {
        console.error('Error updating recipe name:', error);
        Alert.alert('Error', 'Failed to update recipe name');
      }
    }
  };

  const handleSelectRecipe = (recipe) => {
    if (selectedRecipe === recipe) {
      setSelectedRecipe(null);
    } else {
      setSelectedRecipe(recipe);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <LinearGradient colors={["#E0EAFC", "#CFDEF3"]} style={styles.gradientBackground}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Image source={require('../assets/back.png')} style={styles.backIcon} />
          </TouchableOpacity>
          <View style={{ width: 35 }} />
        </View>

        {/* Body */}
        <View style={styles.body}>
          {recipes.length === 0 ? (
            <Text style={styles.message}>No saved recipes</Text>
          ) : (
            recipes.map((recipe, index) => (
              <View key={index}>
                <TouchableOpacity style={styles.recipeCard} onPress={() => handleSelectRecipe(recipe)}>
                  <Text style={styles.recipeTitle}>{recipe.name}</Text>
                  <Text style={styles.recipeContent}>{recipe.introduction.substring(0, 50)}...</Text>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="edit" size={24} color="black" onPress={() => handleOpenEditModal(index, recipe.name)} />
                    <MaterialIcons name="delete" size={24} color="red" onPress={() => handleDeleteRecipe(index)} />
                  </View>
                </TouchableOpacity>
                {selectedRecipe === recipe && (
                  <View style={styles.fullRecipeContainer}>
                    <Text style={styles.fullRecipeTitle}>{selectedRecipe.name}</Text>
                    {Object.entries(selectedRecipe).map(([key, value]) => (
                      key !== 'name' && (
                        <View key={key} style={styles.resultCard}>
                          <Text style={styles.cardTitle}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                          <Text style={styles.cardContent}>{value}</Text>
                        </View>
                      )
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isEditModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Recipe Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editRecipeName}
                onChangeText={setEditRecipeName}
              />
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  message: {
    fontSize: 20,
    fontWeight: '500',
    color: '#2C3E50',
  },
  recipeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  recipeContent: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 12,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  fullRecipeContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullRecipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  resultCard: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  cardContent: {
    fontSize: 14,
    color: '#34495E',
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  modalButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  gradientBackground: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default SavedRecipes;
